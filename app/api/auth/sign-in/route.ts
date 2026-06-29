import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
} as const;

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

  const client = createClient<Database>(url, anon, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await client.auth.signInWithPassword({ email, password });

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

  return NextResponse.json(
    {
      session: data.session,
      user: data.user,
    },
    { headers: JSON_HEADERS },
  );
}
