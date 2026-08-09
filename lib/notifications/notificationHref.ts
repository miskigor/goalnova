import type { NotificationRow } from "@/lib/supabase/notifications";

/** Best navigation target when tapping an activity notification. */
export function hrefForNotification(n: NotificationRow): string | null {
  const videoId = n.related_video_id?.trim();
  if (videoId && (n.type === "like" || n.type === "comment" || n.type === "ai_analysis")) {
    return `/video/${videoId}`;
  }

  const relatedUser = n.related_user_id?.trim();
  if (relatedUser && (n.type === "message" || n.type === "admin_notice")) {
    return `/messages/${relatedUser}`;
  }
  if (relatedUser && n.type === "follow") {
    return `/player/${relatedUser}`;
  }

  if (n.type === "upload" || n.type === "profile") {
    return "/profile";
  }
  if (n.type === "scout_verification") {
    return "/scout-apply";
  }
  if (n.type === "challenge") {
    return "/challenges";
  }
  if (n.type === "welcome" || n.type === "onboarding") {
    return "/home";
  }

  return null;
}
