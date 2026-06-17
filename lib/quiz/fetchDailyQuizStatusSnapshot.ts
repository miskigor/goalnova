import { getQuizZagrebTodayIso } from "@/lib/quiz/quizZagrebDate";
import { rpcQuizGetToday, type QuizTodayPayload } from "@/lib/supabase/dailyQuiz";
import { supabase } from "@/lib/supabase/client";

export type DailyQuizStatusSnapshot = {
  authed: boolean;
  hasQuestion: boolean;
  alreadyAnswered: boolean;
  pending: boolean;
  streak: number;
  questionText: string | null;
  category: string | null;
};

const CACHE_MS = 30_000;

let inflight: Promise<DailyQuizStatusSnapshot> | null = null;
let cache: {
  locale: string;
  quizDate: string;
  at: number;
  snapshot: DailyQuizStatusSnapshot;
} | null = null;

function snapshotFromPayload(
  authed: boolean,
  payload: QuizTodayPayload | null,
): DailyQuizStatusSnapshot {
  const hasQuestion = Boolean(payload?.question);
  const alreadyAnswered = Boolean(payload?.already_answered);
  return {
    authed,
    hasQuestion,
    alreadyAnswered,
    pending: authed && hasQuestion && !alreadyAnswered,
    streak: payload?.current_streak ?? 0,
    questionText: payload?.question?.question_text?.trim() || null,
    category: payload?.question?.category?.trim() || null,
  };
}

export function invalidateDailyQuizStatusSnapshot(): void {
  cache = null;
  inflight = null;
}

export async function fetchDailyQuizStatusSnapshot(
  locale: string,
): Promise<DailyQuizStatusSnapshot> {
  const now = Date.now();
  const today = getQuizZagrebTodayIso();
  if (cache && cache.quizDate !== today) {
    cache = null;
  }
  if (
    cache &&
    cache.locale === locale &&
    cache.quizDate === today &&
    now - cache.at < CACHE_MS
  ) {
    return cache.snapshot;
  }

  if (inflight) return inflight;

  inflight = (async () => {
    const { data: session } = await supabase.auth.getSession();
    const authed = Boolean(session.session?.user);
    const { data } = await rpcQuizGetToday(locale);
    const snapshot = snapshotFromPayload(authed, data);
    cache = {
      locale,
      quizDate: data?.quiz_date?.trim() || today,
      at: Date.now(),
      snapshot,
    };
    return snapshot;
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}
