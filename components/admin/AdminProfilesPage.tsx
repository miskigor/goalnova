"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export function AdminProfilesPage() {
  const t = useTranslations("adminDashboard");

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h1 className="text-2xl font-semibold text-white">{t("profilesTitle")}</h1>
      <p className="text-sm text-zinc-400">{t("profilesBody")}</p>
      <Link
        href="/admin/users"
        className="inline-flex rounded-lg bg-orange-500/90 px-4 py-2 text-sm font-semibold text-black"
      >
        {t("goUsers")}
      </Link>
    </div>
  );
}
