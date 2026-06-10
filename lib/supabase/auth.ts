import { clearFreshLogin, setFreshLogin } from "@/lib/auth/freshLogin";
import { invalidateGateSessionSnapshot, seedGateSessionSnapshot } from "@/lib/auth/gateSessionSnapshot";
import {
  clearSupabaseAuthStorage,
} from "@/lib/auth/staleSessionRecovery";
import { isEmailConfirmed } from "@/lib/auth/emailConfirmed";
import { supabase, assertSupabaseConfigured, type Database } from "./client";
import {
  classifySupabaseSignupError,
  SignupAuthError,
} from "./signupAuthErrors";

export type SignupResult = {
  userId: string | null;
  userEmail: string | null;
  // When Supabase requires email confirmation, `user` may be present but no session.
  // We still consider signup successful from a UX perspective.
  requiresEmailConfirmation: boolean;
};

/** Email already registered (maps from Supabase `user_already_exists`, `email_exists`, etc.). */
export class SignupEmailAlreadyExistsError extends Error {
  constructor() {
    super("SignupEmailAlreadyExists");
    this.name = "SignupEmailAlreadyExistsError";
  }
}

/** Other signup failures; UI should show a generic message — details stay in console. */
export class SignupGenericError extends Error {
  constructor() {
    super("SignupGeneric");
    this.name = "SignupGenericError";
  }
}

/**
 * Prefer this over `instanceof SignupEmailAlreadyExistsError` in client components: Turbopack
 * can duplicate the class across chunks, which breaks `instanceof` and shows a generic error.
 */
export function isSignupEmailAlreadyExistsError(err: unknown): boolean {
  if (err instanceof SignupEmailAlreadyExistsError) return true;
  return (
    typeof err === "object" &&
    err !== null &&
    (err as { name?: string }).name === "SignupEmailAlreadyExistsError"
  );
}

type UserRow = Database["public"]["Tables"]["users"]["Row"];

type SupabaseErrorInfo = {
  message: string;
  code?: string | null;
  details?: string | null;
  hint?: string | null;
};

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${label} timed out after ${Math.floor(timeoutMs / 1000)}s`));
    }, timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

export type EnsureUserRowResult =
  | { success: true; userRow: UserRow }
  | { success: false; userRow: null; error: SupabaseErrorInfo };

function toSupabaseErrorInfo(err: unknown): SupabaseErrorInfo {
  const e = err as
    | {
        message?: string;
        code?: string | null;
        details?: string | null;
        hint?: string | null;
      }
    | undefined;

  return {
    message: e?.message ? String(e.message) : "Supabase request failed.",
    code: e?.code ?? null,
    details: e?.details ?? null,
    hint: e?.hint ?? null,
  };
}

function logSupabaseError(label: string, err: unknown) {
  if (!err || typeof err !== "object") return;

  const info = toSupabaseErrorInfo(err);

  const hasMeaningfulInfo = Boolean(
    (typeof info.message === "string" &&
      info.message !== "Supabase request failed." &&
      info.message.trim().length > 0) ||
      (typeof info.code === "string" && info.code.trim().length > 0) ||
      (typeof info.details === "string" && info.details.trim().length > 0) ||
      (typeof info.hint === "string" && info.hint.trim().length > 0)
  );

  let rawIsEmpty = false;
  try {
    rawIsEmpty = JSON.stringify(err) === "{}";
  } catch {
    rawIsEmpty = false;
  }

  // If there's no meaningful info and raw serializes to `{}`, skip logging.
  if (!hasMeaningfulInfo && rawIsEmpty) return;

  // Log as a string to avoid Chrome showing `{}` for objects with
  // non-enumerable properties.
  console.error(
    `${label} | message=${info.message} code=${info.code ?? "null"} details=${info.details ?? "null"} hint=${info.hint ?? "null"}`
  );

  // Only log the full raw error object when it isn't `{}` noise.
  if (!rawIsEmpty) {
    const raw = err as Record<string, unknown>;
    console.error(label + " (raw)", {
      ...raw,
      message: info.message,
      code: info.code,
      details: info.details,
      hint: info.hint,
    });
  }
}

/**
 * Ensures a minimal `public.users` row (id, email, language) without assigning app role.
 * Role + profile are created only after the user chooses Player/Scout on /role.
 */
async function ensureUserRow({
  providedAuthUser,
}: {
  // Optional: if signup returns a user but there's no session yet (e.g. email confirmation),
  // we can still create the row. We still "first get" from Supabase Auth inside this function.
  providedAuthUser?: { id: string; email: string | null };
}): Promise<EnsureUserRowResult> {
  // 1) First get authenticated user from Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.getUser();

  const sessionUser = authData.user;
  const authUser =
    sessionUser?.id
      ? { id: sessionUser.id, email: sessionUser.email ?? null }
      : providedAuthUser;

  if (authError) {
    // Don't crash yet; if providedAuthUser exists we can still proceed.
    logSupabaseError("Supabase: getUser error", authError);
  }

  // Requirement: if there is no authenticated user, stop and return clear error.
  if (!authUser?.id) {
    return {
      success: false,
      userRow: null,
      error: {
        message:
          "You need to be signed in to create your account profile. Please try again.",
        code: null,
        details: null,
        hint: null,
      },
    };
  }

  const createPayload = {
    id: authUser.id,
    email: authUser.email,
    language_preference: "en",
  };

  // 2) Query public.users by id using a safe "maybeSingle" pattern.
  // We only fetch `id` here to avoid strict selection issues when no row exists.
  const { data: existingIdRow, error: selectIdError } = await supabase
    .from("users")
    .select("id")
    .eq("id", authUser.id)
    .maybeSingle();

  // If the id row exists, fetch the full row and return.
  if (existingIdRow?.id) {
    const { data: fullRow, error: fullSelectError } = await supabase
      .from("users")
      .select("*")
      .eq("id", authUser.id)
      .maybeSingle();

    if (fullRow?.id) {
      return { success: true, userRow: fullRow as UserRow };
    }

    // If full row fetch failed, attempt recovery below (do NOT fail early).
    if (fullSelectError) {
      logSupabaseError("Supabase: users full select error", fullSelectError);
    }
  } else {
    // Requirement: if select returns no row, do NOT treat as fatal.
    if (selectIdError) {
      const code = toSupabaseErrorInfo(selectIdError).code;
      if (code === "PGRST205") {
        return {
          success: false,
          userRow: null,
          error: {
            message:
              "PitchRusch is not configured yet. Missing `public.users` table in Supabase.",
            code: null,
            details: null,
            hint: null,
          },
        };
      }
      logSupabaseError("Supabase: users id select error", selectIdError);
    }
  }

  // 3) Insert new row (safe logic via upsert to prevent duplicates)
  const { error: upsertError } = await supabase
    .from("users")
    .upsert(createPayload, { onConflict: "id" });

  if (upsertError) {
    // Requirement: log exact error object and do not log just "{}"
    const code = toSupabaseErrorInfo(upsertError).code;
    if (code === "PGRST205") {
      return {
        success: false,
        userRow: null,
        error: {
          message:
            "PitchRusch is not configured yet. Missing `public.users` table in Supabase.",
          code: null,
          details: null,
          hint: null,
        },
      };
    }
    logSupabaseError("Supabase: users upsert error", upsertError);
  }

  // 4) Verify that the row exists after recovery attempt
  const { data: recoveredRow, error: recoveredSelectError } = await supabase
    .from("users")
    .select("*")
    .eq("id", authUser.id)
    .maybeSingle();

  if (recoveredRow?.id) return { success: true, userRow: recoveredRow as UserRow };

  // If recovery failed, return a structured error.
  if (recoveredSelectError) {
    const code = toSupabaseErrorInfo(recoveredSelectError).code;
    if (code === "PGRST205") {
      return {
        success: false,
        userRow: null,
        error: {
          message:
            "PitchRusch is not configured yet. Missing `public.users` table in Supabase.",
          code: null,
          details: null,
          hint: null,
        },
      };
    }
    logSupabaseError(
      "Supabase: users recovered select error",
      recoveredSelectError
    );
  }
  return {
    success: false,
    userRow: null,
    error: toSupabaseErrorInfo(upsertError ?? recoveredSelectError),
  };
}

export async function signUpWithEmailPassword({
  email,
  password,
  fullName,
  pendingReferralCode,
  emailRedirectTo,
}: {
  email: string;
  password: string;
  fullName?: string;
  /** Survives email confirmation when browser storage is cleared (auth user_metadata). */
  pendingReferralCode?: string | null;
  /** Must be allow-listed in Supabase Auth (e.g. `/auth/confirm`). */
  emailRedirectTo?: string;
}): Promise<SignupResult> {
  assertSupabaseConfigured();
  const trimmedFullName = fullName?.trim() || "";
  const refMeta = (pendingReferralCode ?? "").trim().toUpperCase();
  const signUpMeta: Record<string, string> = {};
  if (trimmedFullName) signUpMeta.full_name = trimmedFullName;
  if (refMeta.length >= 4) signUpMeta.pending_referral_code = refMeta;

  const signUpOptions: {
    data?: Record<string, string>;
    emailRedirectTo?: string;
  } = {};
  if (Object.keys(signUpMeta).length > 0) signUpOptions.data = signUpMeta;
  const redirectTo = emailRedirectTo?.trim();
  if (redirectTo) signUpOptions.emailRedirectTo = redirectTo;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: Object.keys(signUpOptions).length > 0 ? signUpOptions : undefined,
  });

  if (error) {
    logSupabaseError("Supabase: signUp error", error);
    const kind = classifySupabaseSignupError(
      error as { code?: string; message?: string },
    );
    if (kind === "email_exists") {
      throw new SignupEmailAlreadyExistsError();
    }
    throw new SignupAuthError(kind);
  }

  const authUser = data.user;
  const requiresEmailConfirmation = !isEmailConfirmed(authUser);

  if (requiresEmailConfirmation && data.session) {
    await supabase.auth.signOut({ scope: "local" });
  }

  if (!authUser?.id) {
    // Requirement: do not silently continue if auth user is null.
    const details = {
      hasUser: Boolean(authUser),
      userId: authUser?.id ?? null,
      hasSession: Boolean(data.session),
    };
    console.error("Supabase: signUp succeeded but auth user is missing", details);
    throw new SignupGenericError();
  }

  const userId = authUser.id;
  const userEmail = authUser.email ?? email;

  // No session yet (email confirmation): auth user exists; `users` row is created after login/onboarding.
  if (requiresEmailConfirmation) {
    return {
      userId,
      userEmail,
      requiresEmailConfirmation: true,
    };
  }

  // Requirement: always create a matching row when signup also established a session.
  const ensureResult = await ensureUserRow({
    providedAuthUser: { id: userId, email: userEmail ?? null },
  });

  if (!ensureResult.success) {
    console.error("Supabase: ensureUserRow after signUp failed", ensureResult.error);
    throw new SignupAuthError("generic");
  }

  setFreshLogin();

  return {
    userId,
    userEmail,
    requiresEmailConfirmation: false,
  };
}

export async function signInWithEmailPassword({
  email,
  password,
}: {
  email: string;
  password: string;
}) {
  assertSupabaseConfigured();

  const { data, error } = await withTimeout(
    supabase.auth.signInWithPassword({
      email,
      password,
    }),
    15000,
    "Sign in request",
  );

  if (error) {
    const info = toSupabaseErrorInfo(error);
    const isExpectedInvalidCredentials =
      info.code === "invalid_credentials" ||
      /invalid login credentials|invalid email or password/i.test(info.message);

    // Wrong email/password is a normal auth outcome; avoid noisy console errors.
    if (!isExpectedInvalidCredentials) {
      logSupabaseError("Supabase: signIn error", error);
    }
    throw error;
  }

  const signedInUser = data.user ?? data.session?.user ?? null;
  if (!isEmailConfirmed(signedInUser)) {
    await supabase.auth.signOut({ scope: "local" });
    const notConfirmed = Object.assign(new Error("Email not confirmed"), {
      code: "email_not_confirmed",
    });
    throw notConfirmed;
  }

  // Warm gate cache before navigation so EmailConfirmation/Role gates skip getSession().
  seedGateSessionSnapshot(data.session ?? null);

  // Do not block navigation on profile sync (multiple DB round-trips + getUser); runs in background.
  void withTimeout(ensureUserRow({}), 20000, "Post-login user row sync")
    .then((ensureResult) => {
      if (!ensureResult.success) {
        console.error("Supabase: ensureUserRow after signIn failed", ensureResult.error);
      }
    })
    .catch((err) => {
      console.error("Supabase: ensureUserRow after signIn error", err);
    });

  setFreshLogin();

  return data;
}

export type ResendConfirmationResult =
  | { status: "sent" }
  | { status: "rate_limited" }
  | { status: "failed" };

export async function resendSignupConfirmationEmail(
  email: string,
  emailRedirectTo?: string,
): Promise<ResendConfirmationResult> {
  assertSupabaseConfigured();
  const trimmed = email.trim();
  if (!trimmed.includes("@")) {
    return { status: "failed" };
  }

  const redirectTo = emailRedirectTo?.trim();
  const { error } = await withTimeout(
    supabase.auth.resend({
      type: "signup",
      email: trimmed,
      options: redirectTo ? { emailRedirectTo: redirectTo } : undefined,
    }),
    20000,
    "Confirmation email resend",
  );

  if (!error) {
    return { status: "sent" };
  }

  logSupabaseError("Supabase: resend signup confirmation", error);

  const msg = (error.message ?? "").toLowerCase();
  const status =
    typeof (error as { status?: number }).status === "number"
      ? (error as { status: number }).status
      : undefined;

  if (
    status === 429 ||
    msg.includes("rate limit") ||
    msg.includes("too many requests")
  ) {
    return { status: "rate_limited" };
  }

  return { status: "failed" };
}

export async function signOut() {
  assertSupabaseConfigured();

  clearFreshLogin();
  invalidateGateSessionSnapshot();
  // Clear storage first so the app treats the user as signed out even if Supabase hangs (common on mobile Safari).
  clearSupabaseAuthStorage();

  try {
    await withTimeout(
      supabase.auth.signOut({ scope: "local" }),
      2500,
      "Supabase local signOut",
    );
  } catch (err) {
    logSupabaseError("Supabase: local signOut error", err);
    clearSupabaseAuthStorage();
  }

  void withTimeout(supabase.auth.signOut(), 5000, "Supabase global signOut").catch(
    (err) => {
      logSupabaseError("Supabase: global signOut timed out or failed", err);
    },
  );
}

export type RequestPasswordResetEmailResult =
  | { status: "sent" }
  | { status: "rate_limited" }
  | { status: "send_failed" };

/**
 * Sends Supabase's password recovery email (`redirectTo` must be allow-listed in Supabase Auth).
 */
export async function requestPasswordResetEmail(
  email: string,
  redirectTo: string,
): Promise<RequestPasswordResetEmailResult> {
  assertSupabaseConfigured();
  const trimmed = email.trim();
  if (!trimmed) {
    return { status: "send_failed" };
  }

  const { error } = await withTimeout(
    supabase.auth.resetPasswordForEmail(trimmed, { redirectTo }),
    20000,
    "Password reset email",
  );

  if (!error) {
    return { status: "sent" };
  }

  logSupabaseError("Supabase: resetPasswordForEmail", error);

  const msg = (error.message ?? "").toLowerCase();
  const status = typeof (error as { status?: number }).status === "number"
    ? (error as { status: number }).status
    : undefined;

  if (
    status === 429 ||
    msg.includes("rate limit") ||
    msg.includes("too many requests")
  ) {
    return { status: "rate_limited" };
  }

  return { status: "send_failed" };
}

