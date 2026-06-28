import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ClubProfileView } from "@/components/clubs/ClubProfileView";
import { AppMobileTabPageShell } from "@/components/layout/AppMobileTabPageShell";
import { buildPublicPageMetadata } from "@/lib/seo/buildPublicPageMetadata";

type Props = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  const t = await getTranslations({ locale, namespace: "clubs" });
  return buildPublicPageMetadata({
    locale,
    pathname: `/clubs/${slug}`,
    title: `${slug} · ${t("title")}`,
    description: t("subtitle"),
  });
}

export default async function ClubProfilePage({ params }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  return (
    <AppMobileTabPageShell>
      <ClubProfileView slug={slug} />
    </AppMobileTabPageShell>
  );
}
