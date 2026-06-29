import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { sendResendEmail } from "@/lib/email/resend.server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import { isWeeklyChallengeAdminServer } from "@/lib/weeklyChallenges/weeklyChallengeAdminAuth.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
} as const;

type ClubApprovedRow = {
  name: string;
  slug: string;
  club_code: string;
  contact_email: string | null;
  contact_person: string | null;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

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

  let body: { clubId?: string };
  try {
    body = (await request.json()) as { clubId?: string };
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 400, headers: JSON_HEADERS });
  }

  const clubId = body.clubId?.trim();
  if (!clubId) {
    return NextResponse.json({ ok: false, reason: "club_id_required" }, { status: 400, headers: JSON_HEADERS });
  }

  const authClient = createClient<Database>(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: userData, error: userErr } = await authClient.auth.getUser();
  const userId = userData.user?.id;
  const userEmail = userData.user?.email;
  if (userErr || !userId) {
    return NextResponse.json(
      { ok: false, reason: "not_authenticated" },
      { status: 401, headers: JSON_HEADERS },
    );
  }

  const isStaff = await isWeeklyChallengeAdminServer(authClient, userId, userEmail);
  if (!isStaff) {
    return NextResponse.json({ ok: false, reason: "forbidden" }, { status: 403, headers: JSON_HEADERS });
  }

  const service = createServiceRoleClient();
  if (!service) {
    return NextResponse.json(
      { ok: false, reason: "service_role_unconfigured" },
      { status: 503, headers: JSON_HEADERS },
    );
  }

  const { data: row, error } = await service
    .from("clubs")
    .select("name, slug, club_code, contact_email, contact_person")
    .eq("id", clubId)
    .maybeSingle();

  const club = row as ClubApprovedRow | null;
  if (error || !club) {
    console.error("[clubs/notify-club-approved] load failed", error);
    return NextResponse.json({ ok: false, reason: "club_not_found" }, { status: 404, headers: JSON_HEADERS });
  }

  const notifyEmail = club.contact_email?.trim();
  if (!notifyEmail) {
    return NextResponse.json(
      { ok: true, skipped: true, reason: "no_contact_email" },
      { status: 200, headers: JSON_HEADERS },
    );
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://pitchrusch.com";
  const clubName = club.name?.trim() || "Club";
  const inviteCode = club.club_code?.trim() || "";
  const contactName = club.contact_person?.trim() || "there";
  const clubUrl = `${siteUrl}/clubs/${club.slug}`;
  const dashboardUrl = `${siteUrl}/clubs/dashboard?club=${clubId}`;

  const subject = `Your club is on PitchRusch — invite code ${inviteCode}`;
  const text = [
    `Hi ${contactName},`,
    "",
    `Great news — ${clubName} is now set up on PitchRusch.`,
    "",
    `Invite code for your players: ${inviteCode}`,
    "",
    "Share this code with players so they can join your club from their profile.",
    "",
    `Club profile: ${clubUrl}`,
    `Club dashboard: ${dashboardUrl}`,
    "",
    "When you reach 20 approved players you can activate verified partner status.",
    "",
    "— PitchRusch team",
  ].join("\n");

  const html = `
    <p>Hi ${escapeHtml(contactName)},</p>
    <p>Great news — <strong>${escapeHtml(clubName)}</strong> is now set up on PitchRusch.</p>
    <p><strong>Invite code for your players:</strong><br>
    <span style="font-family:monospace;font-size:18px;">${escapeHtml(inviteCode)}</span></p>
    <p>Share this code with players so they can join your club from their profile.</p>
    <ul>
      <li><a href="${escapeHtml(clubUrl)}">View club profile</a></li>
      <li><a href="${escapeHtml(dashboardUrl)}">Open club dashboard</a></li>
    </ul>
    <p>When you reach 20 approved players you can activate verified partner status.</p>
    <p>— PitchRusch team</p>
  `.trim();

  const sent = await sendResendEmail({ to: notifyEmail, subject, html, text });
  if (!sent.ok && sent.reason === "not_configured") {
    console.warn("[clubs/notify-club-approved] RESEND_API_KEY not set — email skipped");
    return NextResponse.json(
      { ok: true, skipped: true, reason: "email_not_configured" },
      { status: 200, headers: JSON_HEADERS },
    );
  }
  if (!sent.ok) {
    console.error("[clubs/notify-club-approved] email failed", sent.message);
    return NextResponse.json(
      { ok: false, reason: "email_send_failed" },
      { status: 502, headers: JSON_HEADERS },
    );
  }

  return NextResponse.json({ ok: true, emailSent: true }, { status: 200, headers: JSON_HEADERS });
}
