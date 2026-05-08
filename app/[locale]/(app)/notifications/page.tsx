import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { MessagesInboxView } from "@/components/messages/MessagesInboxView";

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
    <div className="mx-auto w-full min-w-0 max-w-lg pb-8 lg:max-w-2xl">
      <h1 className="mb-5 text-xl font-semibold tracking-tight text-gn-text sm:mb-6 sm:text-2xl">
        {t("title")}
      </h1>
      <MessagesInboxView />
    </div>
  );
}
