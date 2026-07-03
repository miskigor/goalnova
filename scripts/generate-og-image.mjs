#!/usr/bin/env node
/**
 * Build social link preview images for WhatsApp / Instagram / Facebook.
 *
 * Usage: node scripts/generate-og-image.mjs [source-logo-path]
 */
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = process.argv[2] ? process.argv[2] : join(root, "public", "logo.png");
const outShare = join(root, "public", "share-preview.jpg");
const outSquareJpg = join(root, "public", "og-image-square.jpg");
const outJpg = join(root, "public", "og-image.jpg");
const outPng = join(root, "public", "og-image.png");
const outAppOg = join(root, "app", "opengraph-image.jpg");

if (!existsSync(source)) {
  console.error("Missing source image:", source);
  process.exit(1);
}

const bg = { r: 14, g: 10, b: 8 };
const jpegOpts = { quality: 88, mozjpeg: true, progressive: false };

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

const share = await buildCard(1200, 1200, 1080, 1080);
const square = await buildCard(1200, 1200, 980, 980);
const landscape = await buildCard(1200, 630, 920, 480);

await share.clone().jpeg(jpegOpts).toFile(outShare);
await square.clone().jpeg(jpegOpts).toFile(outSquareJpg);
await landscape.clone().jpeg(jpegOpts).toFile(outJpg);
await landscape.clone().png({ compressionLevel: 9 }).toFile(outPng);
await share.clone().jpeg(jpegOpts).toFile(outAppOg);

for (const [label, path] of [
  ["share-preview", outShare],
  ["square", outSquareJpg],
  ["landscape", outJpg],
  ["app/opengraph-image", outAppOg],
  ["png", outPng],
]) {
  const meta = await sharp(path).metadata();
  console.log(`Wrote ${path} (${meta.width}×${meta.height}, ${label})`);
}
