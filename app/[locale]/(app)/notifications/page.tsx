import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MessagesInboxPageShell } from "@/components/messages/MessagesInboxPageShell";
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
      <MessagesInboxPageShell title={t("title")} />
    </div>
  );
}
