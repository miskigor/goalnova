import { NextResponse } from "next/server";
import {
  CLUB_LOGO_BUCKET,
  buildClubCoverObjectPath,
  buildClubLogoObjectPath,
  storageObjectPathFromClubLogoUrl,
  validateClubLogoFile,
} from "@/lib/storage/clubLogo";
import {
  authClubUserFromRequest,
  requireServiceRole,
  userManagesClub,
} from "@/lib/clubs/clubManagerAccess.server";
import { ensureClubLogosBucket } from "@/lib/storage/ensureClubLogosBucket.server";

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

function parseKind(value: unknown): "logo" | "cover" {
  return String(value ?? "").trim().toLowerCase() === "cover" ? "cover" : "logo";
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

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, reason: "invalid_form" }, 400);
  }

  const clubId = String(form.get("clubId") ?? "").trim();
  const file = form.get("file");
  const kind = parseKind(form.get("kind"));
  const previousUrl = String(form.get("previousUrl") ?? form.get("previousLogoUrl") ?? "").trim() || null;

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

  if (!(await userManagesClub(service, clubId, user))) {
    return json({ ok: false, reason: "forbidden" }, 403);
  }

  const bucketReady = await ensureClubLogosBucket(service);
  if (!bucketReady.ok) {
    console.error("[clubs/upload-logo] ensureClubLogosBucket", bucketReady.error);
    return json({ ok: false, reason: "bucket_not_found" }, 503);
  }

  const path =
    kind === "cover" ? buildClubCoverObjectPath(clubId, file) : buildClubLogoObjectPath(clubId, file);
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
  const column = kind === "cover" ? "cover_url" : "logo_url";

  const { error: updateError } = await service
    .from("clubs" as never)
    .update({ [column]: publicUrl, updated_at: new Date().toISOString() } as never)
    .eq("id", clubId);

  if (updateError) {
    console.error("[clubs/upload-logo] clubs update", updateError);
    await service.storage.from(CLUB_LOGO_BUCKET).remove([uploaded.path]);
    return json({ ok: false, reason: "save_failed" }, 502);
  }

  if (previousUrl) {
    const oldPath = storageObjectPathFromClubLogoUrl(previousUrl);
    if (oldPath && oldPath !== uploaded.path) {
      await service.storage.from(CLUB_LOGO_BUCKET).remove([oldPath]);
    }
  }

  return json(
    kind === "cover" ? { ok: true, coverUrl: publicUrl } : { ok: true, logoUrl: publicUrl },
    200,
  );
}

export async function DELETE(request: Request): Promise<NextResponse> {
  const user = await authClubUserFromRequest(request);
  if (!user) {
    return json({ ok: false, reason: "not_authenticated" }, 401);
  }

  const service = requireServiceRole();
  if (!service) {
    return json({ ok: false, reason: "service_role_unconfigured" }, 503);
  }

  let body: { clubId?: string; logoUrl?: string | null; coverUrl?: string | null; kind?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ ok: false, reason: "invalid_json" }, 400);
  }

  const clubId = body.clubId?.trim();
  if (!clubId) {
    return json({ ok: false, reason: "club_id_required" }, 400);
  }

  if (!(await userManagesClub(service, clubId, user))) {
    return json({ ok: false, reason: "forbidden" }, 403);
  }

  const kind = parseKind(body.kind ?? (body.coverUrl ? "cover" : "logo"));
  const column = kind === "cover" ? "cover_url" : "logo_url";
  const previousUrl = (kind === "cover" ? body.coverUrl : body.logoUrl)?.trim() || null;

  const { error: updateError } = await service
    .from("clubs" as never)
    .update({ [column]: null, updated_at: new Date().toISOString() } as never)
    .eq("id", clubId);

  if (updateError) {
    console.error("[clubs/upload-logo] remove clubs update", updateError);
    return json({ ok: false, reason: "save_failed" }, 502);
  }

  if (previousUrl) {
    const oldPath = storageObjectPathFromClubLogoUrl(previousUrl);
    if (oldPath) {
      await service.storage.from(CLUB_LOGO_BUCKET).remove([oldPath]);
    }
  }

  return json(kind === "cover" ? { ok: true, coverUrl: null } : { ok: true, logoUrl: null }, 200);
}
