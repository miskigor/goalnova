"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import {
  isApprovedScoutUser,
  parseScoutVerificationStatus,
  type ScoutVerificationStatus,
} from "@/lib/scoutVerification";
import {
  careerHistoryFromDb,
  careerHistoryToDb,
  handleProfileFieldPaste,
  PROFILE_FIELD_LIMITS,
  sanitizeBio,
  sanitizeCareerHistory,
  sanitizeFullName,
  sanitizeOrganizationField,
  sanitizeShortProfileField,
  sanitizeUsername,
} from "@/lib/profileFieldSanitize";
import { logFullSupabaseError } from "@/lib/supabase/logError";
import {
  loadAndEnsureProfile,
  savePlayerProfile,
  saveScoutProfile,
  updateUserAvatarUrl,
} from "@/lib/supabase/profile";
import { DeleteAccountSection } from "@/components/profile/DeleteAccountSection";
import { ProfileAvatarEditor } from "@/components/profile/ProfileAvatarEditor";
import { PlayerFollowSection } from "@/components/profile/PlayerFollowSection";
import { ProfilePremiumBanner } from "@/components/premium/ProfilePremiumBanner";
import { VerifiedScoutBadge } from "@/components/scout/VerifiedScoutBadge";
import { dispatchAvatarUrlUpdated } from "@/lib/avatar/avatarClientEvents";
import {
  AGE_OPTIONS,
  clampAgeSelect,
  clampHeightSelect,
  clampWeightSelect,
  HEIGHT_OPTIONS_CM,
  normalizePreferredFootFromDb,
  parsePositionFromDb,
  PLAYER_FOOT_VALUES,
  PLAYER_POSITION_PRESETS,
  POSITION_OPTION_KEYS,
  POSITION_OTHER_VALUE,
  WEIGHT_OPTIONS_KG,
} from "@/lib/profile/playerFormOptions";
import { fetchMyPlayerPremiumProfile, setFeaturedVideo } from "@/lib/supabase/playerPremium";
import { isPlayerPremium } from "@/lib/premium/playerPremium";
import { resetAppShellHorizontalScroll } from "@/lib/feed/feedScrollContract";
import { resetMobileBrowserZoom } from "@/lib/layout/resetMobileBrowserZoom";
import {
  SETTINGS_PROFILE_MOBILE_INSET_CLASS,
  SETTINGS_PROFILE_PAGE_SHELL_CLASS,
} from "@/lib/layout/appShellClasses";
import { supabase } from "@/lib/supabase/client";

function Spinner({ className = "h-4 w-4 text-black" }: { className?: string }) {
  return (
    <svg
      className={`${className} animate-spin`}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4l3-3-3-3v4a12 12 0 00-12 12h4z"
      />
    </svg>
  );
}

const fieldBlockClass = "min-w-0 max-w-full";

const inputClass = [
  fieldBlockClass,
  "mt-0.5 w-full max-w-full rounded-xl border border-gn-border bg-gn-surface text-sm text-gn-text",
  // 16px on mobile — iOS Safari auto-zooms inputs below 16px and can leave the whole app zoomed in.
  "max-lg:mt-0 max-lg:min-h-10 max-lg:rounded-lg max-lg:px-3 max-lg:py-2 max-lg:text-base max-lg:leading-snug",
  "lg:px-3 lg:py-2.5",
  "placeholder:text-gn-text-tertiary outline-none transition-[border-color,box-shadow]",
  "focus:border-gn-accent/60 focus:ring-2 focus:ring-gn-accent/25 max-lg:focus:ring-1 max-lg:focus:ring-inset",
  "lg:focus:ring-2",
].join(" ");

const selectClass = [
  inputClass,
  "cursor-pointer appearance-none bg-no-repeat",
  "max-lg:pr-7 max-lg:bg-[length:0.75rem] max-lg:bg-[right_0.4rem_center]",
  "lg:min-h-[44px] lg:bg-[length:1.125rem] lg:bg-[right_0.65rem_center] lg:pr-9",
  "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E\")]",
].join(" ");

const saveButtonClass = [
  "inline-flex w-full max-w-full min-w-0 items-center justify-center gap-1.5 font-semibold text-black",
  "rounded-lg bg-gn-accent ring-1 ring-white/10 transition-colors",
  "hover:bg-gn-accent-hover disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45",
  "max-lg:h-9 max-lg:rounded-lg max-lg:px-3 max-lg:py-1.5 max-lg:text-xs max-lg:shadow-none",
  "lg:rounded-xl lg:px-4 lg:py-3 lg:text-sm lg:shadow-[0_8px_28px_-6px_rgba(249,115,22,0.45)]",
].join(" ");

const labelClass =
  "block text-[11px] font-medium uppercase tracking-wider text-gn-text-tertiary max-lg:text-[10px] sm:text-xs";

const editorStatusBoxClass =
  "min-w-0 max-w-full overflow-x-clip rounded-2xl px-3 py-3 text-xs sm:px-4 sm:py-4 sm:text-sm";

function runProfileEditorMountedScrollReset(titleEl: HTMLElement | null) {
  if (typeof window === "undefined") return;
  if (!window.matchMedia("(max-width: 1023px)").matches) return;
  resetAppShellHorizontalScroll();
  if (typeof window.scrollTo === "function") {
    window.scrollTo(0, 0);
  }
  document.querySelectorAll("[data-app-main], [data-app-main-inner]").forEach((node) => {
    if (node instanceof HTMLElement) {
      node.scrollTop = 0;
      node.scrollLeft = 0;
    }
  });
  const main = document.querySelector("[data-app-main]");
  if (!(titleEl && main instanceof HTMLElement)) return;
  const delta = titleEl.getBoundingClientRect().top - main.getBoundingClientRect().top;
  if (delta < -1) {
    main.scrollTop = Math.max(0, main.scrollTop + delta);
  }
}

/** Clears tab-bar overlap at the end of the long settings form (mobile only). */
function SettingsProfileScrollEndSpacer() {
  return (
    <div
      aria-hidden
      className="pointer-events-none shrink-0 max-lg:block max-lg:h-[calc(var(--gn-app-bottom-nav-offset-measured,var(--gn-app-bottom-nav-offset,4.5rem))+3rem)] lg:hidden"
    />
  );
}

function ProfileEditorShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-settings-profile-editor
      data-settings-profile-page
      className={SETTINGS_PROFILE_PAGE_SHELL_CLASS}
    >
      <div
        data-settings-profile-inset
        className={`${SETTINGS_PROFILE_MOBILE_INSET_CLASS} space-y-3 max-lg:space-y-2.5 sm:space-y-6`}
      >
        {children}
      </div>
    </div>
  );
}

const SCOUT_ROLE_OPTIONS = [
  "Head Scout",
  "Scout",
  "Technical Scout",
  "Talent ID Scout",
  "Recruitment Analyst",
  "Sporting Director",
  "Academy Scout",
] as const;

export function ProfileEditor() {
  const t = useTranslations("profileEditor");
  const tSv = useTranslations("scoutVerification");
  const tCommon = useTranslations("authCommon");
  const tErr = useTranslations("errors");
  const router = useRouter();
  const pathname = usePathname();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pasteHint, setPasteHint] = useState<string | null>(null);
  const pasteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof history === "undefined" || !("scrollRestoration" in history)) return;
    const prev = history.scrollRestoration;
    history.scrollRestoration = "manual";
    return () => {
      history.scrollRestoration = prev;
    };
  }, []);

  useEffect(() => {
    return () => {
      resetMobileBrowserZoom();
    };
  }, []);

  /** Tab shell can keep scroll offsets from feed/explore — reset when form is shown. */
  useLayoutEffect(() => {
    if (loading) return;
    const titleEl = titleRef.current;
    const run = () => runProfileEditorMountedScrollReset(titleEl);
    run();
    const frame = requestAnimationFrame(run);
    const t0 = window.setTimeout(run, 0);
    const t100 = window.setTimeout(run, 100);
    const t300 = window.setTimeout(run, 300);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(t0);
      window.clearTimeout(t100);
      window.clearTimeout(t300);
    };
  }, [loading, pathname]);

  const flashPasteBlocked = useCallback(() => {
    setPasteHint(t("pasteBlockedSql"));
    if (pasteTimerRef.current) clearTimeout(pasteTimerRef.current);
    pasteTimerRef.current = setTimeout(() => setPasteHint(null), 5000);
  }, [t]);

  const [role, setRole] = useState<"player" | "scout">("player");
  const [selfUserId, setSelfUserId] = useState<string | null>(null);
  const [scoutVerificationStatus, setScoutVerificationStatus] =
    useState<ScoutVerificationStatus | null>(null);

  // Player fields
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [age, setAge] = useState<string>("");
  const [bio, setBio] = useState("");
  const [positionSelect, setPositionSelect] = useState("");
  const [positionOther, setPositionOther] = useState("");
  const [preferredFoot, setPreferredFoot] = useState("");
  const [height, setHeight] = useState<string>("");
  const [weight, setWeight] = useState<string>("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("");
  const [club, setClub] = useState("");
  const [isAvailableForTrials, setIsAvailableForTrials] = useState(false);
  const [isLookingForClub, setIsLookingForClub] = useState(false);
  const [profileHighlight, setProfileHighlight] = useState("");
  const [achievements, setAchievements] = useState("");
  const [careerHistory, setCareerHistory] = useState("");
  const [selectedFeaturedVideoId, setSelectedFeaturedVideoId] = useState("");
  const [myVideos, setMyVideos] = useState<{ id: string; created_at: string | null }[]>([]);
  const [playerPremiumActive, setPlayerPremiumActive] = useState(false);

  // Scout fields
  const [organization, setOrganization] = useState("");
  const [scoutRole, setScoutRole] = useState("");
  const [scoutCity, setScoutCity] = useState("");
  const [scoutCountry, setScoutCountry] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    async function init() {
      setError(null);
      setLoading(true);
      try {
        const result = await loadAndEnsureProfile();
        if (!mounted) return;
        if (!result.success) {
          setSelfUserId(null);
          logFullSupabaseError(
            "[ProfileEditor] loadAndEnsureProfile",
            new Error(result.error.message),
          );
          setError(t("loadFailed"));
          return;
        }

        setRole(result.data.role);
        setSelfUserId(result.data.user.id);
        setScoutVerificationStatus(
          result.data.role === "scout"
            ? parseScoutVerificationStatus(
                result.data.user.scout_verification_status,
              )
            : null,
        );

        setBio(result.data.profile.bio ?? "");
        setAvatarUrl(result.data.user.avatar_url?.trim() || null);

        if (result.data.role === "player") {
          const pos = parsePositionFromDb(result.data.profile.position);
          setPositionSelect(pos.preset);
          setPositionOther(pos.otherText);
          setClub(result.data.profile.club ?? "");
          setFullName(result.data.profile.full_name ?? "");
          setUsername(result.data.profile.username ?? "");
          setAge(clampAgeSelect(result.data.profile.age));
          setPreferredFoot(
            normalizePreferredFootFromDb(result.data.profile.preferred_foot),
          );
          setHeight(clampHeightSelect(result.data.profile.height));
          setWeight(clampWeightSelect(result.data.profile.weight));
          setCity(result.data.profile.city ?? "");
          setCountry(result.data.profile.country ?? "");
          setIsAvailableForTrials(Boolean(result.data.profile.is_available_for_trials));
          setIsLookingForClub(Boolean(result.data.profile.is_looking_for_club));
          setProfileHighlight(result.data.profile.profile_highlight ?? "");
          setAchievements((result.data.profile.achievements ?? []).join(", "));
          setCareerHistory(careerHistoryFromDb(result.data.profile.career_history));
          const [{ profile: pp }, { data: myVideoRows }] = await Promise.all([
            fetchMyPlayerPremiumProfile(),
            supabase
              .from("videos")
              .select("id,created_at,is_featured")
              .eq("user_id", result.data.user.id)
              .order("created_at", { ascending: false }),
          ]);
          setPlayerPremiumActive(isPlayerPremium(pp, result.data.user.email));
          setMyVideos(
            (myVideoRows ?? []).map((v) => ({
              id: String(v.id),
              created_at: v.created_at ?? null,
            })),
          );
          const featured = (myVideoRows ?? []).find((v) => v.is_featured === true);
          setSelectedFeaturedVideoId(featured?.id ?? "");
        } else {
          setOrganization(result.data.profile.organization ?? "");
          setScoutRole(result.data.profile.role ?? "");
          setScoutCity(result.data.profile.city ?? "");
          setScoutCountry(result.data.profile.country ?? "");
        }
      } catch (e) {
        logFullSupabaseError("[ProfileEditor] init", e);
        if (!mounted) return;
        setError(tCommon("genericError"));
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    init();
    return () => {
      mounted = false;
    };
  }, [t, tCommon]);

  useEffect(() => {
    return () => {
      if (pasteTimerRef.current) clearTimeout(pasteTimerRef.current);
    };
  }, []);

  const canSave = useMemo(() => !loading && !saving, [loading, saving]);
  const scoutRoleChoices = useMemo(() => {
    const base: string[] = [...SCOUT_ROLE_OPTIONS];
    const current = scoutRole.trim();
    if (current && !base.some((v) => v === current)) {
      base.push(current);
    }
    return base;
  }, [scoutRole]);

  const showIncompleteHint = useMemo(() => {
    if (loading || role !== "player") return false;
    return !fullName.trim() && !username.trim();
  }, [loading, role, fullName, username]);

  async function onSave() {
    setError(null);
    setSaving(true);
    try {
      if (role === "player") {
        const toNumberOrNull = (v: string) => {
          const n = Number(v);
          return Number.isFinite(n) && v.trim() !== "" ? n : null;
        };
        const fn = sanitizeFullName(fullName);
        const un = sanitizeUsername(username);
        if (username.trim() && !un) {
          setError(t("invalidUsername"));
          setSaving(false);
          return;
        }
        const positionToSave =
          positionSelect === POSITION_OTHER_VALUE
            ? sanitizeShortProfileField(positionOther) || null
            : positionSelect
              ? sanitizeShortProfileField(positionSelect) || null
              : null;

        const res = await savePlayerProfile({
          full_name: fn || null,
          username: un || null,
          age: toNumberOrNull(age),
          bio: sanitizeBio(bio) || null,
          position: positionToSave,
          preferred_foot: preferredFoot
            ? sanitizeShortProfileField(preferredFoot) || null
            : null,
          height: toNumberOrNull(height),
          weight: toNumberOrNull(weight),
          city: sanitizeShortProfileField(city) || null,
          country: sanitizeShortProfileField(country) || null,
          club: sanitizeShortProfileField(club) || null,
          is_available_for_trials: isAvailableForTrials,
          is_looking_for_club: isLookingForClub,
          profile_highlight: sanitizeShortProfileField(profileHighlight) || null,
          achievements: achievements
            .split(",")
            .map((v) => v.trim())
            .filter((v) => v.length > 0),
          career_history: careerHistoryToDb(sanitizeCareerHistory(careerHistory)),
        });
        if (!res.success) {
          logFullSupabaseError(
            "[ProfileEditor] savePlayerProfile",
            new Error(res.error.message),
          );
          setError(t("saveFailed"));
          return;
        }
        if (playerPremiumActive && selectedFeaturedVideoId) {
          const feat = await setFeaturedVideo(selectedFeaturedVideoId);
          if (!feat.ok) {
            setError(feat.errorMessage ?? t("saveFailed"));
            return;
          }
        }
      } else {
        const res = await saveScoutProfile({
          organization: sanitizeOrganizationField(organization) || null,
          role: sanitizeShortProfileField(scoutRole) || null,
          city: sanitizeShortProfileField(scoutCity) || null,
          country: sanitizeShortProfileField(scoutCountry) || null,
          bio: sanitizeBio(bio) || null,
        });
        if (!res.success) {
          logFullSupabaseError(
            "[ProfileEditor] saveScoutProfile",
            new Error(res.error.message),
          );
          setError(t("saveFailed"));
          return;
        }
      }

      const avRes = await updateUserAvatarUrl(avatarUrl?.trim() || null);
      if (!avRes.success) {
        logFullSupabaseError(
          "[ProfileEditor] updateUserAvatarUrl",
          new Error(avRes.error.message),
        );
        setError(t("saveFailed"));
        return;
      }

      dispatchAvatarUrlUpdated(avatarUrl?.trim() || null);
      resetMobileBrowserZoom();
      router.replace("/profile?saved=1");
    } catch (e) {
      logFullSupabaseError("[ProfileEditor] save", e);
      setError(tErr("generic"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <ProfileEditorShell>
        <div className="flex min-h-[40vh] items-center justify-center">
          <div className="flex items-center gap-2 text-sm text-gn-text-secondary">
            <Spinner className="h-4 w-4 text-gn-accent" />
            {tCommon("loading")}
          </div>
        </div>
      </ProfileEditorShell>
    );
  }

  return (
    <ProfileEditorShell>
      <div className="min-w-0 max-w-full">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h1
            ref={titleRef}
            id="settings-profile-title"
            className="min-w-0 max-w-full shrink scroll-mt-[var(--gn-page-content-scroll-padding-top,1rem)] break-words text-lg font-semibold tracking-tight text-gn-text sm:text-2xl"
          >
            {t("title")}
          </h1>
          {isApprovedScoutUser({
            role,
            scout_verification_status: scoutVerificationStatus ?? "none",
          }) ? (
            <span className="shrink-0">
              <VerifiedScoutBadge />
            </span>
          ) : null}
        </div>
        <p className="mt-1 max-w-full text-xs text-gn-text-secondary sm:text-sm">
          {t("subtitle")}
        </p>
        <div className="mt-4">
          <ProfilePremiumBanner />
        </div>
      </div>

      {role === "scout" && scoutVerificationStatus === "none" ? (
        <div
          className={`${editorStatusBoxClass} border border-gn-accent/30 bg-gn-accent/10`}
          role="status"
        >
          <p className="break-words font-medium text-gn-text">
            {tSv("profileGateNoneTitle")}
          </p>
          <p className="mt-1 break-words text-gn-text-secondary">
            {tSv("profileGateNoneBody")}
          </p>
          <Link
            href="/scout-apply"
            className="mt-3 inline-flex min-h-9 items-center justify-center rounded-full bg-gn-accent px-4 text-xs font-semibold text-black hover:bg-gn-accent-hover sm:h-10 sm:px-5 sm:text-sm"
          >
            {tSv("applyCta")}
          </Link>
        </div>
      ) : null}

      {role === "scout" && scoutVerificationStatus === "pending" ? (
        <div
          className={`${editorStatusBoxClass} border border-gn-border-subtle bg-gn-surface/40 leading-relaxed text-gn-text-secondary`}
          role="status"
        >
          <p className="break-words font-semibold leading-snug text-gn-text">
            {tSv("statusPendingShort")}
          </p>
          <p className="mt-1.5 break-words">{tSv("pendingBody")}</p>
          <p className="mt-1.5 break-words">{tSv("pendingNotify")}</p>
        </div>
      ) : null}

      {role === "scout" && scoutVerificationStatus === "rejected" ? (
        <div
          className={`${editorStatusBoxClass} border border-gn-border-subtle bg-gn-surface/40`}
          role="status"
        >
          <p className="break-words font-semibold text-gn-text">
            {tSv("statusRejectedShort")}
          </p>
          <p className="mt-1 break-words text-gn-text-secondary">
            {tSv("rejectedBody")}
          </p>
          <Link
            href="/scout-apply"
            className="mt-3 inline-block text-xs font-medium text-gn-accent hover:underline sm:text-sm"
          >
            {tSv("reapplyLink")}
          </Link>
        </div>
      ) : null}

      {role === "player" && selfUserId ? (
        <PlayerFollowSection profileUserId={selfUserId} />
      ) : null}

      {showIncompleteHint ? (
        <p
          className="max-w-full break-words rounded-xl border border-gn-border-subtle bg-gn-surface/30 px-3 py-2.5 text-xs text-gn-text-secondary sm:px-4 sm:py-3 sm:text-sm"
          role="status"
        >
          {t("incompleteHint")}
        </p>
      ) : null}

      <div
        data-settings-profile-form-card
        className="min-w-0 max-w-full overflow-x-clip rounded-2xl border border-gn-border-subtle bg-gn-surface/40 p-2 max-lg:rounded-lg max-lg:p-2 lg:p-4"
      >
        <div className="grid min-w-0 max-w-full gap-2 max-lg:gap-1 lg:gap-4">
          {selfUserId ? (
            <ProfileAvatarEditor
              userId={selfUserId}
              displayName={
                role === "player"
                  ? fullName.trim() || username.trim() || t("fullNamePlaceholder")
                  : organization.trim() || t("organizationPlaceholder")
              }
              avatarUrl={avatarUrl}
              onAvatarUrlChange={setAvatarUrl}
            />
          ) : null}

          {role === "player" ? (
            <>
              <div className={fieldBlockClass}>
                <label className={labelClass}>{t("fullName")}</label>
                <input
                  suppressHydrationWarning
                  className={inputClass}
                  value={fullName}
                  onChange={(e) => setFullName(sanitizeFullName(e.target.value))}
                  onPaste={(e) =>
                    handleProfileFieldPaste(
                      e,
                      fullName,
                      sanitizeFullName,
                      sanitizeFullName,
                      setFullName,
                      flashPasteBlocked,
                    )
                  }
                  placeholder={t("fullNamePlaceholder")}
                />
              </div>
              <div className={fieldBlockClass}>
                <label className={labelClass}>{t("username")}</label>
                <input
                  suppressHydrationWarning
                  className={inputClass}
                  value={username}
                  onChange={(e) => setUsername(sanitizeUsername(e.target.value))}
                  onPaste={(e) =>
                    handleProfileFieldPaste(
                      e,
                      username,
                      sanitizeUsername,
                      sanitizeUsername,
                      setUsername,
                      flashPasteBlocked,
                    )
                  }
                  placeholder={t("usernamePlaceholder")}
                  autoCapitalize="none"
                />
              </div>
              <div className={fieldBlockClass}>
                <label className={labelClass}>{t("position")}</label>
                <select
                  suppressHydrationWarning
                  className={selectClass}
                  value={positionSelect}
                  onChange={(e) => setPositionSelect(e.target.value)}
                  aria-label={t("position")}
                >
                  <option value="">{t("fieldSelectPlaceholder")}</option>
                  {PLAYER_POSITION_PRESETS.map((pv) => (
                    <option key={pv} value={pv}>
                      {t(POSITION_OPTION_KEYS[pv])}
                    </option>
                  ))}
                  <option value={POSITION_OTHER_VALUE}>
                    {t("positionOtherOption")}
                  </option>
                </select>
                {positionSelect === POSITION_OTHER_VALUE ? (
                  <input
                    suppressHydrationWarning
                    className={`${inputClass} mt-2`}
                    value={positionOther}
                    onChange={(e) =>
                      setPositionOther(sanitizeShortProfileField(e.target.value))
                    }
                    onPaste={(e) =>
                      handleProfileFieldPaste(
                        e,
                        positionOther,
                        sanitizeShortProfileField,
                        sanitizeShortProfileField,
                        setPositionOther,
                        flashPasteBlocked,
                      )
                    }
                    placeholder={t("positionOtherPlaceholder")}
                  />
                ) : null}
              </div>
              <div className={fieldBlockClass}>
                <label className={labelClass}>{t("preferredFoot")}</label>
                <select
                  suppressHydrationWarning
                  className={selectClass}
                  value={preferredFoot}
                  onChange={(e) => setPreferredFoot(e.target.value)}
                  aria-label={t("preferredFoot")}
                >
                  <option value="">{t("fieldSelectPlaceholder")}</option>
                  {PLAYER_FOOT_VALUES.map((fv) => (
                    <option key={fv} value={fv}>
                      {fv === "Right"
                        ? t("footRight")
                        : fv === "Left"
                          ? t("footLeft")
                          : t("footBoth")}
                    </option>
                  ))}
                </select>
              </div>
              <div className={fieldBlockClass}>
                <label className={labelClass}>{t("age")}</label>
                <select
                  suppressHydrationWarning
                  className={selectClass}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  aria-label={t("age")}
                >
                  <option value="">{t("fieldSelectPlaceholder")}</option>
                  {AGE_OPTIONS.map((a) => (
                    <option key={a} value={String(a)}>
                      {a}
                    </option>
                  ))}
                </select>
              </div>
              <div className={fieldBlockClass}>
                <label className={labelClass}>{t("height")}</label>
                <select
                  suppressHydrationWarning
                  className={selectClass}
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  aria-label={t("height")}
                >
                  <option value="">{t("fieldSelectPlaceholder")}</option>
                  {HEIGHT_OPTIONS_CM.map((h) => (
                    <option key={h} value={String(h)}>
                      {t("heightCmOption", { n: h })}
                    </option>
                  ))}
                </select>
              </div>
              <div className={fieldBlockClass}>
                <label className={labelClass}>{t("weight")}</label>
                <select
                  suppressHydrationWarning
                  className={selectClass}
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  aria-label={t("weight")}
                >
                  <option value="">{t("fieldSelectPlaceholder")}</option>
                  {WEIGHT_OPTIONS_KG.map((w) => (
                    <option key={w} value={String(w)}>
                      {t("weightKgOption", { n: w })}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid min-w-0 max-w-full grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="min-w-0 max-w-full">
                  <label className={labelClass}>{t("city")}</label>
                  <input
                    suppressHydrationWarning
                    className={inputClass}
                    value={city}
                    onChange={(e) =>
                      setCity(sanitizeShortProfileField(e.target.value))
                    }
                    onPaste={(e) =>
                      handleProfileFieldPaste(
                        e,
                        city,
                        sanitizeShortProfileField,
                        sanitizeShortProfileField,
                        setCity,
                        flashPasteBlocked,
                      )
                    }
                    placeholder={t("cityPlaceholder")}
                  />
                </div>
                <div className="min-w-0 max-w-full">
                  <label className={labelClass}>{t("country")}</label>
                  <input
                    suppressHydrationWarning
                    className={inputClass}
                    value={country}
                    onChange={(e) =>
                      setCountry(sanitizeShortProfileField(e.target.value))
                    }
                    onPaste={(e) =>
                      handleProfileFieldPaste(
                        e,
                        country,
                        sanitizeShortProfileField,
                        sanitizeShortProfileField,
                        setCountry,
                        flashPasteBlocked,
                      )
                    }
                    placeholder={t("countryPlaceholder")}
                  />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className={fieldBlockClass}>
                <label className={labelClass}>{t("organization")}</label>
                <input
                  suppressHydrationWarning
                  className={inputClass}
                  value={organization}
                  onChange={(e) =>
                    setOrganization(sanitizeOrganizationField(e.target.value))
                  }
                  onPaste={(e) =>
                    handleProfileFieldPaste(
                      e,
                      organization,
                      sanitizeOrganizationField,
                      sanitizeOrganizationField,
                      setOrganization,
                      flashPasteBlocked,
                    )
                  }
                  placeholder={t("organizationPlaceholder")}
                />
              </div>
              <div className={fieldBlockClass}>
                <label className={labelClass}>{t("scoutRole")}</label>
                <select
                  suppressHydrationWarning
                  className={selectClass}
                  value={scoutRole}
                  onChange={(e) => setScoutRole(sanitizeShortProfileField(e.target.value))}
                  aria-label={t("scoutRole")}
                >
                  <option value="">{t("fieldSelectPlaceholder")}</option>
                  {scoutRoleChoices.map((roleOption) => (
                    <option key={roleOption} value={roleOption}>
                      {roleOption}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid min-w-0 max-w-full grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="min-w-0 max-w-full">
                  <label className={labelClass}>{t("city")}</label>
                  <input
                    suppressHydrationWarning
                    className={inputClass}
                    value={scoutCity}
                    onChange={(e) =>
                      setScoutCity(sanitizeShortProfileField(e.target.value))
                    }
                    onPaste={(e) =>
                      handleProfileFieldPaste(
                        e,
                        scoutCity,
                        sanitizeShortProfileField,
                        sanitizeShortProfileField,
                        setScoutCity,
                        flashPasteBlocked,
                      )
                    }
                    placeholder={t("cityPlaceholder")}
                  />
                </div>
                <div className="min-w-0 max-w-full">
                  <label className={labelClass}>{t("country")}</label>
                  <input
                    suppressHydrationWarning
                    className={inputClass}
                    value={scoutCountry}
                    onChange={(e) =>
                      setScoutCountry(sanitizeShortProfileField(e.target.value))
                    }
                    onPaste={(e) =>
                      handleProfileFieldPaste(
                        e,
                        scoutCountry,
                        sanitizeShortProfileField,
                        sanitizeShortProfileField,
                        setScoutCountry,
                        flashPasteBlocked,
                      )
                    }
                    placeholder={t("countryPlaceholder")}
                  />
                </div>
              </div>
            </>
          )}

          <div className={fieldBlockClass}>
            <label className={labelClass}>{t("bio")}</label>
            <textarea
              suppressHydrationWarning
              rows={8}
              maxLength={PROFILE_FIELD_LIMITS.bio}
              className={`${inputClass} min-h-[11rem] resize-y break-words leading-relaxed max-lg:min-h-[10rem] sm:min-h-[12rem] lg:min-h-[14rem]`}
              value={bio}
              onChange={(e) => setBio(sanitizeBio(e.target.value))}
              onPaste={(e) =>
                handleProfileFieldPaste(
                  e,
                  bio,
                  sanitizeBio,
                  sanitizeBio,
                  setBio,
                  flashPasteBlocked,
                )
              }
              placeholder={t("bioPlaceholder")}
              aria-describedby="profile-bio-char-count"
            />
            <p
              id="profile-bio-char-count"
              className="mt-1.5 text-right text-xs tabular-nums text-gn-text-tertiary"
            >
              {t("bioCharCount", {
                current: bio.length,
                max: PROFILE_FIELD_LIMITS.bio,
              })}
            </p>
          </div>

          {role === "player" ? (
            <>
            <div className={fieldBlockClass}>
              <label className={labelClass}>{t("club")}</label>
              <input
                suppressHydrationWarning
                className={inputClass}
                value={club}
                onChange={(e) =>
                  setClub(sanitizeShortProfileField(e.target.value))
                }
                onPaste={(e) =>
                  handleProfileFieldPaste(
                    e,
                    club,
                    sanitizeShortProfileField,
                    sanitizeShortProfileField,
                    setClub,
                    flashPasteBlocked,
                  )
                }
                placeholder={t("clubPlaceholder")}
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-gn-text-secondary sm:text-sm">
              <input type="checkbox" checked={isAvailableForTrials} onChange={(e) => setIsAvailableForTrials(e.target.checked)} />
              {t("availableForTrials")}
            </label>
            <label className="flex items-center gap-2 text-xs text-gn-text-secondary sm:text-sm">
              <input type="checkbox" checked={isLookingForClub} onChange={(e) => setIsLookingForClub(e.target.checked)} />
              {t("lookingForClub")}
            </label>
            <div className={fieldBlockClass}>
              <label className={labelClass}>{t("profileHighlight")}</label>
              <input className={inputClass} value={profileHighlight} onChange={(e) => setProfileHighlight(e.target.value)} />
            </div>
            <div className={fieldBlockClass}>
              <label className={labelClass}>{t("achievements")}</label>
              <input className={inputClass} value={achievements} onChange={(e) => setAchievements(e.target.value)} />
            </div>
            <div className={fieldBlockClass}>
              <label className={labelClass}>{t("careerHistory")}</label>
              <textarea
                suppressHydrationWarning
                rows={6}
                maxLength={PROFILE_FIELD_LIMITS.careerHistory}
                className={`${inputClass} min-h-[9rem] resize-y break-words leading-relaxed max-lg:min-h-[8rem] sm:min-h-[10rem] lg:min-h-[12rem]`}
                value={careerHistory}
                onChange={(e) => setCareerHistory(sanitizeCareerHistory(e.target.value))}
                onPaste={(e) =>
                  handleProfileFieldPaste(
                    e,
                    careerHistory,
                    sanitizeCareerHistory,
                    sanitizeCareerHistory,
                    setCareerHistory,
                    flashPasteBlocked,
                  )
                }
                placeholder={t("careerHistoryPlaceholder")}
                aria-describedby="profile-career-char-count"
              />
              <p
                id="profile-career-char-count"
                className="mt-1.5 text-right text-xs tabular-nums text-gn-text-tertiary"
              >
                {t("careerHistoryCharCount", {
                  current: careerHistory.length,
                  max: PROFILE_FIELD_LIMITS.careerHistory,
                })}
              </p>
            </div>
            {playerPremiumActive ? (
              <div className={fieldBlockClass}>
                <label className={labelClass}>{t("featuredVideo")}</label>
                <select className={selectClass} value={selectedFeaturedVideoId} onChange={(e) => setSelectedFeaturedVideoId(e.target.value)}>
                  <option value="">{t("fieldSelectPlaceholder")}</option>
                  {myVideos.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.id}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            </>
          ) : null}
        </div>
      </div>

      {pasteHint ? (
        <div
          role="status"
          className="max-w-full break-words rounded-xl border border-amber-500/30 bg-amber-950/20 px-4 py-3 text-sm text-amber-100/90"
        >
          {pasteHint}
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="max-w-full break-words rounded-xl border border-gn-accent/30 bg-gn-surface/40 px-4 py-3 text-sm text-gn-text-secondary"
        >
          {error}
        </div>
      ) : null}

      <button
        type="button"
        data-settings-profile-save
        disabled={!canSave}
        aria-busy={saving}
        onClick={() => void onSave()}
        className={saveButtonClass}
      >
        {saving ? <Spinner /> : null}
        {saving ? t("saving") : t("save")}
      </button>

      <DeleteAccountSection />
      <SettingsProfileScrollEndSpacer />
    </ProfileEditorShell>
  );
}

