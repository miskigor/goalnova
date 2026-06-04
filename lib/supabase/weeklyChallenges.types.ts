/** Weekly challenge tables — keep in sync with `20260604120000_weekly_challenges_admin_foundation.sql`. */

export type WeeklyChallengeRow = {
  id: string;
  title: string;
  description: string | null;
  rules: string | null;
  equipment: string | null;
  reward_xp: number;
  badge_name: string | null;
  max_video_duration_seconds: number | null;
  free_attempts: number;
  premium_attempts: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
};

export type WeeklyChallengeInsert = {
  id?: string;
  title: string;
  description?: string | null;
  rules?: string | null;
  equipment?: string | null;
  reward_xp?: number;
  badge_name?: string | null;
  max_video_duration_seconds?: number | null;
  free_attempts?: number;
  premium_attempts?: number;
  starts_at?: string | null;
  ends_at?: string | null;
  is_active?: boolean;
  is_public?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type WeeklyChallengeUpdate = Partial<
  Omit<WeeklyChallengeInsert, "id" | "created_at">
>;

export type WeeklyChallengeFormInput = {
  title: string;
  description: string;
  rules: string;
  equipment: string;
  rewardXp: number;
  badgeName: string;
  maxVideoDurationSeconds: number | null;
  freeAttempts: number;
  premiumAttempts: number;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  isPublic: boolean;
};
