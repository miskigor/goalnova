import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { localizedPath } from "@/lib/seo/alternates";
import { getServerSiteOrigin } from "@/lib/site/serverSiteOrigin";
import { createAnonSupabaseServerClient } from "@/lib/supabase/anonServerClient";
import { hasVideoPlaybackUrl } from "@/lib/video/videoPlaybackUrl";

/** Public marketing and discovery pages only — no auth-gated app routes. */
const INDEXABLE_PATHS = [
  "/",
  "/explore",
  "/search",
  "/rankings",
  "/challenges",
  "/contact",
  "/privacy",
  "/terms",
  "/content-policy",
] as const;

type SitemapItem = {
  path: string;
  lastModified: Date;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
  priority: number;
};

async function collectAllItems(): Promise<SitemapItem[]> {
  const now = new Date();
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

  const [profilesRes, videosRes, challengesRes] = await Promise.all([
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
    supabase
      .from("challenges")
      .select("slug, created_at")
      .in("status", ["active", "ended"])
      .not("slug", "is", null)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const profileSlugs = (profilesRes.data ?? [])
    .map((row) => (row.username ?? "").trim())
    .filter(Boolean);

  const publicVideos = (videosRes.data ?? []).filter((row) => {
    const id = (row.id ?? "").trim();
    return Boolean(id) && hasVideoPlaybackUrl(row);
  });

  const challengeSlugs = (challengesRes.data ?? [])
    .map((row) => (row.slug ?? "").trim())
    .filter(Boolean);

  // One canonical URL per entity (default locale) — hreflang lives in page metadata.
  for (const slug of profileSlugs) {
    items.push({
      path: `/player/${encodeURIComponent(slug)}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.6,
    });
  }

  for (const video of publicVideos) {
    const id = (video.id ?? "").trim();
    if (!id) continue;
    items.push({
      path: `/video/${encodeURIComponent(id)}`,
      lastModified: video.created_at ? new Date(video.created_at) : now,
      changeFrequency: "weekly",
      priority: 0.7,
    });
  }

  for (const slug of challengeSlugs) {
    items.push({
      path: `/challenges/${encodeURIComponent(slug)}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.65,
    });
  }

  return items;
}

/** Single sitemap at `/sitemap.xml` (robots.txt). Under 50k URLs — no `generateSitemaps` split. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = (getServerSiteOrigin() ?? "https://pitchrusch.com").replace(/\/$/, "");
  const items = await collectAllItems();
  return items.map((item) => ({
    url: `${origin}${item.path.startsWith("/") ? item.path : `/${item.path}`}`,
    lastModified: item.lastModified,
    changeFrequency: item.changeFrequency,
    priority: item.priority,
  }));
}
