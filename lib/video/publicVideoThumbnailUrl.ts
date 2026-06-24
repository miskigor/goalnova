import { SITE_SEO_OG_IMAGE_PATH } from "@/lib/seo/brandMetadata";
import { getServerSiteOrigin } from "@/lib/site/serverSiteOrigin";
import {
  exploreTileVideoPosterAttribute,
  isValidHttpMediaUrl,
  trimMediaUrl,
  type VideoWithOptionalThumbnail,
} from "@/lib/video/exploreTileMedia";

function toAbsoluteMediaUrl(url: string): string | undefined {
  const trimmed = trimMediaUrl(url);
  if (!trimmed || !isValidHttpMediaUrl(trimmed)) return undefined;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  const origin = getServerSiteOrigin();
  if (origin && trimmed.startsWith("/")) {
    return `${origin.replace(/\/$/, "")}${trimmed}`;
  }
  return undefined;
}

/** Absolute image URL for VideoObject `thumbnailUrl` (required by Google rich results). */
export function resolvePublicVideoThumbnailUrl(
  video: VideoWithOptionalThumbnail,
  profileAvatarUrl?: string | null,
): string {
  const poster = exploreTileVideoPosterAttribute(video, profileAvatarUrl);
  const fromMedia = poster ? toAbsoluteMediaUrl(poster) : undefined;
  if (fromMedia) return fromMedia;

  const origin = (getServerSiteOrigin() ?? "https://pitchrusch.com").replace(/\/$/, "");
  return `${origin}${SITE_SEO_OG_IMAGE_PATH}`;
}
