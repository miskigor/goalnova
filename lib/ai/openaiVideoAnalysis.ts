import "server-only";

import {
  getOpenAiApiKey,
  getOpenAiModel,
  VideoAiConfigError,
} from "./openaiRuntime.server";

export { VideoAiConfigError };
import {
  buildVideoAnalysisSystemMessageCombined,
  buildVideoAnalysisUserPrompt,
} from "./videoAnalysisPrompts";
import {
  parseAndNormalizeVideoAnalysisResponse,
  parseVideoAnalysisModelJson,
} from "./parseVideoAnalysisResponse";
import type { VideoAnalysisScores } from "./types";
import type { ExtractedFrame } from "./extractVideoFrames";

function localeInstruction(locale: string): string {
  const base = locale.toLowerCase().split("-")[0];
  if (base === "en") {
    return "Write strengths, improvements, badges, coach_feedback, and player_friendly_summary in English.";
  }
  return `Write strengths, improvements, badges, coach_feedback, and player_friendly_summary in the user's language (${base}). Keep badge names short and catchy (can stay English if natural).`;
}

export async function analyzeFootballClipWithOpenAI(params: {
  videoId: string;
  locale?: string;
  frames: ExtractedFrame[];
}): Promise<VideoAnalysisScores> {
  const locale = params.locale?.trim() || "en";
  const system = buildVideoAnalysisSystemMessageCombined();
  const userText = [
    buildVideoAnalysisUserPrompt({ videoId: params.videoId }),
    localeInstruction(locale),
    `You will receive ${params.frames.length} frames sampled from the same football clip (chronological order).`,
    "Classify football validity first. Only score skills you can see; use null for anything not visible.",
  ].join("\n\n");

  const imageParts = params.frames.map((frame) => ({
    type: "image_url" as const,
    image_url: {
      url: `data:${frame.mime};base64,${frame.base64}`,
      detail: "low" as const,
    },
  }));

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getOpenAiApiKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: getOpenAiModel(),
      temperature: 0.35,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: [{ type: "text", text: userText }, ...imageParts],
        },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(
      `openai_http_${res.status}:${errText.slice(0, 400) || res.statusText}`,
    );
  }

  const payload = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("openai_empty_response");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error("openai_invalid_json");
  }

  const normalized = parseAndNormalizeVideoAnalysisResponse(parsed);
  if (normalized) return normalized;

  const loose = parseVideoAnalysisModelJson(parsed);
  if (!loose) throw new Error("openai_schema_mismatch");
  throw new Error("openai_schema_mismatch");
}
