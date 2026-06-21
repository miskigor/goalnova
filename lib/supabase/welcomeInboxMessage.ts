import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { devLog } from "@/lib/devLog";
import { logFullSupabaseError } from "@/lib/supabase/logError";

type Client = SupabaseClient<Database>;

/**
 * Sends the localized welcome DM once per user (idempotent RPC).
 * Safe to call on every onboarding entry.
 */
export async function ensureWelcomeInboxMessage(
  client: Client,
  userId: string,
): Promise<void> {
  const id = userId.trim();
  if (!id) return;

  try {
    const { data, error } = await client.rpc("goalnova_send_welcome_inbox_message", {
      p_user_id: id,
    });

    if (error) {
      logFullSupabaseError("[welcome inbox] RPC failed", error, { userId: id });
      return;
    }

    devLog("[welcome inbox] ensure result", { userId: id, data });
  } catch (e) {
    logFullSupabaseError("[welcome inbox] ensure threw", e, { userId: id });
  }
}
