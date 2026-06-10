#!/usr/bin/env node
/**
 * Generates supabase/migrations/20260610120001_daily_quiz_seed.sql from quiz_seed/questions.json
 */
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const questionsPath = join(root, "supabase/quiz_seed/questions.json");
const outPath = join(root, "supabase/migrations/20260610120001_daily_quiz_seed.sql");

const questions = JSON.parse(readFileSync(questionsPath, "utf8"));

if (!Array.isArray(questions) || questions.length !== 100) {
  throw new Error(`Expected 100 questions, got ${questions?.length ?? 0}`);
}

const LOCALES = ["en", "hr", "de", "bs", "es", "pt", "sr", "fr", "it", "nl", "tr", "ar"];
const CATEGORIES = {
  world_cup: 20,
  champions_league: 20,
  football_rules: 20,
  legends: 20,
  current_football: 20,
};

const counts = {};
for (const q of questions) {
  counts[q.category] = (counts[q.category] ?? 0) + 1;
  if (q.correct_option_index < 0 || q.correct_option_index > 3) {
    throw new Error(`Invalid correct_option_index for ${q.id}`);
  }
  for (const loc of LOCALES) {
    if (!q.question_text?.[loc] || !q.options?.[loc] || q.options[loc].length !== 4) {
      throw new Error(`Missing locale ${loc} for question ${q.id}`);
    }
  }
}
for (const [cat, n] of Object.entries(CATEGORIES)) {
  if (counts[cat] !== n) {
    throw new Error(`Category ${cat}: expected ${n}, got ${counts[cat] ?? 0}`);
  }
}

function sqlEscape(str) {
  return String(str).replace(/'/g, "''");
}

function jsonSql(obj) {
  return `'${sqlEscape(JSON.stringify(obj))}'::jsonb`;
}

const lines = [
  "-- Daily Football Quiz — 100 multilingual seed questions (generated).",
  "-- Regenerate: node scripts/build-daily-quiz-seed.mjs",
  "",
];

for (const q of questions) {
  lines.push(
    `insert into public.quiz_questions (id, category, question_text, options, correct_option_index)`,
    `values (`,
    `  '${q.id}'::uuid,`,
    `  '${q.category}',`,
    `  ${jsonSql(q.question_text)},`,
    `  ${jsonSql(q.options)},`,
    `  ${q.correct_option_index}`,
    `)`,
    `on conflict (id) do update set`,
    `  category = excluded.category,`,
    `  question_text = excluded.question_text,`,
    `  options = excluded.options,`,
    `  correct_option_index = excluded.correct_option_index;`,
    ``,
  );
}

writeFileSync(outPath, lines.join("\n"), "utf8");
const bytes = Buffer.byteLength(lines.join("\n"), "utf8");
console.log(`Wrote ${outPath}`);
console.log(`Questions: ${questions.length}`);
console.log(`Size: ${(bytes / 1024).toFixed(1)} KB`);
