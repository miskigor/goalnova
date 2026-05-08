#!/usr/bin/env node
/**
 * Fail if any locale is missing flat keys present in messages/en.json.
 * Usage: node scripts/message-key-parity.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MESSAGES_DIR = path.join(__dirname, "..", "messages");

/** @param {Record<string, unknown>} obj @param {string} prefix */
function flatten(obj, prefix = "") {
  /** @type {Record<string, string>} */
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const p = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === "object" && !Array.isArray(v)) {
      Object.assign(out, flatten(/** @type {Record<string, unknown>} */ (v), p));
    } else {
      out[p] = String(v);
    }
  }
  return out;
}

function main() {
  const en = JSON.parse(fs.readFileSync(path.join(MESSAGES_DIR, "en.json"), "utf8"));
  const enKeys = new Set(Object.keys(flatten(en)));
  const targets = ["hr", "de", "it", "fr", "es", "pt", "ar"];
  let failed = false;

  for (const loc of targets) {
    const j = JSON.parse(fs.readFileSync(path.join(MESSAGES_DIR, `${loc}.json`), "utf8"));
    const keys = new Set(Object.keys(flatten(j)));
    const missing = [...enKeys].filter((k) => !keys.has(k));
    const extra = [...keys].filter((k) => !enKeys.has(k));
    if (missing.length || extra.length) {
      failed = true;
      console.error(`\n${loc}.json: missing ${missing.length}, extra ${extra.length}`);
      if (missing.length) console.error("  missing sample:", missing.slice(0, 15).join(", "));
      if (extra.length) console.error("  extra sample:", extra.slice(0, 15).join(", "));
    } else {
      console.log(`${loc}.json OK (${keys.size} keys)`);
    }
  }

  if (failed) {
    console.error("\nRun: node scripts/fill-messages-from-en.mjs");
    process.exit(1);
  }
}

main();
