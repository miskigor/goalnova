import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminGate } from "@/components/admin/AdminGate";
import { AdminShell } from "@/components/admin/AdminShell";
import { PRIVATE_PAGE_ROBOTS } from "@/lib/seo/privateRobots";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return { title: t("adminDashboardTitle"), robots: PRIVATE_PAGE_ROBOTS };
}

/**
 * `/admin/*` is only for the platform owner (`royalexpert1@gmail.com`).
 * Club users and other accounts are sent home.
 */
export default async function AdminSectionLayout({ children, params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <AdminGate redirectNonAdminsTo="/home">
      <AdminShell>{children}</AdminShell>
    </AdminGate>
  );
}
