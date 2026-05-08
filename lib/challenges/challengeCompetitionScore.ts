/**
 * Competition ranking: combines AI overall score with engagement (likes).
 * Used for challenge leaderboards; weights are tunable in one place.
 */

const WEIGHT_AI = 0.55;
const WEIGHT_LIKES = 0.45;

/**
 * @param aiOverall — 0–100 or null if not analyzed
 * @param likeCount — raw like count
 * @param maxLikesInPool — max likes among competing videos in the same pool (>= 1)
 * @returns 0–100 style score for sorting and display
 */
export function competitionScore(
  aiOverall: number | null | undefined,
  likeCount: number,
  maxLikesInPool: number,
): number {
  const likes = Math.max(0, Number(likeCount) || 0);
  const maxL = Math.max(1, Number(maxLikesInPool) || 1);
  const likeNorm = Math.min(1, likes / maxL);
  const ai =
    aiOverall != null && Number.isFinite(aiOverall)
      ? Math.min(100, Math.max(0, aiOverall)) / 100
      : 0;
  const raw = WEIGHT_AI * ai + WEIGHT_LIKES * likeNorm;
  return Math.round(raw * 1000) / 10;
}
