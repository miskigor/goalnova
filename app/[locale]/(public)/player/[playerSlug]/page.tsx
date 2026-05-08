import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { PlayerPublicProfile } from "@/components/profile/PlayerPublicProfile";

type Props = {
  params: Promise<{ locale: string; playerSlug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  return { title: t("playerProfileTitle") };
}

export default async function PlayerProfilePage({ params }: Props) {
  const { locale, playerSlug } = await params;
  setRequestLocale(locale);

  return <PlayerPublicProfile playerSlug={playerSlug} />;
}
