import Stripe from "stripe";
import { createServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

const STRIPE_API_VERSION = "2026-04-22.dahlia";

export function createStripeServerClient(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) return null;
  return new Stripe(key, { apiVersion: STRIPE_API_VERSION });
}

export function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000";
}

export function appUrlForRequest(request: Request) {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  // In local/dev we prefer the live request origin (port/LAN-safe).
  if (process.env.NODE_ENV !== "production") {
    try {
      return new URL(request.url).origin;
    } catch {
      return configured || "http://localhost:3000";
    }
  }
  return configured || new URL(request.url).origin;
}

export async function resolveAuthenticatedUserIdFromBearer(authHeader: string | null) {
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice("Bearer ".length).trim()
    : "";
  if (!token) return null;

  const sb = createServiceRoleClient();
  if (!sb) return null;
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data.user?.id) return null;
  return data.user.id;
}

