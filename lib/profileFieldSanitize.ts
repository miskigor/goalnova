import type { ClipboardEvent } from "react";
import type { Json } from "@/lib/supabase/database.types";

/**
 * Client-safe sanitization for profile and related free-text fields.
 * Strips SQL-ish tokens and fragments, clamps length, and applies field-specific rules.
 */

export const PROFILE_FIELD_LIMITS = {
  full_name: 200,
  username: 40,
  bio: 6000,
  careerHistory: 4000,
  shortText: 120,
  organization: 200,
  scoutDescription: 4000,
  url: 2048,
  email: 320,
} as const;

const SQL_KEYWORD_RE =
  /\b(?:select|insert|update|delete|drop|alter|create|truncate|merge|grant|revoke|exec|execute|union|into|from|where|join|having|group\s+by|order\s+by|begin|commit|rollback|declare|cast|table|database|schema|index|view|procedure|function)\b/gi;

function removeNullBytes(s: string): string {
  return s.replace(/\0/g, "");
}

function stripSqlKeywords(s: string): string {
  return s.replace(SQL_KEYWORD_RE, " ");
}

function stripSqlishFragments(s: string): string {
  let out = s;
  out = out.replace(/\/\*[\s\S]*?\*\//g, " ");
  out = out.replace(/--[^\n\r]*/g, " ");
  out = out.replace(/;\s*(?:select|insert|update|delete|drop|alter|create|truncate|exec|execute|union)\b/gi, " ");
  out = out.replace(/['"]\s*or\s*['"]?\s*\d+\s*=\s*['"]?\s*\d+/gi, "");
  out = out.replace(/;\s*$/gm, " ");
  return out;
}

function clampLength(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max);
}

/** Collapse runs of whitespace to a single space; do not `trim()` — that removed trailing spaces on every keystroke in controlled inputs. Trim happens at save via `emptyToNull` / submit paths. */
function collapseSpaces(s: string): string {
  return s.replace(/\s+/g, " ");
}

/**
 * Heuristic: multi-signal SQL / script dumps (used to block paste into profile fields).
 */
export function looksLikeSqlOrScript(text: string): boolean {
  const t = text.trim();
  if (t.length < 10) return false;
  let score = 0;
  if (/\bselect\b[\s\S]{0,200}\bfrom\b/i.test(t)) score += 3;
  if (/\binsert\b[\s\S]{0,120}\binto\b/i.test(t)) score += 3;
  if (/\bupdate\b[\s\S]{0,120}\bset\b/i.test(t)) score += 3;
  if (/\bdelete\b[\s\S]{0,120}\bfrom\b/i.test(t)) score += 3;
  if (/\bdrop\b\s+(?:table|database|schema|index|view)\b/i.test(t)) score += 3;
  if (/--[^\n\r]+/m.test(t) || /\/\*/.test(t)) score += 2;
  if (/;\s*(?:select|insert|update|delete|drop|create|alter)\b/i.test(t)) score += 2;
  if (/\bunion\b[\s\S]{0,80}\bselect\b/i.test(t)) score += 3;
  return score >= 3;
}

export function sanitizeFullName(input: string): string {
  let s = removeNullBytes(String(input ?? ""));
  s = stripSqlishFragments(s);
  s = stripSqlKeywords(s);
  s = s.replace(/[^\p{L}\p{M}\s'.-]/gu, "");
  s = collapseSpaces(s);
  return clampLength(s, PROFILE_FIELD_LIMITS.full_name);
}

export function sanitizeUsername(input: string): string {
  let s = removeNullBytes(String(input ?? "").trim().toLowerCase());
  s = stripSqlishFragments(s);
  s = stripSqlKeywords(s);
  s = s.replace(/[^a-z0-9_.-]/g, "");
  return clampLength(s, PROFILE_FIELD_LIMITS.username);
}

export function sanitizeLongProfileText(input: string, max: number): string {
  let s = removeNullBytes(String(input ?? ""));
  s = stripSqlishFragments(s);
  s = stripSqlKeywords(s);
  s = s.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  s = s.replace(/\n{5,}/g, "\n\n\n\n");
  return clampLength(s, max);
}

export function sanitizeBio(input: string): string {
  return sanitizeLongProfileText(input, PROFILE_FIELD_LIMITS.bio);
}

export function sanitizeCareerHistory(input: string): string {
  return sanitizeLongProfileText(input, PROFILE_FIELD_LIMITS.careerHistory);
}

/** Plain-text editor value from `player_profiles.career_history` jsonb. */
export function careerHistoryFromDb(value: Json | null | undefined): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) {
    if (
      typeof value === "object" &&
      value !== null &&
      "text" in value &&
      typeof (value as { text: unknown }).text === "string"
    ) {
      return (value as { text: string }).text;
    }
    return "";
  }
  if (value.length === 0) return "";
  if (value.every((item) => typeof item === "string")) {
    return value.join("\n\n");
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "";
  }
}

/** Save plain-text career notes into jsonb (empty → `[]`). */
export function careerHistoryToDb(text: string): Json {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as Json;
      if (Array.isArray(parsed)) return parsed;
    } catch {
      /* free text */
    }
  }
  return [trimmed];
}

export function sanitizeShortProfileField(input: string): string {
  let s = removeNullBytes(String(input ?? ""));
  s = stripSqlishFragments(s);
  s = stripSqlKeywords(s);
  s = collapseSpaces(s);
  return clampLength(s, PROFILE_FIELD_LIMITS.shortText);
}

export function sanitizeOrganizationField(input: string): string {
  let s = removeNullBytes(String(input ?? ""));
  s = stripSqlishFragments(s);
  s = stripSqlKeywords(s);
  s = collapseSpaces(s);
  return clampLength(s, PROFILE_FIELD_LIMITS.organization);
}

export function sanitizeEmailForStorage(input: string): string {
  let s = removeNullBytes(String(input ?? "").trim().toLowerCase());
  s = stripSqlishFragments(s);
  s = stripSqlKeywords(s);
  s = s.replace(/[\s;'"<>()[\]{}]/g, "");
  return clampLength(s, PROFILE_FIELD_LIMITS.email);
}

export function sanitizeWebUrl(input: string): string {
  let s = removeNullBytes(String(input ?? "").trim());
  s = stripSqlishFragments(s);
  s = stripSqlKeywords(s);
  s = s.replace(/\s/g, "");
  return clampLength(s, PROFILE_FIELD_LIMITS.url);
}

/** Digits only (e.g. age) — drops pasted SQL or text. */
export function sanitizeIntegerString(input: string, maxLen = 3): string {
  return removeNullBytes(String(input ?? ""))
    .replace(/\D/g, "")
    .slice(0, maxLen);
}

/** Non-negative decimal-ish input for height/weight fields. */
export function sanitizePositiveNumberInput(input: string, maxLen = 8): string {
  let s = removeNullBytes(String(input ?? "")).replace(/[^\d.]/g, "");
  const firstDot = s.indexOf(".");
  if (firstDot !== -1) {
    s =
      s.slice(0, firstDot + 1) +
      s.slice(firstDot + 1).replace(/\./g, "");
  }
  return s.slice(0, maxLen);
}

export function sanitizeScoutApplyDescription(input: string): string {
  let s = removeNullBytes(String(input ?? ""));
  s = stripSqlishFragments(s);
  s = stripSqlKeywords(s);
  s = s.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  s = s.replace(/\n{5,}/g, "\n\n\n\n");
  return clampLength(s, PROFILE_FIELD_LIMITS.scoutDescription);
}

function emptyToNull(s: string): string | null {
  const t = s.trim();
  return t === "" ? null : t;
}

export type PlayerProfileSanitizedPatch = {
  full_name?: string | null;
  username?: string | null;
  bio?: string | null;
  position?: string | null;
  preferred_foot?: string | null;
  city?: string | null;
  country?: string | null;
  club?: string | null;
};

export function sanitizePlayerProfileStrings(
  patch: PlayerProfileSanitizedPatch,
): PlayerProfileSanitizedPatch {
  const out: PlayerProfileSanitizedPatch = {};
  if (patch.full_name !== undefined) {
    out.full_name = emptyToNull(sanitizeFullName(patch.full_name ?? ""));
  }
  if (patch.username !== undefined) {
    out.username = emptyToNull(sanitizeUsername(patch.username ?? ""));
  }
  if (patch.bio !== undefined) {
    out.bio = emptyToNull(sanitizeBio(patch.bio ?? ""));
  }
  if (patch.position !== undefined) {
    out.position = emptyToNull(sanitizeShortProfileField(patch.position ?? ""));
  }
  if (patch.preferred_foot !== undefined) {
    out.preferred_foot = emptyToNull(
      sanitizeShortProfileField(patch.preferred_foot ?? ""),
    );
  }
  if (patch.city !== undefined) {
    out.city = emptyToNull(sanitizeShortProfileField(patch.city ?? ""));
  }
  if (patch.country !== undefined) {
    out.country = emptyToNull(sanitizeShortProfileField(patch.country ?? ""));
  }
  if (patch.club !== undefined) {
    out.club = emptyToNull(sanitizeShortProfileField(patch.club ?? ""));
  }
  return out;
}

export type ScoutProfileSanitizedPatch = {
  bio?: string | null;
  organization?: string | null;
  role?: string | null;
  city?: string | null;
  country?: string | null;
};

export function sanitizeScoutProfileStrings(
  patch: ScoutProfileSanitizedPatch,
): ScoutProfileSanitizedPatch {
  const out: ScoutProfileSanitizedPatch = {};
  if (patch.bio !== undefined) {
    out.bio = emptyToNull(sanitizeBio(patch.bio ?? ""));
  }
  if (patch.organization !== undefined) {
    out.organization = emptyToNull(
      sanitizeOrganizationField(patch.organization ?? ""),
    );
  }
  if (patch.role !== undefined) {
    out.role = emptyToNull(sanitizeShortProfileField(patch.role ?? ""));
  }
  if (patch.city !== undefined) {
    out.city = emptyToNull(sanitizeShortProfileField(patch.city ?? ""));
  }
  if (patch.country !== undefined) {
    out.country = emptyToNull(sanitizeShortProfileField(patch.country ?? ""));
  }
  return out;
}

const ADMIN_PLAYER_STRING_KEYS: (keyof PlayerProfileSanitizedPatch)[] = [
  "full_name",
  "username",
  "bio",
  "position",
  "preferred_foot",
  "city",
  "country",
  "club",
];

export function sanitizeAdminPlayerProfilePatch(
  patch: Record<string, string | number | null>,
): Record<string, string | number | null> {
  const strIn: PlayerProfileSanitizedPatch = {};
  for (const k of ADMIN_PLAYER_STRING_KEYS) {
    if (k in patch && typeof patch[k] === "string") {
      strIn[k] = patch[k] as string;
    }
  }
  const strOut = sanitizePlayerProfileStrings(strIn);
  return { ...patch, ...strOut };
}

export function sanitizeAdminScoutProfilePatch(
  patch: Record<string, string | null>,
): Record<string, string | null> {
  const out = { ...patch };
  const s = sanitizeScoutProfileStrings({
    bio: typeof out.bio === "string" ? out.bio : undefined,
    organization:
      typeof out.organization === "string" ? out.organization : undefined,
    role: typeof out.role === "string" ? out.role : undefined,
    city: typeof out.city === "string" ? out.city : undefined,
    country: typeof out.country === "string" ? out.country : undefined,
  });
  if ("bio" in patch) out.bio = s.bio ?? null;
  if ("organization" in patch) out.organization = s.organization ?? null;
  if ("role" in patch) out.role = s.role ?? null;
  if ("city" in patch) out.city = s.city ?? null;
  if ("country" in patch) out.country = s.country ?? null;
  return out;
}

export function sanitizeAdminScoutApplyPatch(
  patch: Record<string, string | null>,
): Record<string, string | null> {
  const out = { ...patch };
  if (typeof out.scout_apply_full_name === "string") {
    out.scout_apply_full_name = emptyToNull(
      sanitizeFullName(out.scout_apply_full_name),
    );
  }
  if (typeof out.scout_apply_organization === "string") {
    out.scout_apply_organization = emptyToNull(
      sanitizeOrganizationField(out.scout_apply_organization),
    );
  }
  if (typeof out.scout_apply_business_email === "string") {
    out.scout_apply_business_email = emptyToNull(
      sanitizeEmailForStorage(out.scout_apply_business_email),
    );
  }
  if (typeof out.scout_apply_country === "string") {
    out.scout_apply_country = emptyToNull(
      sanitizeShortProfileField(out.scout_apply_country),
    );
  }
  if (typeof out.scout_apply_description === "string") {
    out.scout_apply_description = emptyToNull(
      sanitizeScoutApplyDescription(out.scout_apply_description),
    );
  }
  if (typeof out.scout_apply_web_url === "string") {
    out.scout_apply_web_url = emptyToNull(
      sanitizeWebUrl(out.scout_apply_web_url),
    );
  }
  return out;
}

/**
 * Blocks paste of obvious SQL/script dumps; otherwise inserts clipboard text through sanitizers and restores caret.
 */
export function handleProfileFieldPaste(
  e: ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>,
  currentValue: string,
  sanitizeChunk: (s: string) => string,
  sanitizeFull: (s: string) => string,
  setValue: (v: string) => void,
  onSqlBlocked?: () => void,
): void {
  const pasted = e.clipboardData.getData("text/plain");
  if (looksLikeSqlOrScript(pasted)) {
    e.preventDefault();
    onSqlBlocked?.();
    return;
  }
  e.preventDefault();
  const el = e.currentTarget;
  const start = el.selectionStart ?? currentValue.length;
  const end = el.selectionEnd ?? currentValue.length;
  const chunk = sanitizeChunk(pasted);
  const merged = currentValue.slice(0, start) + chunk + currentValue.slice(end);
  setValue(sanitizeFull(merged));
  const pos = start + chunk.length;
  queueMicrotask(() => {
    try {
      el.setSelectionRange(pos, pos);
    } catch {
      /* lost focus or unsupported */
    }
  });
}
