import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  LegalBulletList,
  LegalPageLayout,
  LegalSection,
} from "@/components/legal/LegalPageLayout";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return { title: t("privacyTitle") };
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("legal");

  return (
    <LegalPageLayout
      title={t("privacy.title")}
      lastUpdated={t("privacy.lastUpdated")}
      backLabel={t("common.backHome")}
    >
      <LegalSection title={t("privacy.s1Title")}>
        <p>{t("privacy.s1p1")}</p>
      </LegalSection>

      <LegalSection title={t("privacy.s2Title")}>
        <p>{t("privacy.s2intro")}</p>
        <LegalBulletList
          items={[t("privacy.s2b1"), t("privacy.s2b2"), t("privacy.s2b3")]}
        />
        <p>{t("privacy.s2p2")}</p>
      </LegalSection>

      <LegalSection title={t("privacy.s3Title")}>
        <p>{t("privacy.s3p1")}</p>
        <LegalBulletList
          items={[t("privacy.s3b1"), t("privacy.s3b2"), t("privacy.s3b3")]}
        />
      </LegalSection>

      <LegalSection title={t("privacy.s4Title")}>
        <p>{t("privacy.s4p1")}</p>
        <p>{t("privacy.s4p2")}</p>
      </LegalSection>
    </LegalPageLayout>
  );
}
