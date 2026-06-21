import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
} as const;

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

  const { error: softErr } = await service
    .from("users")
    .update({ is_deleted: true })
    .eq("id", userId);

  if (softErr) {
    console.error("[account/delete] users.is_deleted update failed", softErr);
  }

  const { error: trialClaimErr } = await service.rpc(
    "goalnova_record_welcome_trial_email_if_used",
    { p_user_id: userId },
  );
  if (trialClaimErr) {
    console.error("[account/delete] welcome trial email claim failed", trialClaimErr);
  }

  const { error: deleteErr } = await service.auth.admin.deleteUser(userId);
  if (deleteErr) {
    console.error("[account/delete] auth.admin.deleteUser failed", deleteErr);
    return NextResponse.json(
      { ok: false, reason: "delete_failed", message: deleteErr.message },
      { status: 500, headers: JSON_HEADERS },
    );
  }

  return NextResponse.json({ ok: true }, { headers: JSON_HEADERS });
}
