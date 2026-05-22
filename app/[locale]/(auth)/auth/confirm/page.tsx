import type { Metadata } from "next";
import { PRIVATE_PAGE_ROBOTS } from "@/lib/seo/privateRobots";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthConfirmCallbackCard } from "@/components/auth/AuthConfirmCallbackCard";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "authSignup" });
  return { title: t("confirmEmailTitle"), robots: PRIVATE_PAGE_ROBOTS };
}

export default async function AuthConfirmPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AuthConfirmCallbackCard />;
}
