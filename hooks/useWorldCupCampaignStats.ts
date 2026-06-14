"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { fetchPlayerProfileGamification } from "@/lib/supabase/playerProfileGamification";
import { rpcQuizGetToday } from "@/lib/supabase/dailyQuiz";
import { supabase } from "@/lib/supabase/client";

export type WorldCupCampaignStats = {
  authed: boolean;
  totalXp: number | null;
  weeklyRank: number | null;
  weeklyXp: number | null;
};

const EMPTY: WorldCupCampaignStats = {
  authed: false,
  totalXp: null,
  weeklyRank: null,
  weeklyXp: null,
};

export function useWorldCupCampaignStats(enabled: boolean) {
  const locale = useLocale();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<WorldCupCampaignStats>(EMPTY);

  const refresh = useCallback(async () => {
    setLoading(true);
    const { data: sessionData } = await supabase.auth.getSession();
    const uid = sessionData.session?.user?.id ?? null;
    if (!uid) {
      setStats(EMPTY);
      setLoading(false);
      return;
    }

    const [gamification, quiz] = await Promise.all([
      fetchPlayerProfileGamification(uid),
      rpcQuizGetToday(locale),
    ]);

    setStats({
      authed: true,
      totalXp: gamification?.total_xp ?? quiz.data?.total_quiz_xp ?? 0,
      weeklyRank:
        (quiz.data?.weekly_rank ?? 0) > 0 ? (quiz.data?.weekly_rank ?? null) : null,
      weeklyXp: quiz.data?.weekly_xp ?? 0,
    });
    setLoading(false);
  }, [locale]);

  useEffect(() => {
    if (!enabled) return;
    void refresh();
  }, [enabled, refresh]);

  return { stats, loading, refresh };
}
