import type { AppLocale } from "@/i18n/routing";
import { isAppLocale } from "@/lib/i18n/localePreference";
import { createServiceRoleClient } from "@/lib/supabase/serviceRoleClient";

type ServiceClient = NonNullable<ReturnType<typeof createServiceRoleClient>>;

export async function languagePreferenceForEmail(
  service: ServiceClient,
  email: string,
): Promise<AppLocale | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  const { data } = await service
    .from("users")
    .select("language_preference")
    .ilike("email", normalized)
    .maybeSingle();
  const raw = data?.language_preference;
  return typeof raw === "string" && isAppLocale(raw) ? raw : null;
}
