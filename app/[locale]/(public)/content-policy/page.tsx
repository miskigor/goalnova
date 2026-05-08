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
  return { title: t("contentPolicyTitle") };
}

export default async function ContentPolicyPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("legal");

  return (
    <LegalPageLayout
      title={t("content.title")}
      lastUpdated={t("content.lastUpdated")}
      backLabel={t("common.backHome")}
    >
      <LegalSection title={t("content.s1Title")}>
        <p>{t("content.s1p1")}</p>
        <p>{t("content.s1p2")}</p>
      </LegalSection>

      <LegalSection title={t("content.s2Title")}>
        <LegalBulletList
          items={[t("content.s2b1"), t("content.s2b2"), t("content.s2b3")]}
        />
      </LegalSection>

      <LegalSection title={t("content.s3Title")}>
        <p>{t("content.s3p1")}</p>
      </LegalSection>

      <LegalSection title={t("content.s4Title")}>
        <p>{t("content.s4p1")}</p>
      </LegalSection>

      <LegalSection title={t("content.s5Title")}>
        <p>{t("content.s5intro")}</p>
        <LegalBulletList
          items={[t("content.s5b1"), t("content.s5b2")]}
        />
      </LegalSection>

      <LegalSection title={t("content.s6Title")}>
        <p>{t("content.s6lead")}</p>
        <p>{t("content.s6p1")}</p>
        <p>
          <a
            href={`mailto:${t("content.s6email")}`}
            className="font-medium text-gn-accent underline-offset-2 transition-colors hover:text-gn-accent-hover hover:underline"
          >
            {t("content.s6email")}
          </a>
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
