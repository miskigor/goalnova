import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { devLog } from "@/lib/devLog";
import { logFullSupabaseError } from "@/lib/supabase/logError";

type Client = SupabaseClient<Database>;

const WELCOME_INBOX_SENT_STORAGE_PREFIX = "pitchrusch_welcome_inbox_sent:";

function welcomeInboxSentStorageKey(userId: string): string {
  return `${WELCOME_INBOX_SENT_STORAGE_PREFIX}${userId}`;
}

function hasLocalWelcomeInboxSentFlag(userId: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(welcomeInboxSentStorageKey(userId)) === "1";
  } catch {
    return false;
  }
}

function markLocalWelcomeInboxSent(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(welcomeInboxSentStorageKey(userId), "1");
  } catch {
    /* ignore quota / private mode */
  }
}

function rpcWelcomeOk(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;
  const o = data as Record<string, unknown>;
  return o.ok === true || o.ok === "true";
}

/**
 * Sends the welcome DM once when the user finishes registration (role onboarding).
 * Callers should await this before navigating away so the request is not aborted.
 * Not called on routine app entry — see RoleSelectionCard.
 */
export async function sendWelcomeInboxMessageOnRegistration(
  client: Client,
  userId: string,
): Promise<void> {
  const id = userId.trim();
  if (!id) return;

  if (hasLocalWelcomeInboxSentFlag(id)) {
    devLog("[welcome inbox] skipped — already sent on this device", { userId: id });
    return;
  }

  try {
    const { data, error } = await client.rpc("goalnova_send_welcome_inbox_message", {
      p_user_id: id,
    });

    if (error) {
      logFullSupabaseError("[welcome inbox] RPC failed", error, { userId: id });
      return;
    }

    if (rpcWelcomeOk(data)) {
      markLocalWelcomeInboxSent(id);
    } else {
      devLog("[welcome inbox] RPC returned non-ok", { userId: id, data });
    }

    devLog("[welcome inbox] registration send result", { userId: id, data });
  } catch (e) {
    logFullSupabaseError("[welcome inbox] registration send threw", e, { userId: id });
  }
}
