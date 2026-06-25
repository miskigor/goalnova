import { ImageResponse } from "next/og";
import { BrandOgImageContent } from "@/lib/seo/brandOgImageContent";
import {
  fetchImageAsDataUrl,
  loadOgBrandLogoDataUrl,
} from "@/lib/seo/loadOgBrandAsset";
import { VideoShareOgImageContent } from "@/lib/seo/videoShareOgImageContent";
import { getPublicVideoPageData } from "@/lib/supabase/publicVideoPageData";
import { resolvePublicVideoThumbnailUrl } from "@/lib/video/publicVideoThumbnailUrl";

export const runtime = "nodejs";
export const revalidate = 3600;

const SIZE = { width: 1200, height: 630 };

type RouteContext = { params: Promise<{ videoId: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const { videoId } = await context.params;
  const logoSrc = await loadOgBrandLogoDataUrl();
  const data = await getPublicVideoPageData(videoId);

  if (!data) {
    return new ImageResponse(
      <BrandOgImageContent logoSrc={logoSrc} width={SIZE.width} height={SIZE.height} />,
      SIZE,
    );
  }

  const displayName =
    data.profile?.full_name?.trim() ||
    data.profile?.username?.trim() ||
    "PitchRusch highlight";
  const title = data.video.caption?.trim() || displayName;
  const thumbnailUrl = resolvePublicVideoThumbnailUrl(data.video, data.userAvatarUrl);
  const thumbnailSrc = (await fetchImageAsDataUrl(thumbnailUrl)) ?? logoSrc;

  return new ImageResponse(
    <VideoShareOgImageContent
      thumbnailSrc={thumbnailSrc}
      logoSrc={logoSrc}
      title={title.slice(0, 120)}
    />,
    SIZE,
  );
}
