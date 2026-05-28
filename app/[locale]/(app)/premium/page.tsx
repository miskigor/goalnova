import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppMobileTabPageShell } from "@/components/layout/AppMobileTabPageShell";

const PREMIUM_MOBILE_SHELL_CLASS =
  "max-lg:!flex max-lg:h-full max-lg:min-h-0 max-lg:w-full max-lg:max-w-full max-lg:flex-1 max-lg:flex-col max-lg:overflow-hidden max-lg:!space-y-0 max-lg:!pb-0 max-lg:!pt-0 max-lg:!px-0";

const PricingView = dynamic(
  () =>
    import("@/components/premium/PricingView").then((m) => ({ default: m.PricingView })),
  {
    loading: () => (
      <AppMobileTabPageShell data-premium-fit-viewport className={PREMIUM_MOBILE_SHELL_CLASS}>
        <div
          className="flex min-h-0 flex-1 w-full items-center justify-center rounded-2xl border border-gn-border-subtle bg-gn-surface/30 px-4 py-8"
          role="status"
          aria-busy
        >
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-gn-accent border-t-transparent"
            aria-hidden
          />
        </div>
      </AppMobileTabPageShell>
    ),
  },
);

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "billing" });
  return { title: t("title") };
}

export default async function PremiumPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <AppMobileTabPageShell data-premium-fit-viewport className={PREMIUM_MOBILE_SHELL_CLASS}>
      <PricingView />
    </AppMobileTabPageShell>
  );
}
