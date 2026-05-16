import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { isSuperAdminClient } from "@/lib/supabase/adminAuthServer";
import { createServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
} as const;

type Body = { userId?: string };

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

  const targetUserId = typeof body.userId === "string" ? body.userId.trim() : "";
  if (!targetUserId) {
    return NextResponse.json(
      { ok: false, reason: "missing_user_id" },
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
  if (actorErr || !actorId) {
    return NextResponse.json(
      { ok: false, reason: "not_authenticated" },
      { status: 401, headers: JSON_HEADERS },
    );
  }

  if (!(await isSuperAdminClient(authClient, actorId))) {
    return NextResponse.json(
      { ok: false, reason: "forbidden" },
      { status: 403, headers: JSON_HEADERS },
    );
  }

  if (targetUserId === actorId) {
    return NextResponse.json(
      { ok: false, reason: "cannot_delete_self" },
      { status: 400, headers: JSON_HEADERS },
    );
  }

  if (await isSuperAdminClient(authClient, targetUserId)) {
    return NextResponse.json(
      { ok: false, reason: "cannot_delete_super_admin" },
      { status: 400, headers: JSON_HEADERS },
    );
  }

  const service = createServiceRoleClient();
  if (!service) {
    return NextResponse.json(
      { ok: false, reason: "service_role_unconfigured" },
      { status: 503, headers: JSON_HEADERS },
    );
  }

  const { data: targetRow } = await service
    .from("users")
    .select("email")
    .eq("id", targetUserId)
    .maybeSingle();

  await service.from("admin_audit_log").insert({
    admin_user_id: actorId,
    target_user_id: targetUserId,
    action: "hard_delete_user",
    details: { email: targetRow?.email ?? null },
  });

  const { error: deleteErr } = await service.auth.admin.deleteUser(targetUserId);
  if (deleteErr) {
    console.error("[admin/users/delete] auth.admin.deleteUser failed", deleteErr);
    return NextResponse.json(
      { ok: false, reason: "delete_failed", message: deleteErr.message },
      { status: 500, headers: JSON_HEADERS },
    );
  }

  return NextResponse.json({ ok: true }, { headers: JSON_HEADERS });
}
