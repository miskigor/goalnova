#!/usr/bin/env node
/**
 * Build social link preview images for WhatsApp / Instagram / Facebook.
 * - og-image-square.jpg (1:1 — WhatsApp thumbnail friendly, listed first in OG)
 * - og-image.jpg (1.91:1 landscape)
 * - og-image.png (fallback)
 *
 * Usage: node scripts/generate-og-image.mjs [source-logo-path]
 */
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = process.argv[2] ? process.argv[2] : join(root, "public", "logo.png");
const outSquareJpg = join(root, "public", "og-image-square.jpg");
const outJpg = join(root, "public", "og-image.jpg");
const outPng = join(root, "public", "og-image.png");
const outAppOg = join(root, "app", "opengraph-image.jpg");

if (!existsSync(source)) {
  console.error("Missing source image:", source);
  process.exit(1);
}

const bg = { r: 12, g: 12, b: 14 };
const jpegOpts = { quality: 90, mozjpeg: true, progressive: false };

async function buildCard(width, height, maxLogoW, maxLogoH) {
  const resized = await sharp(source)
    .resize(maxLogoW, maxLogoH, { fit: "inside", withoutEnlargement: false })
    .flatten({ background: bg })
    .png()
    .toBuffer();

  const meta = await sharp(resized).metadata();
  const left = Math.floor((width - (meta.width ?? 0)) / 2);
  const top = Math.floor((height - (meta.height ?? 0)) / 2);

  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: bg,
    },
  })
    .composite([{ input: resized, left, top }])
    .flatten({ background: bg });
}

const square = await buildCard(1200, 1200, 980, 980);
const landscape = await buildCard(1200, 630, 920, 480);

await square.clone().jpeg(jpegOpts).toFile(outSquareJpg);
await landscape.clone().jpeg(jpegOpts).toFile(outJpg);
await landscape.clone().png({ compressionLevel: 9 }).toFile(outPng);
await square.clone().jpeg(jpegOpts).toFile(outAppOg);

for (const [label, path] of [
  ["square", outSquareJpg],
  ["landscape", outJpg],
  ["app/opengraph-image", outAppOg],
  ["png", outPng],
]) {
  const meta = await sharp(path).metadata();
  console.log(`Wrote ${path} (${meta.width}×${meta.height}, ${label})`);
}
