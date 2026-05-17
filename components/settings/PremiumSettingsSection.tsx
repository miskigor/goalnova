"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { usePremium } from "@/components/premium/PremiumProvider";
import { createStripePortalSession } from "@/lib/stripe/client";
import { useState } from "react";

export function PremiumSettingsSection() {
  const t = useTranslations("settings");
  const tp = useTranslations("premium");
  const tb = useTranslations("billing");
  const { isPremium, premiumLoaded } = usePremium();
  const [portalBusy, setPortalBusy] = useState(false);
  const [portalError, setPortalError] = useState<string | null>(null);

  async function onManageSubscription() {
    setPortalError(null);
    setPortalBusy(true);
    const { url, error } = await createStripePortalSession();
    setPortalBusy(false);
    if (error || !url) {
      setPortalError(error ?? tb("portalError"));
      return;
    }
    window.location.assign(url);
  }

  return (
    <div className="rounded-xl border border-gn-border-subtle bg-gn-surface/40 p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-gn-text-tertiary">
        {t("premiumTitle")}
      </p>
      {premiumLoaded ? (
        <p className="mt-2 text-sm text-gn-text-secondary">
          {isPremium ? t("premiumBodyActive") : t("premiumBodyUpgrade")}
        </p>
      ) : null}
      <p className="mt-3 rounded-lg border border-white/10 bg-gn-bg/40 px-3 py-2 text-xs text-gn-text-tertiary">
        {!premiumLoaded
          ? t("premiumChecking")
          : isPremium
            ? t("premiumBadgeActive")
            : t("premiumBadgeLocked")}
      </p>
      {!isPremium && premiumLoaded ? (
        <Link
          href="/premium"
          className="mt-3 inline-flex rounded-xl bg-gn-accent px-4 py-2.5 text-sm font-semibold text-black"
        >
          {tp("cta")}
        </Link>
      ) : null}
      {isPremium && premiumLoaded ? (
        <button
          type="button"
          onClick={() => void onManageSubscription()}
          disabled={portalBusy}
          className="mt-3 inline-flex rounded-xl border border-gn-border-subtle bg-gn-surface/60 px-4 py-2.5 text-sm font-semibold text-gn-text disabled:opacity-60"
        >
          {portalBusy ? tb("loadingPortal") : tb("manageSubscription")}
        </button>
      ) : null}
      {portalError ? <p className="mt-2 text-xs text-red-300">{portalError}</p> : null}
    </div>
  );
}
