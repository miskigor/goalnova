import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "payment" });
  return { title: t("cancelTitle") };
}

export default async function PaymentCancelPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "payment" });

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-10 sm:px-5">
      <div className="rounded-2xl border border-gn-border-subtle bg-gn-surface/40 p-6">
        <h1 className="text-2xl font-bold text-gn-text">{t("cancelTitle")}</h1>
        <p className="mt-2 text-sm text-gn-text-secondary">{t("cancelBody")}</p>
      </div>
    </div>
  );
}

