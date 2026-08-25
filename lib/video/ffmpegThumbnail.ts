import { spawn } from "node:child_process";
import ffmpegPath from "ffmpeg-static";

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
    proc.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-1200)}`));
    });
  });
}

/** Extract a single JPEG frame for VideoObject / watch-page poster. */
export async function extractVideoThumbnailJpeg(
  videoPath: string,
  outputPath: string,
  seekSeconds = 1,
): Promise<void> {
  const ffmpeg = assertFfmpeg();
  const seek = Math.max(0, seekSeconds);
  await runFfmpeg(ffmpeg, [
    "-y",
    "-ss",
    String(seek),
    "-i",
    videoPath,
    "-frames:v",
    "1",
    "-vf",
    "scale=1600:-2",
    "-q:v",
    "2",
    outputPath,
  ]);
}
