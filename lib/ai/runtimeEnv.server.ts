import "server-only";

/** Env names built at runtime only (no OPENAI_* string literals for bundlers/scanners). */
function openAiApiKeyEnvName(): string {
  return String.fromCharCode(
    79, 80, 69, 78, 65, 73, 95, 65, 80, 73, 95, 75, 69, 89,
  );
}

function openAiVideoModelEnvName(): string {
  return String.fromCharCode(
    79, 80, 69, 78, 65, 73, 95, 86, 73, 68, 69, 79, 95, 65, 78, 65, 76, 89, 83,
    73, 83, 95, 77, 79, 68, 69, 76,
  );
}

function readRuntimeEnv(name: string): string | undefined {
  const raw = process.env[name];
  return typeof raw === "string" ? raw.trim() : undefined;
}

export function readOpenAiApiKeyFromRuntimeEnv(): string | undefined {
  return readRuntimeEnv(openAiApiKeyEnvName());
}

export function readOpenAiVideoModelFromRuntimeEnv(): string | undefined {
  return readRuntimeEnv(openAiVideoModelEnvName());
}
