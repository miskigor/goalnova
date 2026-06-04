import "server-only";

/**
 * Read server env at request time without static `process.env.<NAME>` property access.
 * Avoids Next/Netlify build steps embedding secret values into `.next` when vars are
 * scoped to Builds.
 */
function readRuntimeEnv(parts: readonly string[]): string | undefined {
  const name = parts.join("_");
  const raw = process.env[name];
  return typeof raw === "string" ? raw.trim() : undefined;
}

const OPENAI_KEY_PARTS = ["OPEN", "AI", "API", "KEY"] as const;
const OPENAI_MODEL_PARTS = ["OPEN", "AI", "VIDEO", "ANALYSIS", "MODEL"] as const;

export function readOpenAiApiKeyFromRuntimeEnv(): string | undefined {
  return readRuntimeEnv(OPENAI_KEY_PARTS);
}

export function readOpenAiVideoModelFromRuntimeEnv(): string | undefined {
  return readRuntimeEnv(OPENAI_MODEL_PARTS);
}
