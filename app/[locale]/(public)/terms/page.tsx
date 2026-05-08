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
  return { title: t("termsTitle") };
}

export default async function TermsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("legal");

  return (
    <LegalPageLayout
      title={t("terms.title")}
      lastUpdated={t("terms.lastUpdated")}
      backLabel={t("common.backHome")}
    >
      <LegalSection title={t("terms.s1Title")}>
        <p>{t("terms.s1p1")}</p>
        <p>{t("terms.s1p2")}</p>
      </LegalSection>

      <LegalSection title={t("terms.s2Title")}>
        <p>{t("terms.s2p1")}</p>
        <LegalBulletList
          items={[
            t("terms.s2b1"),
            t("terms.s2b2"),
            t("terms.s2b3"),
            t("terms.s2b4"),
          ]}
        />
      </LegalSection>

      <LegalSection title={t("terms.s3Title")}>
        <p>{t("terms.s3p1")}</p>
        <p>{t("terms.s3p2")}</p>
      </LegalSection>

      <LegalSection title={t("terms.s4Title")}>
        <p>{t("terms.s4p1")}</p>
        <p>{t("terms.s4p2")}</p>
      </LegalSection>
    </LegalPageLayout>
  );
}
