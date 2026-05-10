import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AccountRecoveryForm } from "@/components/support/AccountRecoveryForm";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return { title: t("accountRecoveryTitle") };
}

export default async function AccountRecoverySupportPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-5">
      <AccountRecoveryForm />
    </div>
  );
}
