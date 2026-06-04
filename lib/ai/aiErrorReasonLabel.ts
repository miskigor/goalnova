/**
 * Human-readable labels for AI flow failure codes (existing API / client errors).
 */

const REASONS: Record<string, { en: string; hr: string }> = {
  ai_not_configured: {
    en: "Server missing OPENAI_API_KEY (ai_not_configured).",
    hr: "Na serveru nema OPENAI_API_KEY (ai_not_configured).",
  },
  service_role_missing: {
    en: "Server missing SUPABASE_SERVICE_ROLE_KEY (service_role_missing).",
    hr: "Na serveru nema SUPABASE_SERVICE_ROLE_KEY (service_role_missing).",
  },
  video_download_failed: {
    en: "Video could not be downloaded for analysis (video_download_failed).",
    hr: "Video se nije mogao preuzeti za analizu (video_download_failed).",
  },
  video_not_found: {
    en: "Video not found in database (video_not_found).",
    hr: "Video nije pronađen u bazi (video_not_found).",
  },
  video_playback_missing: {
    en: "Video has no playback URL (video_playback_missing).",
    hr: "Video nema URL za reprodukciju (video_playback_missing).",
  },
  openai_failed: {
    en: "OpenAI request failed (openai_failed).",
    hr: "OpenAI zahtjev nije uspio (openai_failed).",
  },
  timeout: {
    en: "Analysis timed out (timeout).",
    hr: "Analiza je istekla (timeout).",
  },
  permission_denied: {
    en: "Permission denied for this analysis (permission_denied).",
    hr: "Nema dozvole za ovu analizu (permission_denied).",
  },
  network_error: {
    en: "Network error calling /api/videos/ai-analyze (network_error).",
    hr: "Mrežna greška pri pozivu /api/videos/ai-analyze (network_error).",
  },
  not_authenticated: {
    en: "Not signed in (not_authenticated).",
    hr: "Nisi prijavljen (not_authenticated).",
  },
  save_failed: {
    en: "Analysis ran but could not save to database (save_failed).",
    hr: "Analiza je prošla, ali se nije mogla spremiti (save_failed).",
  },
  load_failed: {
    en: "Could not load saved analysis (load_failed).",
    hr: "Nije moguće učitati spremljenu analizu (load_failed).",
  },
  load_saved_timeout: {
    en: "Loading saved analysis timed out (load_saved_timeout).",
    hr: "Učitavanje spremljene analize je isteklo (load_saved_timeout).",
  },
  scout_access_denied: {
    en: "Scout access not allowed for this run (scout_access_denied).",
    hr: "Scout pristup nije dozvoljen (scout_access_denied).",
  },
  premium_check_timeout: {
    en: "Premium status check timed out (premium_check_timeout).",
    hr: "Provjera Premium statusa je istekla (premium_check_timeout).",
  },
  analysis_failed: {
    en: "Server analysis failed (analysis_failed).",
    hr: "Serverska analiza nije uspjela (analysis_failed).",
  },
  invalid_video_id: {
    en: "Invalid video id (invalid_video_id).",
    hr: "Nevaljan ID videa (invalid_video_id).",
  },
  not_active: {
    en: "Analysis cannot run in current state (not_active).",
    hr: "Analiza se ne može pokrenuti u ovom stanju (not_active).",
  },
};

function localeKey(locale: string): "en" | "hr" {
  return locale.toLowerCase().split("-")[0] === "hr" ? "hr" : "en";
}

/** Label for UI; falls back to raw code if unknown. */
export function getAiErrorReasonLabel(code: string, locale: string): string {
  const key = code.trim();
  if (!key) return "";
  if (key.startsWith("ai_analyze_http_")) {
    const status = key.replace("ai_analyze_http_", "");
    const lang = localeKey(locale);
    if (status === "404") {
      return lang === "hr"
        ? "API ruta /api/videos/ai-analyze nije dostupna (404)."
        : "API route /api/videos/ai-analyze not available (404).";
    }
    return lang === "hr"
      ? `API greška HTTP ${status} (${key}).`
      : `API error HTTP ${status} (${key}).`;
  }
  if (key.startsWith("save_failed:")) {
    const detail = key.slice("save_failed:".length).trim();
    const lang = localeKey(locale);
    return lang === "hr"
      ? `Spremanje nije uspjelo: ${detail}`
      : `Save failed: ${detail}`;
  }
  if (key.startsWith("load_failed:")) {
    const detail = key.slice("load_failed:".length).trim();
    const lang = localeKey(locale);
    return lang === "hr"
      ? `Učitavanje nije uspjelo: ${detail}`
      : `Load failed: ${detail}`;
  }
  const row = REASONS[key];
  if (row) return row[localeKey(locale)];
  return key;
}
