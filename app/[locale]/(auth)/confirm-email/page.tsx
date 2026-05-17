import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ConfirmEmailCard } from "@/components/auth/ConfirmEmailCard";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "authSignup" });
  return { title: t("confirmEmailTitle") };
}

export default async function ConfirmEmailPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ConfirmEmailCard />;
}
