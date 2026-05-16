import { supabase } from "@/lib/supabase/client";
import { logFullSupabaseError } from "@/lib/supabase/logError";

export type AdminHardDeleteResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "not_authenticated"
        | "forbidden"
        | "cannot_delete_self"
        | "cannot_delete_super_admin"
        | "delete_failed"
        | "network";
    };

export async function adminHardDeleteUser(
  userId: string,
): Promise<AdminHardDeleteResult & { errorMessage?: string }> {
  const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (sessionErr || !token) {
    return { ok: false, reason: "not_authenticated" };
  }

  let response: Response;
  try {
    response = await fetch("/api/admin/users/delete", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId }),
    });
  } catch (err) {
    logFullSupabaseError("[adminHardDeleteUser] fetch failed", err);
    return { ok: false, reason: "network" };
  }

  const body = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    reason?: string;
    message?: string;
  };

  if (response.ok && body.ok !== false) {
    return { ok: true };
  }

  const reason = body.reason ?? "delete_failed";
  if (
    reason === "not_authenticated" ||
    reason === "forbidden" ||
    reason === "cannot_delete_self" ||
    reason === "cannot_delete_super_admin"
  ) {
    return { ok: false, reason };
  }

  return {
    ok: false,
    reason: "delete_failed",
    errorMessage: body.message ?? undefined,
  };
}
