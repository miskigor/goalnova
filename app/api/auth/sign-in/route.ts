import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {
  confirmAuthUserEmailByEmail,
  confirmAuthUserEmailById,
  isEmailNotConfirmedAuthError,
  userNeedsEmailConfirmation,
} from "@/lib/auth/confirmAuthUserEmail.server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
} as const;

function createAnonClient(url: string, anon: string) {
  return createClient<Database>(url, anon, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon) {
    return NextResponse.json(
      {
        error: {
          message: "Supabase is not configured on the server.",
          code: "config",
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
      { error: { message: "Invalid request body.", code: "invalid_request" } },
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

  if (!email || !password) {
    return NextResponse.json(
      { error: { message: "Email and password are required.", code: "invalid_request" } },
      { status: 400, headers: JSON_HEADERS },
    );
  }

  const client = createAnonClient(url, anon);

  let { data, error } = await client.auth.signInWithPassword({ email, password });

  if (error && isEmailNotConfirmedAuthError(error)) {
    const admin = createServiceRoleClient();
    if (admin) {
      const confirmed = await confirmAuthUserEmailByEmail(admin, email);
      if (confirmed) {
        const retry = await client.auth.signInWithPassword({ email, password });
        data = retry.data;
        error = retry.error;
      }
    }
  }

  if (error) {
    const status =
      typeof error.status === "number" && error.status >= 400 ? error.status : 400;
    return NextResponse.json(
      {
        error: {
          message: error.message,
          code: error.code ?? null,
          status: error.status ?? null,
        },
      },
      { status, headers: JSON_HEADERS },
    );
  }

  if (!data.session) {
    return NextResponse.json(
      {
        error: {
          message: "Sign-in succeeded but no session was returned.",
          code: "no_session",
        },
      },
      { status: 500, headers: JSON_HEADERS },
    );
  }

  let user = data.user;
  if (userNeedsEmailConfirmation(user)) {
    const admin = createServiceRoleClient();
    if (admin && user?.id) {
      await confirmAuthUserEmailById(admin, user.id);
      const refreshed = await client.auth.signInWithPassword({ email, password });
      if (refreshed.data.session) {
        data = refreshed.data;
        user = refreshed.data.user;
      }
    }
  }

  return NextResponse.json(
    {
      session: data.session,
      user,
    },
    { headers: JSON_HEADERS },
  );
}
