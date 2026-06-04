import "server-only";

export class VideoAiConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VideoAiConfigError";
  }
}

/** Read OpenAI credentials at request time (never import from client code). */
export function hasOpenAiApiKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

export function getOpenAiApiKey(): string {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new VideoAiConfigError("OpenAI API key is not configured on the server");
  }
  return key;
}

export function getOpenAiModel(): string {
  return process.env.OPENAI_VIDEO_ANALYSIS_MODEL?.trim() || "gpt-4o-mini";
}
