import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { sendResendEmail } from "@/lib/email/resend.server";
import {
  buildPasswordResetEmail,
  isAllowedPasswordResetRedirect,
} from "@/lib/auth/passwordResetEmail.server";
import { hrefWithLocale } from "@/i18n/routing";
import { resolveAppLocale } from "@/lib/i18n/resolveRequestLocale";
import { isBootstrapAdminEmail } from "@/lib/admin/bootstrapAdminEmails";
import { createServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
} as const;

type Body = { userId?: string; locale?: string };

export async function POST(request: Request): Promise<NextResponse> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon) {
    return NextResponse.json(
      { ok: false, reason: "server_config" },
      { status: 500, headers: JSON_HEADERS },
    );
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";
  if (!token) {
    return NextResponse.json(
      { ok: false, reason: "not_authenticated" },
      { status: 401, headers: JSON_HEADERS },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json(
      { ok: false, reason: "invalid_body" },
      { status: 400, headers: JSON_HEADERS },
    );
  }

  const targetUserId = typeof body.userId === "string" ? body.userId.trim() : "";
  if (!targetUserId) {
    return NextResponse.json(
      { ok: false, reason: "missing_user_id" },
      { status: 400, headers: JSON_HEADERS },
    );
  }

  const authClient = createClient<Database>(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: actorData, error: actorErr } = await authClient.auth.getUser();
  const actorId = actorData.user?.id;
  const actorEmail = actorData.user?.email;
  if (actorErr || !actorId) {
    return NextResponse.json(
      { ok: false, reason: "not_authenticated" },
      { status: 401, headers: JSON_HEADERS },
    );
  }

  const { data: actorRow } = await authClient
    .from("users")
    .select("admin_role, is_admin")
    .eq("id", actorId)
    .maybeSingle();
  const actorRole = actorRow?.admin_role?.trim() ?? "";
  const isStaff =
    isBootstrapAdminEmail(actorEmail) ||
    actorRole === "super_admin" ||
    actorRole === "support_admin" ||
    (actorRow?.is_admin === true && actorRole === "");
  if (!isStaff) {
    return NextResponse.json(
      { ok: false, reason: "forbidden" },
      { status: 403, headers: JSON_HEADERS },
    );
  }

  const service = createServiceRoleClient();
  if (!service) {
    return NextResponse.json(
      { ok: false, reason: "service_role_unconfigured" },
      { status: 503, headers: JSON_HEADERS },
    );
  }

  const { data: target, error: targetErr } = await service
    .from("users")
    .select("email")
    .eq("id", targetUserId)
    .maybeSingle();

  const email = target?.email?.trim().toLowerCase() ?? "";
  if (targetErr || !email) {
    return NextResponse.json(
      { ok: false, reason: "no_email" },
      { status: 400, headers: JSON_HEADERS },
    );
  }

  const locale = resolveAppLocale(body.locale);
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    "https://pitchrusch.com"
  ).replace(/\/$/, "");
  const redirectTo = `${siteUrl}${hrefWithLocale("/reset-password", locale)}`;
  if (!isAllowedPasswordResetRedirect(redirectTo)) {
    return NextResponse.json(
      { ok: false, reason: "invalid_redirect" },
      { status: 500, headers: JSON_HEADERS },
    );
  }

  const { data, error } = await service.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo },
  });

  if (error) {
    console.error("[admin/send-password-reset] generateLink failed", error.message, error);
    return NextResponse.json(
      { ok: false, reason: "generate_failed" },
      { status: 502, headers: JSON_HEADERS },
    );
  }

  const resetLink =
    typeof data?.properties?.action_link === "string" ? data.properties.action_link.trim() : "";
  if (!resetLink) {
    return NextResponse.json(
      { ok: false, reason: "no_link" },
      { status: 502, headers: JSON_HEADERS },
    );
  }

  const mail = buildPasswordResetEmail({ resetLink, email });
  const sent = await sendResendEmail({
    to: email,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
  });

  return NextResponse.json(
    {
      ok: true,
      email,
      resetLink,
      emailSent: sent.ok,
      emailSkipped: sent.ok ? false : sent.reason === "not_configured",
    },
    { status: 200, headers: JSON_HEADERS },
  );
}
