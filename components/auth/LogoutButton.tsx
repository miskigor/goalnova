"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { devError } from "@/lib/devLog";
import { supabase } from "@/lib/supabase/client";
import { signOut } from "@/lib/supabase/auth";

export function LogoutButton() {
  const tCommon = useTranslations("authCommon");
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setLoggedIn(Boolean(data.session)));
  }, []);

  async function onLogout() {
    setError(null);
    setLoading(true);
    try {
      await signOut();
      router.replace("/login");
    } catch (err) {
      devError("Logout error:", err);
      const msg =
        err && typeof err === "object" && "message" in err
          ? String((err as { message?: unknown }).message)
          : tCommon("genericError");
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {error ? (
        <div className="rounded-xl border border-gn-accent/30 bg-gn-surface/40 px-4 py-3 text-sm text-gn-text-secondary">
          {error}
        </div>
      ) : null}

      <button
        type="button"
        disabled={!loggedIn || loading}
        aria-disabled={!loggedIn || loading}
        onClick={() => void onLogout()}
        className="flex w-full items-center justify-between rounded-xl border border-gn-border-subtle bg-gn-surface/40 px-4 py-3.5 text-left text-sm text-gn-text transition-colors hover:border-gn-border hover:bg-gn-surface/60 disabled:opacity-60"
      >
        <span className="font-medium">{tCommon("logout")}</span>
        <span className="text-gn-text-tertiary">{loading ? tCommon("loading") : ""}</span>
      </button>
    </div>
  );
}

