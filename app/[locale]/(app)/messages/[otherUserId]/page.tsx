import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { ConversationView } from "@/components/messages/ConversationView";
import { isLooseUuid } from "@/lib/uuid";

type Props = {
  params: Promise<{ locale: string; otherUserId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "messages" });
  return { title: t("title") };
}

export default async function ConversationPage({ params }: Props) {
  const { locale, otherUserId } = await params;
  setRequestLocale(locale);

  if (!isLooseUuid(otherUserId)) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-lg pb-8 lg:max-w-2xl">
      <ConversationView otherUserId={otherUserId} />
    </div>
  );
}
