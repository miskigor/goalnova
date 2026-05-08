import { createServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import { appUrlForRequest, createStripeServerClient, resolveAuthenticatedUserIdFromBearer } from "@/lib/stripe/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const userId = await resolveAuthenticatedUserIdFromBearer(request.headers.get("authorization"));
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stripe = createStripeServerClient();
  const sb = createServiceRoleClient();
  if (!stripe || !sb) {
    return Response.json({ error: "Server is not configured for billing." }, { status: 500 });
  }

  const { data, error } = await sb
    .from("users")
    .select("stripe_customer_id")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    return Response.json({ error: "Failed to load profile." }, { status: 500 });
  }

  const customerId = String((data as { stripe_customer_id?: string | null } | null)?.stripe_customer_id ?? "").trim();
  if (!customerId) {
    return Response.json({ error: "No Stripe customer found for this account." }, { status: 400 });
  }

  const root = appUrlForRequest(request).replace(/\/$/, "");
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${root}/settings`,
  });
  return Response.json({ url: session.url });
}

