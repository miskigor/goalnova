import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminScoutVerificationsView } from "@/components/admin/AdminScoutVerificationsView";

/**
 * Internal admin UI only (no external redirects).
 * URLs: `/admin/scout-verifications` or `/[locale]/admin/scout-verifications` (middleware + next-intl).
 */
type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return { title: t("adminScoutVerificationsTitle") };
}

export default async function AdminScoutVerificationsPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminScoutVerificationsView />;
}
