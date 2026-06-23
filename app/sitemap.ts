import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { localizedPath } from "@/lib/seo/alternates";
import { getServerSiteOrigin } from "@/lib/site/serverSiteOrigin";
import { createAnonSupabaseServerClient } from "@/lib/supabase/anonServerClient";
import { rpcFetchPublicPlayerProfilesDiscover } from "@/lib/supabase/publicPlayerProfiles";
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

/** Cache sitemap for 1h — reduces Supabase load and avoids crawler timeouts. */
export const revalidate = 3600;

function safeLastModified(value: string | null | undefined, fallback: Date): Date {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function buildSitemapLanguageAlternates(origin: string, pathname: string): Record<string, string> {
  const path = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const languages = Object.fromEntries(
    routing.locales.map((locale) => [locale, `${origin}${localizedPath(path, locale)}`]),
  ) as Record<string, string>;
  languages["x-default"] = `${origin}${localizedPath(path, routing.defaultLocale)}`;
  return languages;
}

/** Static URLs always included — survives Supabase outages. */
function buildStaticSitemapItems(now = new Date()): SitemapItem[] {
  return INDEXABLE_PATHS.map((path) => ({
    path,
    lastModified: now,
    changeFrequency: path === "/" ? "daily" : "weekly",
    priority: path === "/" ? 1 : 0.7,
  }));
}

async function collectDynamicSitemapItems(now: Date): Promise<SitemapItem[]> {
  const supabase = createAnonSupabaseServerClient();
  if (!supabase) return [];

  const items: SitemapItem[] = [];

  try {
    const profilesRes = await rpcFetchPublicPlayerProfilesDiscover(supabase, 500);
    for (const row of profilesRes.rows) {
      const slug = (row.username ?? "").trim();
      if (!slug) continue;
      items.push({
        path: `/player/${encodeURIComponent(slug)}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  } catch (err) {
    console.error("[sitemap] player profiles failed; skipping dynamic player URLs", err);
  }

  try {
    const videosRes = await supabase
      .from("videos")
      .select("id, created_at, video_url, processed_video_url, source_video_url")
      .order("created_at", { ascending: false })
      .limit(5000);

    if (videosRes.error) {
      console.error("[sitemap] videos query failed", videosRes.error);
    } else {
      for (const video of videosRes.data ?? []) {
        const id = (video.id ?? "").trim();
        if (!id || !hasVideoPlaybackUrl(video)) continue;
        items.push({
          path: `/video/${encodeURIComponent(id)}`,
          lastModified: safeLastModified(video.created_at, now),
          changeFrequency: "weekly",
          priority: 0.7,
        });
      }
    }
  } catch (err) {
    console.error("[sitemap] videos failed; skipping dynamic video URLs", err);
  }

  try {
    const challengesRes = await supabase
      .from("challenges")
      .select("slug, created_at")
      .in("status", ["active", "ended"])
      .not("slug", "is", null)
      .order("created_at", { ascending: false })
      .limit(500);

    if (challengesRes.error) {
      console.error("[sitemap] challenges query failed", challengesRes.error);
    } else {
      for (const row of challengesRes.data ?? []) {
        const slug = (row.slug ?? "").trim();
        if (!slug) continue;
        items.push({
          path: `/challenges/${encodeURIComponent(slug)}`,
          lastModified: now,
          changeFrequency: "weekly",
          priority: 0.65,
        });
      }
    }
  } catch (err) {
    console.error("[sitemap] challenges failed; skipping dynamic challenge URLs", err);
  }

  return items;
}

function toSitemapEntries(origin: string, items: SitemapItem[]): MetadataRoute.Sitemap {
  return items.map((item) => {
    const pathname = item.path.startsWith("/") ? item.path : `/${item.path}`;
    return {
      url: `${origin}${localizedPath(pathname, routing.defaultLocale)}`,
      lastModified: item.lastModified,
      changeFrequency: item.changeFrequency,
      priority: item.priority,
      alternates: {
        languages: buildSitemapLanguageAlternates(origin, pathname),
      },
    };
  });
}

/** Single sitemap at `/sitemap.xml` (robots.txt). Under 50k URLs — no `generateSitemaps` split. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = (getServerSiteOrigin() ?? "https://pitchrusch.com").replace(/\/$/, "");
  const now = new Date();

  try {
    const items = [...buildStaticSitemapItems(now), ...(await collectDynamicSitemapItems(now))];
    return toSitemapEntries(origin, items);
  } catch (err) {
    console.error("[sitemap] unexpected failure; returning static URLs only", err);
    return toSitemapEntries(origin, buildStaticSitemapItems(now));
  }
}
