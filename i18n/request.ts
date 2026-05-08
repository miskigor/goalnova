import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { loadMergedMessages } from "./loadLocaleMessages";
import type { AppLocale } from "./routing";
import { routing } from "./routing";

/** Avoid importing `use-intl/core` here — it has led to RSC/bundler resolution issues. */
const MISSING_MESSAGE = "MISSING_MESSAGE";

/** Softer handling + fallback string so a missing key never hard-crashes the UI. */
const nextIntlErrorHandling = {
  onError(error: { code?: string; message?: string }) {
    if (error.code === MISSING_MESSAGE) {
      console.warn("[next-intl]", error.message);
      return;
    }
    console.error(error);
  },
  getMessageFallback({
    namespace,
    key,
  }: {
    error: unknown;
    key: string;
    namespace?: string;
  }) {
    return [namespace, key].filter(Boolean).join(".") || key;
  },
};

export default getRequestConfig(async ({ requestLocale }) => {
  try {
    const requested = await requestLocale;
    const locale = hasLocale(routing.locales, requested)
      ? requested
      : routing.defaultLocale;

    const messages = await loadMergedMessages(locale as AppLocale);

    return {
      locale,
      messages,
      ...nextIntlErrorHandling,
    };
  } catch (err) {
    console.error("[next-intl] getRequestConfig failed, falling back to English", err);
    return {
      locale: routing.defaultLocale,
      messages: await loadMergedMessages(routing.defaultLocale as AppLocale),
      ...nextIntlErrorHandling,
    };
  }
});
