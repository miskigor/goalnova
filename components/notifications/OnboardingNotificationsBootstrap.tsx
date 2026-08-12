"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase/client";
import { ensureOnboardingNotificationsForCurrentUser } from "@/lib/supabase/onboardingNotifications";
import { sendWelcomeInboxMessageOnRegistration } from "@/lib/supabase/welcomeInboxMessage";
import { useNotificationsInboxOptional } from "@/components/notifications/NotificationsInboxContext";

/**
 * Seeds onboarding notifications if missing, then refreshes the unread badge.
 * Also delivers the welcome inbox DM if registration send was missed.
 * Re-runs when the inbox refresh callback becomes available (provider mounted).
 * `ensureOnboarding…` is idempotent per user/type.
 */
export function OnboardingNotificationsBootstrap() {
  const inbox = useNotificationsInboxOptional();
  const refreshUnread = inbox?.refreshUnreadCount;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      await ensureOnboardingNotificationsForCurrentUser(supabase);
      try {
        const { data } = await supabase.auth.getUser();
        const uid = data.user?.id;
        if (uid && !cancelled) {
          await sendWelcomeInboxMessageOnRegistration(supabase, uid);
        }
      } catch {
        /* welcome is best-effort */
      }
      if (!cancelled) {
        await refreshUnread?.();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshUnread]);

  return null;
}
