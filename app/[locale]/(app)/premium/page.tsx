import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AppMobileTabPageShell } from "@/components/layout/AppMobileTabPageShell";

const PricingView = dynamic(
  () =>
    import("@/components/premium/PricingView").then((m) => ({ default: m.PricingView })),
  {
    loading: () => (
      <AppMobileTabPageShell>
        <div
          className="flex min-h-[16rem] w-full items-center justify-center rounded-2xl border border-gn-border-subtle bg-gn-surface/30 px-4 py-16"
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
    <AppMobileTabPageShell>
      <PricingView />
    </AppMobileTabPageShell>
  );
}
