import "server-only";

import { createServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import { videoPlaybackUrl } from "@/lib/video/videoPlaybackUrl";
import { extractVideoFramesFromUrl } from "./extractVideoFrames";
import {
  analyzeFootballClipWithOpenAI,
  VideoAiConfigError,
} from "./openaiVideoAnalysis";
import { mockVideoAnalysisProvider } from "./mockVideoAnalysisProvider";
import type { VideoAnalysisScores } from "./types";

export async function runServerVideoAiAnalysis(params: {
  videoId: string;
  locale?: string;
}): Promise<VideoAnalysisScores> {
  const videoId = params.videoId.trim();
  if (!videoId) throw new Error("invalid_video_id");

  const hasOpenAi = Boolean(process.env.OPENAI_API_KEY?.trim());
  const demoAllowed =
    process.env.NEXT_PUBLIC_ALLOW_DEMO_AI_SCORING === "true";

  if (!hasOpenAi) {
    if (demoAllowed) {
      return mockVideoAnalysisProvider.analyzeVideo({
        videoId,
        locale: params.locale,
      });
    }
    throw new VideoAiConfigError(
      "AI scoring is not configured. Set OPENAI_API_KEY or enable demo scoring for development.",
    );
  }

  const service = createServiceRoleClient();
  if (!service) throw new Error("supabase_service_unavailable");

  const { data: video, error } = await service
    .from("videos")
    .select("id, video_url, source_video_url, processed_video_url")
    .eq("id", videoId)
    .maybeSingle();

  if (error || !video) {
    throw new Error("video_not_found");
  }

  const playbackUrl = videoPlaybackUrl(video);
  if (!playbackUrl) {
    throw new Error("video_playback_missing");
  }

  const frames = await extractVideoFramesFromUrl(playbackUrl);
  return analyzeFootballClipWithOpenAI({
    videoId,
    locale: params.locale,
    frames,
  });
}
