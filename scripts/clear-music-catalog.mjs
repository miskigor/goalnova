/**
 * Briše sve retke iz public.music_tracks (PitchRusch katalog / „galerija”).
 * video.selected_music_track_id postaje NULL (ON DELETE SET NULL).
 *
 * Učitava ../.env.local i ../.env (kao pixabay-music-sync.mjs).
 * Obavezno u okolini ili u .env.local (ne commitaj):
 *   SUPABASE_SERVICE_ROLE_KEY   # Supabase → Settings → API → service_role
 *
 *   node scripts/clear-music-catalog.mjs
 *   node scripts/clear-music-catalog.mjs --dry-run
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import process from "node:process";

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

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const service = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const dryRun = process.argv.includes("--dry-run");

if (!url || !service) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Dodaj service role key u okolinu (ne commitaj ga).",
  );
  process.exit(1);
}

const supabase = createClient(url, service, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { count: beforeCount, error: countErr } = await supabase
  .from("music_tracks")
  .select("*", { count: "exact", head: true });

if (countErr) {
  console.error("Count failed:", countErr.message);
  process.exit(1);
}

console.log(`Pronađeno redaka u music_tracks: ${beforeCount ?? "?"}`);

if (dryRun) {
  console.log("(dry-run, ništa nije obrisano)");
  process.exit(0);
}

const { error: delErr } = await supabase.from("music_tracks").delete().neq("id", "00000000-0000-0000-0000-000000000000");

if (delErr) {
  console.error("Brisanje nije uspjelo:", delErr.message);
  process.exit(1);
}

const { count: afterCount } = await supabase
  .from("music_tracks")
  .select("*", { count: "exact", head: true });

console.log(`Gotovo. Preostalo redaka: ${afterCount ?? 0}`);
