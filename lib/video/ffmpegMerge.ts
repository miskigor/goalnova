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

type ProbedVideoStream = {
  codec: string;
  width: number;
  height: number;
  audioCodec: string | null;
};

function ffprobeVideoStream(filePath: string): ProbedVideoStream {
  const videoOut = execFileSync(
    ffprobe.path,
    [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=codec_name,width,height",
      "-of",
      "csv=p=0",
      filePath,
    ],
    { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 },
  );
  const [codecRaw, widthRaw, heightRaw] = videoOut.trim().split(",");
  let audioCodec: string | null = null;
  try {
    const audioOut = execFileSync(
      ffprobe.path,
      [
        "-v",
        "error",
        "-select_streams",
        "a:0",
        "-show_entries",
        "stream=codec_name",
        "-of",
        "csv=p=0",
        filePath,
      ],
      { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 },
    );
    const name = audioOut.trim().split(",")[0]?.trim().toLowerCase() ?? "";
    audioCodec = name.length > 0 ? name : null;
  } catch {
    audioCodec = null;
  }
  return {
    codec: (codecRaw ?? "").trim().toLowerCase(),
    width: Number.parseInt(widthRaw ?? "0", 10) || 0,
    height: Number.parseInt(heightRaw ?? "0", 10) || 0,
    audioCodec,
  };
}

/**
 * Cap at 1080p (1920 on the long landscape side) so phones download a sharp,
 * streamable file instead of 4K HEVC. Even dimensions required by libx264.
 */
export const PLAYBACK_SCALE_FILTER =
  "scale='if(gte(iw,ih),trunc(min(1920,iw)/2)*2,trunc(min(1080,iw)/2)*2)':-2";

const PLAYBACK_X264_ARGS = [
  "-c:v",
  "libx264",
  "-profile:v",
  "high",
  "-level",
  "4.1",
  "-preset",
  "veryfast",
  "-crf",
  "20",
  "-pix_fmt",
  "yuv420p",
  "-threads",
  "0",
] as const;

function videoCanStreamCopy(stream: ProbedVideoStream): boolean {
  if (stream.codec !== "h264") return false;
  if (stream.width > 1920 || stream.height > 1920) return false;
  return true;
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
  const audioFilter = `[1:a]${pad}[aout]`;
  const reencodeFilter = `[0:v]${PLAYBACK_SCALE_FILTER}[vout];${audioFilter}`;

  const audioAndContainer = [
    "-c:a",
    "aac",
    "-b:a",
    "192k",
    "-movflags",
    "+faststart",
  ];

  const copyArgs = [
    "-y",
    "-i",
    params.videoPath,
    "-i",
    params.audioPath,
    "-filter_complex",
    audioFilter,
    "-map",
    "0:v:0",
    "-map",
    "[aout]",
    ...audioAndContainer,
    "-c:v",
    "copy",
    params.outputPath,
  ];

  const reencodeArgs = [
    "-y",
    "-i",
    params.videoPath,
    "-i",
    params.audioPath,
    "-filter_complex",
    reencodeFilter,
    "-map",
    "[vout]",
    "-map",
    "[aout]",
    ...audioAndContainer,
    ...PLAYBACK_X264_ARGS,
    params.outputPath,
  ];

  const stream = ffprobeVideoStream(params.videoPath);
  // iOS Safari-safe fast path: stream-copy H.264 that is already phone-sized.
  if (videoCanStreamCopy(stream)) {
    return runFfmpeg(ffmpeg, copyArgs).catch(() => runFfmpeg(ffmpeg, reencodeArgs));
  }
  return runFfmpeg(ffmpeg, reencodeArgs);
}

/**
 * Remux or transcode a clip into a fast-start H.264 MP4 for feed playback.
 * Copies H.264 when it is already ≤1080p; otherwise scales and encodes.
 */
export function encodeToStreamableMp4(
  inputPath: string,
  outputPath: string,
): Promise<void> {
  const ffmpeg = assertFfmpeg();
  const stream = ffprobeVideoStream(inputPath);
  const hasAudio = Boolean(stream.audioCodec);

  if (videoCanStreamCopy(stream)) {
    const copyArgs = [
      "-y",
      "-i",
      inputPath,
      "-map",
      "0:v:0",
      "-c:v",
      "copy",
      "-movflags",
      "+faststart",
    ];
    if (hasAudio) {
      copyArgs.push("-map", "0:a:0");
      if (stream.audioCodec === "aac") {
        copyArgs.push("-c:a", "copy");
      } else {
        copyArgs.push("-c:a", "aac", "-b:a", "160k");
      }
    } else {
      copyArgs.push("-an");
    }
    copyArgs.push(outputPath);
    return runFfmpeg(ffmpeg, copyArgs).catch(() =>
      runFfmpeg(ffmpeg, buildPlaybackReencodeArgs(inputPath, outputPath, hasAudio)),
    );
  }

  return runFfmpeg(ffmpeg, buildPlaybackReencodeArgs(inputPath, outputPath, hasAudio));
}

function buildPlaybackReencodeArgs(
  inputPath: string,
  outputPath: string,
  hasAudio: boolean,
): string[] {
  const reencodeArgs = [
    "-y",
    "-i",
    inputPath,
    "-map",
    "0:v:0",
    "-vf",
    PLAYBACK_SCALE_FILTER,
    ...PLAYBACK_X264_ARGS,
    "-movflags",
    "+faststart",
  ];
  if (hasAudio) {
    reencodeArgs.push("-map", "0:a:0", "-c:a", "aac", "-b:a", "160k");
  } else {
    reencodeArgs.push("-an");
  }
  reencodeArgs.push(outputPath);
  return reencodeArgs;
}

export async function withTempDir<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = await fs.mkdtemp(join(tmpdir(), "gn-merge-"));
  try {
    return await fn(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}
