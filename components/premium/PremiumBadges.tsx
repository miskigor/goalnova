import { useTranslations } from "next-intl";

function BaseBadge({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center rounded-full border border-amber-300/40 bg-amber-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-100">
      {text}
    </span>
  );
}

export function PremiumBadge() {
  const t = useTranslations("premium");
  return <BaseBadge text={t("premiumBadge")} />;
}

export function PlayerPremiumBadge() {
  const t = useTranslations("premium");
  return <BaseBadge text={t("premiumPlayer")} />;
}

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden
    >
      <path d="M8 0 9.2 5.4 14.6 6.6 9.2 7.8 8 13.2 6.8 7.8 1.4 6.6 6.8 5.4 8 0Zm5.5 9.2.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9.9-2.6ZM3.5 10.5l.6 1.7 1.7.6-1.7.6-.6 1.7-.6-1.7-1.7-.6 1.7-.6.6-1.7Z" />
    </svg>
  );
}

export function FoundingPlayerBadge() {
  const t = useTranslations("playerProfile");
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-orange-500/55 bg-black/85 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-orange-100 shadow-sm sm:text-[11px]">
      <SparklesIcon className="h-3 w-3 shrink-0 text-orange-400" />
      <span className="truncate">{t("foundingPlayerBadge")}</span>
    </span>
  );
}

export function ScoutProBadge() {
  return <BaseBadge text="Scout Pro" />;
}

export function ClubBadge() {
  return <BaseBadge text="Club" />;
}
