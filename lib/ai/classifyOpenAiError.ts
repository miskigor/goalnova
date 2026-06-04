/** Maps OpenAI / vision errors to stable API codes (no secrets). */

export type OpenAiErrorLogFields = {
  name: string;
  message: string;
  status: number | null;
  code: string | null;
  type: string | null;
  model: string;
};

export function openAiModelFromEnv(): string {
  return process.env.OPENAI_VIDEO_ANALYSIS_MODEL?.trim() || "gpt-4o-mini";
}

function tryParseOpenAiBody(body: string): {
  code?: string;
  type?: string;
  message?: string;
} | null {
  const start = body.indexOf("{");
  if (start < 0) return null;
  try {
    const parsed = JSON.parse(body.slice(start)) as {
      error?: { code?: string; type?: string; message?: string };
    };
    return parsed.error ?? null;
  } catch {
    return null;
  }
}

/** Extract log-safe fields from thrown Error message (never includes API key). */
export function extractOpenAiLogFields(
  err: unknown,
  model: string,
): OpenAiErrorLogFields {
  const name = err instanceof Error ? err.name : "Error";
  const message = err instanceof Error ? err.message : String(err);
  const httpMatch = message.match(/openai_http_(\d+)(?::([\s\S]*))?/);

  if (httpMatch) {
    const status = Number.parseInt(httpMatch[1], 10);
    const body = httpMatch[2]?.trim() ?? "";
    const apiErr = tryParseOpenAiBody(body);
    return {
      name: "OpenAiHttpError",
      message: apiErr?.message?.slice(0, 500) || message.slice(0, 500),
      status: Number.isFinite(status) ? status : null,
      code: apiErr?.code ?? null,
      type: apiErr?.type ?? null,
      model,
    };
  }

  return {
    name,
    message: message.slice(0, 500),
    status: null,
    code: message.startsWith("openai_") ? message : null,
    type: null,
    model,
  };
}

/** Classify internal OpenAI error text to a client-safe code. */
export function classifyOpenAiError(message: string): string {
  const msg = message.trim();
  if (!msg) return "openai_failed";

  const httpMatch = msg.match(/openai_http_(\d+)(?::([\s\S]*))?/);
  if (httpMatch) {
    const status = Number.parseInt(httpMatch[1], 10);
    const body = httpMatch[2]?.trim() ?? "";
    const apiErr = tryParseOpenAiBody(body);
    const apiCode = (apiErr?.code ?? "").toLowerCase();
    const apiType = (apiErr?.type ?? "").toLowerCase();

    if (status === 401) return "openai_auth_failed";
    if (
      status === 429 ||
      apiCode === "rate_limit_exceeded" ||
      apiType === "rate_limit_error"
    ) {
      return "openai_rate_limited";
    }
    if (
      apiCode === "insufficient_quota" ||
      body.toLowerCase().includes("insufficient_quota") ||
      body.toLowerCase().includes("billing")
    ) {
      return "openai_quota_exceeded";
    }
    if (
      status === 404 ||
      apiCode === "model_not_found" ||
      (body.toLowerCase().includes("model") &&
        body.toLowerCase().includes("not found"))
    ) {
      return "openai_model_not_available";
    }
    if (status === 408 || body.toLowerCase().includes("timeout")) {
      return "openai_timeout";
    }
    if (status === 400 || status === 422 || status === 413) {
      return "openai_invalid_request";
    }
    return "openai_failed";
  }

  if (
    msg === "openai_empty_response" ||
    msg === "openai_invalid_json" ||
    msg === "openai_schema_mismatch"
  ) {
    return "openai_invalid_request";
  }

  if (msg.includes("timeout") || msg.includes("timed out")) {
    return "openai_timeout";
  }

  if (msg.startsWith("openai_")) {
    return "openai_failed";
  }

  return "openai_failed";
}
