import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { RoleSelectionCard } from "@/components/onboarding/RoleSelectionCard";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "onboardingRole" });
  return { title: t("metaTitle") };
}

export default async function RolePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <RoleSelectionCard />;
}

