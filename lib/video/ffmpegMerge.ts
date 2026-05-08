import { spawn } from "node:child_process";
import { execFileSync } from "node:child_process";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { SupabaseClient } from "@supabase/supabase-js";
import ffmpegPath from "ffmpeg-static";
import ffprobe from "@ffprobe-installer/ffprobe";

function assertFfmpeg(): string {
  if (!ffmpegPath) {
    throw new Error("FFmpeg binary not available (ffmpeg-static).");
  }
  return ffmpegPath;
}

/** True when merge can run on this server (Node + binaries present). */
export function getMergeRuntimeStatus():
  | { ready: true }
  | { ready: false; reason: string } {
  if (!ffmpegPath) {
    return { ready: false, reason: "ffmpeg-static binary path is not available" };
  }
  const probePath = typeof ffprobe?.path === "string" ? ffprobe.path : "";
  if (!probePath) {
    return { ready: false, reason: "@ffprobe-installer/ffprobe binary path is not available" };
  }
  return { ready: true };
}

export async function downloadToFile(url: string, destPath: string): Promise<void> {
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok) {
    throw new Error(`Download failed ${res.status} for ${url.slice(0, 80)}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(destPath, buf);
}

/** Reliable server-side fetch of a bucket object (works when the bucket is not public). */
export async function downloadStorageObjectToFile(
  client: SupabaseClient,
  bucket: string,
  objectPath: string,
  destPath: string,
): Promise<void> {
  const { data, error } = await client.storage.from(bucket).download(objectPath);
  if (error) {
    throw new Error(`Storage download failed: ${error.message}`);
  }
  if (!data) {
    throw new Error("Storage download returned empty body");
  }
  const buf = Buffer.from(await data.arrayBuffer());
  await fs.writeFile(destPath, buf);
}

export function ffprobeDurationSeconds(filePath: string): number {
  const out = execFileSync(
    ffprobe.path,
    [
      "-v",
      "error",
      "-show_entries",
      "format=duration",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      filePath,
    ],
    { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 },
  );
  const n = Number.parseFloat(out.trim());
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function ffprobeVideoCodec(filePath: string): string {
  const out = execFileSync(
    ffprobe.path,
    [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=codec_name",
      "-of",
      "default=noprint_wrappers=1:nokey=1",
      filePath,
    ],
    { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 },
  );
  return out.trim().toLowerCase();
}

export type MergeParams = {
  videoPath: string;
  audioPath: string;
  outputPath: string;
  musicStartSec: number;
  musicEndSec: number;
  /** Linear gain, e.g. 1 = 100% */
  volume: number;
  videoDurationSec: number;
};

function runFfmpeg(ffmpeg: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpeg, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    proc.stderr?.on("data", (c: Buffer) => {
      stderr += c.toString();
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-1200)}`));
    });
  });
}

/**
 * Muxes video stream with a trimmed music segment; pads silence if audio is shorter than video.
 */
export function mergeVideoWithMusicAudio(params: MergeParams): Promise<void> {
  const ffmpeg = assertFfmpeg();
  const { musicStartSec, musicEndSec, volume, videoDurationSec } = params;
  const segLen = Math.max(0.05, musicEndSec - musicStartSec);
  const padDur = Math.max(0, videoDurationSec - segLen);
  const vol = Math.min(4, Math.max(0, volume));

  const trim = `atrim=start=${musicStartSec}:end=${musicEndSec},asetpts=PTS-STARTPTS,volume=${vol}`;
  const pad =
    padDur > 0.02 ? `${trim},apad=pad_dur=${padDur.toFixed(3)}` : trim;
  const filter = `[1:a]${pad}[aout]`;

  const base = [
    "-y",
    "-i",
    params.videoPath,
    "-i",
    params.audioPath,
    "-filter_complex",
    filter,
    "-map",
    "0:v:0",
    "-map",
    "[aout]",
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-movflags",
    "+faststart",
  ];

  const codec = ffprobeVideoCodec(params.videoPath);
  // iOS Safari-safe fast path: keep stream copy only for H.264.
  const canCopyVideo = codec === "h264";
  const copyArgs = [...base, "-c:v", "copy", params.outputPath];

  // Fallback for files where stream-copy is not possible.
  const reencodeArgs = [
    ...base,
    "-c:v",
    "libx264",
    "-preset",
    "veryfast",
    "-crf",
    "23",
    "-pix_fmt",
    "yuv420p",
    params.outputPath,
  ];

  if (canCopyVideo) {
    return runFfmpeg(ffmpeg, copyArgs).catch(() => runFfmpeg(ffmpeg, reencodeArgs));
  }
  return runFfmpeg(ffmpeg, reencodeArgs);
}

export async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await fs.mkdtemp(join(tmpdir(), "gn-merge-"));
  try {
    return await fn(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}
