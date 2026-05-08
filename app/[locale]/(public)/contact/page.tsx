import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { LegalPageLayout, LegalSection } from "@/components/legal/LegalPageLayout";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return { title: t("contactTitle") };
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("legal");

  return (
    <LegalPageLayout title={t("contact.title")} backLabel={t("common.backHome")}>
      <LegalSection title={t("contact.companyTitle")}>
        <p className="text-gn-text">{t("contact.companyName")}</p>
      </LegalSection>

      <LegalSection title={t("contact.emailTitle")}>
        <p>{t("contact.emailIntro")}</p>
        <p>
          <a
            href={`mailto:${t("contact.emailAddress")}`}
            className="font-medium text-gn-accent underline-offset-2 transition-colors hover:text-gn-accent-hover hover:underline"
          >
            {t("contact.emailAddress")}
          </a>
        </p>
      </LegalSection>

      <LegalSection title={t("contact.addressTitle")}>
        <p>{t("contact.addressPlaceholder")}</p>
      </LegalSection>
    </LegalPageLayout>
  );
}
