/**
 * Transcode existing heavy clips to small fast-start H.264 MP4s and set
 * videos.processed_video_url (the URL the feed already prefers).
 *
 *   node scripts/backfill-playback-mp4.mjs
 */
import { spawn } from "node:child_process";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import ffmpegPath from "ffmpeg-static";
import ffprobe from "@ffprobe-installer/ffprobe";

const COPY_MAX_BYTES = 6 * 1024 * 1024;
const SCALE =
  "scale='if(gte(iw,ih),trunc(min(1920,iw)/2)*2,trunc(min(1080,iw)/2)*2)':-2";

function loadEnvLocal() {
  const raw = readFileSync(".env.local", "utf8");
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#") || !t.includes("=")) continue;
    const i = t.indexOf("=");
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

function publicVideoUrl(supabaseUrl, bucket, path) {
  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${bucket}/${path}`;
}

function parsePublicStorageUrl(url) {
  const match = url.trim().match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+?)(?:\?|#|$)/);
  if (!match) return null;
  try {
    return { bucket: match[1], path: decodeURIComponent(match[2]) };
  } catch {
    return null;
  }
}

function isMp4Like(url) {
  const base = url.split(/[?#]/)[0]?.toLowerCase() ?? "";
  return base.endsWith(".mp4") || base.endsWith(".m4v") || base.endsWith(".webm");
}

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    proc.stderr?.on("data", (c) => {
      stderr += c.toString();
    });
    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ffmpeg ${code}: ${stderr.slice(-800)}`));
    });
  });
}

function probeVideo(filePath) {
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
    { encoding: "utf8" },
  );
  const [codecRaw, widthRaw, heightRaw] = videoOut.trim().split(",");
  let audioCodec = null;
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
      { encoding: "utf8" },
    );
    const name = audioOut.trim().split(",")[0]?.trim().toLowerCase() ?? "";
    audioCodec = name || null;
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

async function encodeToStreamableMp4(inputPath, outputPath) {
  const stream = probeVideo(inputPath);
  const size = (await stat(inputPath)).size;
  const canCopy =
    stream.codec === "h264" &&
    stream.width > 0 &&
    stream.height > 0 &&
    stream.width <= 1920 &&
    stream.height <= 1920 &&
    size <= COPY_MAX_BYTES;
  const hasAudio = Boolean(stream.audioCodec);

  const reencode = [
    "-y",
    "-i",
    inputPath,
    "-map",
    "0:v:0",
    "-vf",
    SCALE,
    "-c:v",
    "libx264",
    "-profile:v",
    "high",
    "-level",
    "4.1",
    "-preset",
    "veryfast",
    "-crf",
    "22",
    "-maxrate",
    "2500k",
    "-bufsize",
    "5000k",
    "-pix_fmt",
    "yuv420p",
    "-threads",
    "0",
    "-movflags",
    "+faststart",
  ];
  if (hasAudio) reencode.push("-map", "0:a:0", "-c:a", "aac", "-b:a", "160k");
  else reencode.push("-an");
  reencode.push(outputPath);

  if (!canCopy) {
    await runFfmpeg(reencode);
    return;
  }

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
    if (stream.audioCodec === "aac") copyArgs.push("-c:a", "copy");
    else copyArgs.push("-c:a", "aac", "-b:a", "160k");
  } else {
    copyArgs.push("-an");
  }
  copyArgs.push(outputPath);
  try {
    await runFfmpeg(copyArgs);
  } catch {
    await runFfmpeg(reencode);
  }
}

function pickEncodeSource(video) {
  const processed = (video.processed_video_url ?? "").trim();
  const source = (video.source_video_url ?? "").trim();
  const primary = (video.video_url ?? "").trim();
  const hasMusic = Boolean((video.selected_music_track_id ?? "").trim());
  if (hasMusic) return processed || primary || source;
  return source || primary || processed;
}

loadEnvLocal();

if (!ffmpegPath) {
  console.error("ffmpeg-static missing");
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
if (!supabaseUrl || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(supabaseUrl, key, { auth: { persistSession: false } });
const { data, error } = await sb
  .from("videos")
  .select("id,user_id,video_url,processed_video_url,source_video_url,selected_music_track_id")
  .order("created_at", { ascending: false });

if (error) {
  console.error(error.message);
  process.exit(1);
}

const rows = data ?? [];
console.log(`backfill ${rows.length} videos`);

let skipped = 0;
let updated = 0;
let failed = 0;

for (const video of rows) {
  const id = video.id;
  const short = String(id).slice(0, 8);
  const started = Date.now();
  try {
    const current =
      (video.processed_video_url ?? "").trim() || (video.video_url ?? "").trim();
    if (current && isMp4Like(current)) {
      const head = await fetch(current, { method: "HEAD", redirect: "follow" });
      const bytes = Number(head.headers.get("content-length") ?? 0);
      if (head.ok && bytes > 0 && bytes <= COPY_MAX_BYTES) {
        skipped += 1;
        console.log(`skip ${short} ${Math.round(bytes / 1024)}KB`);
        continue;
      }
    }

    const inputUrl = pickEncodeSource(video);
    if (!inputUrl || !video.user_id) {
      failed += 1;
      console.log(`FAIL ${short} missing url`);
      continue;
    }

    const parsed = parsePublicStorageUrl(inputUrl);
    const dir = await mkdtemp(join(tmpdir(), "gn-play-"));
    try {
      const inputPath = join(dir, "in.bin");
      const outPath = join(dir, "out.mp4");
      if (parsed) {
        const { data: blob, error: dlErr } = await sb.storage
          .from(parsed.bucket)
          .download(parsed.path);
        if (dlErr || !blob) throw new Error(dlErr?.message || "download empty");
        await writeFile(inputPath, Buffer.from(await blob.arrayBuffer()));
      } else {
        const res = await fetch(inputUrl, { redirect: "follow" });
        if (!res.ok) throw new Error(`download ${res.status}`);
        await writeFile(inputPath, Buffer.from(await res.arrayBuffer()));
      }

      await encodeToStreamableMp4(inputPath, outPath);
      const buf = await readFile(outPath);
      if (buf.length < 64) throw new Error("empty output");

      const bucket = parsed?.bucket || "goalnova-videos";
      const objectPath = `${video.user_id}/playback-${Date.now()}.mp4`;
      const { error: upErr } = await sb.storage.from(bucket).upload(objectPath, buf, {
        contentType: "video/mp4",
        upsert: true,
        cacheControl: "31536000",
      });
      if (upErr) throw new Error(upErr.message);

      const processedUrl = publicVideoUrl(supabaseUrl, bucket, objectPath);
      const { error: updErr } = await sb
        .from("videos")
        .update({ processed_video_url: processedUrl })
        .eq("id", id);
      if (updErr) throw new Error(updErr.message);

      const inMb = ((await stat(inputPath)).size / 1024 / 1024).toFixed(1);
      const outMb = (buf.length / 1024 / 1024).toFixed(1);
      updated += 1;
      console.log(
        `ok   ${short} ${inMb}MB -> ${outMb}MB ${Date.now() - started}ms`,
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  } catch (e) {
    failed += 1;
    const msg = e instanceof Error ? e.message : String(e);
    console.log(`FAIL ${short} ${msg.slice(0, 200)}`);
  }
}

console.log(`done updated=${updated} skipped=${skipped} failed=${failed}`);
