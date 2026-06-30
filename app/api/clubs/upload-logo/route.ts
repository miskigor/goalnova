import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {
  CLUB_LOGO_BUCKET,
  buildClubLogoObjectPath,
  storageObjectPathFromClubLogoUrl,
  validateClubLogoFile,
} from "@/lib/storage/clubLogo";
import { createServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

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

async function authClientFromRequest(request: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anon) return null;

  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";
  if (!token) return null;

  const client = createClient<Database>(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data, error } = await client.auth.getUser();
  if (error || !data.user?.id) return null;

  return { client, userId: data.user.id };
}

async function userCanManageClub(
  client: ReturnType<typeof createClient<Database>>,
  clubId: string,
  userId: string,
): Promise<boolean> {
  const { data, error } = await client.rpc("goalnova_club_user_can_manage", {
    p_club_id: clubId,
    p_user_id: userId,
  });
  if (error) {
    console.error("[clubs/upload-logo] goalnova_club_user_can_manage", error);
    return false;
  }
  return Boolean(data);
}

export async function POST(request: Request): Promise<NextResponse> {
  const auth = await authClientFromRequest(request);
  if (!auth) {
    return json({ ok: false, reason: "not_authenticated" }, 401);
  }

  const service = createServiceRoleClient();
  if (!service) {
    return json({ ok: false, reason: "service_role_unconfigured" }, 503);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, reason: "invalid_form" }, 400);
  }

  const clubId = String(form.get("clubId") ?? "").trim();
  const file = form.get("file");
  const previousLogoUrl = String(form.get("previousLogoUrl") ?? "").trim() || null;

  if (!clubId) {
    return json({ ok: false, reason: "club_id_required" }, 400);
  }
  if (!(file instanceof File)) {
    return json({ ok: false, reason: "file_required" }, 400);
  }

  const validation = validateClubLogoFile(file);
  if (validation === "type") {
    return json({ ok: false, reason: "invalid_type" }, 400);
  }
  if (validation === "size") {
    return json({ ok: false, reason: "file_too_large" }, 400);
  }

  if (!(await userCanManageClub(auth.client, clubId, auth.userId))) {
    return json({ ok: false, reason: "forbidden" }, 403);
  }

  const path = buildClubLogoObjectPath(clubId, file);
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { data: uploaded, error: uploadError } = await service.storage
    .from(CLUB_LOGO_BUCKET)
    .upload(path, bytes, {
      upsert: true,
      cacheControl: "3600",
      contentType: file.type || "image/jpeg",
    });

  if (uploadError || !uploaded?.path) {
    console.error("[clubs/upload-logo] storage.upload", uploadError);
    const message = String(uploadError?.message ?? "").toLowerCase();
    if (message.includes("bucket not found")) {
      return json({ ok: false, reason: "bucket_not_found" }, 503);
    }
    return json({ ok: false, reason: "upload_failed" }, 502);
  }

  const { data: pub } = service.storage.from(CLUB_LOGO_BUCKET).getPublicUrl(uploaded.path);
  const publicUrl = pub.publicUrl;

  const { data: updateData, error: updateError } = await auth.client.rpc("goalnova_club_update_logo", {
    p_club_id: clubId,
    p_logo_url: publicUrl,
  });

  if (updateError || !(updateData as { ok?: boolean })?.ok) {
    console.error("[clubs/upload-logo] goalnova_club_update_logo", updateError, updateData);
    await service.storage.from(CLUB_LOGO_BUCKET).remove([uploaded.path]);
    return json({ ok: false, reason: "save_failed" }, 502);
  }

  if (previousLogoUrl) {
    const oldPath = storageObjectPathFromClubLogoUrl(previousLogoUrl);
    if (oldPath && oldPath !== uploaded.path) {
      await service.storage.from(CLUB_LOGO_BUCKET).remove([oldPath]);
    }
  }

  return json({ ok: true, logoUrl: publicUrl }, 200);
}

export async function DELETE(request: Request): Promise<NextResponse> {
  const auth = await authClientFromRequest(request);
  if (!auth) {
    return json({ ok: false, reason: "not_authenticated" }, 401);
  }

  const service = createServiceRoleClient();
  if (!service) {
    return json({ ok: false, reason: "service_role_unconfigured" }, 503);
  }

  let body: { clubId?: string; logoUrl?: string | null };
  try {
    body = (await request.json()) as { clubId?: string; logoUrl?: string | null };
  } catch {
    return json({ ok: false, reason: "invalid_json" }, 400);
  }

  const clubId = body.clubId?.trim();
  if (!clubId) {
    return json({ ok: false, reason: "club_id_required" }, 400);
  }

  if (!(await userCanManageClub(auth.client, clubId, auth.userId))) {
    return json({ ok: false, reason: "forbidden" }, 403);
  }

  const { data: updateData, error: updateError } = await auth.client.rpc("goalnova_club_update_logo", {
    p_club_id: clubId,
    p_logo_url: null,
  });

  if (updateError || !(updateData as { ok?: boolean })?.ok) {
    console.error("[clubs/upload-logo] remove goalnova_club_update_logo", updateError, updateData);
    return json({ ok: false, reason: "save_failed" }, 502);
  }

  const logoUrl = body.logoUrl?.trim();
  if (logoUrl) {
    const oldPath = storageObjectPathFromClubLogoUrl(logoUrl);
    if (oldPath) {
      await service.storage.from(CLUB_LOGO_BUCKET).remove([oldPath]);
    }
  }

  return json({ ok: true, logoUrl: null }, 200);
}
