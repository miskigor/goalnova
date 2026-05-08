"use client";

import { useTranslations } from "next-intl";
import { usePremium } from "@/components/premium/PremiumProvider";
import { Link } from "@/i18n/navigation";
import { fetchMyPlayerPremiumProfile } from "@/lib/supabase/playerPremium";
import { useEffect, useState } from "react";
import { isPlayerPremium } from "@/lib/premium/playerPremium";

export function PlayerPremiumPageView() {
  const t = useTranslations("premium");
  const { userId } = usePremium();
  const [active, setActive] = useState(false);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const { profile } = await fetchMyPlayerPremiumProfile();
      if (!mounted) return;
      setActive(isPlayerPremium(profile));
    })();
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold text-gn-text">{t("playerPremium")}</h1>
      <p className="text-sm text-gn-text-secondary">{t("playerPremiumDescription")}</p>
      <p className="text-lg font-semibold text-gn-text">4.99 EUR / month</p>
      <ul className="list-disc space-y-1 ps-5 text-sm text-gn-text-secondary">
        <li>{t("moreVideoUploads")}</li>
        <li>{t("priorityScoutVisibility")}</li>
        <li>{t("premiumBadge")}</li>
        <li>{t("featuredVideo")}</li>
        <li>{t("profileHighlight")}</li>
        <li>{t("detailedProfileStatistics")}</li>
      </ul>
      {!userId ? (
        <Link href="/login" className="inline-flex rounded-xl bg-gn-accent px-4 py-2 font-semibold text-black">
          {t("upgradeToPlayerPremium")}
        </Link>
      ) : (
        <div className="rounded-xl border border-gn-border-subtle px-4 py-3 text-sm text-gn-text-secondary">
          {active ? t("premiumPlayer") : t("upgradeToPlayerPremium")}
        </div>
      )}
    </div>
  );
}
