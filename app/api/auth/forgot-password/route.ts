import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { sendResendEmail } from "@/lib/email/resend.server";
import {
  buildPasswordResetEmail,
  isAllowedPasswordResetRedirect,
  isPasswordRecoveryEmailSendFailure,
  isPasswordRecoveryUserNotFound,
} from "@/lib/auth/passwordResetEmail.server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
} as const;

type AnonClient = SupabaseClient<Database>;

type ResetStatus = "sent" | "rate_limited" | "send_failed";

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

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isRateLimited(error: { message?: string; status?: number; code?: string }): boolean {
  const msg = (error.message ?? "").toLowerCase();
  const code = (error.code ?? "").toLowerCase();
  return (
    error.status === 429 ||
    code === "over_request_rate_limit" ||
    msg.includes("rate limit") ||
    msg.includes("too many requests")
  );
}

function jsonStatus(status: ResetStatus, httpStatus = 200): NextResponse {
  return NextResponse.json({ status }, { status: httpStatus, headers: JSON_HEADERS });
}

async function sendRecoveryViaResend(
  email: string,
  redirectTo: string,
): Promise<ResetStatus> {
  const admin = createServiceRoleClient();
  if (!admin) return "send_failed";

  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo },
  });

  if (error) {
    if (isPasswordRecoveryUserNotFound(error)) {
      return "sent";
    }
    if (isRateLimited(error)) {
      return "rate_limited";
    }
    console.error("[forgot-password] generateLink failed", error.message, error);
    return "send_failed";
  }

  const resetLink =
    typeof data?.properties?.action_link === "string"
      ? data.properties.action_link
      : "";

  if (!resetLink) {
    console.error("[forgot-password] generateLink returned no action_link");
    return "send_failed";
  }

  const mail = buildPasswordResetEmail({ resetLink, email });
  const sent = await sendResendEmail({
    to: email,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
  });

  if (sent.ok) return "sent";
  if (sent.reason === "not_configured") {
    console.warn("[forgot-password] RESEND_API_KEY not set — cannot send recovery email");
  } else {
    console.error("[forgot-password] Resend send failed", sent.message ?? sent.reason);
  }
  return "send_failed";
}

async function sendRecoveryViaSupabaseAuth(
  email: string,
  redirectTo: string,
): Promise<ResetStatus> {
  const anon = createAnonAuthClient();
  if (!anon) return "send_failed";

  const { error } = await anon.auth.resetPasswordForEmail(email, { redirectTo });
  if (!error) return "sent";
  if (isRateLimited(error)) return "rate_limited";
  if (isPasswordRecoveryEmailSendFailure(error)) return "send_failed";

  console.error("[forgot-password] resetPasswordForEmail failed", error.message, error);
  return "send_failed";
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ status: "send_failed" satisfies ResetStatus }, {
      status: 400,
      headers: JSON_HEADERS,
    });
  }

  const o = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const email = typeof o.email === "string" ? o.email.trim().toLowerCase() : "";
  const redirectTo = typeof o.redirectTo === "string" ? o.redirectTo.trim() : "";

  if (!email || !isValidEmail(email)) {
    return jsonStatus("send_failed", 400);
  }
  if (!redirectTo || !isAllowedPasswordResetRedirect(redirectTo)) {
    return jsonStatus("send_failed", 400);
  }

  const resendConfigured = Boolean(process.env.RESEND_API_KEY?.trim());
  const status = resendConfigured
    ? await sendRecoveryViaResend(email, redirectTo)
    : await sendRecoveryViaSupabaseAuth(email, redirectTo);

  return jsonStatus(status);
}
