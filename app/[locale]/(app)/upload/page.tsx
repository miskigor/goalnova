import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { UploadForm } from "@/components/upload/UploadForm";
import { PRIVATE_PAGE_ROBOTS } from "@/lib/seo/privateRobots";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ challenge_id?: string | string[] }>;
};

export async function generateMetadata({
  params,
  searchParams,
}: Props): Promise<Metadata> {
  const { locale } = await params;
  const sp = await searchParams;
  const t = await getTranslations({ locale, namespace: "upload" });
  const raw = sp.challenge_id;
  const q =
    typeof raw === "string"
      ? raw.trim()
      : Array.isArray(raw)
        ? String(raw[0] ?? "").trim()
        : "";
  if (q) {
    return { title: t("metaTitleChallenge"), robots: PRIVATE_PAGE_ROBOTS };
  }
  return { title: t("uploadTitle"), robots: PRIVATE_PAGE_ROBOTS };
}

export default async function UploadPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const tCommon = await getTranslations({ locale, namespace: "common" });
  return (
    <Suspense
      fallback={
        <div
          className="flex min-h-[40vh] items-center justify-center"
          role="status"
          aria-label={tCommon("loadingEllipsis")}
        >
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gn-accent border-t-transparent" />
        </div>
      }
    >
      <UploadForm />
    </Suspense>
  );
}

