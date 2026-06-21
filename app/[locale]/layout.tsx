import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { LocaleIntlProviders } from "@/components/i18n/LocaleIntlProviders";
import type { AppLocale } from "@/i18n/routing";
import { routing } from "@/i18n/routing";
import { buildBrandLinkPreviewMetadata } from "@/lib/seo/englishLinkPreview";
import { buildLocaleAlternates, localizedCanonicalPath } from "@/lib/seo/alternates";
import { PUBLIC_INDEX_ROBOTS } from "@/lib/seo/publicIndexRobots";
import { buildSiteVerificationMetadata } from "@/lib/seo/siteVerification";
import { getServerSiteOrigin, siteMetadataBase } from "@/lib/site/serverSiteOrigin";
import { isMobileLayoutStableV2Enabled } from "@/lib/layout/mobileLayoutStableV2Flag";
import { isMobileLayoutV3Enabled } from "@/lib/layout/mobileLayoutV3Flag";
import { MLV2_CRITICAL_NON_HOME_CSS } from "@/lib/layout/mlv2CriticalCss";
import { MLV3_CRITICAL_CSS } from "@/lib/layout/mlv3CriticalCss";
import "@/components/layout/mobile-v2/mobileLayoutStableV2.css";
import "@/components/layout/mobile-v2/mobileLayoutStableV2Content.css";
import "@/components/scout/scoutPageLayout.css";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });
  const origin = getServerSiteOrigin();
  const metadataBase = siteMetadataBase(origin);
  const canonicalPath = localizedCanonicalPath(locale, "/");
  const linkPreview = buildBrandLinkPreviewMetadata({ canonicalPath, origin });

  return {
    metadataBase,
    title: {
      default: t("rootTitle"),
      template: t("rootTitleTemplate"),
    },
    description: t("rootDescription"),
    alternates: {
      ...buildLocaleAlternates("/"),
      canonical: canonicalPath,
    },
    robots: PUBLIC_INDEX_ROBOTS,
    openGraph: linkPreview.openGraph,
    twitter: linkPreview.twitter,
    ...buildSiteVerificationMetadata(),
  };
}

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const mobileLayoutStableV2 = isMobileLayoutStableV2Enabled();
  const mobileLayoutV3 = isMobileLayoutV3Enabled();

  return (
    <>
      {mobileLayoutStableV2 ? (
        <style
          id="mlv2-critical-non-home"
          dangerouslySetInnerHTML={{ __html: MLV2_CRITICAL_NON_HOME_CSS }}
        />
      ) : null}
      {mobileLayoutV3 ? (
        <style
          id="mlv3-critical"
          dangerouslySetInnerHTML={{ __html: MLV3_CRITICAL_CSS }}
        />
      ) : null}
      <LocaleIntlProviders locale={locale as AppLocale}>{children}</LocaleIntlProviders>
    </>
  );
}
