import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import { BOOTSTRAP_ADMIN_EMAILS } from "@/lib/admin/bootstrapAdminEmails";
import { WELCOME_INBOX_MESSAGE_TOKEN } from "@/lib/messages/welcomeInboxMessage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
} as const;

function rpcOk(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const o = data as Record<string, unknown>;
  return o.ok === true || o.ok === "true";
}

function rpcReason(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  return String((data as { reason?: unknown }).reason ?? "");
}

/**
 * Authenticated: deliver the one-time welcome inbox DM via service role.
 */
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

  // Ensure bootstrap owner can act as welcome sender (idempotent).
  await service
    .from("users")
    .update({
      is_admin: true,
      admin_role: "super_admin",
    })
    .in("email", [...BOOTSTRAP_ADMIN_EMAILS]);

  const { data: rpcData, error: rpcError } = await service.rpc(
    "goalnova_send_welcome_inbox_message",
    { p_user_id: userId },
  );

  if (!rpcError && rpcOk(rpcData)) {
    return NextResponse.json(
      { ok: true, via: "rpc", data: rpcData },
      { status: 200, headers: JSON_HEADERS },
    );
  }

  const reason = rpcReason(rpcData);
  if (reason === "already_sent") {
    return NextResponse.json(
      { ok: true, via: "rpc", data: rpcData },
      { status: 200, headers: JSON_HEADERS },
    );
  }

  // Fallback: insert welcome DM directly if RPC missing sender / unavailable.
  const { data: existing } = await service
    .from("messages")
    .select("id")
    .eq("receiver_id", userId)
    .eq("message", WELCOME_INBOX_MESSAGE_TOKEN)
    .limit(1)
    .maybeSingle();

  if (existing?.id) {
    return NextResponse.json(
      { ok: true, via: "existing", message_id: existing.id },
      { status: 200, headers: JSON_HEADERS },
    );
  }

  const [{ data: staffRows }, { data: bootstrapRows }] = await Promise.all([
    service
      .from("users")
      .select("id, email, admin_role, is_admin")
      .neq("id", userId)
      .or("admin_role.eq.super_admin,is_admin.eq.true")
      .limit(20),
    service
      .from("users")
      .select("id, email, admin_role, is_admin")
      .in("email", [...BOOTSTRAP_ADMIN_EMAILS])
      .neq("id", userId)
      .limit(5),
  ]);

  const candidates = [...(staffRows ?? []), ...(bootstrapRows ?? [])];
  const seen = new Set<string>();
  const unique = candidates.filter((r) => {
    if (!r.id || seen.has(r.id)) return false;
    seen.add(r.id);
    return true;
  });

  const sender =
    unique.find((r) => r.admin_role === "super_admin") ??
    unique.find((r) => r.is_admin) ??
    unique[0] ??
    null;

  if (!sender?.id) {
    return NextResponse.json(
      {
        ok: false,
        reason: "no_sender",
        rpc: rpcData ?? null,
        rpc_error: rpcError?.message ?? null,
      },
      { status: 503, headers: JSON_HEADERS },
    );
  }

  const { data: inserted, error: insertErr } = await service
    .from("messages")
    .insert({
      sender_id: sender.id,
      receiver_id: userId,
      message: WELCOME_INBOX_MESSAGE_TOKEN,
    })
    .select("id")
    .single();

  if (insertErr || !inserted?.id) {
    return NextResponse.json(
      {
        ok: false,
        reason: "insert_failed",
        detail: insertErr?.message ?? null,
      },
      { status: 500, headers: JSON_HEADERS },
    );
  }

  // Best-effort: mark delivery via RPC retry (idempotent once message exists).
  await service.rpc("goalnova_send_welcome_inbox_message", {
    p_user_id: userId,
  });

  return NextResponse.json(
    {
      ok: true,
      via: "fallback_insert",
      message_id: inserted.id,
      sender_id: sender.id,
    },
    { status: 200, headers: JSON_HEADERS },
  );
}
