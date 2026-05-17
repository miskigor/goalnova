import { createServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import { appUrlForRequest, createStripeServerClient, resolveAuthenticatedUserIdFromBearer } from "@/lib/stripe/server";
import { envPriceIdForPlan, isPaidSubscriptionPlan, type PaidSubscriptionPlan } from "@/lib/stripe/plans";
import { locales, routing } from "@/i18n/routing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Body = { plan?: string; locale?: string };

function withLocalePrefix(pathname: string, locale: string) {
  const safePath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (locale === routing.defaultLocale) return safePath;
  return `/${locale}${safePath}`;
}

export async function POST(request: Request) {
  try {
    const userId = await resolveAuthenticatedUserIdFromBearer(request.headers.get("authorization"));
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stripe = createStripeServerClient();
    const sb = createServiceRoleClient();
    if (!stripe || !sb) {
      return Response.json({ error: "Server is not configured for billing." }, { status: 500 });
    }

    const body = (await request.json().catch(() => null)) as Body | null;
    const planCandidate = String(body?.plan ?? "").trim();
    const localeCandidate = String(body?.locale ?? "").trim().toLowerCase();
    if (!isPaidSubscriptionPlan(planCandidate)) {
      return Response.json({ error: "Invalid plan." }, { status: 400 });
    }
    const locale = (locales as readonly string[]).includes(localeCandidate)
      ? localeCandidate
      : routing.defaultLocale;
    const plan = planCandidate as PaidSubscriptionPlan;
    const priceId = envPriceIdForPlan(plan);
    if (!priceId) {
      return Response.json({ error: `Missing Stripe price id for ${plan}.` }, { status: 500 });
    }

    const { data: userRow, error: userErr } = await sb
      .from("users")
      .select("id,email,role,stripe_customer_id")
      .eq("id", userId)
      .maybeSingle();
    if (userErr || !userRow) {
      return Response.json({ error: "Profile not found." }, { status: 404 });
    }

    let customerId = String((userRow as { stripe_customer_id?: string | null }).stripe_customer_id ?? "").trim();
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userRow.email ?? undefined,
        metadata: { user_id: userId },
      });
      customerId = customer.id;
      await sb.from("users").update({ stripe_customer_id: customerId }).eq("id", userId);
      const role = String((userRow as { role?: string | null }).role ?? "").trim();
      if (role === "player") {
        await sb.from("player_profiles").update({ stripe_customer_id: customerId }).eq("id", userId);
      } else if (role === "scout") {
        await sb.from("scout_profiles").update({ stripe_customer_id: customerId }).eq("id", userId);
      }
    }

    const root = appUrlForRequest(request).replace(/\/$/, "");
    const successPath = withLocalePrefix("/payment/success", locale);
    const cancelPath = withLocalePrefix("/premium", locale);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${root}${successPath}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${root}${cancelPath}`,
      metadata: { user_id: userId, plan },
      subscription_data: {
        metadata: { user_id: userId, plan },
      },
    });

    if (!session.url) {
      return Response.json({ error: "Stripe did not return a checkout URL." }, { status: 500 });
    }

    return Response.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown checkout error.";
    return Response.json({ error: `Stripe checkout failed: ${message}` }, { status: 500 });
  }
}

