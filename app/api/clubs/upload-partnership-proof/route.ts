import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import {
  CLUB_VERIFICATION_DOCUMENTS_BUCKET,
  buildClubProofStoragePath,
  inferClubProofContentType,
  validateClubProofFile,
} from "@/lib/storage/clubProof";
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

async function authUserIdFromRequest(request: Request): Promise<string | null> {
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
  return data.user.id;
}

/** Upload partnership proof (authenticated). */
export async function POST(request: Request): Promise<NextResponse> {
  const userId = await authUserIdFromRequest(request);
  if (!userId) {
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

  const file = form.get("file");
  if (!(file instanceof File)) {
    return json({ ok: false, reason: "file_required" }, 400);
  }

  const validated = validateClubProofFile(file);
  if (!validated.ok) {
    return json({ ok: false, reason: validated.error }, 400);
  }

  const contentType = inferClubProofContentType(validated.file);
  const path = buildClubProofStoragePath(userId, validated.file.name);
  const body = new File([validated.file], validated.file.name, {
    type: contentType,
    lastModified: validated.file.lastModified,
  });

  const { error: uploadError } = await service.storage
    .from(CLUB_VERIFICATION_DOCUMENTS_BUCKET)
    .upload(path, body, { contentType, upsert: false });

  if (uploadError) {
    console.error("[clubs/upload-partnership-proof] upload failed", uploadError);
    const msg = (uploadError.message ?? "").toLowerCase();
    const reason =
      msg.includes("bucket") || msg.includes("not found")
        ? "bucket_missing"
        : "upload_failed";
    return json({ ok: false, reason, message: uploadError.message }, 502);
  }

  return json({
    ok: true,
    path,
    fileName: validated.file.name,
  }, 200);
}

/** Staff: signed URL to view proof. */
export async function GET(request: Request): Promise<NextResponse> {
  const userId = await authUserIdFromRequest(request);
  if (!userId) {
    return json({ ok: false, reason: "not_authenticated" }, 401);
  }

  const service = createServiceRoleClient();
  if (!service) {
    return json({ ok: false, reason: "service_role_unconfigured" }, 503);
  }

  const path = new URL(request.url).searchParams.get("path")?.trim() ?? "";
  if (!path) {
    return json({ ok: false, reason: "path_required" }, 400);
  }

  const { data: staffRow } = await service
    .from("users")
    .select("admin_role, is_admin")
    .eq("id", userId)
    .maybeSingle();

  const isStaff =
    staffRow?.admin_role === "super_admin" ||
    staffRow?.admin_role === "support_admin" ||
    staffRow?.is_admin === true;

  if (!isStaff) {
    return json({ ok: false, reason: "forbidden" }, 403);
  }

  const { data, error } = await service.storage
    .from(CLUB_VERIFICATION_DOCUMENTS_BUCKET)
    .createSignedUrl(path, 60 * 10);

  if (error || !data?.signedUrl) {
    console.error("[clubs/upload-partnership-proof] signed url failed", error);
    return json({ ok: false, reason: "signed_url_failed" }, 502);
  }

  return json({ ok: true, url: data.signedUrl }, 200);
}
