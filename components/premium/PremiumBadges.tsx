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

export function ScoutProBadge() {
  return <BaseBadge text="Scout Pro" />;
}

export function ClubBadge() {
  return <BaseBadge text="Club" />;
}
