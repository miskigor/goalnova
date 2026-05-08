"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  fetchMyPlayerPremiumProfile,
  fetchMyPlayerProfileStats,
  type PlayerProfileStatsRow,
} from "@/lib/supabase/playerPremium";
import { isPlayerPremium } from "@/lib/premium/playerPremium";

export function PlayerStatsPageView() {
  const t = useTranslations("premium");
  const [loading, setLoading] = useState(true);
  const [premium, setPremium] = useState(false);
  const [stats, setStats] = useState<PlayerProfileStatsRow | null>(null);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      const [{ profile }, { stats: s }] = await Promise.all([
        fetchMyPlayerPremiumProfile(),
        fetchMyPlayerProfileStats(),
      ]);
      if (!mounted) return;
      setPremium(isPlayerPremium(profile));
      setStats(s);
      setLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  if (loading) return <div className="text-sm text-gn-text-secondary">Loading…</div>;

  if (!premium) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-gn-text-secondary">{t("playerStatisticsAvailableInPlayerPremium")}</p>
        <Link href="/player/premium" className="inline-flex rounded-xl bg-gn-accent px-4 py-2 font-semibold text-black">
          {t("upgradeToPlayerPremium")}
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2 text-sm text-gn-text-secondary">
      <h1 className="text-2xl font-bold text-gn-text">{t("playerStatistics")}</h1>
      <p>{t("profileViews")}: {stats?.profile_views ?? 0}</p>
      <p>{t("videoViews")}: {stats?.video_views ?? 0}</p>
      <p>{t("scoutSaves")}: {stats?.scout_saves ?? 0}</p>
      <p>{t("scoutContacts")}: {stats?.scout_contacts ?? 0}</p>
    </div>
  );
}
