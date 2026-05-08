import type { NotificationRow } from "@/lib/supabase/notifications";

/** Stored in DB for onboarding rows — UI maps to `notifications.*` keys. */
export const GN_NOTIFY_PREFIX = "__gn:" as const;
export const GN_NOTIFY_SUFFIX = "__" as const;

export type NotificationTranslate = (
  key: string,
  values?: Record<string, string | number | Date>,
) => string;

const LEGACY_MESSAGE_PREVIEW = /^New message:\s*([\s\S]*)$/i;
const LEGACY_YOU_HAVE_MESSAGE = /^you have a new message\.?$/i;

function stripGnToken(message: string): string | null {
  const raw = message.trim();
  const prefix = GN_NOTIFY_PREFIX;
  const suffix = GN_NOTIFY_SUFFIX;
  if (!raw.startsWith(prefix) || !raw.endsWith(suffix)) return null;
  const inner = raw.slice(prefix.length, raw.length - suffix.length).trim();
  return inner.length > 0 ? inner : null;
}

/**
 * Localized primary line for a notification card (ignores raw DB English when possible).
 */
export function localizedNotificationMessage(
  n: NotificationRow,
  t: NotificationTranslate,
): string {
  const token = stripGnToken(n.message);
  if (token) {
    switch (token) {
      case "welcome_player":
        return t("onboardingWelcomePlayer");
      case "welcome_scout":
        return t("onboardingWelcomeScout");
      case "profile_prompt":
        return t("onboardingProfilePrompt");
      case "upload_prompt":
        return t("onboardingUploadPrompt");
      case "scout_verify_prompt":
        return t("onboardingScoutVerifyPrompt");
      case "scout_explore_prompt":
        return t("onboardingScoutExplorePrompt");
      case "scout_admin_review_pending":
        return t("scoutAdminReviewPending");
      default:
        break;
    }
  }

  switch (n.type) {
    case "follow":
      return t("follow");
    case "like":
      return t("likeVideo");
    case "comment":
      return t("commentVideo");
    case "message":
      return localizedDirectMessageBody(n.message, t);
    case "ai_analysis":
      return t("aiReady");
    case "scout_verification":
      if (/apply for scout verification/i.test(n.message)) {
        return t("onboardingScoutVerifyPrompt");
      }
      return /not approved/i.test(n.message)
        ? t("scoutRejected")
        : t("scoutApproved");
    case "welcome":
      if (/discover top football talent/i.test(n.message)) {
        return t("onboardingWelcomeScout");
      }
      return t("onboardingWelcomePlayer");
    case "profile":
      return t("onboardingProfilePrompt");
    case "upload":
      return t("onboardingUploadPrompt");
    case "onboarding":
      return t("onboardingScoutExplorePrompt");
    case "challenge":
      return t("challengeReady");
    default:
      return n.message;
  }
}

function localizedDirectMessageBody(raw: string, t: NotificationTranslate): string {
  const m = raw.match(LEGACY_MESSAGE_PREVIEW);
  if (m && m[1] !== undefined) {
    const preview = m[1].trim();
    return preview.length > 0
      ? t("newMessageWithPreview", { preview })
      : t("newMessage");
  }
  if (LEGACY_YOU_HAVE_MESSAGE.test(raw.trim())) {
    return t("newMessage");
  }
  const preview = raw.trim();
  return preview.length > 0
    ? t("newMessageWithPreview", { preview })
    : t("newMessage");
}

const TYPE_LABEL_KEYS: Record<string, string> = {
  follow: "typeLabelFollow",
  like: "typeLabelLike",
  comment: "typeLabelComment",
  message: "typeLabelMessage",
  ai_analysis: "typeLabelAiAnalysis",
  scout_verification: "typeLabelScoutVerification",
  welcome: "typeLabelWelcome",
  onboarding: "typeLabelOnboarding",
  profile: "typeLabelProfile",
  upload: "typeLabelUpload",
  challenge: "typeLabelChallenge",
};

export function localizedNotificationTypeLabel(
  type: string,
  t: NotificationTranslate,
): string {
  const key = TYPE_LABEL_KEYS[type];
  return key ? t(key) : type.replaceAll("_", " ");
}
