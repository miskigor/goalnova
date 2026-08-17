import { NextResponse } from "next/server";
import {
  authClubUserFromRequest,
  requireServiceRole,
  userManagesClub,
} from "@/lib/clubs/clubManagerAccess.server";
import { mapManagedClubProfile } from "@/lib/clubs/managedClubProfile";

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

function trimOrNull(value: unknown, max: number): string | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  return text.slice(0, max);
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

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ ok: false, reason: "invalid_json" }, 400);
  }

  const clubId = String(body.clubId ?? "").trim();
  const name = trimOrNull(body.name, 120);
  if (!clubId) {
    return json({ ok: false, reason: "club_id_required" }, 400);
  }
  if (!name || name.length < 2) {
    return json({ ok: false, reason: "name_required" }, 400);
  }

  if (!(await userManagesClub(service, clubId, user))) {
    return json({ ok: false, reason: "forbidden" }, 403);
  }

  const patch = {
    name,
    city: trimOrNull(body.city, 80),
    country: trimOrNull(body.country, 80),
    website: trimOrNull(body.website, 240),
    instagram: trimOrNull(body.instagram, 80),
    description: trimOrNull(body.description, 2000),
    contact_person: trimOrNull(body.contactPerson, 120),
    organization_kind: String(body.organizationKind ?? "").trim().toLowerCase() === "academy"
      ? "academy"
      : "club",
    updated_at: new Date().toISOString(),
  };

  const selectCols =
    "id, name, slug, logo_url, cover_url, city, country, website, instagram, description, contact_person, contact_email, club_code, organization_kind";

  let { data, error } = await service
    .from("clubs" as never)
    .update(patch as never)
    .eq("id", clubId)
    .select(selectCols)
    .maybeSingle();

  if (error && String(error.message ?? "").includes("organization_kind")) {
    const { organization_kind: _kind, ...withoutKind } = patch as typeof patch & {
      organization_kind?: string;
    };
    const fallback = await service
      .from("clubs" as never)
      .update(withoutKind as never)
      .eq("id", clubId)
      .select(
        "id, name, slug, logo_url, cover_url, city, country, website, instagram, description, contact_person, contact_email, club_code",
      )
      .maybeSingle();
    data = fallback.data;
    error = fallback.error;
  }

  if (error || !data) {
    console.error("[clubs/update-profile]", error);
    return json({ ok: false, reason: "save_failed" }, 502);
  }

  return json({ ok: true, club: mapManagedClubProfile(data as Record<string, unknown>) }, 200);
}
