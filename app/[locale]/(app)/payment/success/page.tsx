import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PaymentSuccessActivation } from "@/components/payment/PaymentSuccessActivation";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ session_id?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "payment" });
  return { title: t("successTitle") };
}

export default async function PaymentSuccessPage({ params, searchParams }: Props) {
  const { locale } = await params;
  const sp = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "payment" });
  const sessionId = String(sp.session_id ?? "").trim();

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-10 sm:px-5">
      <div className="rounded-2xl border border-gn-accent/35 bg-gn-accent/10 p-6">
        <h1 className="text-2xl font-bold text-gn-text">{t("successTitle")}</h1>
        <p className="mt-2 text-sm text-gn-text-secondary">{t("successBody")}</p>
        <PaymentSuccessActivation sessionId={sessionId} />
        <Link
          href="/home"
          className="mt-5 inline-flex rounded-xl bg-gn-accent px-4 py-2.5 text-sm font-semibold text-black"
        >
          {t("goToDashboard")}
        </Link>
      </div>
    </div>
  );
}

