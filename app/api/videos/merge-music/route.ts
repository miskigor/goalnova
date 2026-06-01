import { readFile, stat } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { createServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import { clampMusicSegment } from "@/lib/video/clampMusicSegment";
import {
  downloadStorageObjectToFile,
  downloadToFile,
  ffprobeDurationSeconds,
  getMergeRuntimeStatus,
  mergeVideoWithMusicAudio,
  withTempDir,
} from "@/lib/video/ffmpegMerge";
import {
  LEGACY_VIDEO_STORAGE_BUCKET,
  VIDEO_STORAGE_BUCKET,
} from "@/lib/constants/storageBuckets";

/**
 * Music merge during upload: `POST /api/videos/merge-music`
 * Called from `UploadForm` → `runUpload` when a library track is selected.
 */

export const runtime = "nodejs";
export const maxDuration = 300;
export const dynamic = "force-dynamic";

const BUCKET = VIDEO_STORAGE_BUCKET;

type Body = {
  storagePath?: string;
  storageBucket?: string;
  musicTrackId?: string;
  musicStartSeconds?: number;
  musicEndSeconds?: number | null;
  musicVolume?: number;
};

const JSON_HEADERS: Record<string, string> = {
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
  "X-PitchRusch-Merge-Api": "1",
};

type MergeSuccessBody = { ok: true; processed_video_url: string };
type MergeFailureBody = { ok: false; error: string };

function mergeDebugEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" || process.env.DEBUG_MERGE_UPLOAD === "true"
  );
}

function logMergeTempDebug(payload: Record<string, unknown>) {
  if (!mergeDebugEnabled()) return;
  console.info("[merge-music TEMP DEBUG]", payload);
}

function mergeHttpResponse(data: MergeSuccessBody | MergeFailureBody, status: number): Response {
  if (data.ok === true) {
    const url = String(data.processed_video_url ?? "").trim();
    if (!url) {
      const fb: MergeFailureBody = { ok: false, error: "Music merge failed" };
      return new Response(JSON.stringify(fb), { status: 500, headers: JSON_HEADERS });
    }
    const body: MergeSuccessBody = { ok: true, processed_video_url: url };
    const s = JSON.stringify(body);
    if (s === "{}" || !s.includes("processed_video_url")) {
      const fb: MergeFailureBody = { ok: false, error: "Music merge failed" };
      return new Response(JSON.stringify(fb), { status: 500, headers: JSON_HEADERS });
    }
    const headers =
      status === 200 ? { ...JSON_HEADERS, "X-PitchRusch-Merge-Result": "ok" } : JSON_HEADERS;
    return new Response(s, { status, headers });
  }
  const err = String(data.error ?? "").trim() || "Music merge failed";
  const body: MergeFailureBody = { ok: false, error: err };
  const s = JSON.stringify(body);
  if (s === "{}" || s === "null") {
    return new Response(JSON.stringify({ ok: false, error: "Music merge failed" }), {
      status: 500,
      headers: JSON_HEADERS,
    });
  }
  return new Response(s, { status, headers: JSON_HEADERS });
}

class MergeJsonHttpError extends Error {
  constructor(
    readonly httpStatus: number,
    readonly errorMessage: string,
  ) {
    super("MergeJsonHttpError");
    this.name = "MergeJsonHttpError";
  }
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

function truncateUrlForLog(u: string, max = 220): string {
  const s = u.trim();
  if (s.length <= max) return s;
  return `${s.slice(0, max)}…`;
}

function errorDiagnostics(err: unknown): { message: string; stack: string | null } {
  if (err instanceof Error) {
    return { message: err.message, stack: err.stack ?? null };
  }
  return { message: String(err), stack: null };
}

export async function GET() {
  const fail: MergeFailureBody = { ok: false, error: "Music merge failed" };
  const final_response_payload = JSON.stringify(fail);
  logMergeTempDebug({
    source_video_url: null,
    selected_music_track_id: null,
    music_track_audio_url: null,
    music_start_seconds: null,
    music_end_seconds: null,
    merged_output_path: null,
    final_uploaded_processed_video_url: null,
    final_response_payload,
  });
  return mergeHttpResponse(fail, 405);
}

export async function POST(req: Request) {
  const startedAtMs = Date.now();

  const runtimeAtStart = getMergeRuntimeStatus();
  console.info("[merge-music] runtime status", {
    ready: runtimeAtStart.ready,
    reason: runtimeAtStart.ready ? null : runtimeAtStart.reason,
    videoMergeDisabled: process.env.VIDEO_MERGE_DISABLED === "true",
    hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
    maxDurationSeconds: maxDuration,
  });
  if (mergeDebugEnabled()) {
    console.info("[merge-music] verbose debug enabled");
  }

  let source_video_url: string | null = null;
  let selected_music_track_id: string | null = null;
  let music_track_audio_url: string | null = null;
  let music_start_seconds_request: number | null = null;
  let music_end_seconds_request: number | null = null;
  let music_start_seconds_applied: number | null = null;
  let music_end_seconds_applied: number | null = null;
  let merged_output_path: string | null = null;
  let final_uploaded_processed_video_url: string | null = null;

  const respondFail = (status: number, error: string, cause?: unknown): Response => {
    const body: MergeFailureBody = {
      ok: false,
      error: error.trim() || "Music merge failed",
    };
    const causeDiag = cause !== undefined ? errorDiagnostics(cause) : null;
    const isTimeout =
      /timed out|timeout|ETIMEDOUT|function invocation|60000/i.test(body.error) ||
      (causeDiag !== null && /timed out|timeout|ETIMEDOUT/i.test(causeDiag.message));
    console.error("[merge-music] fail", {
      httpStatus: status,
      error: body.error,
      selected_music_track_id,
      storagePath: source_video_url ? "(set)" : null,
      elapsedMs: Date.now() - startedAtMs,
      isTimeout,
      processed_video_url_missing: true,
      ...(causeDiag
        ? { exceptionMessage: causeDiag.message, stack: causeDiag.stack }
        : {}),
    });
    const final_response_payload = JSON.stringify(body);
    logMergeTempDebug({
      source_video_url,
      selected_music_track_id,
      music_track_audio_url:
        music_track_audio_url === null ? null : truncateUrlForLog(music_track_audio_url),
      music_start_seconds: {
        request: music_start_seconds_request,
        applied: music_start_seconds_applied,
      },
      music_end_seconds: {
        request: music_end_seconds_request,
        applied: music_end_seconds_applied,
      },
      merged_output_path,
      final_uploaded_processed_video_url,
      final_response_payload,
    });
    return mergeHttpResponse(body, status);
  };

  try {
    if (process.env.VIDEO_MERGE_DISABLED === "true") {
      return respondFail(503, "Video merge is disabled");
    }

    const runtime = getMergeRuntimeStatus();
    if (!runtime.ready) {
      return respondFail(503, "Merge not implemented");
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
    if (!url || !anon) {
      return respondFail(500, "Server config missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    }

    const authHeader = req.headers.get("authorization") ?? "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice("Bearer ".length).trim()
      : "";
    if (!token) {
      return respondFail(401, "Missing authorization token");
    }

    const authClient = createClient<Database>(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: userData, error: userErr } = await authClient.auth.getUser();
    if (userErr || !userData.user?.id) {
      return respondFail(401, "Invalid or expired session");
    }
    const userId = userData.user.id;

    let body: Body;
    try {
      body = (await req.json()) as Body;
    } catch {
      return respondFail(400, "Invalid JSON body");
    }

    const storagePath = typeof body.storagePath === "string" ? body.storagePath.trim() : "";
    const storageBucket = typeof body.storageBucket === "string" ? body.storageBucket.trim() : BUCKET;
    const musicTrackId =
      typeof body.musicTrackId === "string" ? body.musicTrackId.trim() : "";
    if (!storagePath || !musicTrackId) {
      return respondFail(400, "Missing storagePath or musicTrackId");
    }
    if (storageBucket !== BUCKET && storageBucket !== LEGACY_VIDEO_STORAGE_BUCKET) {
      return respondFail(400, "Invalid storageBucket");
    }
    if (!safeUserStoragePath(userId, storagePath)) {
      return respondFail(403, "Invalid storagePath for current user");
    }

    const service = createServiceRoleClient();
    if (!service) {
      return respondFail(500, "Missing SUPABASE_SERVICE_ROLE_KEY");
    }

    const { data: track, error: trackErr } = await service
      .from("music_tracks")
      .select("id,audio_url,duration_seconds,active")
      .eq("id", musicTrackId)
      .eq("active", true)
      .maybeSingle();

    if (trackErr || !track?.audio_url?.trim()) {
      return respondFail(400, "Music track not found or inactive");
    }

    const musicUrl = track.audio_url.trim();
    if (!musicUrl.startsWith("http://") && !musicUrl.startsWith("https://")) {
      return respondFail(400, "Music track audio_url is invalid");
    }

    const startRaw = Number(body.musicStartSeconds ?? 0);
    const endRaw =
      body.musicEndSeconds == null || body.musicEndSeconds === undefined
        ? Number.NaN
        : Number(body.musicEndSeconds);
    const volumeRaw = Number(body.musicVolume ?? 1);

    source_video_url = publicVideoUrl(url, storageBucket, storagePath);
    selected_music_track_id = musicTrackId;
    music_track_audio_url = musicUrl;
    music_start_seconds_request = startRaw;
    music_end_seconds_request = Number.isFinite(endRaw) ? endRaw : null;

    console.info("[merge-music] start", {
      selected_music_track_id: musicTrackId,
      storagePath,
      storageBucket,
      music_start_seconds_request: startRaw,
      music_end_seconds_request: Number.isFinite(endRaw) ? endRaw : null,
    });

    logMergeTempDebug({
      phase: "after_track_loaded",
      source_video_url,
      selected_music_track_id,
      music_track_audio_url: truncateUrlForLog(musicUrl),
      music_start_seconds: { request: music_start_seconds_request, applied: null },
      music_end_seconds: { request: music_end_seconds_request, applied: null },
      merged_output_path: null,
      final_uploaded_processed_video_url: null,
      final_response_payload: null,
    });

    if (mergeDebugEnabled()) {
      console.info("[merge-music] verbose request", {
        source_storage_path: storagePath,
        music_volume: volumeRaw,
      });
    }

    const result = await withTempDir(async (dir) => {
      const videoLocal = `${dir}/input_video.bin`;
      const audioLocal = `${dir}/input_audio.bin`;
      const outLocal = `${dir}/out.mp4`;

      await downloadStorageObjectToFile(service, storageBucket, storagePath, videoLocal);
      const videoFileStat = await stat(videoLocal);
      await downloadToFile(musicUrl, audioLocal);

      const videoDur = ffprobeDurationSeconds(videoLocal);
      if (videoDur <= 0) {
        throw new Error("Could not read video duration");
      }

      console.info("[merge-music] start", {
        phase: "inputs_ready",
        storagePath,
        videoBytes: videoFileStat.size,
        videoDurationSec: videoDur,
        selected_music_track_id: musicTrackId,
      });

      let musicDur = Math.max(
        0,
        Number.isFinite(track.duration_seconds) ? track.duration_seconds : 0,
      );
      if (musicDur <= 0.05) {
        musicDur = ffprobeDurationSeconds(audioLocal);
      }
      if (musicDur <= 0.05) {
        musicDur = videoDur;
      }

      const endSec = Number.isFinite(endRaw) ? endRaw : Math.min(musicDur || videoDur, videoDur);
      const { startSec, endSec: clampedEnd } = clampMusicSegment({
        videoDurationSec: videoDur,
        musicDurationSec: musicDur || videoDur,
        startSec: startRaw,
        endSec,
      });

      const volume = Math.min(2, Math.max(0, Number.isFinite(volumeRaw) ? volumeRaw : 1));

      await mergeVideoWithMusicAudio({
        videoPath: videoLocal,
        audioPath: audioLocal,
        outputPath: outLocal,
        musicStartSec: startSec,
        musicEndSec: clampedEnd,
        volume,
        videoDurationSec: videoDur,
      });

      const buf = await readFile(outLocal);
      if (buf.length < 64) {
        throw new Error("Merged output file is empty or too small");
      }

      const mergedOutputStoragePath = `${userId}/merged-${Date.now()}.mp4`;

      const { error: upErr } = await service.storage
        .from(storageBucket)
        .upload(mergedOutputStoragePath, buf, {
          contentType: "video/mp4",
          upsert: true,
        });
      if (upErr) {
        console.error("[merge-music] storage upload failed", upErr.message);
        throw new MergeJsonHttpError(500, "Music merge failed");
      }

      const processedVideoUrl = publicVideoUrl(url, storageBucket, mergedOutputStoragePath).trim();
      if (!processedVideoUrl) {
        throw new MergeJsonHttpError(500, "Music merge failed");
      }

      return {
        processedVideoUrl,
        mergedPath: mergedOutputStoragePath,
        applied: {
          musicStartSeconds: startSec,
          musicEndSeconds: clampedEnd,
          musicVolume: volume,
        },
        mergedLocalPath: outLocal,
      };
    });

    music_start_seconds_applied = result.applied.musicStartSeconds;
    music_end_seconds_applied = result.applied.musicEndSeconds;
    merged_output_path = result.mergedPath;

    const finalPublicUrl = String(result.processedVideoUrl ?? "").trim();
    if (!finalPublicUrl) {
      return respondFail(500, "Merged file uploaded but processed_video_url is empty");
    }

    final_uploaded_processed_video_url = finalPublicUrl;

    const success: MergeSuccessBody = { ok: true, processed_video_url: finalPublicUrl };
    const final_response_payload = JSON.stringify(success);

    logMergeTempDebug({
      phase: "success",
      source_video_url,
      selected_music_track_id,
      music_track_audio_url: truncateUrlForLog(music_track_audio_url ?? ""),
      music_start_seconds: {
        request: music_start_seconds_request,
        applied: music_start_seconds_applied,
      },
      music_end_seconds: {
        request: music_end_seconds_request,
        applied: music_end_seconds_applied,
      },
      merged_output_path,
      merged_local_file: result.mergedLocalPath,
      final_uploaded_processed_video_url,
      final_response_payload,
    });

    console.info("[merge-music] success", {
      httpStatus: 200,
      selected_music_track_id,
      merged_output_path,
      processed_video_url_length: finalPublicUrl.length,
      elapsedMs: Date.now() - startedAtMs,
      x_pitchrusch_merge_api: "1",
    });

    return mergeHttpResponse(success, 200);
  } catch (e) {
    if (e instanceof MergeJsonHttpError) {
      return respondFail(e.httpStatus, e.errorMessage, e);
    }
    const detail = e instanceof Error ? e.message : String(e);
    return respondFail(500, `Music merge failed: ${detail.slice(0, 140)}`, e);
  }
}
