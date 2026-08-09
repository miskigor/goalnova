import { NextResponse } from "next/server";
import { sendResendEmail } from "@/lib/email/resend.server";
import { clubPartnershipStaffNotifyEmails } from "@/lib/clubs/staffNotifyEmails.server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
} as const;

const CLUB_PARTNERSHIP_NOTIFY_MESSAGE = "__gn:club_partnership_request_pending__";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function insertStaffInAppNotifications(
  service: NonNullable<ReturnType<typeof createServiceRoleClient>>,
): Promise<number> {
  const { data: staff, error } = await service
    .from("users")
    .select("id, admin_role, is_admin, is_deleted")
    .or("admin_role.in.(super_admin,support_admin),and(is_admin.eq.true,admin_role.is.null)");

  if (error) {
    console.error("[clubs/notify-partnership-request] staff load failed", error);
    return 0;
  }

  const targets = (staff ?? []).filter((row) => {
    if (row.is_deleted) return false;
    if (row.admin_role === "super_admin" || row.admin_role === "support_admin") return true;
    return row.is_admin === true && (row.admin_role == null || row.admin_role === "");
  });

  if (targets.length === 0) return 0;

  const rows = targets.map((u) => ({
    user_id: u.id as string,
    type: "club_partnership",
    message: CLUB_PARTNERSHIP_NOTIFY_MESSAGE,
    // Schema types require related_user_id; self-id is fine for staff alerts.
    related_user_id: u.id as string,
    is_read: false,
  }));

  const { error: insertError } = await service.from("notifications").insert(rows);
  if (insertError) {
    console.error("[clubs/notify-partnership-request] in-app notify failed", insertError);
    return 0;
  }
  return rows.length;
}

export async function POST(request: Request): Promise<NextResponse> {
  let body: { requestId?: string };
  try {
    body = (await request.json()) as { requestId?: string };
  } catch {
    return NextResponse.json({ ok: false, reason: "invalid_json" }, { status: 400, headers: JSON_HEADERS });
  }

  const requestId = body.requestId?.trim();
  if (!requestId) {
    return NextResponse.json({ ok: false, reason: "request_id_required" }, { status: 400, headers: JSON_HEADERS });
  }

  const service = createServiceRoleClient();
  if (!service) {
    return NextResponse.json(
      { ok: false, reason: "service_role_unconfigured" },
      { status: 503, headers: JSON_HEADERS },
    );
  }

  const { data: row, error } = await service
    .from("club_partnership_requests" as "clubs")
    .select(
      "id, club_name, country, contact_person, email, instagram, website, estimated_players, message, status, created_at",
    )
    .eq("id", requestId)
    .maybeSingle();

  const req = row as {
    club_name?: string | null;
    country?: string | null;
    contact_person?: string | null;
    email?: string | null;
    instagram?: string | null;
    website?: string | null;
    estimated_players?: number | null;
    message?: string | null;
  } | null;

  if (error || !req) {
    console.error("[clubs/notify-partnership-request] load failed", error);
    return NextResponse.json({ ok: false, reason: "request_not_found" }, { status: 404, headers: JSON_HEADERS });
  }

  const inAppCount = await insertStaffInAppNotifications(service);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://pitchrusch.com";
  const adminUrl = `${siteUrl}/admin/clubs`;
  const clubName = String(req.club_name ?? "Club");
  const subject = `New club partnership request — ${clubName}`;

  const text = [
    "A new club partnership request was submitted on PitchRusch.",
    "",
    `Club: ${clubName}`,
    `Country: ${req.country ?? "—"}`,
    `Contact: ${req.contact_person ?? "—"}`,
    `Email: ${req.email ?? "—"}`,
    `Instagram: ${req.instagram ?? "—"}`,
    `Website: ${req.website ?? "—"}`,
    `Estimated players: ${req.estimated_players ?? "—"}`,
    "",
    req.message ? `Message:\n${req.message}` : "",
    "",
    `Review and approve: ${adminUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <p>A new <strong>club partnership request</strong> was submitted on PitchRusch.</p>
    <ul>
      <li><strong>Club:</strong> ${escapeHtml(clubName)}</li>
      <li><strong>Country:</strong> ${escapeHtml(String(req.country ?? "—"))}</li>
      <li><strong>Contact:</strong> ${escapeHtml(String(req.contact_person ?? "—"))}</li>
      <li><strong>Email:</strong> ${escapeHtml(String(req.email ?? "—"))}</li>
      <li><strong>Instagram:</strong> ${escapeHtml(String(req.instagram ?? "—"))}</li>
      <li><strong>Website:</strong> ${escapeHtml(String(req.website ?? "—"))}</li>
      <li><strong>Estimated players:</strong> ${escapeHtml(String(req.estimated_players ?? "—"))}</li>
    </ul>
    ${req.message ? `<p><strong>Message:</strong><br>${escapeHtml(String(req.message))}</p>` : ""}
    <p><a href="${escapeHtml(adminUrl)}">Open Admin → Clubs</a> to approve and create the club.</p>
  `.trim();

  const recipients = clubPartnershipStaffNotifyEmails();
  let emailSent = false;
  let emailSkipped = false;

  for (const to of recipients) {
    const sent = await sendResendEmail({ to, subject, html, text });
    if (sent.ok) {
      emailSent = true;
    } else if (sent.reason === "not_configured") {
      emailSkipped = true;
      console.warn("[clubs/notify-partnership-request] RESEND_API_KEY not set — email skipped");
      break;
    } else {
      console.error("[clubs/notify-partnership-request] email failed for", to, sent.message);
    }
  }

  return NextResponse.json(
    {
      ok: true,
      inAppNotified: inAppCount,
      emailSent,
      emailSkipped,
    },
    { status: 200, headers: JSON_HEADERS },
  );
}
