/**
 * Third-party share destination URLs — safe URL encoding throughout.
 * Modal social grid order: WhatsApp → X → Facebook → Messenger → Telegram → LinkedIn → Reddit → Email.
 */

const REDDIT_TITLE_MAX = 300;

export function buildWhatsAppShareUrl(text: string, pageUrl: string): string {
  const u = pageUrl.trim();
  const combined = `${text}\n${u}`.trim();
  return `https://wa.me/?text=${encodeURIComponent(combined)}`;
}

/** X (Twitter) web intent — opens compose in browser / app. */
export function buildTwitterShareUrl(text: string, pageUrl: string): string {
  const u = pageUrl.trim();
  const params = new URLSearchParams({
    text,
    url: u,
  });
  return `https://x.com/intent/tweet?${params.toString()}`;
}

export function buildFacebookShareUrl(pageUrl: string): string {
  const u = pageUrl.trim();
  return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}`;
}

/** Opens the Messenger app when installed (mobile). */
export function buildMessengerShareUrl(pageUrl: string): string {
  const u = pageUrl.trim();
  return `fb-messenger://share/?link=${encodeURIComponent(u)}`;
}

export function buildTelegramShareUrl(text: string, pageUrl: string): string {
  const u = pageUrl.trim();
  const params = new URLSearchParams({
    url: u,
    text,
  });
  return `https://t.me/share/url?${params.toString()}`;
}

export function buildLinkedInShareUrl(pageUrl: string): string {
  const u = pageUrl.trim();
  return `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(u)}`;
}

export function buildRedditShareUrl(title: string, pageUrl: string): string {
  const u = pageUrl.trim();
  const t = title.trim().slice(0, REDDIT_TITLE_MAX);
  const params = new URLSearchParams({
    url: u,
    title: t,
  });
  return `https://www.reddit.com/submit?${params.toString()}`;
}

export function buildEmailShareUrl(
  subject: string,
  bodyText: string,
  pageUrl: string,
): string {
  const u = pageUrl.trim();
  const body = `${bodyText.trim()}\n\n${u}`.trim();
  return `mailto:?subject=${encodeURIComponent(subject.trim())}&body=${encodeURIComponent(body)}`;
}

export type VideoShareDestinationId =
  | "whatsapp"
  | "twitter"
  | "facebook"
  | "messenger"
  | "telegram"
  | "linkedin"
  | "reddit"
  | "email";

export const VIDEO_SHARE_DESTINATION_ORDER: VideoShareDestinationId[] = [
  "whatsapp",
  "twitter",
  "facebook",
  "messenger",
  "telegram",
  "linkedin",
  "reddit",
  "email",
];

export type VideoShareDestinationLink = {
  id: VideoShareDestinationId;
  href: string;
};

export function buildVideoShareDestinationLinks(input: {
  pageUrl: string;
  shareText: string;
  shareTitle: string;
  /** When set, used for Reddit only (e.g. caption-enriched). */
  redditTitle?: string | null;
}): VideoShareDestinationLink[] {
  const pageUrl = input.pageUrl.trim();
  if (!pageUrl) return [];

  const { shareText, shareTitle } = input;
  const redditRaw =
    input.redditTitle?.trim() ||
    shareTitle.trim() ||
    shareText.trim() ||
    "PitchRusch";

  const hrefs: Record<VideoShareDestinationId, string> = {
    whatsapp: buildWhatsAppShareUrl(shareText, pageUrl),
    twitter: buildTwitterShareUrl(shareText, pageUrl),
    facebook: buildFacebookShareUrl(pageUrl),
    messenger: buildMessengerShareUrl(pageUrl),
    telegram: buildTelegramShareUrl(shareText, pageUrl),
    linkedin: buildLinkedInShareUrl(pageUrl),
    reddit: buildRedditShareUrl(redditRaw, pageUrl),
    email: buildEmailShareUrl(shareTitle || "PitchRusch", shareText, pageUrl),
  };

  return VIDEO_SHARE_DESTINATION_ORDER.map((id) => ({
    id,
    href: hrefs[id],
  }));
}
