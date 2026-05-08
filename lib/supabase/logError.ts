import { isDev } from "@/lib/devLog";

/** Fields PostgREST / Supabase clients usually attach (safe for UI + logs). */
export type PostgrestErrorFields = {
  message: string;
  code: string | null;
  details: string | null;
  hint: string | null;
  status: number | null;
};

/**
 * Pull message, code, details, hint from a Supabase/PostgREST error (never rely on JSON.stringify alone).
 */
export function extractPostgrestErrorFields(err: unknown): PostgrestErrorFields {
  if (!err || typeof err !== "object") {
    return {
      message: err == null ? "Unknown error" : String(err),
      code: null,
      details: null,
      hint: null,
      status: null,
    };
  }
  const e = err as Record<string, unknown>;
  const message =
    err instanceof Error
      ? err.message
      : typeof e.message === "string"
        ? e.message
        : "Request failed.";
  const code = typeof e.code === "string" ? e.code : null;
  const details = typeof e.details === "string" ? e.details : null;
  const hint = typeof e.hint === "string" ? e.hint : null;
  const statusRaw = e.status ?? e.statusCode;
  const status =
    typeof statusRaw === "number"
      ? statusRaw
      : typeof statusRaw === "string"
        ? Number.parseInt(statusRaw, 10)
        : null;
  return {
    message: String(message),
    code,
    details,
    hint,
    status: Number.isFinite(status as number) ? (status as number) : null,
  };
}

/**
 * Client-side fetch failed before a normal PostgREST body (offline, tab sleep, Safari “Load failed”, adblock, bad TLS on LAN).
 * These are not actionable app bugs — avoid `console.error` spam for them.
 */
export function isLikelyTransientNetworkFailure(err: unknown): boolean {
  const f = extractPostgrestErrorFields(err);
  const lower = f.message.toLowerCase();
  if (err instanceof TypeError) {
    if (lower.includes("load failed")) return true;
    if (lower.includes("failed to fetch")) return true;
    if (lower.includes("networkerror")) return true;
    if (lower.includes("terminated")) return true;
    if (lower.includes("aborted")) return true;
    if (lower.includes("offline") || lower.includes("internet connection")) {
      return true;
    }
  }
  // PostgREST / Supabase often wrap browser fetch failures as generic `Error` with
  // message like "TypeError: Failed to fetch" (string), not an actual TypeError.
  if (lower.includes("failed to fetch") || lower.includes("load failed")) {
    return true;
  }
  if (err instanceof Error && err.name === "AbortError") return true;
  if (typeof err === "object" && err !== null) {
    const n = (err as { name?: unknown }).name;
    if (n === "NetworkError" || n === "AbortError") return true;
  }
  return false;
}

/** One line per field so consoles never show only `{}`. */
export function logSupabaseErrorFields(label: string, err: unknown) {
  if (!isDev) return;
  const f = extractPostgrestErrorFields(err);
  console.error(
    `${label} | message=${f.message} | code=${f.code ?? "null"} | details=${f.details ?? "null"} | hint=${f.hint ?? "null"} | status=${f.status ?? "null"}`
  );
}

export function formatPostgrestErrorForScreen(f: PostgrestErrorFields): string {
  const lines = [
    `message: ${f.message}`,
    f.code != null ? `code: ${f.code}` : null,
    f.details != null ? `details: ${f.details}` : null,
    f.hint != null ? `hint: ${f.hint}` : null,
    f.status != null ? `status: ${f.status}` : null,
  ].filter(Boolean) as string[];
  return lines.join("\n");
}

/**
 * Logs Supabase / Storage errors with all useful fields (avoids empty `{}` in console).
 * PostgREST errors are `Error` subclasses — `JSON.stringify(err)` is often `{}`, so we always log a plain-text line first.
 */
export function logFullSupabaseError(
  label: string,
  err: unknown,
  context?: Record<string, unknown>
) {
  const e =
    err && typeof err === "object"
      ? (err as Record<string, unknown>)
      : ({} as Record<string, unknown>);

  const message =
    err instanceof Error
      ? err.message
      : typeof e.message === "string"
        ? e.message
        : String(e.message ?? err ?? "unknown");

  const code = e.code ?? null;
  const details = e.details ?? null;
  const hint = e.hint ?? null;
  const status = e.status ?? e.statusCode ?? null;
  const name = e.name ?? (err instanceof Error ? err.name : null);

  const ctxSuffix =
    context && Object.keys(context).length > 0
      ? ` | context=${JSON.stringify(context)}`
      : "";

  /** One line in all environments — PostgREST errors often stringify as `{}`. */
  console.error(
    `${label} | message=${String(message)} code=${code ?? "null"} details=${details ?? "null"} hint=${hint ?? "null"} status=${status ?? "null"} name=${name ?? "null"}${ctxSuffix}`
  );

  if (!isDev) return;

  logSupabaseErrorFields(`${label} | fields`, err);

  console.error(`${label} | originalError`, err);

  console.error(`${label} | structured`, {
    message: String(message),
    code,
    details,
    hint,
    status,
    error: e.error ?? null,
    name,
  });

  if (err && typeof err === "object") {
    console.error(`${label} | objectKeys`, Object.keys(err as object));
    console.error(
      `${label} | ownPropertyNames`,
      Object.getOwnPropertyNames(err as object)
    );
  }

  try {
    const s = JSON.stringify(err);
    if (s !== "{}") {
      console.error(`${label} | json`, s);
    } else {
      console.error(
        `${label} | json is "{}" — use the message=… line above (PostgREST Error is not JSON-serializable)`
      );
    }
  } catch {
    console.error(`${label} | (not JSON-serializable)`, String(err));
  }
}

export function supabaseErrorToUserMessage(err: unknown): string {
  if (err == null) return "Unknown error";
  if (typeof err !== "object") return String(err);
  const e = err as {
    message?: string;
    error?: string;
    details?: string;
    hint?: string;
    code?: string;
    statusCode?: number;
    status?: number;
  };
  const parts = [
    e.message,
    e.error && typeof e.error === "string" ? e.error : null,
    e.details,
    e.hint,
    e.code ? `code=${e.code}` : null,
    typeof e.statusCode === "number" ? `status=${e.statusCode}` : null,
    typeof e.status === "number" ? `status=${e.status}` : null,
  ].filter(Boolean);
  return parts.length ? parts.join(" — ") : "Request failed.";
}
