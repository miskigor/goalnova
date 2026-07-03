#!/usr/bin/env node
/**
 * Build social link preview images for WhatsApp / Instagram / Facebook.
 * Outputs JPEG (primary — best crawler compatibility) and PNG fallback.
 *
 * Usage: node scripts/generate-og-image.mjs [source-logo-path]
 */
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = process.argv[2] ? process.argv[2] : join(root, "public", "logo.png");
const outJpg = join(root, "public", "og-image.jpg");
const outPng = join(root, "public", "og-image.png");

if (!existsSync(source)) {
  console.error("Missing source image:", source);
  process.exit(1);
}

const width = 1200;
const height = 630;
const maxLogoW = 920;
const maxLogoH = 480;
const bg = { r: 12, g: 12, b: 14 };

const resized = await sharp(source)
  .resize(maxLogoW, maxLogoH, { fit: "inside", withoutEnlargement: false })
  .flatten({ background: bg })
  .png()
  .toBuffer();

const meta = await sharp(resized).metadata();
const left = Math.floor((width - (meta.width ?? 0)) / 2);
const top = Math.floor((height - (meta.height ?? 0)) / 2);

const base = sharp({
  create: {
    width,
    height,
    channels: 3,
    background: bg,
  },
}).composite([{ input: resized, left, top }]);

await base.clone().flatten({ background: bg }).jpeg({ quality: 92, mozjpeg: true }).toFile(outJpg);
await base.clone().flatten({ background: bg }).png({ compressionLevel: 9 }).toFile(outPng);

const jpgMeta = await sharp(outJpg).metadata();
console.log("Wrote", outJpg, `(${jpgMeta.width}×${jpgMeta.height}, JPEG)`);
console.log("Wrote", outPng, `(${width}×${height}, PNG)`);
