import type { AbstractIntlMessages } from "next-intl";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { LocalePreferenceSync } from "@/components/i18n/LocalePreferenceSync";
import { BootSplashDismiss } from "@/components/loading/BootSplashDismiss";

type Props = {
  locale: AppLocale;
  children: React.ReactNode;
};

export async function LocaleIntlProviders({ locale, children }: Props) {
  setRequestLocale(locale);

  let messages: AbstractIntlMessages;
  try {
    messages = await getMessages();
  } catch (err) {
    console.error("[locale layout] getMessages failed; using English messages fallback", err);
    const mod = await import("../../messages/en.json");
    messages = mod.default as unknown as AbstractIntlMessages;
  }

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <BootSplashDismiss />
      <LocalePreferenceSync />
      {children}
    </NextIntlClientProvider>
  );
}
