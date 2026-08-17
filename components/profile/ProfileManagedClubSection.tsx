"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { usePathname } from "@/i18n/navigation";
import { ClubProfileEditor } from "@/components/clubs/ClubProfileEditor";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { rpcClubManagedList, type ManagedClubProfile } from "@/lib/supabase/clubs";

type Props = {
  /** Show setup / empty copy even when this account has no managed clubs yet. */
  alwaysShow?: boolean;
};

export function ProfileManagedClubSection({ alwaysShow = false }: Props) {
  const t = useTranslations("clubs");
  const pathname = usePathname();
  const { loaded: adminLoaded, isStaff } = useAdminAccess();
  const [clubs, setClubs] = useState<ManagedClubProfile[]>([]);
  const [missingRpc, setMissingRpc] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Personal Profile tab is never a club admin screen — even if this component is mounted.
  const onPersonalProfile = pathname === "/profile";
  const blocked = onPersonalProfile || (adminLoaded && isStaff);

  useEffect(() => {
    if (blocked || !adminLoaded) return;
    let mounted = true;
    void (async () => {
      const result = await rpcClubManagedList();
      if (!mounted) return;
      setClubs(result.clubs);
      setMissingRpc(result.missingRpc);
      setLoaded(true);
    })();
    return () => {
      mounted = false;
    };
  }, [adminLoaded, blocked]);

  if (onPersonalProfile) return null;
  if (!adminLoaded || isStaff) return null;
  if (!loaded) return null;

  if (missingRpc) {
    if (!alwaysShow) return null;
    return (
      <section className="rounded-2xl border border-amber-500/30 bg-amber-950/20 p-4">
        <h2 className="text-sm font-semibold text-gn-text">{t("manageClubTitle")}</h2>
        <p className="mt-1 text-xs leading-relaxed text-amber-100">{t("manageClubSetupPending")}</p>
      </section>
    );
  }

  if (clubs.length === 0) {
    if (!alwaysShow) return null;
    return (
      <section className="rounded-2xl border border-gn-border-subtle bg-gn-surface/40 p-4">
        <h2 className="text-sm font-semibold text-gn-text">{t("manageClubTitle")}</h2>
        <p className="mt-1 text-xs leading-relaxed text-gn-text-secondary">{t("manageClubEmpty")}</p>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      {clubs.map((club) => (
        <ClubProfileEditor
          key={club.id}
          club={club}
          onClubChange={(next) =>
            setClubs((prev) => prev.map((row) => (row.id === next.id ? next : row)))
          }
        />
      ))}
    </div>
  );
}
