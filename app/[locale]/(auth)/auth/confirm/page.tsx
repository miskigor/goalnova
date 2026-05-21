import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthConfirmCallbackCard } from "@/components/auth/AuthConfirmCallbackCard";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "authSignup" });
  return { title: t("confirmEmailTitle") };
}

export default async function AuthConfirmPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AuthConfirmCallbackCard />;
}
