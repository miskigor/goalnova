"use client";

import { supabase } from "@/lib/supabase/client";
import type { PaidSubscriptionPlan } from "@/lib/stripe/plans";

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token ?? "";
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function createStripeCheckout(
  plan: PaidSubscriptionPlan,
  locale: string,
): Promise<{
  url: string | null;
  error: string | null;
}> {
  try {
    const headers = await authHeaders();
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ plan, locale }),
    });
    const raw = await res.text().catch(() => "");
    const json = (raw ? JSON.parse(raw) : null) as { url?: string; error?: string } | null;
    if (!res.ok || !json?.url) {
      return {
        url: null,
        error: json?.error ?? `Unable to start checkout (HTTP ${res.status}).`,
      };
    }
    return { url: json.url, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";
    return { url: null, error: `Unable to start checkout. ${message}` };
  }
}

export async function createStripePortalSession(): Promise<{
  url: string | null;
  error: string | null;
}> {
  try {
    const headers = await authHeaders();
    const res = await fetch("/api/stripe/portal", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
    });
    const json = (await res.json().catch(() => null)) as { url?: string; error?: string } | null;
    if (!res.ok || !json?.url) {
      return { url: null, error: json?.error ?? "Unable to open billing portal." };
    }
    return { url: json.url, error: null };
  } catch {
    return { url: null, error: "Unable to open billing portal." };
  }
}

