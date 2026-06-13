export const DAILY_QUIZ_CHALLENGES_HREF = "/challenges?tab=quiz" as const;

export function challengesNavHref(quizPending: boolean): "/challenges" | typeof DAILY_QUIZ_CHALLENGES_HREF {
  return quizPending ? DAILY_QUIZ_CHALLENGES_HREF : "/challenges";
}
