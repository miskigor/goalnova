"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { deleteMyAccount } from "@/lib/supabase/deleteAccount";

export function DeleteAccountSection() {
  const t = useTranslations("profile");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onDelete() {
    if (deleting) return;
    if (!window.confirm(t("deleteAccountConfirm"))) return;

    setError(null);
    setDeleting(true);
    try {
      const result = await deleteMyAccount();
      if (!result.ok) {
        setError(t("deleteAccountFailed"));
        return;
      }
      router.replace("/signup");
      router.refresh();
    } catch {
      setError(t("deleteAccountFailed"));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <section
      className="mt-10 box-border w-full min-w-0 max-w-full overflow-x-clip border-t border-gn-border-subtle pt-8 max-lg:mt-5 max-lg:pt-4"
      aria-labelledby="delete-account-heading"
    >
      <h2 id="delete-account-heading" className="text-sm font-semibold text-gn-text">
        {t("deleteAccountTitle")}
      </h2>
      <p className="mt-2 break-words text-sm leading-relaxed text-gn-text-secondary max-lg:text-xs">
        {t("deleteAccountDescription")}
      </p>
      {error ? (
        <p role="alert" className="mt-3 text-sm text-red-400 max-lg:text-xs">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        disabled={deleting}
        onClick={() => void onDelete()}
        className="mt-4 w-full max-w-full rounded-xl border border-red-500/40 bg-red-950/20 px-4 py-3 text-sm font-semibold text-red-300 transition hover:border-red-500/60 hover:bg-red-950/35 disabled:cursor-not-allowed disabled:opacity-50 max-lg:rounded-lg max-lg:py-1.5 max-lg:text-xs sm:w-auto"
      >
        {deleting ? tCommon("loadingEllipsis") : t("deleteAccountButton")}
      </button>
    </section>
  );
}
