"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "next-intl";
import {
  fetchDailyQuizStatusSnapshot,
  invalidateDailyQuizStatusSnapshot,
  type DailyQuizStatusSnapshot,
} from "@/lib/quiz/fetchDailyQuizStatusSnapshot";
import { subscribeDailyQuizStatusChanged } from "@/lib/quiz/dailyQuizStatusEvents";

const EMPTY_SNAPSHOT: DailyQuizStatusSnapshot = {
  authed: false,
  hasQuestion: false,
  alreadyAnswered: false,
  pending: false,
  streak: 0,
  questionText: null,
  category: null,
};

export function useDailyQuizStatus() {
  const locale = useLocale();
  const [loading, setLoading] = useState(true);
  const [snapshot, setSnapshot] = useState<DailyQuizStatusSnapshot>(EMPTY_SNAPSHOT);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const next = await fetchDailyQuizStatusSnapshot(locale);
      setSnapshot(next);
    } catch {
      setSnapshot(EMPTY_SNAPSHOT);
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    return subscribeDailyQuizStatusChanged(() => {
      invalidateDailyQuizStatusSnapshot();
      void refresh();
    });
  }, [refresh]);

  return { loading, ...snapshot, refresh };
}
