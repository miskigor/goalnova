import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ResetPasswordCard } from "@/components/auth/ResetPasswordCard";
import { PRIVATE_PAGE_ROBOTS } from "@/lib/seo/privateRobots";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return { title: t("resetPasswordTitle"), robots: PRIVATE_PAGE_ROBOTS };
}

export default async function ResetPasswordPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="mx-auto w-full max-w-lg px-4 py-12 sm:px-5">
      <ResetPasswordCard />
    </div>
  );
}
