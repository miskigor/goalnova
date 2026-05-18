#!/usr/bin/env node
/**
 * Regenerate PitchRusch site icons from public/logo.png (512×512 mark).
 * Requires macOS `sips` and npx png-to-ico.
 *
 * Usage: node scripts/generate-site-icons.mjs
 */
import { execSync } from "node:child_process";
import { copyFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pub = join(root, "public");
const app = join(root, "app");
const logo = join(pub, "logo.png");

if (!existsSync(logo)) {
  console.error("Missing public/logo.png");
  process.exit(1);
}

for (const size of [32, 180, 192, 512]) {
  const out = join(pub, `icon-${size}.png`);
  execSync(`sips -s format png -z ${size} ${size} "${logo}" --out "${out}"`, {
    stdio: "inherit",
  });
}

copyFileSync(join(pub, "icon-512.png"), join(pub, "icon.png"));
copyFileSync(join(pub, "icon-180.png"), join(pub, "apple-touch-icon.png"));
copyFileSync(join(pub, "icon-512.png"), join(app, "icon.png"));
copyFileSync(join(pub, "icon-180.png"), join(app, "apple-icon.png"));

execSync(`npx --yes png-to-ico icon-32.png > favicon.ico`, { cwd: pub, stdio: "inherit" });

console.log("Site icons updated in public/ and app/");
