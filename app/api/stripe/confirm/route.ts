import { createServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import { createStripeServerClient, resolveAuthenticatedUserIdFromBearer } from "@/lib/stripe/server";
import { isPaidSubscriptionPlan } from "@/lib/stripe/plans";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { sessionId?: string };
type ProfileTable = "player_profiles" | "scout_profiles";

function tableForPlan(plan: string): ProfileTable | null {
  if (plan === "player_premium") return "player_profiles";
  if (plan === "scout_pro" || plan === "club") return "scout_profiles";
  return null;
}

function toIsoTs(unixSeconds?: number | null): string | null {
  if (!unixSeconds || !Number.isFinite(unixSeconds)) return null;
  return new Date(unixSeconds * 1000).toISOString();
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

async function safeUpsertUsersBilling(
  sb: NonNullable<ReturnType<typeof createServiceRoleClient>>,
  userId: string,
  patch: Record<string, unknown>,
) {
  const payload: Record<string, unknown> = { ...patch };
  for (let i = 0; i < 8; i += 1) {
    const { error } = await sb.from("users").update(payload).eq("id", userId);
    if (!error) return;
    const missing = extractMissingUsersColumn(error);
    if (!missing || !(missing in payload)) {
      throw error;
    }
    delete payload[missing];
  }
}

export async function POST(request: Request) {
  const authUserId = await resolveAuthenticatedUserIdFromBearer(
    request.headers.get("authorization"),
  );
  if (!authUserId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stripe = createStripeServerClient();
  const sb = createServiceRoleClient();
  if (!stripe || !sb) {
    return Response.json({ error: "Server is not configured for billing." }, { status: 500 });
  }

  const body = (await request.json().catch(() => null)) as Body | null;
  const sessionId = String(body?.sessionId ?? "").trim();
  if (!sessionId) {
    return Response.json({ error: "Missing sessionId." }, { status: 400 });
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const userId = String(session.metadata?.user_id ?? "").trim();
  const plan = String(session.metadata?.plan ?? "").trim();
  const customerId = typeof session.customer === "string" ? session.customer : "";
  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : "";

  if (!userId || userId !== authUserId) {
    return Response.json({ error: "Session user mismatch." }, { status: 403 });
  }
  if (!isPaidSubscriptionPlan(plan)) {
    return Response.json({ error: "Session plan is invalid." }, { status: 400 });
  }

  const table = tableForPlan(plan);
  if (!table) {
    return Response.json({ error: "Unsupported subscription plan." }, { status: 400 });
  }

  const sub = subscriptionId
    ? await stripe.subscriptions.retrieve(subscriptionId)
    : null;
  const status = (sub?.status ?? "active") as string;
  const normalizedStatus =
    status === "active" || status === "canceled" || status === "past_due" || status === "unpaid"
      ? status
      : "active";
  const currentPeriodEnd = toIsoTs(
    (sub as { current_period_end?: number | null } | null)?.current_period_end,
  );

  const patch = {
    stripe_customer_id: customerId || null,
    stripe_subscription_id: subscriptionId || null,
    subscription_plan: plan,
    subscription_status: normalizedStatus,
    subscription_current_period_end: currentPeriodEnd,
    is_premium: normalizedStatus === "active",
  };

  const profilePatch = {
    stripe_customer_id: patch.stripe_customer_id,
    stripe_subscription_id: patch.stripe_subscription_id,
    subscription_plan: patch.subscription_plan,
    subscription_status: patch.subscription_status,
    subscription_current_period_end: patch.subscription_current_period_end,
  };

  const { error: profileError } = await sb
    .from(table)
    .upsert({ id: userId, ...profilePatch }, { onConflict: "id" });
  if (profileError) {
    console.error("[stripe confirm] profile upsert failed", {
      table,
      user_id: userId,
      plan,
      status: normalizedStatus,
      message: String(profileError.message ?? profileError),
      code: (profileError as { code?: string | null }).code ?? null,
    });
    return Response.json({ error: "Failed to update profile subscription." }, { status: 500 });
  }

  try {
    await safeUpsertUsersBilling(sb, userId, patch as Record<string, unknown>);
  } catch (error) {
    console.error("[stripe confirm] users update failed", {
      user_id: userId,
      plan,
      status: normalizedStatus,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  if (process.env.NODE_ENV === "development") {
    console.info("[stripe confirm] subscription confirmed", {
      user_id: userId,
      plan,
      table,
      status: normalizedStatus,
      customer_id: customerId || null,
      subscription_id: subscriptionId || null,
    });
  }

  return Response.json({ ok: true, plan, status: normalizedStatus });
}

