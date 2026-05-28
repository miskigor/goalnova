import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MessagesInboxView } from "@/components/messages/MessagesInboxView";
import { APP_MESSAGES_INBOX_PAGE_CLASS } from "@/lib/layout/appShellClasses";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "messages" });
  return { title: t("title") };
}

export default async function NotificationsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "messages" });

  return (
    <div data-messages-inbox className={APP_MESSAGES_INBOX_PAGE_CLASS}>
      <h1 className="mb-5 min-w-0 break-words text-xl font-semibold tracking-tight text-gn-text max-lg:mb-2 max-lg:text-sm sm:mb-6 sm:text-2xl">
        {t("title")}
      </h1>
      <MessagesInboxView />
    </div>
  );
}
