import "server-only";

import {
  readOpenAiApiKeyFromRuntimeEnv,
  readOpenAiVideoModelFromRuntimeEnv,
} from "./runtimeEnv.server";

export class VideoAiConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "VideoAiConfigError";
  }
}

/** Read OpenAI credentials at request time (never import from client code). */
export function hasOpenAiApiKey(): boolean {
  return Boolean(readOpenAiApiKeyFromRuntimeEnv());
}

export function getOpenAiApiKey(): string {
  const key = readOpenAiApiKeyFromRuntimeEnv();
  if (!key) {
    throw new VideoAiConfigError("OpenAI API key is not configured on the server");
  }
  return key;
}

export function getOpenAiModel(): string {
  return readOpenAiVideoModelFromRuntimeEnv() || "gpt-4o-mini";
}
