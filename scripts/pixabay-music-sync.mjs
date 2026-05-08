#!/usr/bin/env node
/**
 * Download up to 50 royalty-free audio tracks from Pixabay (via /api/audio/),
 * upload each file to Supabase Storage (`pitchrusch-music`), and upsert rows in
 * public.music_tracks.
 *
 * Prerequisites:
 * - Pixabay API key (same as images): https://pixabay.com/api/docs/
 * - Supabase service role key (never expose to the browser)
 * - Migrations applied: 20260407194000_music_tracks.sql + 20260408105000_music_library_v2.sql
 *
 * Env (or export manually):
 *   PIXABAY_API_KEY
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * Optional:
 *   PIXABAY_TARGET_COUNT=50
 *
 * Usage:
 *   node scripts/pixabay-music-sync.mjs
 *   node scripts/pixabay-music-sync.mjs --dry-run   # log first hit shape only, no uploads
 *
 * License: Pixabay Content License — free for commercial use; see
 * https://pixabay.com/service/license/ — do not hotlink CDN URLs long-term;
 * this script stores files in your own bucket as recommended by Pixabay.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";

const MUSIC_STORAGE_BUCKET = "pitchrusch-music";
import { setTimeout as delay } from "node:timers/promises";

function loadDotEnvFiles() {
  for (const name of [".env.local", ".env"]) {
    const p = new URL(`../${name}`, import.meta.url);
    if (!existsSync(p)) continue;
    const raw = readFileSync(p, "utf8");
    for (const line of raw.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i <= 0) continue;
      const k = t.slice(0, i).trim();
      let v = t.slice(i + 1).trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (!process.env[k]) process.env[k] = v;
    }
  }
}

loadDotEnvFiles();

const TARGET = Math.min(
  200,
  Math.max(1, Number.parseInt(process.env.PIXABAY_TARGET_COUNT ?? "50", 10) || 50),
);

/**
 * @param {unknown} hit
 * @returns {string | null}
 */
function extractAudioUrl(hit) {
  if (!hit || typeof hit !== "object") return null;
  const h = /** @type {Record<string, unknown>} */ (hit);
  if (typeof h.audio === "string" && h.audio.startsWith("http")) return h.audio;
  if (h.audio && typeof h.audio === "object") {
    const a = /** @type {Record<string, unknown>} */ (h.audio);
    const nested = [a.mp3, a.wav, a.ogg, a.url, a.small, a.medium, a.large];
    for (const c of nested) {
      if (typeof c === "string" && c.startsWith("http")) return c;
      if (c && typeof c === "object") {
        const u = /** @type {Record<string, unknown>} */ (c).url;
        if (typeof u === "string" && u.startsWith("http")) return u;
      }
    }
  }
  for (const k of ["audioURL", "download_url", "previewURL", "webformatURL"]) {
    const v = h[k];
    if (typeof v === "string" && v.startsWith("http")) return v;
  }
  return null;
}

/**
 * @param {unknown} hit
 */
function hitDurationSeconds(hit) {
  if (!hit || typeof hit !== "object") return 0;
  const h = /** @type {Record<string, unknown>} */ (hit);
  if (typeof h.duration === "number" && Number.isFinite(h.duration)) {
    return Math.max(0, Math.round(h.duration));
  }
  return 0;
}

/**
 * @param {unknown} hit
 */
function hitTitle(hit) {
  if (!hit || typeof hit !== "object") return "Untitled";
  const h = /** @type {Record<string, unknown>} */ (hit);
  if (typeof h.tags === "string" && h.tags.trim()) {
    return h.tags.split(",")[0].trim().slice(0, 200);
  }
  if (typeof h.id === "number") return `Pixabay audio ${h.id}`;
  return "Untitled";
}

/**
 * @param {string} tags
 */
function genreMoodFromTags(tags) {
  const parts = tags
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    genre: parts[0] ?? null,
    mood: parts[1] ?? null,
  };
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const key = process.env.PIXABAY_API_KEY?.trim();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!key) {
    console.error("Missing PIXABAY_API_KEY");
    process.exit(1);
  }
  if (!dryRun && (!url || !service)) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = dryRun
    ? null
    : createClient(url, service, {
        auth: { persistSession: false, autoRefreshToken: false },
      });

  const queries = [
    "sport",
    "energetic",
    "electronic",
    "ambient",
    "rock",
    "motivation",
    "cinematic",
    "percussion",
    "summer",
    "workout",
    "corporate",
    "happy",
    "guitar",
    "piano",
    "strings",
    "bass",
    "drums",
    "intro",
    "hip hop",
    "dance",
    "dramatic",
    "beats",
    "vlog",
    "upbeat",
    "chill",
    "trailer",
    "action",
    "news",
    "documentary",
    "funk",
    "jazz",
    "latin",
    "reggae",
    "techno",
    "house",
    "pop",
    "folk",
    "orchestral",
    "synth",
    "lofi",
    "meditation",
    "game",
    "podcast",
    "advertising",
    "background",
    "tension",
    "victory",
    "stadium",
    "crowd",
    "celebration",
    "inspiration",
    "travel",
    "nature",
    "urban",
    "retro",
    "modern",
    "minimal",
    "epic",
    "soft",
    "powerful",
  ];

  /** @type {Map<number, Record<string, unknown>>} */
  const byId = new Map();
  let page = 1;

  outer: for (const q of queries) {
    if (byId.size >= TARGET) break;
    for (let attempt = 0; attempt < 3 && byId.size < TARGET; attempt++) {
      const u = new URL("https://pixabay.com/api/audio/");
      u.searchParams.set("key", key);
      u.searchParams.set("q", q);
      u.searchParams.set("per_page", "200");
      u.searchParams.set("page", String(page));
      u.searchParams.set("order", "popular");

      const res = await fetch(u.toString());
      if (!res.ok) {
        const text = await res.text();
        console.error("Pixabay API error", res.status, text.slice(0, 500));
        process.exit(1);
      }
      const data = /** @type {{ hits?: unknown[] }} */ (await res.json());
      const hits = Array.isArray(data.hits) ? data.hits : [];

      if (dryRun && hits[0]) {
        console.log("Sample hit keys:", Object.keys(/** @type {object} */ (hits[0])));
        console.log(JSON.stringify(hits[0], null, 2).slice(0, 2000));
        return;
      }

      for (const hit of hits) {
        if (!(hit && typeof hit === "object")) continue;
        const h = /** @type {Record<string, unknown>} */ (hit);
        const id = h.id;
        if (typeof id !== "number" || byId.has(id)) continue;
        const audioUrl = extractAudioUrl(hit);
        if (!audioUrl) continue;
        byId.set(id, h);
        if (byId.size >= TARGET) break outer;
      }
      page += 1;
      await delay(350);
    }
    page = 1;
  }

  console.log("Collected", byId.size, "unique audio hits (target", TARGET, ")");

  if (dryRun) return;

  if (byId.size === 0) {
    console.error("No downloadable audio hits — check API response shape / key permissions.");
    process.exit(1);
  }

  for (const [pixabayId, hit] of byId) {
    const audioUrl = extractAudioUrl(hit);
    if (!audioUrl) continue;
    const tags = typeof hit.tags === "string" ? hit.tags : "";
    const { genre, mood } = genreMoodFromTags(tags);
    const title = hitTitle(hit);
    const duration = hitDurationSeconds(hit);

    const rAudio = await fetch(audioUrl);
    if (!rAudio.ok) {
      console.warn("Skip download failed", pixabayId, rAudio.status);
      continue;
    }
    const buf = Buffer.from(await rAudio.arrayBuffer());
    const ext =
      audioUrl.includes(".wav") ? "wav" : audioUrl.includes(".ogg") ? "ogg" : "mp3";
    const path = `catalog/${pixabayId}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from(MUSIC_STORAGE_BUCKET)
      .upload(path, buf, {
        contentType: ext === "wav" ? "audio/wav" : ext === "ogg" ? "audio/ogg" : "audio/mpeg",
        upsert: true,
      });

    if (upErr) {
      console.warn("Storage upload failed", pixabayId, upErr.message);
      continue;
    }

    const { data: pub } = supabase.storage.from(MUSIC_STORAGE_BUCKET).getPublicUrl(path);
    const publicUrl = pub.publicUrl;

    const artist =
      typeof hit.user === "string" && hit.user.trim()
        ? hit.user.trim()
        : "Pixabay Community";

    const { error: dbErr } = await supabase.from("music_tracks").insert({
      title,
      artist,
      genre,
      mood,
      duration_seconds: duration,
      audio_url: publicUrl,
      cover_image_url: null,
      license_type: "royalty_free",
      provider: "Pixabay",
      active: true,
    });

    if (dbErr) {
      console.warn("DB upsert failed", pixabayId, dbErr.message);
      continue;
    }

    console.log("OK", pixabayId, title.slice(0, 60));
    await delay(400);
  }

  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
