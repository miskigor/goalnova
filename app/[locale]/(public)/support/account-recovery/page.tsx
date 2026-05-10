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

  const t = await getTranslations({ locale, namespace: "accountRecoverySupport" });
  const labels = {
    title: t("title"),
    intro: t("intro"),
    accountEmailLabel: t("accountEmailLabel"),
    contactEmailLabel: t("contactEmailLabel"),
    usernameLabel: t("usernameLabel"),
    usernamePlaceholder: t("usernamePlaceholder"),
    messageLabel: t("messageLabel"),
    messagePlaceholder: t("messagePlaceholder"),
    submit: t("submit"),
    submitting: t("submitting"),
    confirmMessage: t("confirmMessage"),
    submitFailed: t("submitFailed"),
    validationEmail: t("validationEmail"),
    validationMessageShort: t("validationMessageShort"),
    backToLogin: t("backToLogin"),
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 pb-28 sm:px-5 lg:pb-10">
      <AccountRecoveryForm labels={labels} />
    </div>
  );
}
