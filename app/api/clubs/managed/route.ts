import { NextResponse } from "next/server";
import {
  authClubUserFromRequest,
  listManagedClubs,
  requireServiceRole,
} from "@/lib/clubs/clubManagerAccess.server";

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

export async function GET(request: Request): Promise<NextResponse> {
  const user = await authClubUserFromRequest(request);
  if (!user) {
    return json({ ok: false, reason: "not_authenticated", clubs: [] }, 401);
  }

  const service = requireServiceRole();
  if (!service) {
    return json({ ok: false, reason: "service_role_unconfigured", clubs: [] }, 503);
  }

  const clubs = await listManagedClubs(service, user);
  return json({ ok: true, clubs }, 200);
}
