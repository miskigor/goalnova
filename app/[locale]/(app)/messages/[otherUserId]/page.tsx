import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ConversationView } from "@/components/messages/ConversationView";
import { APP_MESSAGES_THREAD_PAGE_CLASS } from "@/lib/layout/appShellClasses";
import { isLooseUuid } from "@/lib/uuid";
import { PRIVATE_PAGE_ROBOTS } from "@/lib/seo/privateRobots";

type Props = {
  params: Promise<{ locale: string; otherUserId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "messages" });
  return { title: t("title"), robots: PRIVATE_PAGE_ROBOTS };
}

export default async function ConversationPage({ params }: Props) {
  const { locale, otherUserId } = await params;
  setRequestLocale(locale);

  if (!isLooseUuid(otherUserId)) {
    notFound();
  }

  return (
    <div data-messages-thread className={APP_MESSAGES_THREAD_PAGE_CLASS}>
      <ConversationView otherUserId={otherUserId} />
    </div>
  );
}
