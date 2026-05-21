import { hrefWithLocale } from "@/i18n/routing";
import { getPublicAppOriginForClient } from "@/lib/site/publicAppUrl";

/** Allow-listed redirect target for signup / resend confirmation emails. */
export function buildSignupEmailConfirmRedirectUrl(locale: string): string {
  const origin = getPublicAppOriginForClient();
  if (!origin) return "";
  return `${origin}${hrefWithLocale("/auth/confirm", locale)}`;
}
