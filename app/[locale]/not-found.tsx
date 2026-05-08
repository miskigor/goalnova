"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export default function NotFoundPage() {
  const t = useTranslations("notFound");

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-semibold text-gn-text">{t("title")}</h1>
      <p className="max-w-sm text-sm text-gn-text-secondary">{t("body")}</p>
      <Link
        href="/"
        className="rounded-xl bg-gn-accent px-5 py-2.5 text-sm font-semibold text-black hover:bg-gn-accent-hover"
      >
        {t("cta")}
      </Link>
    </div>
  );
}
