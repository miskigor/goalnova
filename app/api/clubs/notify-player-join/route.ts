import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { sendResendEmail } from "@/lib/email/resend.server";
import { playerJoinEmail } from "@/lib/i18n/clubEmailCopy";
import { languagePreferenceForEmail } from "@/lib/i18n/languagePreferenceForEmail";
import { localeFromRequest } from "@/lib/i18n/resolveRequestLocale";
import { createServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
} as const;

type MembershipRow = {
  id: string;
  club_id: string;
  user_id: string;
  status: string;
  created_at: string;
};

type ClubNotifyRow = {
  name: string;
  contact_email: string | null;
  contact_person: string | null;
  club_code: string;
};

type Body = {
  clubId?: string;
  membershipId?: string;
  locale?: string;
};

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
  if (userErr || !userId) {
    return NextResponse.json(
      { ok: false, reason: "not_authenticated" },
      { status: 401, headers: JSON_HEADERS },
    );
  }

  const service = createServiceRoleClient();
  if (!service) {
    return NextResponse.json(
      { ok: false, reason: "service_role_unconfigured" },
      { status: 503, headers: JSON_HEADERS },
    );
  }

  const membershipQuery = service
    .from("club_memberships" as "clubs")
    .select("id, club_id, user_id, status, created_at")
    .eq("club_id", clubId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1);

  const membershipResult = body.membershipId?.trim()
    ? await service
        .from("club_memberships" as "clubs")
        .select("id, club_id, user_id, status, created_at")
        .eq("id", body.membershipId.trim())
        .eq("user_id", userId)
        .maybeSingle()
    : await membershipQuery.maybeSingle();

  const membership = (membershipResult.data ?? null) as MembershipRow | null;
  if (!membership || membership.club_id !== clubId) {
    return NextResponse.json({ ok: false, reason: "membership_not_found" }, { status: 404, headers: JSON_HEADERS });
  }

  const [clubRes, profileRes, userRes] = await Promise.all([
    service.from("clubs").select("name, contact_email, contact_person, club_code").eq("id", clubId).maybeSingle(),
    service
      .from("player_profiles")
      .select("full_name, username, country")
      .eq("id", userId)
      .maybeSingle(),
    service.from("users").select("email").eq("id", userId).maybeSingle(),
  ]);

  const club = clubRes.data as ClubNotifyRow | null;
  if (!club) {
    return NextResponse.json({ ok: false, reason: "club_not_found" }, { status: 404, headers: JSON_HEADERS });
  }

  const notifyEmail = club.contact_email?.trim();
  if (!notifyEmail) {
    return NextResponse.json(
      { ok: true, skipped: true, reason: "no_contact_email" },
      { status: 200, headers: JSON_HEADERS },
    );
  }

  const requestLocale = localeFromRequest(request, body.locale);
  const locale =
    (await languagePreferenceForEmail(service, notifyEmail)) ?? requestLocale;
  const playerName =
    profileRes.data?.full_name?.trim() ||
    profileRes.data?.username?.trim() ||
    userRes.data?.email?.split("@")[0]?.trim() ||
    "Player";
  const username = profileRes.data?.username?.trim() || "—";
  const country = profileRes.data?.country?.trim() || "—";
  const playerEmail = userRes.data?.email?.trim() || "—";
  const clubName = club.name?.trim() || "Club";
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://pitchrusch.com";
  const dashboardUrl = `${siteUrl}/clubs/dashboard?club=${clubId}`;

  const copy = await playerJoinEmail(locale, {
    clubName,
    playerName,
    username,
    country,
    playerEmail,
    status: String(membership.status),
    dashboardUrl,
  });

  const sent = await sendResendEmail({
    to: notifyEmail,
    subject: copy.subject,
    html: copy.html,
    text: copy.text,
  });
  if (!sent.ok && sent.reason === "not_configured") {
    console.warn("[clubs/notify-player-join] RESEND_API_KEY not set — email skipped");
    return NextResponse.json(
      { ok: true, skipped: true, reason: "email_not_configured" },
      { status: 200, headers: JSON_HEADERS },
    );
  }
  if (!sent.ok) {
    console.error("[clubs/notify-player-join] email failed", sent.message);
    return NextResponse.json(
      { ok: false, reason: "email_send_failed" },
      { status: 502, headers: JSON_HEADERS },
    );
  }

  return NextResponse.json({ ok: true, emailSent: true }, { status: 200, headers: JSON_HEADERS });
}
