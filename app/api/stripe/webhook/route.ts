import Stripe from "stripe";
import { createServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import {
  isPaidSubscriptionPlan,
  normalizeSubscriptionPlan,
  normalizeSubscriptionStatus,
  type SubscriptionPlan,
  type SubscriptionStatus,
} from "@/lib/stripe/plans";
import { createStripeServerClient } from "@/lib/stripe/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type SubscriptionPatch = {
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  subscription_plan?: SubscriptionPlan;
  subscription_status?: SubscriptionStatus;
  subscription_current_period_end?: string | null;
  is_premium?: boolean;
};

type ProfileTableName = "player_profiles" | "scout_profiles";

function toIsoTs(unixSeconds?: number | null): string | null {
  if (!unixSeconds || !Number.isFinite(unixSeconds)) return null;
  return new Date(unixSeconds * 1000).toISOString();
}

async function resolveUserIdByCustomerId(
  sb: NonNullable<ReturnType<typeof createServiceRoleClient>>,
  customerId: string,
): Promise<string | null> {
  const { data } = await sb.from("users").select("id").eq("stripe_customer_id", customerId).maybeSingle();
  return data?.id ?? null;
}

function extractMissingUsersColumn(error: unknown): string | null {
  const e = error as { code?: string | null; message?: string | null } | null;
  const code = String(e?.code ?? "");
  const msg = String(e?.message ?? "");
  if (code !== "42703" && !/PGRST204/i.test(msg)) return null;
  const m = msg.match(/users\.([a-zA-Z0-9_]+)/);
  if (m?.[1]) return m[1];
  const m2 = msg.match(/column ['"]?([a-zA-Z0-9_]+)['"]?/i);
  return m2?.[1] ?? null;
}

async function safeUpdateUsersBilling(
  sb: NonNullable<ReturnType<typeof createServiceRoleClient>>,
  userId: string,
  patch: SubscriptionPatch,
) {
  const payload: Record<string, unknown> = { ...patch };
  for (let i = 0; i < 6; i += 1) {
    const { error } = await sb.from("users").update(payload).eq("id", userId);
    if (!error) return;
    const missing = extractMissingUsersColumn(error);
    if (!missing || !(missing in payload)) {
      throw error;
    }
    delete payload[missing];
  }
}

function profileTableForPlan(plan: SubscriptionPlan): ProfileTableName | null {
  if (plan === "player_premium") return "player_profiles";
  if (plan === "scout_pro" || plan === "club") return "scout_profiles";
  return null;
}

async function applySubscriptionPatchByPlan(
  sb: NonNullable<ReturnType<typeof createServiceRoleClient>>,
  table: ProfileTableName,
  userId: string,
  patch: SubscriptionPatch,
) {
  await sb.from(table).update(patch).eq("id", userId);
  await safeUpdateUsersBilling(sb, userId, patch);
}

function planFromMetadata(value: unknown): SubscriptionPlan {
  return normalizeSubscriptionPlan(typeof value === "string" ? value : null);
}

function statusFromStripe(subscription: Stripe.Subscription): SubscriptionStatus {
  const st = normalizeSubscriptionStatus(subscription.status);
  if (st === "inactive" && subscription.status === "canceled") return "canceled";
  return st;
}

export async function POST(request: Request) {
  const stripe = createStripeServerClient();
  const sb = createServiceRoleClient();
  const secret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!stripe || !sb || !secret) {
    return Response.json({ error: "Webhook is not configured." }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return Response.json({ error: "Missing signature." }, { status: 400 });

  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, secret);
  } catch {
    return Response.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    console.info("[stripe webhook] event received", { eventType: event.type });

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const customerId = typeof session.customer === "string" ? session.customer : null;
        const subscriptionId =
          typeof session.subscription === "string" ? session.subscription : null;
        const userId = String(session.metadata?.user_id ?? "").trim();
        const plan = planFromMetadata(session.metadata?.plan);
        const table = profileTableForPlan(plan);

        console.info("[stripe webhook] checkout.session.completed", {
          eventType: event.type,
          user_id: userId || null,
          plan,
          customer_id: customerId,
          subscription_id: subscriptionId,
        });

        if (customerId && userId && table && isPaidSubscriptionPlan(plan)) {
          const sub = subscriptionId
            ? await stripe.subscriptions.retrieve(subscriptionId)
            : null;
          const patch: SubscriptionPatch = {
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            subscription_plan: plan,
            subscription_status: "active",
            subscription_current_period_end: toIsoTs(
              (sub as { current_period_end?: number | null } | null)?.current_period_end,
            ),
            is_premium: true,
          };
          await applySubscriptionPatchByPlan(sb, table, userId, patch);
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const customerId = typeof sub.customer === "string" ? sub.customer : "";
        const metadataUserId = String(sub.metadata?.user_id ?? "").trim();
        const userId = metadataUserId || (await resolveUserIdByCustomerId(sb, customerId));
        const basePlan = planFromMetadata(sub.metadata?.plan);
        const table = profileTableForPlan(basePlan);
        console.info("[stripe webhook] subscription event", {
          eventType: event.type,
          user_id: userId || null,
          plan: basePlan,
          customer_id: customerId || null,
          subscription_id: sub.id,
        });
        if (!userId) break;
        if (!table && event.type !== "customer.subscription.deleted") break;

        const status = statusFromStripe(sub);
        const isActive = status === "active";
        const finalPlan: SubscriptionPlan = isActive
          ? basePlan === "free"
            ? "free"
            : basePlan
          : status === "canceled"
            ? "free"
            : basePlan;

        const patch: SubscriptionPatch = {
          stripe_customer_id: customerId || null,
          stripe_subscription_id: sub.id,
          subscription_plan: finalPlan,
          subscription_status: status,
          subscription_current_period_end: toIsoTs(
            (sub as { current_period_end?: number | null }).current_period_end,
          ),
          is_premium: finalPlan !== "free" && status === "active",
        };
        if (event.type === "customer.subscription.deleted") {
          patch.subscription_plan = "free";
          patch.subscription_status = "inactive";
          patch.is_premium = false;
        }
        if (table) {
          await applySubscriptionPatchByPlan(sb, table, userId, patch);
        } else {
          await sb.from("users").update(patch).eq("id", userId);
        }
        break;
      }

      case "invoice.payment_failed":
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId =
          typeof invoice.customer === "string" ? invoice.customer : "";
        const userId = customerId
          ? await resolveUserIdByCustomerId(sb, customerId)
          : null;
        console.info("[stripe webhook] invoice event", {
          eventType: event.type,
          user_id: userId || null,
          plan: null,
          customer_id: customerId || null,
          subscription_id:
            typeof (invoice as { subscription?: unknown }).subscription === "string"
              ? ((invoice as { subscription?: string }).subscription ?? null)
              : null,
        });
        if (!userId) break;

        if (event.type === "invoice.payment_failed") {
          await safeUpdateUsersBilling(sb, userId, {
            subscription_status: "past_due",
            is_premium: false,
          });
        } else {
          await safeUpdateUsersBilling(sb, userId, {
            subscription_status: "active",
            is_premium: true,
          });
        }
        break;
      }

      default:
        break;
    }
  } catch {
    return Response.json({ error: "Webhook handling failed." }, { status: 500 });
  }

  return Response.json({ received: true });
}

