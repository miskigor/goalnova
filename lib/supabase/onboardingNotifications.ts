import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { logFullSupabaseError } from "@/lib/supabase/logError";
import { insertNotificationCompat } from "@/lib/supabase/notifications";
import { ensureWelcomeInboxMessage } from "@/lib/supabase/welcomeInboxMessage";

export type OnboardingNotificationRole = "player" | "scout";

/** System-driven types stored in public.notifications (see migration). */
export type SystemNotificationType =
  | "welcome"
  | "onboarding"
  | "profile"
  | "upload"
  | "scout_verification";

type Client = SupabaseClient<Database>;

type OnboardingSpec = {
  type: SystemNotificationType;
  message: string;
};

/** Machine tokens — UI maps via `notifications` namespace (see `notificationDisplay.ts`). */
const GN = (token: string) => `__gn:${token}__`;

const PLAYER_ONBOARDING: readonly OnboardingSpec[] = [
  {
    type: "welcome",
    message: GN("welcome_player"),
  },
  {
    type: "profile",
    message: GN("profile_prompt"),
  },
  {
    type: "upload",
    message: GN("upload_prompt"),
  },
] as const;

const SCOUT_ONBOARDING: readonly OnboardingSpec[] = [
  {
    type: "welcome",
    message: GN("welcome_scout"),
  },
  {
    type: "scout_verification",
    message: GN("scout_verify_prompt"),
  },
  {
    type: "onboarding",
    message: GN("scout_explore_prompt"),
  },
] as const;

/** All system onboarding types (matches DB partial unique index). */
export const SYSTEM_NOTIFICATION_TYPES: readonly SystemNotificationType[] = [
  "welcome",
  "onboarding",
  "profile",
  "upload",
  "scout_verification",
] as const;

function specsForRole(role: OnboardingNotificationRole): readonly OnboardingSpec[] {
  return role === "scout" ? SCOUT_ONBOARDING : PLAYER_ONBOARDING;
}

/** Collapse concurrent ensure calls for the same user (e.g. bootstrap + role save). */
const ensureInFlight = new Map<string, Promise<void>>();

/**
 * Inserts one system notification for the authenticated user (recipient = self, related_user_id = self).
 * Idempotent per (user_id, type) via partial unique index — duplicate key is ignored.
 * Never throws; logs clearly on failure.
 */
async function insertSystemNotification(
  client: Client,
  userId: string,
  spec: OnboardingSpec,
): Promise<void> {
  try {
    const { error } = await insertNotificationCompat(client, {
      user_id: userId,
      type: spec.type,
      message: spec.message,
      related_user_id: userId,
      related_video_id: null,
      related_challenge_id: null,
      is_read: false,
    });

    if (!error) return;

    const code =
      error && typeof error === "object" && "code" in error
        ? String((error as { code?: unknown }).code)
        : null;
    if (code === "23505") {
      return;
    }

    logFullSupabaseError(
      "[onboarding notifications] insert failed",
      error,
      { userId, type: spec.type },
    );
  } catch (e) {
    logFullSupabaseError(
      "[onboarding notifications] insert threw",
      e,
      { userId, type: spec.type },
    );
  }
}

/**
 * Creates any missing onboarding notifications for the user + role.
 * Safe to call on every app entry: skips types that already exist (no duplicate rows).
 */
export async function ensureOnboardingNotificationsForRole(
  client: Client,
  userId: string,
  role: OnboardingNotificationRole,
): Promise<void> {
  if (!userId) return;

  try {
    const { data: existingRows, error: selectError } = await client
      .from("notifications")
      .select("type")
      .eq("user_id", userId)
      .in("type", [...SYSTEM_NOTIFICATION_TYPES]);

    if (selectError) {
      logFullSupabaseError(
        "[onboarding notifications] existing types select failed",
        selectError,
        { userId, role },
      );
      return;
    }

    const alreadyHave = new Set(
      (existingRows ?? []).map((r) => r.type).filter(Boolean) as string[],
    );

    for (const spec of specsForRole(role)) {
      if (alreadyHave.has(spec.type)) continue;
      await insertSystemNotification(client, userId, spec);
      alreadyHave.add(spec.type);
    }

    await ensureWelcomeInboxMessage(client, userId);
  } catch (e) {
    logFullSupabaseError(
      "[onboarding notifications] ensureOnboardingNotificationsForRole unexpected",
      e,
      { userId, role },
    );
  }
}

/**
 * Loads `users.role` and ensures onboarding notifications for the signed-in user.
 * No-op if not authenticated or role is not player/scout.
 * Concurrent calls for the same user share one in-flight run (avoids duplicate inserts).
 */
export async function ensureOnboardingNotificationsForCurrentUser(
  client: Client,
): Promise<void> {
  try {
    const {
      data: { user },
      error: authError,
    } = await client.auth.getUser();

    if (authError) {
      logFullSupabaseError(
        "[onboarding notifications] getUser failed",
        authError,
      );
      return;
    }

    const userId = user?.id;
    if (!userId) return;

    if (!ensureInFlight.has(userId)) {
      const run = (async () => {
        try {
          const { data: row, error: userError } = await client
            .from("users")
            .select("role")
            .eq("id", userId)
            .maybeSingle();

          if (userError) {
            logFullSupabaseError(
              "[onboarding notifications] users select failed",
              userError,
              { userId },
            );
            return;
          }

          const role = row?.role;
          if (role !== "player" && role !== "scout") return;

          await ensureOnboardingNotificationsForRole(client, userId, role);
        } finally {
          ensureInFlight.delete(userId);
        }
      })();
      ensureInFlight.set(userId, run);
    }

    await ensureInFlight.get(userId)!;
  } catch (e) {
    logFullSupabaseError(
      "[onboarding notifications] ensureOnboardingNotificationsForCurrentUser unexpected",
      e,
    );
  }
}
