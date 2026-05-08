import type { AugmentedHomeFeedItem } from "@/lib/supabase/homeFeed";

/** Stable key for feed rows — must match `FeedItemCard` / `FeedVideoSurface` visibility id. */
export function feedItemVideoKey(item: AugmentedHomeFeedItem): string {
  const v = item.video;
  const id = v.id?.trim();
  if (id) return id;
  const u = (v.user_id ?? "").trim() || "unknown";
  const c = (v.created_at ?? "").trim() || "";
  return `${u}::${c}`;
}
