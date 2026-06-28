import { supabase } from "@/lib/supabase/client";
import { logFullSupabaseError } from "@/lib/supabase/logError";

export type QuizQuestionPayload = {
  id: string;
  category: string;
  question_text: string;
  options: string[];
};

export type QuizAnswerPayload = {
  selected_option_index: number;
  is_correct: boolean;
  xp_awarded: number;
  correct_option_index: number;
  correct_option_text: string;
};

export type QuizViewerPayload = {
  display_name: string;
  username: string;
  country: string | null;
};

export type QuizTodayPayload = {
  locale: string;
  quiz_date: string;
  question: QuizQuestionPayload | null;
  already_answered: boolean;
  answer: QuizAnswerPayload | null;
  current_streak?: number;
  total_quiz_xp?: number;
  weekly_xp?: number;
  weekly_rank?: number;
  monthly_xp?: number;
  monthly_rank?: number;
  viewer?: QuizViewerPayload;
  error?: string;
};

export type QuizSubmitPayload = {
  locale: string;
  quiz_date: string;
  is_correct: boolean;
  xp_awarded: number;
  selected_option_index: number;
  correct_option_index: number;
  correct_option_text: string;
  current_streak: number;
  total_quiz_xp: number;
  weekly_xp: number;
  weekly_rank: number;
  monthly_xp: number;
  monthly_rank: number;
  streak_bonus_awarded: boolean;
};

export type QuizMonthlyLeaderboardRow = {
  rank: number;
  user_id: string;
  display_name: string;
  username: string;
  country: string | null;
  monthly_xp: number;
};

export type QuizLeaderboardRow = {
  rank: number;
  user_id: string;
  display_name: string;
  username: string;
  country: string | null;
  weekly_xp: number;
};

export async function rpcQuizGetToday(locale: string): Promise<{
  data: QuizTodayPayload | null;
  error: string | null;
}> {
  const { data, error } = await supabase.rpc("goalnova_quiz_get_today", {
    p_locale: locale,
  });
  if (error) {
    logFullSupabaseError("[dailyQuiz] goalnova_quiz_get_today", error);
    return { data: null, error: error.message };
  }
  return { data: (data ?? null) as QuizTodayPayload | null, error: null };
}

export async function rpcQuizSubmitAnswer(
  selectedOptionIndex: number,
  locale: string,
): Promise<{ data: QuizSubmitPayload | null; error: string | null }> {
  const { data, error } = await supabase.rpc("goalnova_quiz_submit_answer", {
    p_selected_option_index: selectedOptionIndex,
    p_locale: locale,
  });
  if (error) {
    logFullSupabaseError("[dailyQuiz] goalnova_quiz_submit_answer", error);
    return { data: null, error: error.message };
  }
  return { data: (data ?? null) as QuizSubmitPayload | null, error: null };
}

export async function rpcQuizWeeklyLeaderboard(
  locale: string,
  limit = 10,
): Promise<{ rows: QuizLeaderboardRow[]; error: string | null }> {
  const { data, error } = await supabase.rpc("goalnova_quiz_weekly_leaderboard", {
    p_locale: locale,
    p_limit: limit,
  });
  if (error) {
    logFullSupabaseError("[dailyQuiz] goalnova_quiz_weekly_leaderboard", error);
    return { rows: [], error: error.message };
  }
  const rows = (data ?? []) as QuizLeaderboardRow[];
  return {
    rows: rows.map((r) => ({
      rank: Number(r.rank),
      user_id: r.user_id,
      display_name: r.display_name,
      username: r.username,
      country: r.country?.trim() || null,
      weekly_xp: Number(r.weekly_xp),
    })),
    error: null,
  };
}

export async function rpcQuizMonthlyLeaderboard(
  locale: string,
  limit = 10,
): Promise<{ rows: QuizMonthlyLeaderboardRow[]; error: string | null }> {
  const { data, error } = await supabase.rpc("goalnova_quiz_monthly_leaderboard", {
    p_locale: locale,
    p_limit: limit,
  });
  if (error) {
    logFullSupabaseError("[dailyQuiz] goalnova_quiz_monthly_leaderboard", error);
    return { rows: [], error: error.message };
  }
  const rows = (data ?? []) as QuizMonthlyLeaderboardRow[];
  return {
    rows: rows.map((r) => ({
      rank: Number(r.rank),
      user_id: r.user_id,
      display_name: r.display_name,
      username: r.username,
      country: r.country?.trim() || null,
      monthly_xp: Number(r.monthly_xp),
    })),
    error: null,
  };
}
