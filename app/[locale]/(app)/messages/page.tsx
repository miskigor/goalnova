import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "@/i18n/navigation";
import { PRIVATE_PAGE_ROBOTS } from "@/lib/seo/privateRobots";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "messages" });
  return { title: t("title"), robots: PRIVATE_PAGE_ROBOTS };
}

/** Inbox lives at `/notifications`; keep `/messages` as a stable alias. */
export default async function MessagesPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  redirect({ href: "/notifications", locale });
}
