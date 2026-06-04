import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import { join } from "node:path";
import ffmpegPath from "ffmpeg-static";
import {
  downloadToFile,
  ffprobeDurationSeconds,
  withTempDir,
} from "@/lib/video/ffmpegMerge";

const MAX_VIDEO_BYTES = 28 * 1024 * 1024;
const FRAME_COUNT = 6;

function assertFfmpeg(): string {
  if (!ffmpegPath) {
    throw new Error("FFmpeg binary not available (ffmpeg-static).");
  }
  return ffmpegPath;
}

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
      else reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-800)}`));
    });
  });
}

export type ExtractedFrame = {
  base64: string;
  mime: "image/jpeg";
};

/**
 * Downloads a short football clip and samples evenly spaced JPEG frames for vision models.
 */
export async function extractVideoFramesFromUrl(
  videoUrl: string,
): Promise<ExtractedFrame[]> {
  const url = videoUrl.trim();
  if (!url) throw new Error("missing_video_url");

  return withTempDir(async (dir) => {
    const inputPath = join(dir, "input.mp4");
    await downloadToFile(url, inputPath);

    const stat = await fs.stat(inputPath);
    if (stat.size > MAX_VIDEO_BYTES) {
      throw new Error("video_too_large");
    }

    const duration = ffprobeDurationSeconds(inputPath);
    const ffmpeg = assertFfmpeg();
    const frames: ExtractedFrame[] = [];

    const timestamps =
      duration > 0.5
        ? Array.from({ length: FRAME_COUNT }, (_, i) => {
            const t = ((i + 1) / (FRAME_COUNT + 1)) * duration;
            return Math.max(0, Math.min(duration - 0.05, t));
          })
        : [0];

    for (let i = 0; i < timestamps.length; i += 1) {
      const outPath = join(dir, `frame_${i}.jpg`);
      await runFfmpeg(ffmpeg, [
        "-hide_banner",
        "-loglevel",
        "error",
        "-ss",
        String(timestamps[i]),
        "-i",
        inputPath,
        "-frames:v",
        "1",
        "-q:v",
        "3",
        "-y",
        outPath,
      ]);
      const buf = await fs.readFile(outPath);
      if (buf.length < 512) continue;
      frames.push({
        base64: buf.toString("base64"),
        mime: "image/jpeg",
      });
    }

    if (frames.length === 0) {
      throw new Error("frame_extraction_failed");
    }

    return frames;
  });
}
