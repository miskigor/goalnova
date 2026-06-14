import { supabase } from "@/lib/supabase/client";
import { logFullSupabaseError } from "@/lib/supabase/logError";

export type AdminDeleteVideoResult =
  | { ok: true }
  | {
      ok: false;
      reason:
        | "not_authenticated"
        | "forbidden"
        | "not_found"
        | "delete_failed"
        | "network";
      errorMessage?: string;
    };

export async function adminDeleteVideo(
  videoId: string,
): Promise<AdminDeleteVideoResult> {
  const vid = videoId.trim();
  if (!vid) {
    return { ok: false, reason: "delete_failed", errorMessage: "Invalid video id." };
  }

  const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (sessionErr || !token) {
    return { ok: false, reason: "not_authenticated" };
  }

  let response: Response;
  try {
    response = await fetch("/api/admin/videos/delete", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ videoId: vid }),
    });
  } catch (err) {
    logFullSupabaseError("[adminDeleteVideo] fetch failed", err);
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
    reason === "not_found"
  ) {
    return {
      ok: false,
      reason,
      errorMessage: body.message,
    };
  }

  return {
    ok: false,
    reason: "delete_failed",
    errorMessage: body.message,
  };
}
