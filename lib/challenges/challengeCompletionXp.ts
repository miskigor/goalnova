/** Mirrors `goalnova_challenge_slug_completion_xp` in Supabase. */
export function challengeSlugCompletionXp(slug: string | null | undefined): number {
  switch (slug?.trim()) {
    case "freestyle-challenge":
      return 75;
    case "sprint-20m-challenge":
    case "keepy-ups-challenge":
    case "dribbling-slalom-challenge":
    case "weak-foot-pass-challenge":
    case "crossbar-challenge":
      return 50;
    default:
      return 0;
  }
}
