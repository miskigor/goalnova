import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import { ReferralDebugPage } from "@/components/debug/ReferralDebugPage";

type Props = { params: Promise<{ locale: string }> };

export const metadata: Metadata = {
  title: "Referral debug",
  robots: { index: false, follow: false },
};

export default async function ReferralDebugRoute({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <ReferralDebugPage />;
}
