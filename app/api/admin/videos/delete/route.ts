import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { canModerateVideosClient } from "@/lib/supabase/adminAuthServer";
import { deleteVideoCascadeServer } from "@/lib/supabase/adminDeleteVideoCascade.server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
} as const;

type Body = { videoId?: string };

export async function POST(request: Request): Promise<NextResponse> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon) {
    return NextResponse.json(
      { ok: false, reason: "server_config" },
      { status: 500, headers: JSON_HEADERS },
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

  const videoId = typeof body.videoId === "string" ? body.videoId.trim() : "";
  if (!videoId) {
    return NextResponse.json(
      { ok: false, reason: "missing_video_id" },
      { status: 400, headers: JSON_HEADERS },
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

  const authClient = createClient<Database>(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data: actorData, error: actorErr } = await authClient.auth.getUser();
  const actorId = actorData.user?.id;
  const actorEmail = actorData.user?.email ?? null;
  if (actorErr || !actorId) {
    return NextResponse.json(
      { ok: false, reason: "not_authenticated" },
      { status: 401, headers: JSON_HEADERS },
    );
  }

  if (!(await canModerateVideosClient(authClient, actorId, actorEmail))) {
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

  const result = await deleteVideoCascadeServer(service, videoId);
  if (!result.ok) {
    if (result.reason === "not_found") {
      return NextResponse.json(
        { ok: false, reason: "not_found" },
        { status: 404, headers: JSON_HEADERS },
      );
    }
    console.error("[admin/videos/delete] cascade delete failed", result.message);
    return NextResponse.json(
      { ok: false, reason: "delete_failed", message: result.message },
      { status: 500, headers: JSON_HEADERS },
    );
  }

  await service.from("admin_audit_log").insert({
    admin_user_id: actorId,
    target_user_id: result.ownerUserId,
    action: "delete_video",
    details: { video_id: videoId },
  });

  return NextResponse.json({ ok: true }, { headers: JSON_HEADERS });
}
