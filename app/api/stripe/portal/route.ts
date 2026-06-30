import { createServiceRoleClient } from "@/lib/supabase/serviceRoleClient";
import { ensureStripeCustomer } from "@/lib/stripe/customer";
import { appUrlForRequest, createStripeServerClient, resolveAuthenticatedUserIdFromBearer } from "@/lib/stripe/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

    const { data, error } = await sb
      .from("users")
      .select("email,role,stripe_customer_id")
      .eq("id", userId)
      .maybeSingle();
    if (error || !data) {
      return Response.json({ error: "Failed to load profile." }, { status: 500 });
    }

    const customerId = await ensureStripeCustomer(stripe, sb, {
      userId,
      email: (data as { email?: string | null }).email,
      role: (data as { role?: string | null }).role,
      existingCustomerId: (data as { stripe_customer_id?: string | null }).stripe_customer_id,
    });

    const root = appUrlForRequest(request).replace(/\/$/, "");
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${root}/settings`,
    });
    return Response.json({ url: session.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown portal error.";
    return Response.json({ error: `Stripe portal failed: ${message}` }, { status: 500 });
  }
}

