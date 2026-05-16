"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import {
  isApprovedScoutUser,
  parseScoutVerificationStatus,
  type ScoutVerificationStatus,
} from "@/lib/scoutVerification";
import {
  handleProfileFieldPaste,
  sanitizeBio,
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
import { GN_PRIMARY_BUTTON_CLASS } from "@/components/ui/gnButtonClasses";
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
  "mt-1 w-full rounded-xl border border-gn-border bg-gn-surface px-3 py-2.5 text-sm text-gn-text",
  "placeholder:text-gn-text-tertiary outline-none transition-[border-color,box-shadow]",
  "focus:border-gn-accent/60 focus:ring-2 focus:ring-gn-accent/25 sm:px-3.5 sm:py-3",
].join(" ");

/** Native select: tall tap target, no horizontal overflow. */
const selectClass = [
  inputClass,
  "min-h-[44px] cursor-pointer appearance-none bg-[length:1.125rem] bg-[right_0.65rem_center] bg-no-repeat pr-9",
  "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E\")]",
].join(" ");

const labelClass =
  "block text-[11px] font-medium uppercase tracking-wider text-gn-text-tertiary sm:text-xs";

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pasteHint, setPasteHint] = useState<string | null>(null);
  const pasteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
          setCareerHistory(
            Array.isArray(result.data.profile.career_history)
              ? JSON.stringify(result.data.profile.career_history)
              : "",
          );
          const [{ profile: pp }, { data: myVideoRows }] = await Promise.all([
            fetchMyPlayerPremiumProfile(),
            supabase
              .from("videos")
              .select("id,created_at,is_featured")
              .eq("user_id", result.data.user.id)
              .order("created_at", { ascending: false }),
          ]);
          setPlayerPremiumActive(isPlayerPremium(pp));
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
          career_history: (() => {
            try {
              const parsed = JSON.parse(careerHistory || "[]");
              return Array.isArray(parsed) ? parsed : [];
            } catch {
              return [];
            }
          })(),
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
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-gn-text-secondary">
          <Spinner className="h-4 w-4 text-gn-accent" />
          {tCommon("loading")}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-full space-y-4 sm:space-y-6">
      <div className="min-w-0 max-w-full">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h1 className="min-w-0 max-w-full shrink break-words text-xl font-semibold tracking-tight text-gn-text sm:text-2xl">
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
          className="min-w-0 max-w-full rounded-2xl border border-gn-accent/30 bg-gn-accent/10 px-4 py-4 text-sm"
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
            className="mt-3 inline-flex h-10 items-center justify-center rounded-full bg-gn-accent px-5 text-sm font-semibold text-black hover:bg-gn-accent-hover"
          >
            {tSv("applyCta")}
          </Link>
        </div>
      ) : null}

      {role === "scout" && scoutVerificationStatus === "pending" ? (
        <div
          className="min-w-0 max-w-full overflow-x-clip rounded-2xl border border-gn-border-subtle bg-gn-surface/40 px-3 py-3 text-xs leading-relaxed text-gn-text-secondary sm:px-4 sm:py-4 sm:text-sm"
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
          className="min-w-0 max-w-full rounded-2xl border border-gn-border-subtle bg-gn-surface/40 px-4 py-4 text-sm"
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
            className="mt-3 inline-block text-sm font-medium text-gn-accent hover:underline"
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
          className="max-w-full break-words rounded-xl border border-gn-border-subtle bg-gn-surface/30 px-4 py-3 text-sm text-gn-text-secondary"
          role="status"
        >
          {t("incompleteHint")}
        </p>
      ) : null}

      <div className="min-w-0 max-w-full rounded-2xl border border-gn-border-subtle bg-gn-surface/40 p-3 sm:p-4">
        <div className="grid min-w-0 max-w-full gap-3 sm:gap-4">
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
              className={`${inputClass} min-h-[96px] resize-none break-words sm:min-h-[110px]`}
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
            />
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
            <label className="flex items-center gap-2 text-sm text-gn-text-secondary">
              <input type="checkbox" checked={isAvailableForTrials} onChange={(e) => setIsAvailableForTrials(e.target.checked)} />
              {t("availableForTrials")}
            </label>
            <label className="flex items-center gap-2 text-sm text-gn-text-secondary">
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
              <textarea className={`${inputClass} min-h-[88px]`} value={careerHistory} onChange={(e) => setCareerHistory(e.target.value)} />
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
        disabled={!canSave}
        aria-busy={saving}
        onClick={() => void onSave()}
        className={`${GN_PRIMARY_BUTTON_CLASS} box-border w-full max-w-full min-w-0 py-3.5`}
      >
        {saving ? <Spinner /> : null}
        {saving ? t("saving") : t("save")}
      </button>

      <DeleteAccountSection />
    </div>
  );
}

