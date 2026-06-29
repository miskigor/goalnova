#!/usr/bin/env node
/**
 * Build public/og-image.png (1200×630) for WhatsApp / Instagram / Facebook link previews.
 * Usage: node scripts/generate-og-image.mjs [source-logo-path]
 */
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = process.argv[2] ? process.argv[2] : join(root, "public", "logo.png");
const out = join(root, "public", "og-image.png");

if (!existsSync(source)) {
  console.error("Missing source image:", source);
  process.exit(1);
}

const width = 1200;
const height = 630;
const maxLogoW = 1000;
const maxLogoH = 520;

const resized = await sharp(source)
  .resize(maxLogoW, maxLogoH, { fit: "inside", withoutEnlargement: false })
  .png()
  .toBuffer();

const meta = await sharp(resized).metadata();
const left = Math.floor((width - (meta.width ?? 0)) / 2);
const top = Math.floor((height - (meta.height ?? 0)) / 2);

await sharp({
  create: {
    width,
    height,
    channels: 3,
    background: { r: 0, g: 0, b: 0 },
  },
})
  .composite([{ input: resized, left, top }])
  .png({ compressionLevel: 9 })
  .toFile(out);

console.log("Wrote", out, `(${width}×${height})`);
