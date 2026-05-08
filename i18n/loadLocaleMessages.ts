import { mergeMessagesWithFallback } from "./mergeMessages";
import type { AppLocale } from "./routing";
import { routing } from "./routing";

/**
 * Eager locale chunks (same map as in request config) so Turbopack/webpack
 * always bundle every messages file.
 */
const loadMessages: Record<
  AppLocale,
  () => Promise<{ default: Record<string, unknown> }>
> = {
  en: () => import("../messages/en.json"),
  hr: () => import("../messages/hr.json"),
  de: () => import("../messages/de.json"),
  bs: () => import("../messages/bs.json"),
  es: () => import("../messages/es.json"),
  pt: () => import("../messages/pt.json"),
  sr: () => import("../messages/sr.json"),
  fr: () => import("../messages/fr.json"),
  it: () => import("../messages/it.json"),
  nl: () => import("../messages/nl.json"),
  tr: () => import("../messages/tr.json"),
  ar: () => import("../messages/ar.json"),
};

/** English + deep-merge locale over en (missing keys fall back to en). */
export async function loadMergedMessages(
  locale: AppLocale,
): Promise<Record<string, unknown>> {
  const enMessages = (await loadMessages.en()).default;
  if (locale === routing.defaultLocale) {
    return enMessages;
  }
  return mergeMessagesWithFallback(
    enMessages,
    (await loadMessages[locale]()).default ?? {},
  );
}
