import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Session, User } from "@supabase/supabase-js";
import { isEmailConfirmed } from "@/lib/auth/emailConfirmed";
import type { Database } from "@/lib/supabase/database.types";
import { createServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import {
  classifySupabaseSignupError,
  isConfirmationEmailSendFailure,
  type SignupErrorKind,
} from "@/lib/supabase/signupAuthErrors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
} as const;

type AnonClient = SupabaseClient<Database>;

function createAnonAuthClient(): AnonClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon) return null;
  return createClient<Database>(url, anon, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * When Supabase Auth SMTP cannot send confirmation mail, skip the slow failing
 * `signUp` call (~5s) and create a confirmed user via service role instead.
 * Default ON — set SIGNUP_DIRECT_CREATE=false only for local experiments.
 */
function shouldUseDirectSignup(): boolean {
  const v = process.env.SIGNUP_DIRECT_CREATE?.trim().toLowerCase();
  if (v === "false" || v === "0" || v === "no") return false;
  return true;
}

function isDuplicateEmailUser(user: User | null): boolean {
  if (!user) return false;
  const identities = user.identities;
  return Array.isArray(identities) && identities.length === 0;
}

function isAdminEmailExistsError(error: { message?: string; code?: string }): boolean {
  const msg = (error.message ?? "").toLowerCase();
  const code = (error.code ?? "").toLowerCase();
  return (
    code === "email_exists" ||
    msg.includes("already been registered") ||
    msg.includes("already exists") ||
    msg.includes("user already registered")
  );
}

async function signInFreshUser(
  client: AnonClient,
  email: string,
  password: string,
): Promise<{ session: Session | null; user: User | null; error: string | null }> {
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    return { session: null, user: null, error: error.message };
  }
  return {
    session: data.session ?? null,
    user: data.user ?? data.session?.user ?? null,
    error: null,
  };
}

async function ensurePublicUserRow(userId: string, email: string | null): Promise<boolean> {
  const admin = createServiceRoleClient();
  if (!admin) return false;
  const { error } = await admin.from("users").upsert(
    {
      id: userId,
      email,
      language_preference: "en",
    },
    { onConflict: "id" },
  );
  if (error) {
    console.error("[sign-up] users upsert failed", error.message);
    return false;
  }
  return true;
}

async function createConfirmedUserViaAdmin({
  email,
  password,
  userMetadata,
}: {
  email: string;
  password: string;
  userMetadata: Record<string, string>;
}): Promise<
  | { ok: true; user: User }
  | { ok: false; kind: SignupErrorKind; message: string }
> {
  const admin = createServiceRoleClient();
  if (!admin) {
    return {
      ok: false,
      kind: "confirmation_email_failed",
      message: "Signup email delivery is unavailable.",
    };
  }

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: userMetadata,
  });

  if (error) {
    if (isAdminEmailExistsError(error)) {
      return { ok: false, kind: "email_exists", message: error.message };
    }
    return {
      ok: false,
      kind: "confirmation_email_failed",
      message: error.message,
    };
  }

  const user = data.user;
  if (!user?.id) {
    return {
      ok: false,
      kind: "generic",
      message: "Account could not be created.",
    };
  }

  return { ok: true, user };
}

async function finishInstantSignup({
  client,
  email,
  password,
  user,
}: {
  client: AnonClient;
  email: string;
  password: string;
  user: User;
}): Promise<NextResponse> {
  const signedIn = await signInFreshUser(client, email, password);
  if (!signedIn.session) {
    return NextResponse.json(
      {
        error: {
          message:
            signedIn.error ??
            "Account was created but sign-in failed. Try logging in.",
          code: "sign_in_after_signup_failed",
          kind: "generic",
        },
      },
      { status: 500, headers: JSON_HEADERS },
    );
  }

  const userRowReady = await ensurePublicUserRow(
    user.id,
    signedIn.user?.email ?? user.email ?? email,
  );

  return NextResponse.json(
    {
      user: signedIn.user ?? user,
      session: signedIn.session,
      requiresEmailConfirmation: false,
      userRowReady,
      instantSignup: true,
    },
    { headers: JSON_HEADERS },
  );
}

async function signupViaAdminFallback({
  client,
  email,
  password,
  userMetadata,
}: {
  client: AnonClient;
  email: string;
  password: string;
  userMetadata: Record<string, string>;
}): Promise<NextResponse> {
  const created = await createConfirmedUserViaAdmin({
    email,
    password,
    userMetadata,
  });

  if (!created.ok) {
    const status = created.kind === "email_exists" ? 400 : 503;
    return NextResponse.json(
      {
        error: {
          message: created.message,
          code: created.kind,
          kind: created.kind,
        },
      },
      { status, headers: JSON_HEADERS },
    );
  }

  return finishInstantSignup({
    client,
    email,
    password,
    user: created.user,
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  const client = createAnonAuthClient();
  if (!client) {
    return NextResponse.json(
      {
        error: {
          message: "Supabase is not configured on the server.",
          code: "config",
          kind: "generic",
        },
      },
      { status: 500, headers: JSON_HEADERS },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: { message: "Invalid request body.", code: "invalid_request", kind: "generic" } },
      { status: 400, headers: JSON_HEADERS },
    );
  }

  const email =
    typeof (body as { email?: unknown })?.email === "string"
      ? (body as { email: string }).email.trim()
      : "";
  const password =
    typeof (body as { password?: unknown })?.password === "string"
      ? (body as { password: string }).password
      : "";
  const fullName =
    typeof (body as { fullName?: unknown })?.fullName === "string"
      ? (body as { fullName: string }).fullName.trim()
      : "";
  const pendingReferralCode =
    typeof (body as { pendingReferralCode?: unknown })?.pendingReferralCode ===
    "string"
      ? (body as { pendingReferralCode: string }).pendingReferralCode.trim().toUpperCase()
      : "";
  const emailRedirectTo =
    typeof (body as { emailRedirectTo?: unknown })?.emailRedirectTo === "string"
      ? (body as { emailRedirectTo: string }).emailRedirectTo.trim()
      : "";

  if (!email || !password) {
    return NextResponse.json(
      {
        error: {
          message: "Email and password are required.",
          code: "invalid_request",
          kind: "generic",
        },
      },
      { status: 400, headers: JSON_HEADERS },
    );
  }

  const userMetadata: Record<string, string> = {};
  if (fullName) userMetadata.full_name = fullName;
  if (pendingReferralCode.length >= 4) {
    userMetadata.pending_referral_code = pendingReferralCode;
  }

  if (shouldUseDirectSignup()) {
    return signupViaAdminFallback({ client, email, password, userMetadata });
  }

  const signUpOptions: {
    data?: Record<string, string>;
    emailRedirectTo?: string;
  } = {};
  if (Object.keys(userMetadata).length > 0) signUpOptions.data = userMetadata;
  if (emailRedirectTo) signUpOptions.emailRedirectTo = emailRedirectTo;

  const { data, error } = await client.auth.signUp({
    email,
    password,
    options: Object.keys(signUpOptions).length > 0 ? signUpOptions : undefined,
  });

  if (!error && data.user) {
    if (isDuplicateEmailUser(data.user)) {
      return NextResponse.json(
        {
          error: {
            message: "User already registered",
            code: "email_exists",
            kind: "email_exists",
          },
        },
        { status: 400, headers: JSON_HEADERS },
      );
    }

    const requiresEmailConfirmation = !isEmailConfirmed(data.user);
    if (requiresEmailConfirmation && data.session) {
      await client.auth.signOut({ scope: "local" });
    }

    let userRowReady = false;
    if (!requiresEmailConfirmation && data.session && data.user.id) {
      userRowReady = await ensurePublicUserRow(
        data.user.id,
        data.user.email ?? email,
      );
    }

    return NextResponse.json(
      {
        user: data.user,
        session: requiresEmailConfirmation ? null : data.session,
        requiresEmailConfirmation,
        userRowReady,
      },
      { headers: JSON_HEADERS },
    );
  }

  if (error && isConfirmationEmailSendFailure(error)) {
    return signupViaAdminFallback({ client, email, password, userMetadata });
  }

  if (error) {
    const kind = classifySupabaseSignupError(
      error as { code?: string; message?: string },
    );
    const status =
      kind === "email_exists" || kind === "invalid_email" || kind === "password_too_short"
        ? 400
        : kind === "rate_limited"
          ? 429
          : 400;
    return NextResponse.json(
      {
        error: {
          message: error.message,
          code: error.code ?? null,
          kind,
        },
      },
      { status, headers: JSON_HEADERS },
    );
  }

  return NextResponse.json(
    {
      error: {
        message: "Sign up succeeded but no user was returned.",
        code: "no_user",
        kind: "generic",
      },
    },
    { status: 500, headers: JSON_HEADERS },
  );
}
