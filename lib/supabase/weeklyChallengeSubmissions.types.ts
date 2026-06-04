/** Keep in sync with `20260605120000_weekly_challenge_submissions_phase2.sql`. */

export const WEEKLY_CHALLENGE_FREE_SUBMISSION_LIMIT = 1;
export const WEEKLY_CHALLENGE_PREMIUM_SUBMISSION_LIMIT = 3;

export type WeeklyChallengeSubmissionStatus =
  | "pending"
  | "submitted"
  | "scored"
  | "rejected";

export type WeeklyChallengeSubmissionRow = {
  id: string;
  challenge_id: string;
  player_id: string;
  video_id: string | null;
  score: number | null;
  rank: number | null;
  status: WeeklyChallengeSubmissionStatus;
  created_at: string;
  updated_at: string;
};

export type WeeklyChallengeSubmissionInsert = {
  id?: string;
  challenge_id: string;
  player_id: string;
  video_id?: string | null;
  score?: number | null;
  rank?: number | null;
  status?: WeeklyChallengeSubmissionStatus;
  created_at?: string;
  updated_at?: string;
};

export type WeeklyChallengeSubmissionUpdate = Partial<
  Omit<WeeklyChallengeSubmissionInsert, "id" | "challenge_id" | "player_id" | "created_at">
>;

export type WeeklyChallengeSubmissionQuota = {
  limit: number;
  used: number;
  remaining: number;
  isPremium: boolean;
};
