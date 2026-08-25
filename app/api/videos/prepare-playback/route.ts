import { readFile, stat } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import {
  downloadStorageObjectToFile,
  encodeToStreamableMp4,
  getMergeRuntimeStatus,
  withTempDir,
} from "@/lib/video/ffmpegMerge";
import {
  LEGACY_VIDEO_STORAGE_BUCKET,
  VIDEO_STORAGE_BUCKET,
} from "@/lib/constants/storageBuckets";

/**
 * Transcode/remux an uploaded clip into a fast-start H.264 MP4 for feed playback.
 * Called from `UploadForm` when there is no music merge (or after merge fallback).
 */

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const BUCKET = VIDEO_STORAGE_BUCKET;

type Body = {
  storagePath?: string;
  storageBucket?: string;
};

const JSON_HEADERS: Record<string, string> = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

type SuccessBody = { ok: true; processed_video_url: string };
type FailureBody = { ok: false; error: string };

function jsonResponse(data: SuccessBody | FailureBody, status: number): Response {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function publicVideoUrl(supabaseUrl: string, bucket: string, path: string): string {
  const base = supabaseUrl.replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}

function safeUserStoragePath(userId: string, storagePath: string): boolean {
  const normalized = storagePath.replace(/^\/+/, "");
  if (normalized.includes("..") || normalized.includes("//")) return false;
  return normalized === userId || normalized.startsWith(`${userId}/`);
}

export async function POST(req: Request) {
  const startedAtMs = Date.now();

  try {
    if (process.env.VIDEO_MERGE_DISABLED === "true") {
      return jsonResponse({ ok: false, error: "Video processing is disabled" }, 503);
    }

    const runtime = getMergeRuntimeStatus();
    if (!runtime.ready) {
      return jsonResponse({ ok: false, error: "Playback encoder unavailable" }, 503);
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
    if (!url || !anon) {
      return jsonResponse({ ok: false, error: "Server config missing" }, 500);
    }

    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length).trim()
      : "";
    if (!token) {
      return jsonResponse({ ok: false, error: "Missing authorization token" }, 401);
    }

    const authClient = createClient<Database>(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: userData, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userData.user?.id) {
      return jsonResponse({ ok: false, error: "Invalid or expired session" }, 401);
    }
    const userId = userData.user.id;

    let body: Body;
    try {
      body = (await req.json()) as Body;
    } catch {
      return jsonResponse({ ok: false, error: "Invalid JSON body" }, 400);
    }

    const storagePath = typeof body.storagePath === "string" ? body.storagePath.trim() : "";
    const storageBucket =
      typeof body.storageBucket === "string" ? body.storageBucket.trim() : BUCKET;
    if (!storagePath) {
      return jsonResponse({ ok: false, error: "Missing storagePath" }, 400);
    }
    if (storageBucket !== BUCKET && storageBucket !== LEGACY_VIDEO_STORAGE_BUCKET) {
      return jsonResponse({ ok: false, error: "Invalid storageBucket" }, 400);
    }
    if (!safeUserStoragePath(userId, storagePath)) {
      return jsonResponse({ ok: false, error: "Invalid storagePath for current user" }, 403);
    }

    const service = createServiceRoleClient();
    if (!service) {
      return jsonResponse({ ok: false, error: "Missing SUPABASE_SERVICE_ROLE_KEY" }, 500);
    }

    const processedVideoUrl = await withTempDir(async (dir) => {
      const videoLocal = `${dir}/input_video.bin`;
      const outLocal = `${dir}/out.mp4`;

      await downloadStorageObjectToFile(service, storageBucket, storagePath, videoLocal);
      const videoFileStat = await stat(videoLocal);
      if (videoFileStat.size < 64) {
        throw new Error("Uploaded video is empty");
      }

      await encodeToStreamableMp4(videoLocal, outLocal);
      const buf = await readFile(outLocal);
      if (buf.length < 64) {
        throw new Error("Encoded output is empty");
      }

      const playbackStoragePath = `${userId}/playback-${Date.now()}.mp4`;
      const { error: upErr } = await service.storage.from(storageBucket).upload(
        playbackStoragePath,
        buf,
        {
          contentType: "video/mp4",
          upsert: true,
          cacheControl: "31536000",
        },
      );
      if (upErr) {
        throw new Error(`Storage upload failed: ${upErr.message}`);
      }

      return publicVideoUrl(url, storageBucket, playbackStoragePath).trim();
    });

    if (!processedVideoUrl) {
      return jsonResponse({ ok: false, error: "Playback file URL is empty" }, 500);
    }

    console.info("[prepare-playback] success", {
      elapsedMs: Date.now() - startedAtMs,
      processed_video_url_length: processedVideoUrl.length,
    });

    return jsonResponse({ ok: true, processed_video_url: processedVideoUrl }, 200);
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error("[prepare-playback] fail", {
      elapsedMs: Date.now() - startedAtMs,
      error: detail,
    });
    return jsonResponse(
      { ok: false, error: `Playback encode failed: ${detail.slice(0, 140)}` },
      500,
    );
  }
}
