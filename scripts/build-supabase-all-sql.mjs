#!/usr/bin/env node
/**
 * Spaja sve datoteke iz supabase/migrations/*.sql u jedan fajl za copy-paste u
 * Supabase SQL Editor. Izlaz je ISKLJUČIVO SQL (nema shell naredbi).
 *
 *   node scripts/build-supabase-all-sql.mjs
 *   npm run db:export-all-sql
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const migrationsDir = path.join(root, "supabase", "migrations");
const outFile = path.join(root, "supabase", "ALL_MIGRATIONS_COPY_PASTE_SUPABASE.sql");

const files = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const header = `-- =============================================================================
-- PitchRusch — spojene migracije (samo SQL, bez terminala)
--
-- KAKO U SUPABASE (SQL Editor)
-- 1) Otvori lokalno ovaj fajl: supabase/ALL_MIGRATIONS_COPY_PASTE_SUPABASE.sql
-- 2) Select all u EDITORU TOG FAJLA → Copy
-- 3) Supabase → SQL → New query → Paste → Run
--
-- NIKAKO ne lijepaj naredbe tipa: cd "... " && cat ... (to nije SQL.)
--
-- Ako baza već ima dio sheme, "already exists" je čest — čitaj poruku ili
-- pokreni samo pojedinačne fajlove iz supabase/migrations/ koje još nemaš.
-- =============================================================================

`;

let body = header;
for (const f of files) {
  body += `

-- ============================================================================
-- FILE: ${f}
-- ============================================================================
`;
  body += fs.readFileSync(path.join(migrationsDir, f), "utf8");
}

fs.writeFileSync(outFile, body, "utf8");
console.log(`OK: wrote ${path.relative(root, outFile)} (${files.length} migration files)`);
