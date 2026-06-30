import type Stripe from "stripe";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Stripe test/live mismatch or deleted customer — safe to recreate in the current mode. */
export function isStaleStripeCustomerError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string };
  if (e.code === "resource_missing") return true;
  const msg = String(e.message ?? "").toLowerCase();
  return (
    msg.includes("no such customer") ||
    msg.includes("similar object exists in test mode") ||
    msg.includes("similar object exists in live mode")
  );
}

async function persistStripeCustomerId(
  sb: SupabaseClient,
  userId: string,
  customerId: string,
  role?: string | null,
) {
  await sb.from("users").update({ stripe_customer_id: customerId }).eq("id", userId);
  const normalizedRole = String(role ?? "").trim();
  if (normalizedRole === "player") {
    await sb.from("player_profiles").update({ stripe_customer_id: customerId }).eq("id", userId);
  } else if (normalizedRole === "scout") {
    await sb.from("scout_profiles").update({ stripe_customer_id: customerId }).eq("id", userId);
  }
}

/**
 * Returns a Stripe customer id valid for the server's current mode (test vs live).
 * Recreates the customer when the stored id is missing or from the wrong Stripe mode.
 */
export async function ensureStripeCustomer(
  stripe: Stripe,
  sb: SupabaseClient,
  params: {
    userId: string;
    email?: string | null;
    role?: string | null;
    existingCustomerId?: string | null;
  },
): Promise<string> {
  const existing = String(params.existingCustomerId ?? "").trim();
  if (existing) {
    try {
      const customer = await stripe.customers.retrieve(existing);
      if (!("deleted" in customer && customer.deleted)) {
        return existing;
      }
    } catch (error) {
      if (!isStaleStripeCustomerError(error)) throw error;
    }
  }

  const customer = await stripe.customers.create({
    email: params.email ?? undefined,
    metadata: { user_id: params.userId },
  });
  await persistStripeCustomerId(sb, params.userId, customer.id, params.role);
  return customer.id;
}
