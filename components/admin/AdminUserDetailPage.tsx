"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { adminHardDeleteUser } from "@/lib/supabase/adminDeleteUser";
import { supabase } from "@/lib/supabase/client";
import {
  type AdminNoticeType,
  rpcAdminGetUserDetail,
  rpcAdminMergePlayerProfile,
  rpcAdminMergeScoutApplyFields,
  rpcAdminMergeScoutProfile,
  rpcAdminSendUserNotice,
  rpcAdminSetAppRole,
  rpcAdminSetDeleted,
  rpcAdminSetPremium,
  rpcAdminSetFoundingPlayer,
  rpcAdminSetScoutVerificationStatus,
  rpcAdminSetStaffRole,
  rpcAdminSetSuspended,
  rpcAdminCreateTicketForUser,
} from "@/lib/supabase/adminSystem";
import { PITCHRUSCH_PREMIUM_UPDATED_EVENT } from "@/lib/supabase/premium";
import { devLog } from "@/lib/devLog";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import {
  handleProfileFieldPaste,
  sanitizeBio,
  sanitizeEmailForStorage,
  sanitizeFullName,
  sanitizeIntegerString,
  sanitizeOrganizationField,
  sanitizePositiveNumberInput,
  sanitizeScoutApplyDescription,
  sanitizeShortProfileField,
  sanitizeUsername,
  sanitizeWebUrl,
} from "@/lib/profileFieldSanitize";

function str(v: unknown): string {
  if (v == null) return "";
  return String(v);
}

function isPlayerProfileEmpty(pp: Record<string, unknown> | null | undefined): boolean {
  if (!pp) return true;
  const keys = [
    "full_name",
    "username",
    "bio",
    "city",
    "country",
    "position",
    "club",
    "preferred_foot",
    "age",
    "height",
    "weight",
  ] as const;
  return keys.every((k) => {
    const v = pp[k];
    if (v == null) return true;
    if (typeof v === "number") return !Number.isFinite(v);
    return String(v).trim().length === 0;
  });
}

const SCOUT_VER_OPTIONS = ["none", "pending", "approved", "rejected"] as const;
const ADMIN_NOTICE_TYPE_OPTIONS: {
  value: AdminNoticeType;
  labelKey:
    | "noticeTypeWarning"
    | "noticeTypeGuidelineViolation"
    | "noticeTypeProfileIssue"
    | "noticeTypeSuspensionWarning"
    | "noticeTypeVerificationIssue"
    | "noticeTypeCustom";
}[] = [
  { value: "warning", labelKey: "noticeTypeWarning" },
  { value: "guideline_violation", labelKey: "noticeTypeGuidelineViolation" },
  { value: "profile_issue", labelKey: "noticeTypeProfileIssue" },
  { value: "suspension_warning", labelKey: "noticeTypeSuspensionWarning" },
  { value: "verification_issue", labelKey: "noticeTypeVerificationIssue" },
  { value: "custom", labelKey: "noticeTypeCustom" },
];

const ADMIN_NOTICE_TEMPLATES = [
  {
    id: "guideline_violation",
    labelKey: "noticeTemplateGuidelineViolation",
    noticeType: "guideline_violation" as const,
    messageKey: "noticeMessageGuidelineViolation",
  },
  {
    id: "profile_issue",
    labelKey: "noticeTemplateProfileIssue",
    noticeType: "profile_issue" as const,
    messageKey: "noticeMessageProfileIssue",
  },
  {
    id: "suspension_warning",
    labelKey: "noticeTemplateSuspensionWarning",
    noticeType: "suspension_warning" as const,
    messageKey: "noticeMessageSuspensionWarning",
  },
  {
    id: "inappropriate_content",
    labelKey: "noticeTemplateInappropriateContent",
    noticeType: "guideline_violation" as const,
    messageKey: "noticeMessageInappropriateContent",
  },
  {
    id: "verification_issue",
    labelKey: "noticeTemplateScoutVerificationIssue",
    noticeType: "verification_issue" as const,
    messageKey: "noticeMessageScoutVerificationIssue",
  },
  {
    id: "final_warning",
    labelKey: "noticeTemplateFinalWarning",
    noticeType: "warning" as const,
    messageKey: "noticeMessageFinalWarning",
  },
] as const;

export function AdminUserDetailPage({ userId }: { userId: string }) {
  const t = useTranslations("adminDashboard");
  const tc = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const {
    isSuperAdmin,
    isSupportAdmin,
    isModerator,
    loaded: roleLoaded,
  } = useAdminAccess();

  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [user, setUser] = useState<Record<string, unknown> | null>(null);
  const [player, setPlayer] = useState<Record<string, unknown> | null>(null);
  const [scout, setScout] = useState<Record<string, unknown> | null>(null);

  const [appRole, setAppRole] = useState("player");
  const [isPremium, setIsPremium] = useState(false);
  const [isFoundingPlayer, setIsFoundingPlayer] = useState(false);
  const [savingFoundingPlayer, setSavingFoundingPlayer] = useState(false);
  const [scoutVer, setScoutVer] = useState("none");
  const [staffRole, setStaffRole] = useState("");
  const [savingUserFlags, setSavingUserFlags] = useState(false);
  const [premiumUntil, setPremiumUntil] = useState<string | null>(null);
  const [savedAccountFlags, setSavedAccountFlags] = useState({
    appRole: "player",
    isPremium: false,
    isFoundingPlayer: false,
    scoutVer: "none",
    staffRole: "",
  });

  const [pf, setPf] = useState({
    full_name: "",
    username: "",
    bio: "",
    city: "",
    country: "",
    position: "",
    club: "",
    age: "",
    height: "",
    weight: "",
    preferred_foot: "",
  });

  const [sf, setSf] = useState({
    bio: "",
    organization: "",
    role: "",
    city: "",
    country: "",
  });

  const [apply, setApply] = useState({
    scout_apply_full_name: "",
    scout_apply_organization: "",
    scout_apply_business_email: "",
    scout_apply_country: "",
    scout_apply_description: "",
    scout_apply_web_url: "",
  });

  const [pasteHint, setPasteHint] = useState<string | null>(null);
  const pasteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [noticeType, setNoticeType] = useState<AdminNoticeType>("warning");
  const [noticeTemplateId, setNoticeTemplateId] = useState<string>("");
  const [noticeMessage, setNoticeMessage] = useState("");
  const [sendingNotice, setSendingNotice] = useState(false);

  const flashPasteBlocked = useCallback(() => {
    setPasteHint(t("pasteBlockedSql"));
    if (pasteTimerRef.current) clearTimeout(pasteTimerRef.current);
    pasteTimerRef.current = setTimeout(() => setPasteHint(null), 5000);
  }, [t]);

  useEffect(() => {
    return () => {
      if (pasteTimerRef.current) clearTimeout(pasteTimerRef.current);
    };
  }, []);

  const canEditProfiles = isSuperAdmin || isSupportAdmin;
  const canModerate = isSuperAdmin || isModerator;
  const canSendNotice = isSuperAdmin || isSupportAdmin || isModerator;

  const load = useCallback(async () => {
    setLoading(true);
    setLoadErr(null);
    const { detail, error } = await rpcAdminGetUserDetail(userId);
    if (error || !detail?.user) {
      setLoadErr(error ?? t("userDetailLoadFailed"));
      setUser(null);
      setLoading(false);
      return;
    }
    const u = detail.user;
    devLog("ADMIN USER DETAIL PROFILE SOURCE", {
      userId,
      sourceTable: detail.player_profile_source ?? "unknown",
      playerProfileRowExists: Boolean(detail.player_profile_exists),
    });
    devLog("ADMIN USER DETAIL PAYLOAD", detail);
    setUser(u);
    setPlayer(detail.player_profile);
    setScout(detail.scout_profile);
    setAppRole(str(u.role) || "player");
    setIsPremium(Boolean(u.is_premium));
    setScoutVer(str(u.scout_verification_status) || "none");
    setStaffRole(str(u.admin_role) || "");

    let pp = detail.player_profile;
    if (isPlayerProfileEmpty(pp)) {
      const [{ data: ppDirect }, { data: userDirect }] = await Promise.all([
        supabase
          .from("player_profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle(),
        supabase
          .from("users")
          .select("*")
          .eq("id", userId)
          .maybeSingle(),
      ]);
      const userFallback = userDirect as Record<string, unknown> | null;
      if (ppDirect) {
        pp = {
          ...(pp ?? {}),
          ...(ppDirect as Record<string, unknown>),
        };
      }
      if (isPlayerProfileEmpty(pp) && userFallback) {
        pp = {
          ...(pp ?? {}),
          full_name: pp?.full_name ?? userFallback.full_name ?? null,
          username: pp?.username ?? userFallback.username ?? null,
          bio: pp?.bio ?? userFallback.bio ?? null,
          city: pp?.city ?? userFallback.city ?? null,
          country: pp?.country ?? userFallback.country ?? null,
          position: pp?.position ?? userFallback.position ?? null,
          club: pp?.club ?? userFallback.club ?? null,
          age: pp?.age ?? userFallback.age ?? null,
          height: pp?.height ?? userFallback.height ?? null,
          weight: pp?.weight ?? userFallback.weight ?? null,
          preferred_foot: pp?.preferred_foot ?? userFallback.preferred_foot ?? null,
        };
      }
      devLog("ADMIN USER DETAIL FALLBACK PROFILE FETCH", {
        userId,
        hadRpcProfile: Boolean(detail.player_profile),
        hadDirectPlayerProfile: Boolean(ppDirect),
        hadUserFallback: Boolean(userFallback),
      });
    }
    setPf({
      full_name: str(pp?.full_name),
      username: str(pp?.username),
      bio: str(pp?.bio),
      city: str(pp?.city),
      country: str(pp?.country),
      position: str(pp?.position),
      club: str(pp?.club),
      age: pp?.age != null ? String(pp.age) : "",
      height: pp?.height != null ? String(pp.height) : "",
      weight: pp?.weight != null ? String(pp.weight) : "",
      preferred_foot: str(pp?.preferred_foot),
    });

    const sp = detail.scout_profile;
    setSf({
      bio: str(sp?.bio),
      organization: str(sp?.organization),
      role: str(sp?.role),
      city: str(sp?.city),
      country: str(sp?.country),
    });

    setApply({
      scout_apply_full_name: str(u.scout_apply_full_name),
      scout_apply_organization: str(u.scout_apply_organization),
      scout_apply_business_email: str(u.scout_apply_business_email),
      scout_apply_country: str(u.scout_apply_country),
      scout_apply_description: str(u.scout_apply_description),
      scout_apply_web_url: str(u.scout_apply_web_url),
    });

    const { data: foundingRow } = await supabase
      .from("player_profiles")
      .select("founding_player")
      .eq("id", userId)
      .maybeSingle();
    const foundingPlayer = Boolean(foundingRow?.founding_player ?? pp?.founding_player);
    setIsFoundingPlayer(foundingPlayer);
    const periodEnd =
      str(pp?.subscription_current_period_end) ||
      str(u.subscription_current_period_end) ||
      null;
    setPremiumUntil(periodEnd || null);
    setSavedAccountFlags({
      appRole: str(u.role) || "player",
      isPremium: Boolean(u.is_premium),
      isFoundingPlayer: foundingPlayer,
      scoutVer: str(u.scout_verification_status) || "none",
      staffRole: str(u.admin_role) || "",
    });

    setLoading(false);
  }, [userId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const publicPlayerHref = useMemo(() => {
    const slug = pf.username.trim() || userId;
    return `/player/${slug}`;
  }, [pf.username, userId]);

  async function savePlayerPatch() {
    const patch: Record<string, string | number | null> = {};
    if (pf.full_name !== "") patch.full_name = pf.full_name;
    if (pf.username !== "") patch.username = pf.username;
    if (pf.bio !== "") patch.bio = pf.bio;
    if (pf.city !== "") patch.city = pf.city;
    if (pf.country !== "") patch.country = pf.country;
    if (pf.position !== "") patch.position = pf.position;
    if (pf.club !== "") patch.club = pf.club;
    if (pf.age.trim() !== "") {
      const n = Number(pf.age);
      patch.age = Number.isFinite(n) ? n : null;
    }
    if (pf.height.trim() !== "") {
      const n = Number(pf.height);
      patch.height = Number.isFinite(n) ? n : null;
    }
    if (pf.weight.trim() !== "") {
      const n = Number(pf.weight);
      patch.weight = Number.isFinite(n) ? n : null;
    }
    if (pf.preferred_foot !== "") patch.preferred_foot = pf.preferred_foot;

    const { ok, error } = await rpcAdminMergePlayerProfile(userId, patch);
    if (!ok) alert(error ?? t("saveFailed"));
    else void load();
  }

  async function saveScoutPatch() {
    const patch: Record<string, string | null> = {};
    for (const [k, v] of Object.entries(sf)) {
      patch[k] = v || null;
    }
    const { ok, error } = await rpcAdminMergeScoutProfile(userId, patch);
    if (!ok) alert(error ?? t("saveFailed"));
    else void load();
  }

  async function saveApplyPatch() {
    const patch: Record<string, string | null> = {};
    for (const [k, v] of Object.entries(apply)) {
      patch[k] = v || null;
    }
    const { ok, error } = await rpcAdminMergeScoutApplyFields(userId, patch);
    if (!ok) alert(error ?? t("saveFailed"));
    else void load();
  }

  async function saveFoundingPlayerFlag(enabled: boolean) {
    if (!isSuperAdmin) return;
    const role = appRole === "scout" ? "scout" : "player";
    if (role !== "player") return;

    setSavingFoundingPlayer(true);
    const r = await rpcAdminSetFoundingPlayer(userId, enabled);
    setSavingFoundingPlayer(false);

    if (!r.ok) {
      setIsFoundingPlayer(savedAccountFlags.isFoundingPlayer);
      alert(r.error ?? tc("failed"));
      return;
    }
    setSavedAccountFlags((prev) => ({ ...prev, isFoundingPlayer: enabled }));
  }

  async function saveUserFlags() {
    if (!isSuperAdmin) return;

    setSavingUserFlags(true);
    let premiumChanged = false;

    const nextAppRole = appRole === "scout" ? "scout" : "player";

    if (nextAppRole !== savedAccountFlags.appRole) {
      const r1 = await rpcAdminSetAppRole(userId, nextAppRole);
      if (!r1.ok) {
        setSavingUserFlags(false);
        alert(r1.error ?? tc("failed"));
        return;
      }
    }

    if (isPremium !== savedAccountFlags.isPremium) {
      premiumChanged = true;
      const r2 = await rpcAdminSetPremium(userId, isPremium);
      if (!r2.ok) {
        setSavingUserFlags(false);
        alert(r2.error ?? tc("failed"));
        return;
      }
    }

    if (scoutVer !== savedAccountFlags.scoutVer) {
      const r3 = await rpcAdminSetScoutVerificationStatus(userId, scoutVer);
      if (!r3.ok) {
        setSavingUserFlags(false);
        alert(r3.error ?? tc("failed"));
        return;
      }
    }

    const roleVal = staffRole.trim() || null;
    const savedStaffVal = savedAccountFlags.staffRole.trim() || null;
    if (roleVal !== savedStaffVal) {
      const r4 = await rpcAdminSetStaffRole(userId, roleVal);
      if (!r4.ok) {
        setSavingUserFlags(false);
        alert(r4.error ?? tc("failed"));
        return;
      }
    }

    await load();
    setSavingUserFlags(false);
    if (premiumChanged && typeof window !== "undefined") {
      window.dispatchEvent(new Event(PITCHRUSCH_PREMIUM_UPDATED_EVENT));
    }
    alert(tc("done"));
  }

  function applyNoticeTemplate(templateId: string) {
    setNoticeTemplateId(templateId);
    const tmpl = ADMIN_NOTICE_TEMPLATES.find((x) => x.id === templateId);
    if (!tmpl) return;
    setNoticeType(tmpl.noticeType);
    setNoticeMessage(t(tmpl.messageKey));
  }

  async function sendUserNotice() {
    if (!canSendNotice) return;
    const finalMessage = noticeMessage.trim();
    if (!finalMessage) {
      alert("Notice message cannot be empty.");
      return;
    }
    setSendingNotice(true);
    const res = await rpcAdminSendUserNotice({
      userId,
      noticeType,
      message: finalMessage,
      locale: locale ?? null,
    });
    setSendingNotice(false);
    if (!res.ok) {
      alert(res.error ?? tc("failed"));
      return;
    }
    setNoticeMessage("");
  }

  if (!roleLoaded || loading) {
    return (
      <div className="flex justify-center py-20 text-zinc-500">
        {tc("loadingEllipsis")}
      </div>
    );
  }

  if (loadErr || !user) {
    return (
      <p className="text-red-300" role="alert">
        {loadErr ?? tc("notFound")}
      </p>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-16">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <ProfileAvatar
            name={
              pf.full_name.trim() ||
              pf.username.trim() ||
              str(user.email) ||
              t("userDetailTitle")
            }
            imageUrl={
              typeof user.avatar_url === "string"
                ? user.avatar_url.trim() || undefined
                : undefined
            }
            sizeClassName="h-14 w-14 shrink-0 text-sm"
          />
          <div className="min-w-0">
            <h1 className="text-2xl font-semibold text-white">
              {t("userDetailTitle")}
            </h1>
            <p className="mt-1 font-mono text-xs text-zinc-500">{userId}</p>
            <p className="mt-1 text-sm text-zinc-400">{str(user.email)}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={publicPlayerHref}
            className="rounded-lg border border-white/15 px-3 py-2 text-sm text-orange-300 hover:bg-white/5"
          >
            {t("userDetailPublicProfile")}
          </Link>
          <button
            type="button"
            onClick={() => void load()}
            className="rounded-lg border border-white/15 px-3 py-2 text-sm text-zinc-300 hover:bg-white/5"
          >
            {t("userDetailRefresh")}
          </button>
        </div>
      </div>

      {isSuperAdmin ? (
        <section className="space-y-3 rounded-xl border border-white/10 bg-black/30 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-orange-300">
            {t("userDetailAccountSuperAdmin")}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs text-zinc-500">
              {t("userDetailLabelAppRole")}
              <select
                suppressHydrationWarning
                value={appRole}
                onChange={(e) => setAppRole(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-sm text-white"
              >
                <option value="player">{t("userDetailAppRolePlayer")}</option>
                <option value="scout">{t("userDetailAppRoleScout")}</option>
              </select>
            </label>
            <label className="flex items-center gap-2 pt-6 text-sm text-zinc-300">
              <input
                suppressHydrationWarning
                type="checkbox"
                checked={isPremium}
                disabled={savingUserFlags}
                onChange={(e) => setIsPremium(e.target.checked)}
              />
              {t("userDetailLabelPremium")}
            </label>
            {isPremium && premiumUntil ? (
              <p className="text-xs text-zinc-500 sm:col-span-2">
                {t("userDetailPremiumUntil", {
                  date: new Date(premiumUntil).toLocaleDateString(locale),
                })}
              </p>
            ) : null}
            {appRole === "player" ? (
              <label className="flex items-center gap-2 pt-6 text-sm text-zinc-300 sm:col-span-2">
                <input
                  suppressHydrationWarning
                  type="checkbox"
                  checked={isFoundingPlayer}
                  disabled={savingFoundingPlayer}
                  onChange={(e) => {
                    const next = e.target.checked;
                    setIsFoundingPlayer(next);
                    void saveFoundingPlayerFlag(next);
                  }}
                />
                {t("userDetailLabelFoundingPlayer")}
                {savingFoundingPlayer ? (
                  <span className="text-xs text-zinc-500">{tc("loadingEllipsis")}</span>
                ) : null}
              </label>
            ) : null}
            <label className="block text-xs text-zinc-500">
              {t("userDetailLabelScoutVerStatus")}
              <select
                suppressHydrationWarning
                value={scoutVer}
                onChange={(e) => setScoutVer(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-sm text-white"
              >
                {SCOUT_VER_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {t(
                      (
                        {
                          none: "userDetailScoutVer_none",
                          pending: "userDetailScoutVer_pending",
                          approved: "userDetailScoutVer_approved",
                          rejected: "userDetailScoutVer_rejected",
                        } as const
                      )[s],
                    )}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-zinc-500">
              {t("userDetailLabelStaffRole")}
              <select
                suppressHydrationWarning
                value={staffRole}
                onChange={(e) => setStaffRole(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-sm text-white"
              >
                <option value="">{t("none")}</option>
                <option value="super_admin">
                  {t("userDetailStaffSuperAdmin")}
                </option>
                <option value="support_admin">
                  {t("userDetailStaffSupportAdmin")}
                </option>
                <option value="moderator">
                  {t("userDetailStaffModerator")}
                </option>
              </select>
            </label>
          </div>
          <button
            type="button"
            disabled={savingUserFlags}
            onClick={() => void saveUserFlags()}
            className="rounded-lg bg-orange-500/90 px-4 py-2 text-sm font-semibold text-black hover:bg-orange-400 disabled:opacity-50"
          >
            {savingUserFlags ? tc("loadingEllipsis") : t("saveUserFlags")}
          </button>
        </section>
      ) : null}

      {canModerate ? (
        <section className="flex flex-wrap gap-2 rounded-xl border border-white/10 bg-black/30 p-4">
          <button
            type="button"
            onClick={async () => {
              const r = await rpcAdminSetSuspended(
                userId,
                !Boolean(user.is_suspended),
              );
              if (!r.ok) alert(r.error ?? tc("failed"));
              else void load();
            }}
            className="rounded-lg bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15"
          >
            {Boolean(user.is_suspended) ? t("unsuspend") : t("suspend")}
          </button>
          {isSuperAdmin ? (
            <button
              type="button"
              onClick={async () => {
                if (!window.confirm(t("userDetailConfirmSoftDelete"))) return;
                const r = await rpcAdminSetDeleted(
                  userId,
                  !Boolean(user.is_deleted),
                );
                if (!r.ok) alert(r.error ?? tc("failed"));
                else void load();
              }}
              className="rounded-lg bg-white/10 px-3 py-2 text-sm text-white hover:bg-white/15"
            >
              {Boolean(user.is_deleted) ? t("restore") : t("softDelete")}
            </button>
          ) : null}
          {isSuperAdmin ? (
            <button
              type="button"
              onClick={async () => {
                const email =
                  typeof user.email === "string" ? user.email : userId;
                if (!window.confirm(t("userDetailConfirmHardDelete", { email }))) {
                  return;
                }
                const r = await adminHardDeleteUser(userId);
                if (!r.ok) {
                  if (r.reason === "cannot_delete_self") {
                    alert(t("cannotDeleteSelf"));
                  } else if (r.reason === "cannot_delete_super_admin") {
                    alert(t("cannotDeleteSuperAdmin"));
                  } else if (r.reason === "forbidden") {
                    alert(t("hardDeleteForbidden"));
                  } else {
                    alert(r.errorMessage ?? tc("failed"));
                  }
                  return;
                }
                router.replace("/admin/users");
              }}
              className="rounded-lg bg-red-500/25 px-3 py-2 text-sm font-semibold text-red-200 hover:bg-red-500/35"
            >
              {t("hardDelete")}
            </button>
          ) : null}
        </section>
      ) : null}

      {pasteHint ? (
        <div
          role="status"
          className="rounded-xl border border-amber-500/40 bg-amber-950/40 px-4 py-3 text-sm text-amber-100/90"
        >
          {pasteHint}
        </div>
      ) : null}

      {canEditProfiles ? (
        <>
          <section className="space-y-3 rounded-xl border border-white/10 bg-black/30 p-4">
            <h2 className="text-sm font-semibold text-zinc-300">
              {t("userDetailSectionPlayer")}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["full_name", "fldPlayerFullName"],
                  ["username", "fldPlayerUsername"],
                  ["bio", "fldPlayerBio"],
                  ["city", "fldPlayerCity"],
                  ["country", "fldPlayerCountry"],
                  ["position", "fldPlayerPosition"],
                  ["club", "fldPlayerClub"],
                  ["age", "fldPlayerAge"],
                  ["height", "fldPlayerHeight"],
                  ["weight", "fldPlayerWeight"],
                  ["preferred_foot", "fldPlayerPreferredFoot"],
                ] as const
              ).map(([key, labelKey]) => (
                <label key={key} className="block text-xs text-zinc-500">
                  {t(labelKey)}
                  <input
                    suppressHydrationWarning
                    value={pf[key]}
                    onChange={(e) =>
                      setPf((p) => ({
                        ...p,
                        [key]: sanitizeAdminPlayerFormField(key, e.target.value),
                      }))
                    }
                    onPaste={(e) =>
                      handleProfileFieldPaste(
                        e,
                        pf[key],
                        (s) => sanitizeAdminPlayerFormField(key, s),
                        (s) => sanitizeAdminPlayerFormField(key, s),
                        (next) => setPf((p) => ({ ...p, [key]: next })),
                        flashPasteBlocked,
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-sm text-white"
                  />
                </label>
              ))}
            </div>
            <button
              type="button"
              onClick={() => void savePlayerPatch()}
              className="rounded-lg bg-orange-500/90 px-4 py-2 text-sm font-semibold text-black"
            >
              {t("saveProfiles")}
            </button>
          </section>

          <section className="space-y-3 rounded-xl border border-white/10 bg-black/30 p-4">
            <h2 className="text-sm font-semibold text-zinc-300">
              {t("userDetailSectionScout")}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["bio", "fldScoutBio"],
                  ["organization", "fldScoutOrganization"],
                  ["role", "fldScoutRoleTitle"],
                  ["city", "fldScoutCity"],
                  ["country", "fldScoutCountry"],
                ] as const
              ).map(([key, labelKey]) => (
                <label key={key} className="block text-xs text-zinc-500">
                  {t(labelKey)}
                  <input
                    suppressHydrationWarning
                    value={sf[key]}
                    onChange={(e) =>
                      setSf((s) => ({
                        ...s,
                        [key]: sanitizeAdminScoutFormField(key, e.target.value),
                      }))
                    }
                    onPaste={(e) =>
                      handleProfileFieldPaste(
                        e,
                        sf[key],
                        (s) => sanitizeAdminScoutFormField(key, s),
                        (s) => sanitizeAdminScoutFormField(key, s),
                        (next) => setSf((prev) => ({ ...prev, [key]: next })),
                        flashPasteBlocked,
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-sm text-white"
                  />
                </label>
              ))}
            </div>
            <button
              type="button"
              onClick={() => void saveScoutPatch()}
              className="rounded-lg border border-white/20 px-4 py-2 text-sm text-zinc-200 hover:bg-white/5"
            >
              {t("userDetailSaveScoutProfile")}
            </button>
          </section>
        </>
      ) : null}

      {isSuperAdmin || isSupportAdmin ? (
        <section className="space-y-3 rounded-xl border border-white/10 bg-black/30 p-4">
          <h2 className="text-sm font-semibold text-zinc-300">
            {t("userDetailSectionApply")}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["scout_apply_full_name", "fldApplyFullName"],
                ["scout_apply_organization", "fldApplyOrganization"],
                ["scout_apply_business_email", "fldApplyBusinessEmail"],
                ["scout_apply_country", "fldApplyCountry"],
                ["scout_apply_description", "fldApplyDescription"],
                ["scout_apply_web_url", "fldApplyWebUrl"],
              ] as const
            ).map(([key, labelKey]) => (
              <label key={key} className="block text-xs text-zinc-500 sm:col-span-2">
                {t(labelKey)}
                <input
                  suppressHydrationWarning
                  value={apply[key]}
                  onChange={(e) =>
                    setApply((a) => ({
                      ...a,
                      [key]: sanitizeAdminScoutApplyFormField(key, e.target.value),
                    }))
                  }
                  onPaste={(e) =>
                    handleProfileFieldPaste(
                      e,
                      apply[key],
                      (s) => sanitizeAdminScoutApplyFormField(key, s),
                      (s) => sanitizeAdminScoutApplyFormField(key, s),
                      (next) => setApply((prev) => ({ ...prev, [key]: next })),
                      flashPasteBlocked,
                    )
                  }
                  className="mt-1 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-sm text-white"
                />
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={() => void saveApplyPatch()}
            className="rounded-lg border border-white/20 px-4 py-2 text-sm text-zinc-200 hover:bg-white/5"
          >
            {t("userDetailSaveApply")}
          </button>
        </section>
      ) : null}

      {isSuperAdmin || isSupportAdmin ? (
        <section className="rounded-xl border border-white/10 bg-black/30 p-4">
          <h2 className="mb-3 text-sm font-semibold text-zinc-300">
            {t("userDetailQuickTicket")}
          </h2>
          <button
            type="button"
            onClick={async () => {
              const subject = window.prompt(t("ticketSubject")) ?? "";
              const message = window.prompt(t("ticketMessage")) ?? "";
              if (!subject.trim() || !message.trim()) return;
              const { id, error } = await rpcAdminCreateTicketForUser(
                userId,
                subject,
                message,
                null,
              );
              alert(
                id
                  ? t("userDetailTicketCreated", { id })
                  : error ?? tc("failed"),
              );
            }}
            className="rounded-lg bg-white/10 px-4 py-2 text-sm text-white"
          >
            {t("createTicket")}
          </button>
        </section>
      ) : null}

      {canSendNotice ? (
        <section className="space-y-3 rounded-xl border border-white/10 bg-black/30 p-4">
          <h2 className="text-sm font-semibold text-zinc-300">
            {t("sendNoticeTitle")}
          </h2>
          <fieldset className="space-y-2">
            <legend className="text-xs text-zinc-500">{t("noticeTypeLabel")}</legend>
            {ADMIN_NOTICE_TYPE_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300"
              >
                <input
                  suppressHydrationWarning
                  type="radio"
                  name="admin-notice-type"
                  value={opt.value}
                  checked={noticeType === opt.value}
                  onChange={() => setNoticeType(opt.value)}
                  className="h-4 w-4"
                />
                <span>{t(opt.labelKey)}</span>
              </label>
            ))}
          </fieldset>
          <fieldset className="space-y-2">
            <legend className="text-xs text-zinc-500">{t("noticeTemplateLabel")}</legend>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
              <input
                suppressHydrationWarning
                type="radio"
                name="admin-notice-template"
                value=""
                checked={noticeTemplateId === ""}
                onChange={() => setNoticeTemplateId("")}
                className="h-4 w-4"
              />
              <span>{t("noticeTemplateNone")}</span>
            </label>
            {ADMIN_NOTICE_TEMPLATES.map((tmpl) => (
              <label
                key={tmpl.id}
                className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300"
              >
                <input
                  suppressHydrationWarning
                  type="radio"
                  name="admin-notice-template"
                  value={tmpl.id}
                  checked={noticeTemplateId === tmpl.id}
                  onChange={() => applyNoticeTemplate(tmpl.id)}
                  className="h-4 w-4"
                />
                <span>{t(tmpl.labelKey)}</span>
              </label>
            ))}
          </fieldset>
          <label className="block text-xs text-zinc-500">
            {t("noticeCustomMessageLabel")}
            <textarea
              suppressHydrationWarning
              value={noticeMessage}
              onChange={(e) => setNoticeMessage(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-lg border border-white/15 bg-black/50 px-3 py-2 text-sm text-white"
              placeholder={t("noticeCustomMessagePlaceholder")}
            />
          </label>
          <button
            type="button"
            disabled={sendingNotice}
            onClick={() => void sendUserNotice()}
            className="rounded-lg bg-orange-500/90 px-4 py-2 text-sm font-semibold text-black hover:bg-orange-400 disabled:opacity-60"
          >
            {sendingNotice ? t("noticeSending") : t("noticeSend")}
          </button>
        </section>
      ) : null}

      <details className="rounded-xl border border-white/10 bg-black/20 p-4 text-xs text-zinc-500">
        <summary className="cursor-pointer text-zinc-400">
          {t("userDetailRawJson")}
        </summary>
        <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap">
          {JSON.stringify({ user, player_profile: player, scout_profile: scout }, null, 2)}
        </pre>
      </details>
    </div>
  );
}

function sanitizeAdminPlayerFormField(key: string, value: string): string {
  switch (key) {
    case "full_name":
      return sanitizeFullName(value);
    case "username":
      return sanitizeUsername(value);
    case "bio":
      return sanitizeBio(value);
    case "age":
      return sanitizeIntegerString(value, 3);
    case "height":
    case "weight":
      return sanitizePositiveNumberInput(value);
    default:
      return sanitizeShortProfileField(value);
  }
}

function sanitizeAdminScoutFormField(key: string, value: string): string {
  switch (key) {
    case "bio":
      return sanitizeBio(value);
    case "organization":
      return sanitizeOrganizationField(value);
    default:
      return sanitizeShortProfileField(value);
  }
}

function sanitizeAdminScoutApplyFormField(key: string, value: string): string {
  switch (key) {
    case "scout_apply_full_name":
      return sanitizeFullName(value);
    case "scout_apply_organization":
      return sanitizeOrganizationField(value);
    case "scout_apply_business_email":
      return sanitizeEmailForStorage(value);
    case "scout_apply_country":
      return sanitizeShortProfileField(value);
    case "scout_apply_description":
      return sanitizeScoutApplyDescription(value);
    case "scout_apply_web_url":
      return sanitizeWebUrl(value);
    default:
      return value;
  }
}
