import { NextResponse } from "next/server";
import {
  authClubUserFromRequest,
  requireServiceRole,
  userManagesClub,
} from "@/lib/clubs/clubManagerAccess.server";
import {
  syncClubMemberPremiumForClub,
  syncClubMemberPremiumForUser,
} from "@/lib/clubs/syncClubMemberPremium.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JSON_HEADERS = {
  "Cache-Control": "no-store",
} as const;

function json(body: Record<string, unknown>, status: number): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { ...JSON_HEADERS, "Content-Type": "application/json; charset=utf-8" },
  });
}

export async function POST(request: Request): Promise<NextResponse> {
  const user = await authClubUserFromRequest(request);
  if (!user) {
    return json({ ok: false, reason: "not_authenticated" }, 401);
  }

  const service = requireServiceRole();
  if (!service) {
    return json({ ok: false, reason: "service_role_unconfigured" }, 503);
  }

  let body: Record<string, unknown> = {};
  try {
    const text = await request.text();
    if (text.trim()) body = JSON.parse(text) as Record<string, unknown>;
  } catch {
    return json({ ok: false, reason: "invalid_json" }, 400);
  }

  const clubId = String(body.clubId ?? "").trim();
  if (clubId) {
    if (!(await userManagesClub(service, clubId, user))) {
      return json({ ok: false, reason: "forbidden" }, 403);
    }
    const result = await syncClubMemberPremiumForClub(service, clubId);
    return json({ ok: true, ...result }, 200);
  }

  const result = await syncClubMemberPremiumForUser(service, user.userId);
  return json({ ok: true, ...result }, 200);
}
