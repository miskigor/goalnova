"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  GN_PRIMARY_BUTTON_CLASS,
  GN_SECONDARY_BUTTON_CLASS,
} from "@/components/ui/gnButtonClasses";

type Props = {
  onUploadAnother: () => void;
};

const buttonClass =
  "box-border flex min-h-11 w-full max-w-full min-w-0 items-center justify-center px-4 py-3 text-sm";

export function UploadSuccessNextSteps({ onUploadAnother }: Props) {
  const t = useTranslations("upload");

  return (
    <section
      className="mx-auto box-border w-full min-w-0 max-w-full overflow-x-clip rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-950/25 via-gn-surface/50 to-gn-surface/30 p-6 shadow-[0_12px_40px_-16px_rgba(16,185,129,0.25)] sm:p-8"
      role="status"
      aria-live="polite"
    >
      <div className="text-center">
        <div
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400"
          aria-hidden
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            className="h-6 w-6"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="break-words text-lg font-semibold tracking-tight text-gn-text sm:text-xl">
          {t("uploadSuccessTitle")}
        </h2>
        <p className="mt-2 break-words text-sm leading-relaxed text-gn-text-secondary">
          {t("uploadSuccessText")}
        </p>
      </div>
      <div className="mt-6 grid w-full min-w-0 max-w-full grid-cols-1 gap-3">
        <Link href="/profile" className={`${GN_PRIMARY_BUTTON_CLASS} ${buttonClass}`}>
          {t("uploadSuccessViewProfile")}
        </Link>
        <button
          type="button"
          onClick={onUploadAnother}
          className={`${GN_SECONDARY_BUTTON_CLASS} ${buttonClass}`}
        >
          {t("uploadSuccessUploadAnother")}
        </button>
      </div>
    </section>
  );
}
