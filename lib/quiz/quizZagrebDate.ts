import { QUIZ_TIMEZONE } from "@/lib/quiz/quizConfig";

/** `YYYY-MM-DD` in Europe/Zagreb — must match `goalnova_quiz_zagreb_today()`. */
export function getQuizZagrebTodayIso(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: QUIZ_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
