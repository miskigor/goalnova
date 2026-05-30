import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { BenefitsReferralPage } from "@/components/benefits/BenefitsReferralPage";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "benefits" });
  return { title: t("benefitsTitle") };
}

export default async function BenefitsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <BenefitsReferralPage variant="invite-only" />;
}
