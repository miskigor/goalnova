import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { getServerSiteOrigin } from "@/lib/site/serverSiteOrigin";
import { createAnonSupabaseServerClient } from "@/lib/supabase/anonServerClient";
import { hasVideoPlaybackUrl } from "@/lib/video/videoPlaybackUrl";

const INDEXABLE_PATHS = [
  "/",
  "/explore",
  "/discover",
  "/search",
  "/rankings",
  "/challenges",
  "/premium",
  "/contact",
  "/privacy",
  "/terms",
  "/content-policy",
] as const;
const SITEMAP_PAGE_SIZE = 2000;

function localizedPath(pathname: string, locale: string): string {
  if (locale === routing.defaultLocale) return pathname;
  return pathname === "/" ? `/${locale}` : `/${locale}${pathname}`;
}

type SitemapItem = {
  path: string;
  lastModified: Date;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
  priority: number;
};

async function collectAllItems(): Promise<SitemapItem[]> {
  const origin = getServerSiteOrigin() ?? "https://pitchrusch.com";
  const now = new Date();
  void origin;
  const items: SitemapItem[] = [];

  for (const locale of routing.locales) {
    for (const path of INDEXABLE_PATHS) {
      items.push({
        path: localizedPath(path, locale),
        lastModified: now,
        changeFrequency: path === "/" ? "daily" : "weekly",
        priority: path === "/" ? 1 : 0.7,
      });
    }
  }

  const supabase = createAnonSupabaseServerClient();
  if (!supabase) return items;

  const [profilesRes, videosRes] = await Promise.all([
    supabase
      .from("player_profiles")
      .select("username, created_at")
      .not("username", "is", null)
      .order("created_at", { ascending: false })
      .limit(5000),
    supabase
      .from("videos")
      .select("id, created_at, video_url, processed_video_url, source_video_url")
      .order("created_at", { ascending: false })
      .limit(5000),
  ]);

  const profileSlugs = (profilesRes.data ?? [])
    .map((row) => (row.username ?? "").trim())
    .filter(Boolean);

  const publicVideos = (videosRes.data ?? []).filter((row) => {
    const id = (row.id ?? "").trim();
    return Boolean(id) && hasVideoPlaybackUrl(row);
  });

  for (const locale of routing.locales) {
    for (const slug of profileSlugs) {
      items.push({
        path: localizedPath(`/player/${encodeURIComponent(slug)}`, locale),
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }

    for (const video of publicVideos) {
      const id = (video.id ?? "").trim();
      if (!id) continue;
      items.push({
        path: localizedPath(`/video/${encodeURIComponent(id)}`, locale),
        lastModified: video.created_at ? new Date(video.created_at) : now,
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
  }

  return items;
}

export async function generateSitemaps() {
  const items = await collectAllItems();
  const totalPages = Math.max(1, Math.ceil(items.length / SITEMAP_PAGE_SIZE));
  return Array.from({ length: totalPages }, (_, id) => ({ id }));
}

export default async function sitemap({
  id,
}: {
  id: number;
}): Promise<MetadataRoute.Sitemap> {
  const origin = getServerSiteOrigin() ?? "https://pitchrusch.com";
  const items = await collectAllItems();
  const start = id * SITEMAP_PAGE_SIZE;
  const page = items.slice(start, start + SITEMAP_PAGE_SIZE);
  return page.map((item) => ({
    url: `${origin}${item.path}`,
    lastModified: item.lastModified,
    changeFrequency: item.changeFrequency,
    priority: item.priority,
  }));
}
