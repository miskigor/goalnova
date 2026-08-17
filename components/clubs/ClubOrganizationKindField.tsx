"use client";

import { useTranslations } from "next-intl";
import type { ClubOrganizationKind } from "@/lib/clubs/organizationKind";

type Props = {
  idPrefix: string;
  value: ClubOrganizationKind;
  onChange: (next: ClubOrganizationKind) => void;
};

export function ClubOrganizationKindField({ idPrefix, value, onChange }: Props) {
  const t = useTranslations("clubs");

  return (
    <fieldset className="space-y-2">
      <legend className="text-xs font-medium uppercase tracking-wider text-gn-text-tertiary">
        {t("fieldOrganizationKind")}
        <span className="text-gn-accent"> *</span>
      </legend>
      <p className="text-xs leading-relaxed text-gn-text-secondary">{t("organizationKindHint")}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {(
          [
            ["club", t("organizationKindClub")],
            ["academy", t("organizationKindAcademy")],
          ] as const
        ).map(([kind, label]) => {
          const id = `${idPrefix}-${kind}`;
          const selected = value === kind;
          return (
            <label
              key={kind}
              htmlFor={id}
              className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-4 text-sm ${
                selected
                  ? "border-gn-accent/50 bg-gn-accent/10 text-gn-text"
                  : "border-gn-border-subtle bg-black/40 text-gn-text-secondary"
              }`}
            >
              <input
                id={id}
                type="radio"
                name={`${idPrefix}-organization-kind`}
                checked={selected}
                onChange={() => onChange(kind)}
                className="accent-gn-accent"
              />
              {label}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
