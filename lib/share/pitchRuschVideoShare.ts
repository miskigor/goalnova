import { devError } from "@/lib/devLog";
import { copyTextToClipboard } from "@/lib/share/copyToClipboard";
import {
  buildVideoShareDestinationLinks,
  type VideoShareDestinationLink,
} from "@/lib/share/socialShareUrls";
import {
  VIDEO_SHARE_BODY,
  videoShareTitle,
} from "@/lib/share/videoShareCopy";

const REDDIT_TITLE_MAX = 300;

/** Default English copy; override via {@link PitchRuschVideoShareParams.labels}. */
export const DEFAULT_PITCHRUSCH_SHARE_LABELS = {
  invalidUrl: "This link is not ready to share yet.",
  copyFailed: "Share failed",
} as const;

export type PitchRuschVideoShareLabels = {
  invalidUrl: string;
  copyFailed: string;
};

export type PitchRuschVideoShareParams = {
  videoId: string;
  playerName: string;
  caption?: string | null;
  /** Absolute public video page URL (canonical). */
  publicUrl: string;
  labels?: Partial<PitchRuschVideoShareLabels>;
};

export type PitchRuschSharePayload = {
  videoId: string;
  playerName: string;
  caption: string | null;
  /** Modal headline / prefill title */
  title: string;
  /** Prefill body for social apps */
  text: string;
  url: string;
};

export type PitchRuschCopyLinkResult =
  | { ok: true; kind: "copy" }
  | {
      ok: false;
      kind: "copy";
      code: "invalid_url" | "denied";
      message: string;
    };

function mergeLabels(
  input?: Partial<PitchRuschVideoShareLabels>,
): PitchRuschVideoShareLabels {
  return { ...DEFAULT_PITCHRUSCH_SHARE_LABELS, ...input };
}

function normalizePublicUrl(publicUrl: string): string | null {
  const u = publicUrl.trim();
  return u.length > 0 ? u : null;
}

function buildRedditTitle(
  shareTitle: string,
  caption: string | null | undefined,
): string | undefined {
  const cap = caption?.trim();
  if (!cap) return undefined;
  const combined = `${shareTitle} — ${cap}`;
  return combined.slice(0, REDDIT_TITLE_MAX);
}

export type PitchRuschVideoShareHandle = {
  readonly params: PitchRuschVideoShareParams;
  readonly payload: PitchRuschSharePayload;
  readonly labels: PitchRuschVideoShareLabels;
  /** Clipboard */
  copyLink(): Promise<PitchRuschCopyLinkResult>;
  /** Prefilled social URLs (same order as the share modal). */
  getSocialDestinations(): VideoShareDestinationLink[];
};

/**
 * PitchRusch video sharing: copy link and social destination URLs.
 * Pass an absolute `publicUrl` (e.g. from `window.location.origin` + `localizedPublicVideoPath`).
 */
export function createPitchRuschVideoShare(
  params: PitchRuschVideoShareParams,
): PitchRuschVideoShareHandle {
  const labels = mergeLabels(params.labels);
  const videoId = params.videoId.trim();
  const playerName = params.playerName.trim();
  const caption = params.caption?.trim() ? params.caption.trim() : null;
  const urlNorm = normalizePublicUrl(params.publicUrl);

  const title = videoShareTitle(playerName || "Player");
  const text = VIDEO_SHARE_BODY;

  const payload: PitchRuschSharePayload = {
    videoId,
    playerName,
    caption,
    title,
    text,
    url: urlNorm ?? "",
  };

  return {
    params: { ...params, videoId, playerName, caption, publicUrl: urlNorm ?? "" },
    payload,
    labels,

    async copyLink(): Promise<PitchRuschCopyLinkResult> {
      if (!urlNorm) {
        return {
          ok: false,
          kind: "copy",
          code: "invalid_url",
          message: labels.invalidUrl,
        };
      }

      try {
        const ok = await copyTextToClipboard(urlNorm);
        if (ok) return { ok: true, kind: "copy" };
        return {
          ok: false,
          kind: "copy",
          code: "denied",
          message: labels.copyFailed,
        };
      } catch (e) {
        devError("[PitchRusch share] createPitchRuschVideoShare.copyLink failed", e);
        return {
          ok: false,
          kind: "copy",
          code: "denied",
          message: labels.copyFailed,
        };
      }
    },

    getSocialDestinations(): VideoShareDestinationLink[] {
      if (!urlNorm) return [];
      try {
        return buildVideoShareDestinationLinks({
          pageUrl: urlNorm,
          shareText: text,
          shareTitle: title,
          redditTitle: buildRedditTitle(title, caption),
        });
      } catch (e) {
        devError("[PitchRusch share] getSocialDestinations failed", e);
        return [];
      }
    },
  };
}

export async function pitchRuschVideoShareCopyLink(
  params: PitchRuschVideoShareParams,
): Promise<PitchRuschCopyLinkResult> {
  return createPitchRuschVideoShare(params).copyLink();
}

export function pitchRuschVideoShareSocialUrls(
  params: PitchRuschVideoShareParams,
): VideoShareDestinationLink[] {
  return createPitchRuschVideoShare(params).getSocialDestinations();
}
