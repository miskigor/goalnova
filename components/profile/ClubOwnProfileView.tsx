"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { GN_SUCCESS_BUTTON_CLASS } from "@/components/ui/gnButtonClasses";

type Props = {
  email: string | null;
  avatarUrl: string | null;
};

function emailLocalPart(email: string | null | undefined): string {
  const e = email?.trim();
  if (!e) return "";
  const idx = e.indexOf("@");
  return idx > 0 ? e.slice(0, idx).trim() : e;
}

export function ClubOwnProfileView({ email, avatarUrl }: Props) {
  const t = useTranslations("clubs");
  const tProfile = useTranslations("profile");
  const displayName = emailLocalPart(email) || t("clubAccountTitle");

  return (
    <div className="box-border w-full min-w-0 max-w-full space-y-4 overflow-x-clip">
      <header className="space-y-3">
        <div className="flex min-w-0 items-center gap-3">
          <ProfileAvatar name={displayName} imageUrl={avatarUrl || undefined} className="shrink-0" />
          <div className="min-w-0 flex-1 overflow-hidden">
            <h1 className="truncate text-lg font-semibold tracking-tight text-gn-text sm:text-2xl">
              {displayName}
            </h1>
            {email ? <p className="truncate text-sm text-gn-text-secondary">{email}</p> : null}
            <p className="mt-1 text-xs text-gn-text-tertiary">{t("clubAccountSubtitle")}</p>
          </div>
        </div>
        <Link
          href="/settings/profile"
          className={`${GN_SUCCESS_BUTTON_CLASS} box-border min-h-11 w-full max-w-full min-w-0`}
        >
          <span className="min-w-0 truncate">{tProfile("editProfile")}</span>
        </Link>
      </header>
    </div>
  );
}
