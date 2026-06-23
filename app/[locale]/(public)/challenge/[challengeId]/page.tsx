import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { FriendChallengeView } from "@/components/friendChallenge/FriendChallengeView";
import { PRIVATE_PAGE_ROBOTS } from "@/lib/seo/privateRobots";

type Props = {
  params: Promise<{ locale: string; challengeId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "friendChallenges" });
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: PRIVATE_PAGE_ROBOTS,
  };
}

export default async function FriendChallengePage({ params }: Props) {
  const { locale, challengeId } = await params;
  setRequestLocale(locale);
  const id = String(challengeId ?? "").trim();
  return <FriendChallengeView challengeId={id} />;
}
