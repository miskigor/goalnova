import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { createAnonSupabaseServerClient } from "@/lib/supabase/anonServerClient";
import { hasVideoPlaybackUrl } from "@/lib/video/videoPlaybackUrl";

/** Server-rendered links so crawlers discover public videos without waiting for the client feed. */
export async function ExploreCrawlLinks() {
  const supabase = createAnonSupabaseServerClient();
  if (!supabase) return null;

  const { data } = await supabase
    .from("videos")
    .select("id, caption, video_url, processed_video_url, source_video_url")
    .not("video_url", "is", null)
    .order("created_at", { ascending: false })
    .limit(32);

  const videos = (data ?? []).filter((row) => row.id && hasVideoPlaybackUrl(row));
  if (videos.length === 0) return null;

  const t = await getTranslations("explore");

  return (
    <section
      className="border-t border-gn-border-subtle px-4 py-6 sm:px-6"
      aria-label={t("title")}
    >
      <h2 className="text-sm font-semibold text-gn-text">{t("recentHighlightsTitle")}</h2>
      <ul className="mt-3 flex flex-col gap-2">
        {videos.map((video) => {
          const id = String(video.id);
          const label = (video.caption ?? "").trim() || t("videoLinkFallback", { id: id.slice(0, 8) });
          return (
            <li key={id}>
              <Link
                href={`/video/${encodeURIComponent(id)}`}
                className="text-sm text-gn-accent underline-offset-2 hover:underline"
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
