import type { Metadata } from "next";
import { PRIVATE_PAGE_ROBOTS } from "@/lib/seo/privateRobots";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ForgotPasswordCard } from "@/components/auth/ForgotPasswordCard";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return { title: t("forgotPasswordTitle"), robots: PRIVATE_PAGE_ROBOTS };
}

export default async function ForgotPasswordPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations({ locale, namespace: "authForgotPassword" });

  const labels = {
    title: t("title"),
    subtitle: t("subtitle"),
    email: t("email"),
    emailPlaceholder: t("emailPlaceholder"),
    submit: t("submit"),
    sending: t("sending"),
    success: t("success"),
    rateLimited: t("rateLimited"),
    sendFailed: t("sendFailed"),
    invalidEmail: t("invalidEmail"),
    backToLogin: t("backToLogin"),
    needSupport: t("needSupport"),
    needSupportLink: t("needSupportLink"),
  };

  return <ForgotPasswordCard labels={labels} />;
}
