/**
 * Single entry point for PitchRusch universal video sharing (URLs, copy, destinations).
 */

export {
  VIDEO_SHARE_BODY,
  videoShareTitle,
} from "@/lib/share/videoShareCopy";
export {
  buildVideoShareDestinationLinks,
  VIDEO_SHARE_DESTINATION_ORDER,
  type VideoShareDestinationId,
  type VideoShareDestinationLink,
} from "@/lib/share/socialShareUrls";
export { localizedPublicVideoPath, absolutePublicVideoUrl } from "@/lib/share/localizedVideoPath";
export { copyTextToClipboard } from "@/lib/share/copyToClipboard";
export {
  createPitchRuschVideoShare,
  pitchRuschVideoShareCopyLink,
  pitchRuschVideoShareSocialUrls,
  DEFAULT_PITCHRUSCH_SHARE_LABELS,
  type PitchRuschVideoShareParams,
  type PitchRuschVideoShareHandle,
  type PitchRuschSharePayload,
  type PitchRuschCopyLinkResult,
  type PitchRuschVideoShareLabels,
} from "@/lib/share/pitchRuschVideoShare";
