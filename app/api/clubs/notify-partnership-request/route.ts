import { NextResponse } from "next/server";
import { sendResendEmail } from "@/lib/email/resend.server";
import { clubPartnershipStaffNotifyEmails } from "@/lib/clubs/staffNotifyEmails.server";
import { clubReceivedEmail, defaultContactName, staffPartnershipEmail } from "@/lib/i18n/clubEmailCopy";
import { languagePreferenceForEmail } from "@/lib/i18n/languagePreferenceForEmail";
import { localeFromRequest } from "@/lib/i18n/resolveRequestLocale";
import { createServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
} as const;

const CLUB_PARTNERSHIP_NOTIFY_MESSAGE = "__gn:club_partnership_request_pending__";

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
  let body: { requestId?: string; locale?: string };
  try {
    body = (await request.json()) as { requestId?: string; locale?: string };
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

  const submitterLocale = localeFromRequest(request, body.locale);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://pitchrusch.com";
  const adminUrl = `${siteUrl}/admin/clubs`;
  const clubName = String(req.club_name ?? "Club");
  const clubEmail = String(req.email ?? "").trim().toLowerCase();

  const staffInput = {
    clubName,
    country: String(req.country ?? ""),
    contact: String(req.contact_person ?? ""),
    email: String(req.email ?? ""),
    instagram: String(req.instagram ?? ""),
    website: String(req.website ?? ""),
    estimatedPlayers: req.estimated_players == null ? "" : String(req.estimated_players),
    message: req.message ? String(req.message) : null,
    adminUrl,
  };

  const recipients = clubPartnershipStaffNotifyEmails();
  let staffEmailSent = false;
  let clubEmailSent = false;
  let emailSkipped = false;

  for (const to of recipients) {
    const staffLocale =
      (await languagePreferenceForEmail(service, to)) ?? submitterLocale;
    const staffCopy = await staffPartnershipEmail(staffLocale, staffInput);
    const sent = await sendResendEmail({
      to,
      subject: staffCopy.subject,
      html: staffCopy.html,
      text: staffCopy.text,
    });
    if (sent.ok) {
      staffEmailSent = true;
    } else if (sent.reason === "not_configured") {
      emailSkipped = true;
      console.warn("[clubs/notify-partnership-request] RESEND_API_KEY not set — email skipped");
      break;
    } else {
      console.error("[clubs/notify-partnership-request] staff email failed for", to, sent.message);
    }
  }

  if (!emailSkipped && clubEmail.length > 0) {
    const clubLocale =
      (await languagePreferenceForEmail(service, clubEmail)) ?? submitterLocale;
    const fallbackName = await defaultContactName(clubLocale);
    const contactName = String(req.contact_person ?? "").trim() || fallbackName;
    const clubCopy = await clubReceivedEmail(clubLocale, {
      contactName,
      clubName,
      siteUrl,
    });
    const sentClub = await sendResendEmail({
      to: clubEmail,
      subject: clubCopy.subject,
      html: clubCopy.html,
      text: clubCopy.text,
    });
    if (sentClub.ok) {
      clubEmailSent = true;
    } else if (sentClub.reason === "not_configured") {
      emailSkipped = true;
      console.warn("[clubs/notify-partnership-request] RESEND_API_KEY not set — club email skipped");
    } else {
      console.error("[clubs/notify-partnership-request] club email failed", sentClub.message);
    }
  }

  return NextResponse.json(
    {
      ok: true,
      inAppNotified: inAppCount,
      emailSent: staffEmailSent || clubEmailSent,
      staffEmailSent,
      clubEmailSent,
      emailSkipped,
    },
    { status: 200, headers: JSON_HEADERS },
  );
}
