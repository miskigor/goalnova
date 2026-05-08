import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { SignupCard } from "@/components/auth/SignupCard";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return { title: t("signupTitle") };
}

export default async function SignupPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <SignupCard />;
}
