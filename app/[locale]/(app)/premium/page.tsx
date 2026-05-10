import type { Metadata } from "next";
import dynamic from "next/dynamic";
import { getTranslations, setRequestLocale } from "next-intl/server";

const PricingView = dynamic(
  () =>
    import("@/components/premium/PricingView").then((m) => ({ default: m.PricingView })),
  {
    loading: () => (
      <div
        className="mx-auto flex min-h-[16rem] w-full max-w-4xl items-center justify-center rounded-2xl border border-gn-border-subtle bg-gn-surface/30 px-4 py-16"
        role="status"
        aria-busy
      >
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-gn-accent border-t-transparent"
          aria-hidden
        />
      </div>
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
    <div className="mx-auto w-full max-w-6xl px-4 pb-10 sm:px-5">
      <PricingView />
    </div>
  );
}
