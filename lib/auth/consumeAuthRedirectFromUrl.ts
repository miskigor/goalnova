import { devError } from "@/lib/devLog";
import { supabase } from "@/lib/supabase/client";
import type { EmailOtpType } from "@supabase/supabase-js";

const OTP_TYPES = new Set<string>([
  "signup",
  "email",
  "recovery",
  "invite",
  "magiclink",
  "email_change",
]);

/**
 * Completes Supabase email/OAuth redirects (`code`, `token_hash`, or hash tokens).
 * Returns true when a session was established or already present.
 */
export async function consumeAuthRedirectFromUrl(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  let established = false;
  const url = new URL(window.location.href);

  const tokenHash = url.searchParams.get("token_hash");
  const typeRaw = url.searchParams.get("type");
  if (tokenHash && typeRaw && OTP_TYPES.has(typeRaw)) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: typeRaw as EmailOtpType,
    });
    if (error) devError("[auth] verifyOtp", error);
    else if (data.session) established = true;
    url.searchParams.delete("token_hash");
    url.searchParams.delete("type");
  }

  const code = url.searchParams.get("code");
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) devError("[auth] exchangeCodeForSession", error);
    else if (data.session) established = true;
    url.searchParams.delete("code");
  }

  const rawHash = window.location.hash?.replace(/^#/, "") ?? "";
  if (rawHash) {
    const hashParams = new URLSearchParams(rawHash);
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");
    if (accessToken && refreshToken) {
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (error) devError("[auth] setSession from hash", error);
      else if (data.session) established = true;
    }
  }

  const qs = url.searchParams.toString();
  const cleanPath = `${url.pathname}${qs ? `?${qs}` : ""}`;
  const current = `${url.pathname}${url.search}`;
  if (cleanPath !== current || rawHash) {
    window.history.replaceState(null, "", cleanPath);
  }

  if (!established) {
    const { data } = await supabase.auth.getSession();
    if (data.session) established = true;
  }

  return established;
}

/** True when the URL still carries Supabase auth redirect parameters. */
export function urlHasPendingAuthRedirect(): boolean {
  if (typeof window === "undefined") return false;
  const url = new URL(window.location.href);
  if (url.searchParams.has("code") || url.searchParams.has("token_hash")) {
    return true;
  }
  const hash = url.hash.replace(/^#/, "");
  if (!hash) return false;
  const params = new URLSearchParams(hash);
  return Boolean(params.get("access_token") && params.get("refresh_token"));
}
