import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AdminMusicPage } from "@/components/admin/AdminMusicPage";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return { title: t("adminMusicTitle") };
}

export default async function AdminMusicRoute({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <AdminMusicPage />;
}
