import { ImageResponse } from "next/og";
import { BrandOgImageContent } from "@/lib/seo/brandOgImageContent";
import { loadOgBrandLogoDataUrl } from "@/lib/seo/loadOgBrandAsset";

export const runtime = "nodejs";
export const size = { width: 1200, height: 600 };
export const contentType = "image/png";

export default async function TwitterImage() {
  const logoSrc = await loadOgBrandLogoDataUrl();

  return new ImageResponse(
    <BrandOgImageContent logoSrc={logoSrc} width={size.width} height={size.height} />,
    size,
  );
}
