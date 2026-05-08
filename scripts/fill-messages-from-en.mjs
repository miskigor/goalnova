#!/usr/bin/env node
/**
 * Deep-fill locale message files from messages/en.json.
 * - Output has the EXACT same key tree as en.json.
 * - Existing locale string values are kept; missing keys get the English string.
 *
 * Run from repo root:
 *   node scripts/fill-messages-from-en.mjs
 *
 * Locales: hr, de, it, fr, es, pt (plus optional ar to stay in sync with routing).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MESSAGES_DIR = path.join(__dirname, "..", "messages");

/** @param {unknown} enVal @param {unknown} locVal */
function mergeStrictEnShape(enVal, locVal) {
  if (enVal === null || typeof enVal !== "object" || Array.isArray(enVal)) {
    if (locVal !== undefined && typeof locVal !== "object") {
      return locVal;
    }
    return enVal;
  }
  const locObj =
    locVal !== null && typeof locVal === "object" && !Array.isArray(locVal)
      ? locVal
      : {};
  /** @type {Record<string, unknown>} */
  const out = {};
  for (const key of Object.keys(enVal)) {
    const ev = enVal[key];
    const lv = locObj[key];
    if (ev !== null && typeof ev === "object" && !Array.isArray(ev)) {
      out[key] = mergeStrictEnShape(ev, lv);
    } else {
      out[key] =
        lv !== undefined && (typeof lv === "string" || typeof lv === "number")
          ? lv
          : ev;
    }
  }
  return out;
}

function main() {
  const enPath = path.join(MESSAGES_DIR, "en.json");
  const enRaw = fs.readFileSync(enPath, "utf8");
  const en = JSON.parse(enRaw);

  const targets = ["hr", "de", "it", "fr", "es", "pt", "ar"];

  for (const loc of targets) {
    const p = path.join(MESSAGES_DIR, `${loc}.json`);
    if (!fs.existsSync(p)) {
      console.warn("skip missing", p);
      continue;
    }
    const cur = JSON.parse(fs.readFileSync(p, "utf8"));
    const merged = mergeStrictEnShape(en, cur);
    fs.writeFileSync(p, `${JSON.stringify(merged, null, 2)}\n`, "utf8");
    console.log("wrote", loc, "keys top-level", Object.keys(merged).length);
  }
}

main();
