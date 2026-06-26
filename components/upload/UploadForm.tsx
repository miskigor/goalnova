"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { supabase } from "@/lib/supabase/client";
import { logFullSupabaseError } from "@/lib/supabase/logError";
import type { Database } from "@/lib/supabase/client";
import {
  GN_PRIMARY_BUTTON_CLASS,
  GN_SECONDARY_BUTTON_CLASS,
} from "@/components/ui/gnButtonClasses";
import { isChallengeUploadSuperAdminBypassEnabled } from "@/lib/challenges/challengeUploadSuperAdminBypass";
import { challengeLinkSegment } from "@/lib/challenges/challengeRowUtils";
import {
  fetchActiveChallengesOrdered,
  fetchChallengeForUploadContext,
  type ChallengeRow,
} from "@/lib/supabase/challenges";
import { isEffectiveSuperAdmin } from "@/lib/supabase/adminScoutVerification";
import { recordChallengeEntryForNewVideo } from "@/lib/supabase/challengeEntries";
import { runAndPersistChallengeVideoAiAnalysis } from "@/lib/ai/challengeUploadAiAnalysis";
import { MusicTrackPicker } from "@/components/upload/MusicTrackPicker";
import { MusicMergeTrimPanel } from "@/components/upload/MusicMergeTrimPanel";
import { UploadSuccessNextSteps } from "@/components/upload/UploadSuccessNextSteps";
import {
  VIDEO_UPLOAD_MAX_BYTES,
  VIDEO_UPLOAD_MAX_MB,
  formatVideoFileSize,
  isStorageOrUploadSizeLimitError,
} from "@/lib/upload/videoUploadLimits";
import { isPublishWithMusicBlocked } from "@/lib/upload/musicMergePublish";
import { probeLocalVideoDuration } from "@/lib/upload/videoDurationProbe";
import { captureVideoThumbnailJpeg } from "@/lib/video/captureVideoThumbnail";
import { formatTrackDuration } from "@/lib/supabase/musicTracks";
import { defaultMusicEndSec } from "@/lib/video/clampMusicSegment";
import {
  LEGACY_VIDEO_STORAGE_BUCKET,
  VIDEO_STORAGE_BUCKET,
} from "@/lib/constants/storageBuckets";
import { canUploadVideo, getPlayerVideoUploadLimit } from "@/lib/premium/playerPremium";
import { fetchMyPlayerPremiumProfile, fetchMyVideoCount } from "@/lib/supabase/playerPremium";

type Role = "player" | "scout";
type PlayerGateStatus = "checking" | "allowed" | "denied" | "unknown";

const BUCKET = VIDEO_STORAGE_BUCKET;

const STORAGE_UPLOAD_TIMEOUT_MS = 5 * 60 * 1000;

/** TEMP: remove when merge/upload pipeline is stable. Dev-only, or set NEXT_PUBLIC_DEBUG_MERGE_UPLOAD=true. */
function tempDebugMergeUpload(label: string, payload: Record<string, unknown>) {
  if (
    process.env.NODE_ENV !== "development" &&
    process.env.NEXT_PUBLIC_DEBUG_MERGE_UPLOAD !== "true"
  ) {
    return;
  }
  console.info(`[PitchRusch TEMP DEBUG] ${label}`, payload);
}

/** Production-safe merge diagnostics (always logged when library music merge runs). */
function logMusicMergeDiagnostics(payload: {
  httpStatus: number | null;
  mergeResOk: boolean;
  mergeApiHeader: string | null;
  parseState: string;
  jsonOk: unknown;
  apiError: string | null;
  rawBodyPreview: string;
  processedVideoUrlLength: number;
  mergeRejectReasons?: string[];
  selectedMusicTrackId?: string | null;
  storagePath?: string;
  videoFileBytes?: number;
  phase?: string;
}) {
  console.info("[PitchRusch upload] music merge diagnostics", payload);
}

type UploadPhase =
  | "idle"
  | "validating"
  | "uploading"
  | "processing_merge"
  | "saving_metadata"
  | "ai_analyzing"
  | "success"
  | "failed";

type UploadWizardStep = 1 | 2;

function logSupabaseError(label: string, err: unknown) {
  logFullSupabaseError(label, err);
}

function isBucketNotFoundError(err: unknown): boolean {
  const e = err as {
    message?: string | null;
    error?: string | null;
    statusCode?: number | null;
    status?: number | null;
  } | null;
  const msg = `${String(e?.message ?? "")} ${String(e?.error ?? "")}`.toLowerCase();
  const status = e?.statusCode ?? e?.status ?? null;
  return msg.includes("bucket not found") || status === 404;
}

function isVideoFile(file: File): boolean {
  if (file.type && file.type.startsWith("video/")) return true;
  const name = file.name.toLowerCase();
  return (
    name.endsWith(".mp4") ||
    name.endsWith(".mov") ||
    name.endsWith(".webm") ||
    name.endsWith(".mkv") ||
    name.endsWith(".avi") ||
    name.endsWith(".m4v")
  );
}

const UPLOAD_CAPTION_MAX_LENGTH = 160;

/** Caption field + step-1 continue — inset from screen edges on narrow viewports. */
const UPLOAD_FORM_INSET_BLOCK_CLASS =
  "mx-auto box-border w-full min-w-0 max-w-[calc(100%-1.5rem)] sm:max-w-xl";

type UploadCaptionFieldProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  label: string;
  placeholder: string;
  tooLongMessage: string;
};

function UploadCaptionField({
  id,
  value,
  onChange,
  disabled,
  label,
  placeholder,
  tooLongMessage,
}: UploadCaptionFieldProps) {
  const length = value.length;
  const tooLong = length > UPLOAD_CAPTION_MAX_LENGTH;

  return (
    <div className={`${UPLOAD_FORM_INSET_BLOCK_CLASS} space-y-1.5`}>
      <label htmlFor={id} className="block text-sm font-medium text-gn-text">
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={3}
        aria-invalid={tooLong}
        aria-describedby={tooLong ? `${id}-error ${id}-counter` : `${id}-counter`}
        className={[
          "box-border w-full min-w-0 max-w-full resize-y rounded-xl border bg-gn-bg px-3 py-2.5 text-sm text-gn-text",
          "placeholder:text-gn-text-tertiary focus:outline-none focus:ring-2 focus:ring-gn-accent/40",
          tooLong ? "border-red-500/60" : "border-gn-border-subtle",
          disabled ? "cursor-not-allowed opacity-60" : "",
        ].join(" ")}
      />
      <div className="flex min-w-0 items-start justify-between gap-2">
        {tooLong ? (
          <p id={`${id}-error`} role="alert" className="min-w-0 flex-1 text-xs text-red-300/95">
            {tooLongMessage}
          </p>
        ) : (
          <span className="flex-1" />
        )}
        <p
          id={`${id}-counter`}
          className={[
            "shrink-0 tabular-nums text-xs",
            tooLong ? "font-medium text-red-300/95" : "text-gn-text-tertiary",
          ].join(" ")}
        >
          {length}/{UPLOAD_CAPTION_MAX_LENGTH}
        </p>
      </div>
    </div>
  );
}

export function UploadForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const challengeId = useMemo(() => {
    const fromSp = searchParams.get("challenge_id")?.trim();
    if (fromSp) return fromSp;
    if (typeof window !== "undefined") {
      return (
        new URLSearchParams(window.location.search).get("challenge_id")?.trim() ||
        null
      );
    }
    return null;
  }, [searchParams]);

  const t = useTranslations("upload");
  const tMusic = useTranslations("music");
  const tCh = useTranslations("challenges");
  const tCommon = useTranslations("authCommon");
  const tLogin = useTranslations("authLogin");
  const prevUploadPhaseRef = useRef<UploadPhase>("idle");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [checking, setChecking] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [playerGate, setPlayerGate] = useState<PlayerGateStatus>("checking");
  const [staffOrScoutHint, setStaffOrScoutHint] = useState(false);
  const [superAdminChallengeBypass, setSuperAdminChallengeBypass] =
    useState(false);

  const [challengeUrlContext, setChallengeUrlContext] = useState<{
    status: "absent" | "loading" | "ready";
    row: ChallengeRow | null;
    rules: string | null;
  }>({ status: "absent", row: null, rules: null });
  /** Optional challenge when not using `?challenge_id=` (picker on upload page). */
  const [pickerChallengeId, setPickerChallengeId] = useState<string>("");
  const [activeChallengesPick, setActiveChallengesPick] = useState<ChallengeRow[]>([]);
  const [ignoreInvalidChallengeParam, setIgnoreInvalidChallengeParam] = useState(false);

  const [uploadPhase, setUploadPhase] = useState<UploadPhase>("idle");
  const [lastChallengeAiOk, setLastChallengeAiOk] = useState(true);
  const [failureDetail, setFailureDetail] = useState<string | null>(null);
  /** Shown on success when library music merge failed but the original video was published. */
  const [uploadSuccessWarning, setUploadSuccessWarning] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const [selectedMusicTrackId, setSelectedMusicTrackId] = useState<string | null>(
    null,
  );
  const [selectedMusicTitle, setSelectedMusicTitle] = useState("");
  const [selectedMusicArtist, setSelectedMusicArtist] = useState("");
  const [musicTrackDurationSec, setMusicTrackDurationSec] = useState<number | null>(
    null,
  );
  /** Used to probe real audio duration from the file when DB metadata is missing or wrong. */
  const [selectedMusicAudioUrl, setSelectedMusicAudioUrl] = useState<string | null>(
    null,
  );
  const [videoDurationSeconds, setVideoDurationSeconds] = useState<number | null>(
    null,
  );
  const [musicStartSec, setMusicStartSec] = useState(0);
  const [musicEndSec, setMusicEndSec] = useState(0);
  const [musicVolume, setMusicVolume] = useState(1);
  const [selectedFileMeta, setSelectedFileMeta] = useState<{
    name: string;
    size: number;
  } | null>(null);
  const [wizardStep, setWizardStep] = useState<UploadWizardStep>(1);
  const [draftVideoFile, setDraftVideoFile] = useState<File | null>(null);
  const [videoDurationProbeFailed, setVideoDurationProbeFailed] = useState(false);
  const [caption, setCaption] = useState("");
  const captionTooLong = caption.length > UPLOAD_CAPTION_MAX_LENGTH;

  const draftVideoObjectUrl = useMemo(() => {
    if (!draftVideoFile) return null;
    return URL.createObjectURL(draftVideoFile);
  }, [draftVideoFile]);

  useEffect(() => {
    return () => {
      if (draftVideoObjectUrl) URL.revokeObjectURL(draftVideoObjectUrl);
    };
  }, [draftVideoObjectUrl]);

  /** Prefer browser-measured duration so the trim UI spans the full real track. */
  useEffect(() => {
    const url = selectedMusicAudioUrl?.trim();
    if (!url) return;

    const audio = new Audio();
    audio.preload = "metadata";

    const detach = () => {
      audio.removeAttribute("src");
      audio.load();
    };

    const onMeta = () => {
      const d = audio.duration;
      if (Number.isFinite(d) && d > 0.05) {
        setMusicTrackDurationSec((prev) =>
          prev == null || prev < 0.1 || Math.abs(prev - d) > 0.75 ? d : prev,
        );
      }
      detach();
    };

    const onErr = () => detach();

    audio.addEventListener("loadedmetadata", onMeta);
    audio.addEventListener("error", onErr);
    audio.src = url;

    return () => {
      audio.removeEventListener("loadedmetadata", onMeta);
      audio.removeEventListener("error", onErr);
      detach();
    };
  }, [selectedMusicAudioUrl]);

  const isUploadBusy = [
    "validating",
    "uploading",
    "processing_merge",
    "saving_metadata",
    "ai_analyzing",
  ].includes(uploadPhase);

  useEffect(() => {
    let mounted = true;
    const bootstrapRef = { current: true };

    async function init() {
      if (bootstrapRef.current) {
        setChecking(true);
        setPlayerGate("checking");
        setStaffOrScoutHint(false);
        setSuperAdminChallengeBypass(false);
        setInitError(null);
        setFailureDetail(null);
        setUploadSuccessWarning(null);
        setUploadPhase("idle");
        setSelectedMusicTrackId(null);
        setSelectedMusicTitle("");
        setSelectedMusicArtist("");
        setMusicTrackDurationSec(null);
        setSelectedMusicAudioUrl(null);
        setVideoDurationSeconds(null);
        setMusicStartSec(0);
        setMusicEndSec(0);
        setMusicVolume(1);
        setSelectedFileMeta(null);
        setWizardStep(1);
        setDraftVideoFile(null);
        setVideoDurationProbeFailed(false);
        setCaption("");
        setPickerChallengeId("");
      }
      try {
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) {
          logSupabaseError("Supabase: getSession error (upload init)", sessionError);
        }

        const user = sessionData.session?.user ?? null;
        if (!mounted) return;
        if (!user?.id) {
          setUserId(null);
          setPlayerGate("denied");
          setStaffOrScoutHint(false);
          setSuperAdminChallengeBypass(false);
          return;
        }

        setUserId(user.id);

        const { data: userRow, error: userError } = await supabase
          .from("users")
          .select("role, is_admin, admin_role")
          .eq("id", user.id)
          .maybeSingle();

        if (userError) {
          logSupabaseError("Supabase: users role select error", userError);
          const { data: playerProfile, error: playerProfileError } = await supabase
            .from("player_profiles")
            .select("id")
            .eq("id", user.id)
            .maybeSingle();

          if (playerProfileError) {
            logSupabaseError(
              "Supabase: player_profiles fallback select error",
              playerProfileError,
            );
            setPlayerGate("unknown");
            setSuperAdminChallengeBypass(false);
            setInitError(tCommon("genericError"));
            return;
          }

          if (playerProfile?.id) {
            setPlayerGate("allowed");
            setStaffOrScoutHint(false);
            setSuperAdminChallengeBypass(false);
            return;
          }

          setPlayerGate("unknown");
          setStaffOrScoutHint(false);
          setSuperAdminChallengeBypass(false);
          setInitError(tCommon("genericError"));
          return;
        }

        const r = (userRow?.role as Role | undefined) ?? null;
        if (r === "player") {
          setPlayerGate("allowed");
          setStaffOrScoutHint(false);
          setSuperAdminChallengeBypass(false);
        } else if (
          isChallengeUploadSuperAdminBypassEnabled() &&
          userRow != null &&
          isEffectiveSuperAdmin(userRow)
        ) {
          setPlayerGate("allowed");
          setStaffOrScoutHint(false);
          setSuperAdminChallengeBypass(true);
        } else {
          setPlayerGate("denied");
          setSuperAdminChallengeBypass(false);
          const roleStr = String(userRow?.role ?? "").trim();
          const isAdmin = Boolean(userRow?.is_admin);
          const staffRole = String(userRow?.admin_role ?? "").trim();
          setStaffOrScoutHint(
            roleStr === "scout" || isAdmin || staffRole.length > 0,
          );
        }
      } catch (e) {
        logFullSupabaseError("[PitchRusch upload] init catch", e);
        setInitError(tCommon("genericError"));
        setPlayerGate("unknown");
        setSuperAdminChallengeBypass(false);
      } finally {
        if (!mounted) return;
        if (bootstrapRef.current) {
          bootstrapRef.current = false;
        }
        setChecking(false);
      }
    }

    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void init();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [tCommon]);

  const urlChallengeParam = challengeId?.trim() ?? "";
  const effectiveJoinChallengeId = useMemo(
    () =>
      (ignoreInvalidChallengeParam ? "" : urlChallengeParam) || pickerChallengeId.trim(),
    [ignoreInvalidChallengeParam, urlChallengeParam, pickerChallengeId],
  );

  const resolvedJoinChallengeId = useMemo(() => {
    const u = effectiveJoinChallengeId.trim();
    if (!u) return "";
    if (challengeUrlContext.status !== "ready" || !challengeUrlContext.row) {
      return "";
    }
    return challengeUrlContext.row.id;
  }, [effectiveJoinChallengeId, challengeUrlContext]);

  const challengeUrlBlocksUpload =
    effectiveJoinChallengeId.trim().length > 0 &&
    challengeUrlContext.status === "loading" &&
    !resolvedJoinChallengeId;

  const finishChallengeSuccessUx = useCallback(
    (opts: {
      challengeId: string | null;
      newVideoId: string | null;
      aiAnalysisOk: boolean;
    }) => {
      void opts.aiAnalysisOk;
      const vid = opts.newVideoId?.trim() ?? "";
      const cid = opts.challengeId?.trim() ?? "";
      if (!cid) return;
      const row = challengeUrlContext.row;
      const seg =
        row && row.id === cid ? challengeLinkSegment(row) : cid;
      const q = vid ? `?highlight=${encodeURIComponent(vid)}` : "";
      window.setTimeout(() => {
        router.push(`/challenges/${encodeURIComponent(seg)}${q}`);
      }, 320);
    },
    [challengeUrlContext.row, router],
  );

  useEffect(() => {
    const id = effectiveJoinChallengeId.trim();

    if (!id) {
      setChallengeUrlContext({ status: "absent", row: null, rules: null });
      return;
    }

    setChallengeUrlContext({ status: "loading", row: null, rules: null });
    let cancelled = false;
    void (async () => {
      const res = await fetchChallengeForUploadContext(id);
      if (cancelled) return;
      if (res.error) {
        setChallengeUrlContext({ status: "ready", row: null, rules: null });
        return;
      }
      if (!res.row) {
        setChallengeUrlContext({ status: "ready", row: null, rules: null });
        return;
      }
      setChallengeUrlContext({
        status: "ready",
        row: res.row,
        rules: res.rules,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [effectiveJoinChallengeId]);

  useEffect(() => {
    setIgnoreInvalidChallengeParam(false);
  }, [urlChallengeParam]);

  useEffect(() => {
    if (urlChallengeParam.length > 0) {
      setActiveChallengesPick([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const { challenges, error } = await fetchActiveChallengesOrdered();
      if (cancelled) return;
      if (error) {
        setActiveChallengesPick([]);
        return;
      }
      setActiveChallengesPick(challenges);
    })();
    return () => {
      cancelled = true;
    };
  }, [urlChallengeParam]);

  useEffect(() => {
    prevUploadPhaseRef.current = uploadPhase;
  }, [uploadPhase]);

  const statusBannerText = useMemo(() => {
    switch (uploadPhase) {
      case "idle":
        if (wizardStep === 2) return t("uploadWizardStep2Status");
        return t("uploadWizardStep1Status");
      case "validating":
        return t("uploadStatusValidating");
      case "uploading":
        return t("uploadStatusUploading");
      case "processing_merge":
        return t("uploadStatusProcessingMerge");
      case "saving_metadata":
        return t("uploadStatusSaving");
      case "ai_analyzing":
        return t("uploadStatusAiAnalyzing");
      case "success": {
        const base = effectiveJoinChallengeId.trim()
          ? lastChallengeAiOk
            ? t("challengeUploadCompleteSuccess")
            : t("challengeUploadAiIncomplete")
          : t("videoUploadedSuccess");
        return uploadSuccessWarning ? `${base} ${uploadSuccessWarning}` : base;
      }
      case "failed":
        return `${t("uploadStatusFailedPrefix")}${failureDetail ?? tCommon("genericError")}`;
      default:
        return t("uploadStatusIdleSimple");
    }
  }, [
    uploadPhase,
    failureDetail,
    uploadSuccessWarning,
    t,
    tCommon,
    effectiveJoinChallengeId,
    lastChallengeAiOk,
    wizardStep,
  ]);

  const runUpload = useCallback(
    async (file: File) => {
      setUploadPhase("validating");
      setFailureDetail(null);
      setUploadSuccessWarning(null);
      setInitError(null);
      setSelectedFileMeta({ name: file.name, size: file.size });

      if (caption.length > UPLOAD_CAPTION_MAX_LENGTH) {
        setUploadPhase("failed");
        setFailureDetail(t("captionTooLong"));
        return;
      }

      if (file.size > VIDEO_UPLOAD_MAX_BYTES) {
        setUploadPhase("failed");
        setFailureDetail(t("fileTooLargeSimple"));
        return;
      }

      if (!isVideoFile(file)) {
        setUploadPhase("failed");
        setFailureDetail(t("invalidFileType"));
        return;
      }

      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError) {
        logFullSupabaseError(
          "[PitchRusch upload] auth.getSession before upload",
          sessionError,
        );
        setUploadPhase("failed");
        setFailureDetail(t("mustBeLoggedIn"));
        return;
      }

      const user = sessionData.session?.user;
      if (!user?.id) {
        setUploadPhase("failed");
        setFailureDetail(t("mustBeLoggedIn"));
        return;
      }

      const authUserId = user.id;
      const [{ profile }, { count: currentVideoCount }] = await Promise.all([
        fetchMyPlayerPremiumProfile(),
        fetchMyVideoCount(),
      ]);
      if (!canUploadVideo(profile, currentVideoCount)) {
        const limit = getPlayerVideoUploadLimit(profile);
        setUploadPhase("failed");
        setFailureDetail(
          `${t("youReachedFreeVideoLimit")} (${currentVideoCount}/${limit}) ${t("upgradeToUploadMoreVideos")}`,
        );
        return;
      }

      try {
        setUploadPhase("uploading");
        const thumbnailBlobPromise = captureVideoThumbnailJpeg(file);

        const safeOriginalName = file.name.replaceAll("/", "_");
        const objectPath = `${authUserId}/${Date.now()}-${safeOriginalName}`;
        const uploadWithTimeout = (bucket: string) => {
          const uploadPromise = supabase.storage.from(bucket).upload(objectPath, file, {
            upsert: true,
            contentType: file.type || "application/octet-stream",
          });
          const timeoutPromise = new Promise<never>((_, reject) => {
            window.setTimeout(() => {
              reject(
                new Error(
                  `Upload timed out after ${STORAGE_UPLOAD_TIMEOUT_MS / 1000} seconds.`,
                ),
              );
            }, STORAGE_UPLOAD_TIMEOUT_MS);
          });
          return Promise.race([uploadPromise, timeoutPromise]);
        };

        let activeBucket = BUCKET;
        let { data: uploadData, error: uploadError } = await uploadWithTimeout(activeBucket);
        if (uploadError && isBucketNotFoundError(uploadError)) {
          tempDebugMergeUpload("primary bucket missing, retrying legacy bucket", {
            primaryBucket: BUCKET,
            fallbackBucket: LEGACY_VIDEO_STORAGE_BUCKET,
            message:
              uploadError && typeof uploadError === "object" && "message" in uploadError
                ? String((uploadError as { message?: unknown }).message ?? "")
                : null,
          });
          activeBucket = LEGACY_VIDEO_STORAGE_BUCKET;
          const retry = await uploadWithTimeout(activeBucket);
          uploadData = retry.data;
          uploadError = retry.error;
        }

        if (uploadError) {
          logFullSupabaseError("[PitchRusch upload] storage upload error", uploadError);
          setUploadPhase("failed");
          setFailureDetail(
            isBucketNotFoundError(uploadError)
              ? "Video storage bucket is missing. Run Supabase storage migration."
              : isStorageOrUploadSizeLimitError(uploadError)
              ? t("fileTooLargeSimple")
              : tCommon("genericError"),
          );
          return;
        }

        if (!uploadData?.path) {
          setUploadPhase("failed");
          setFailureDetail(tCommon("genericError"));
          return;
        }

        tempDebugMergeUpload("raw video storage upload OK", {
          bucket: activeBucket,
          path: uploadData.path,
          id: uploadData.id ?? null,
          fullPath: uploadData.fullPath ?? null,
        });

        const { data: urlData } = supabase.storage.from(activeBucket).getPublicUrl(uploadData.path);
        const videoUrl = urlData.publicUrl;

        let resolvedChallengeId = resolvedJoinChallengeId;

        const musicId =
          typeof selectedMusicTrackId === "string"
            ? selectedMusicTrackId.trim() || null
            : null;

        if (effectiveJoinChallengeId.trim() && !resolvedChallengeId) {
          const challengeResolve = await fetchChallengeForUploadContext(
            effectiveJoinChallengeId.trim(),
          );
          if (challengeResolve.row?.id) {
            resolvedChallengeId = challengeResolve.row.id;
          } else {
            setUploadPhase("failed");
            setFailureDetail(t("challengeInvalidLink"));
            return;
          }
        }

        let publishUrl = videoUrl;
        let sourceUrl: string | null = null;
        let processedVideoUrl: string | null = null;
        let mergeFailed = false;
        const storeMusicId: string | null = musicId;
        let storeStart = 0;
        let storeEnd: number | null = null;
        let storeVol = 1;

        /**
         * Optional library music: merge when selected; on failure publish original upload without
         * `selected_music_track_id` and show `mergeCompletedWithoutMusic` on success.
         */
        let publishedWithoutLibraryMusic = false;
        if (musicId) {
          setUploadPhase("processing_merge");
          if (isPublishWithMusicBlocked()) {
            mergeFailed = true;
            console.warn("[PitchRusch upload] merge skipped — client gate (API not called)", {
              selectedMusicTrackId: musicId,
              reason:
                "TEMP_BLOCK_PUBLISH_WITH_MUSIC or NEXT_PUBLIC_DISABLE_MUSIC_MERGE_PUBLISH; override with NEXT_PUBLIC_ALLOW_PUBLISH_WITH_MUSIC=true",
            });
            tempDebugMergeUpload("publish-with-music blocked", {
              reason:
                "temp gate or NEXT_PUBLIC_DISABLE_MUSIC_MERGE_PUBLISH; allow via NEXT_PUBLIC_ALLOW_PUBLISH_WITH_MUSIC=true",
            });
          } else {
            const { data: sess } = await supabase.auth.getSession();
            const accessToken = sess.session?.access_token;
            if (!accessToken) {
              console.error(
                "[PitchRusch upload] merge blocked: missing access token (session expired or unavailable)",
              );
              try {
                await supabase.storage.from(activeBucket).remove([uploadData.path]);
              } catch (rmErr) {
                console.error(
                  "[PitchRusch upload] cleanup after missing access token (remove raw upload)",
                  rmErr,
                );
              }
              setUploadPhase("failed");
              setFailureDetail(t("mustBeLoggedIn"));
              return;
            } else {
              const mergeEndpoint =
                typeof window !== "undefined"
                  ? `${window.location.origin}/api/videos/merge-music`
                  : "/api/videos/merge-music";
              try {
              console.info("[PitchRusch upload] music merge request started", {
                selectedMusicTrackId: musicId,
                storagePath: uploadData.path,
                storageBucket: activeBucket,
                videoFileBytes: file.size,
                mergeEndpoint,
              });
              const mergeRes = await fetch(mergeEndpoint, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                  storagePath: uploadData.path,
                  storageBucket: activeBucket,
                  musicTrackId: musicId,
                  musicStartSeconds: musicStartSec,
                  musicEndSeconds: musicEndSec,
                  musicVolume,
                }),
                signal: AbortSignal.timeout(120_000),
              });
              const mergeApiHeader = mergeRes.headers.get("x-pitchrusch-merge-api");
              const rawBody = await mergeRes.text();
              const trimmed = rawBody.trim();
              let mergeJson: Record<string, unknown> = {};
              let parseOk = false;
              if (!trimmed) {
                console.error(
                  "[PitchRusch upload] merge API returned empty body (not valid JSON) — check deployment /api route",
                  { httpStatus: mergeRes.status, mergeEndpoint },
                );
              } else {
                try {
                  mergeJson = JSON.parse(trimmed) as Record<string, unknown>;
                  parseOk = true;
                } catch (parseErr) {
                  console.error(
                    "[PitchRusch upload] merge API returned non-JSON body",
                    { httpStatus: mergeRes.status, mergeEndpoint, preview: trimmed.slice(0, 400) },
                    parseErr,
                  );
                }
              }
              const isEmptyObject =
                parseOk && Object.keys(mergeJson).length === 0;
              if (isEmptyObject) {
                console.error(
                  "[PitchRusch upload] merge API returned literal empty object {}",
                  { httpStatus: mergeRes.status, mergeEndpoint, rawLength: rawBody.length },
                );
              }
              tempDebugMergeUpload("merge API full response", {
                httpStatus: mergeRes.status,
                fetchOk: mergeRes.ok,
                mergeApiHeader,
                rawLength: rawBody.length,
                parseOk,
                isEmptyObject,
                rawBodyPreview: rawBody.slice(0, 2000),
                parsed: mergeJson,
                apiError: mergeJson.error,
              });
              tempDebugMergeUpload("merge API response (parsed)", {
                httpStatus: mergeRes.status,
                fetchOk: mergeRes.ok,
                parseOk,
                jsonOk: mergeJson.ok,
                code: mergeJson.code,
                error: mergeJson.error,
                message: mergeJson.message,
                processed_video_url:
                  typeof mergeJson.processed_video_url === "string"
                    ? mergeJson.processed_video_url
                    : null,
                merged_storage_path: mergeJson.merged_storage_path ?? null,
                applied: mergeJson.applied ?? null,
              });
              const pickUrl = (v: unknown) =>
                typeof v === "string" ? v.trim() : "";
              const processedVideoUrlFromApi = pickUrl(mergeJson.processed_video_url);
              const parseState = !trimmed
                ? "empty_body"
                : !parseOk
                  ? "invalid_json"
                  : isEmptyObject
                    ? "empty_object_json"
                    : processedVideoUrlFromApi.length === 0
                      ? "missing_processed_video_url"
                      : "ok";
              const mergeRejectReasons: string[] = [];
              if (!parseOk) mergeRejectReasons.push("response_not_json");
              else if (isEmptyObject) mergeRejectReasons.push("response_empty_object");
              if (!mergeRes.ok) mergeRejectReasons.push(`http_status_${mergeRes.status}`);
              if (mergeApiHeader !== "1") {
                mergeRejectReasons.push(
                  `missing_x_pitchrusch_merge_api_header:${mergeApiHeader ?? "null"}`,
                );
              }
              if (mergeJson.ok !== true) mergeRejectReasons.push("json_ok_not_true");
              if (processedVideoUrlFromApi.length === 0) {
                mergeRejectReasons.push("missing_processed_video_url");
              }
              const apiError =
                typeof mergeJson.error === "string" ? mergeJson.error : null;
              logMusicMergeDiagnostics({
                phase: mergeRejectReasons.length === 0 ? "accepted" : "rejected",
                selectedMusicTrackId: musicId,
                storagePath: uploadData.path,
                videoFileBytes: file.size,
                httpStatus: mergeRes.status,
                mergeResOk: mergeRes.ok,
                mergeApiHeader,
                parseState,
                jsonOk: mergeJson.ok,
                apiError,
                rawBodyPreview: rawBody.slice(0, 500),
                processedVideoUrlLength: processedVideoUrlFromApi.length,
                mergeRejectReasons:
                  mergeRejectReasons.length > 0 ? mergeRejectReasons : undefined,
              });
              const mergeOk =
                parseOk &&
                !isEmptyObject &&
                mergeRes.ok === true &&
                mergeApiHeader === "1" &&
                mergeJson.ok === true &&
                processedVideoUrlFromApi.length > 0;
              if (mergeOk) {
                publishUrl = processedVideoUrlFromApi;
                sourceUrl = videoUrl;
                processedVideoUrl = processedVideoUrlFromApi;
                const applied = mergeJson.applied as
                  | {
                      musicStartSeconds?: number;
                      musicEndSeconds?: number;
                      musicVolume?: number;
                    }
                  | undefined;
                storeStart = applied?.musicStartSeconds ?? musicStartSec;
                storeEnd = applied?.musicEndSeconds ?? musicEndSec;
                storeVol = applied?.musicVolume ?? musicVolume;
                tempDebugMergeUpload("merge accepted merged video", {
                  processed_video_url: processedVideoUrl,
                });
              } else {
                mergeFailed = true;
                console.warn(
                  "[PitchRusch upload] merge API rejected — fallback will publish original video",
                  { mergeRejectReasons, httpStatus: mergeRes.status },
                );
              }
            } catch (mergeErr) {
              const mergeErrMessage =
                mergeErr instanceof Error ? mergeErr.message : String(mergeErr);
              logMusicMergeDiagnostics({
                phase: "network_or_parse_exception",
                selectedMusicTrackId: musicId,
                storagePath: uploadData.path,
                videoFileBytes: file.size,
                httpStatus: null,
                mergeResOk: false,
                mergeApiHeader: null,
                parseState: "network_or_parse_exception",
                jsonOk: null,
                apiError: mergeErrMessage,
                rawBodyPreview: "",
                processedVideoUrlLength: 0,
              });
              console.error("[PitchRusch upload] merge-music network/parse error", {
                selectedMusicTrackId: musicId,
                mergeEndpoint,
                error: mergeErr,
              });
              mergeFailed = true;
            }
            }
          }
        }

        const hasProcessedMergedVideo =
          typeof processedVideoUrl === "string" && processedVideoUrl.trim().length > 0;
        if (musicId && (mergeFailed || !hasProcessedMergedVideo)) {
          console.warn(
            "[PitchRusch upload] library music merge failed — publishing original video without added track",
            {
              musicId,
              storagePath: uploadData.path,
              mergeFailed,
              hasProcessedMergedVideo,
            },
          );
          publishedWithoutLibraryMusic = true;
          publishUrl = videoUrl;
          sourceUrl = null;
          processedVideoUrl = null;
        }

        if (hasProcessedMergedVideo) {
          tempDebugMergeUpload("merge succeeded — will persist processed_video_url", {
            video_url: publishUrl,
            processed_video_url: processedVideoUrl,
            source_video_url: sourceUrl,
          });
        }

        setUploadPhase("saving_metadata");

        let thumbnailUrl: string | null = null;
        const thumbBlob = await thumbnailBlobPromise.catch(() => null);
        if (thumbBlob) {
          const thumbPath = `${authUserId}/thumbnails/${Date.now()}-thumb.jpg`;
          const { error: thumbUploadError } = await supabase.storage
            .from(activeBucket)
            .upload(thumbPath, thumbBlob, {
              upsert: true,
              contentType: "image/jpeg",
              cacheControl: "31536000",
            });
          if (!thumbUploadError) {
            thumbnailUrl = supabase.storage.from(activeBucket).getPublicUrl(thumbPath).data
              .publicUrl;
          }
        }

        /**
         * DB columns `music_start_seconds` / `music_end_seconds` are integer-backed.
         * Merge math can produce decimals (e.g. 10.368), so normalize before insert.
         */
        const normalizedMusicStartSeconds = Math.max(
          0,
          Math.floor(Number.isFinite(storeStart) ? storeStart : 0),
        );
        const normalizedMusicEndSeconds =
          storeEnd == null || !Number.isFinite(storeEnd)
            ? null
            : Math.max(normalizedMusicStartSeconds, Math.ceil(storeEnd));

        /** Only persist music metadata when we have a merged file URL (matches videos.processed_video_url). */
        const captionTrimmed = caption.trim();
        const insertPayload: Database["public"]["Tables"]["videos"]["Insert"] = {
          user_id: authUserId,
          video_url: publishUrl,
          source_video_url: sourceUrl,
          processed_video_url: processedVideoUrl,
          caption: captionTrimmed.length > 0 ? captionTrimmed : null,
          skill_type: null,
          city: null,
          country: null,
          selected_music_track_id: hasProcessedMergedVideo ? storeMusicId : null,
          music_start_seconds: hasProcessedMergedVideo ? normalizedMusicStartSeconds : 0,
          music_end_seconds: hasProcessedMergedVideo ? normalizedMusicEndSeconds : null,
          music_volume: hasProcessedMergedVideo ? storeVol : 1,
          ...(thumbnailUrl ? { thumbnail_url: thumbnailUrl } : {}),
        };
        if (resolvedChallengeId) {
          insertPayload.challenge_id = resolvedChallengeId;
        }

        const { data: insertedRow, error: insertError } = await supabase
          .from("videos")
          .insert(insertPayload)
          .select()
          .single();

        tempDebugMergeUpload("videos insert challenge linkage", {
          videoId: insertedRow?.id ?? null,
          challenge_id: insertedRow?.challenge_id ?? null,
          expectedChallengeId: resolvedChallengeId || null,
          effectiveJoinChallengeId: effectiveJoinChallengeId || null,
        });

        tempDebugMergeUpload("videos row after insert (storage + DB)", {
          videoId: insertedRow?.id ?? null,
          insertOk: !insertError,
          insertError: insertError?.message ?? null,
          video_url: insertedRow?.video_url ?? null,
          processed_video_url: insertedRow?.processed_video_url ?? null,
          source_video_url: insertedRow?.source_video_url ?? null,
          selected_music_track_id: insertedRow?.selected_music_track_id ?? null,
        });

        if (insertError) {
          logFullSupabaseError("[PitchRusch upload] videos insert error", insertError);
          setUploadPhase("failed");
          setFailureDetail(tCommon("genericError"));
          return;
        }

        const newVideoId = insertedRow?.id ?? null;
        let aiAnalysisOk = true;

        if (!thumbnailUrl && newVideoId) {
          const { data: sess } = await supabase.auth.getSession();
          const accessToken = sess.session?.access_token;
          if (accessToken) {
            void fetch(
              typeof window !== "undefined"
                ? `${window.location.origin}/api/videos/generate-thumbnail`
                : "/api/videos/generate-thumbnail",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({ videoId: newVideoId }),
              },
            ).catch(() => undefined);
          }
        }

        if (resolvedChallengeId && newVideoId) {
          await recordChallengeEntryForNewVideo(supabase, {
            challengeId: resolvedChallengeId,
            videoId: newVideoId,
            userId: authUserId,
          });
          setUploadPhase("ai_analyzing");
          const ar = await runAndPersistChallengeVideoAiAnalysis({
            userId: authUserId,
            videoId: newVideoId,
          });
          aiAnalysisOk = ar.ok;
        }

        setLastChallengeAiOk(aiAnalysisOk);
        setUploadSuccessWarning(
          publishedWithoutLibraryMusic ? t("mergeCompletedWithoutMusic") : null,
        );
        setUploadPhase("success");
        finishChallengeSuccessUx({
          challengeId: resolvedChallengeId || null,
          newVideoId,
          aiAnalysisOk,
        });
        setSelectedMusicTrackId(null);
        setSelectedMusicTitle("");
        setSelectedMusicArtist("");
        setMusicTrackDurationSec(null);
        setSelectedMusicAudioUrl(null);
        setVideoDurationSeconds(null);
        setMusicStartSec(0);
        setMusicEndSec(0);
        setMusicVolume(1);
        setSelectedFileMeta(null);
        setCaption("");
      } catch (e) {
        logFullSupabaseError("[PitchRusch upload] catch block", e);
        const raw =
          e && typeof e === "object" && "message" in e
            ? String((e as { message?: unknown }).message)
            : "";
        const timedOut = /timed out|timeout/i.test(raw);
        setUploadPhase("failed");
        setFailureDetail(
          timedOut
            ? t("uploadTimeout")
            : isStorageOrUploadSizeLimitError(e)
              ? t("fileTooLargeSimple")
              : tCommon("genericError"),
        );
      }
    },
    [
      t,
      tCommon,
      effectiveJoinChallengeId,
      resolvedJoinChallengeId,
      finishChallengeSuccessUx,
      selectedMusicTrackId,
      musicStartSec,
      musicEndSec,
      musicVolume,
      caption,
    ],
  );

  async function onFileInputChange(e: ChangeEvent<HTMLInputElement>) {
    const next = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!next) return;

    setSelectedFileMeta({ name: next.name, size: next.size });
    setFailureDetail(null);
    setUploadSuccessWarning(null);
    setVideoDurationProbeFailed(false);
    setWizardStep(1);

    if (!isVideoFile(next)) {
      setUploadPhase("failed");
      setFailureDetail(t("invalidFileType"));
      setDraftVideoFile(null);
      setVideoDurationSeconds(null);
      return;
    }
    if (next.size > VIDEO_UPLOAD_MAX_BYTES) {
      setUploadPhase("failed");
      setFailureDetail(t("fileTooLargeSimple"));
      setDraftVideoFile(null);
      setVideoDurationSeconds(null);
      return;
    }

    setUploadPhase("idle");
    setDraftVideoFile(next);
    const dur = await probeLocalVideoDuration(next);
    if (dur == null || dur <= 0) {
      setVideoDurationSeconds(null);
      setVideoDurationProbeFailed(true);
      return;
    }
    setVideoDurationSeconds(dur);
  }

  function continueToPreviewStep() {
    if (!draftVideoFile || challengeUrlBlocksUpload || isUploadBusy) return;
    if (draftVideoFile.size > VIDEO_UPLOAD_MAX_BYTES) {
      setUploadPhase("failed");
      setFailureDetail(t("fileTooLargeSimple"));
      return;
    }
    if (videoDurationSeconds == null || videoDurationSeconds <= 0) return;
    if (caption.length > UPLOAD_CAPTION_MAX_LENGTH) {
      setUploadPhase("failed");
      setFailureDetail(t("captionTooLong"));
      return;
    }

    const vd = videoDurationSeconds;
    if (selectedMusicTrackId) {
      const md = musicTrackDurationSec ?? 0;
      setMusicStartSec(0);
      setMusicEndSec(defaultMusicEndSec(md, vd));
    } else {
      setMusicStartSec(0);
      setMusicEndSec(0);
    }
    setWizardStep(2);
  }

  function backToSetupStep() {
    if (isUploadBusy) return;
    setWizardStep(1);
  }

  function resetUploadFormForAnother() {
    if (fileInputRef.current) fileInputRef.current.value = "";
    setUploadPhase("idle");
    setFailureDetail(null);
    setUploadSuccessWarning(null);
    setDraftVideoFile(null);
    setWizardStep(1);
    setSelectedFileMeta(null);
    setSelectedMusicTrackId(null);
    setSelectedMusicTitle("");
    setSelectedMusicArtist("");
    setMusicTrackDurationSec(null);
    setSelectedMusicAudioUrl(null);
    setVideoDurationSeconds(null);
    setMusicStartSec(0);
    setMusicEndSec(0);
    setMusicVolume(1);
    setVideoDurationProbeFailed(false);
    setCaption("");
  }

  function publishDraftVideo() {
    if (isUploadBusy) return;
    if (caption.length > UPLOAD_CAPTION_MAX_LENGTH) {
      setUploadPhase("failed");
      setFailureDetail(t("captionTooLong"));
      return;
    }
    if (!draftVideoFile) {
      setUploadPhase("failed");
      setFailureDetail(t("fileRequired"));
      return;
    }
    if (challengeUrlBlocksUpload) {
      setUploadPhase("failed");
      setFailureDetail(t("challengeInvalidLink"));
      return;
    }
    if (draftVideoFile.size > VIDEO_UPLOAD_MAX_BYTES) {
      setUploadPhase("failed");
      setFailureDetail(t("fileTooLargeSimple"));
      return;
    }
    void runUpload(draftVideoFile);
  }

  const canContinueToPreview =
    draftVideoFile != null &&
    draftVideoFile.size <= VIDEO_UPLOAD_MAX_BYTES &&
    !videoDurationProbeFailed &&
    videoDurationSeconds != null &&
    videoDurationSeconds > 0 &&
    !isUploadBusy &&
    !challengeUrlBlocksUpload &&
    !captionTooLong;

  const isChallengeUploadFlow = effectiveJoinChallengeId.trim().length > 0;
  const uploadFormRendered = Boolean(userId) && playerGate === "allowed";
  const showGeneralUploadSuccess =
    uploadPhase === "success" && resolvedJoinChallengeId.trim().length === 0;

  const pageTitle = t("uploadTitle");
  const pageSubtitle = isChallengeUploadFlow
    ? t("uploadVideoOnlySubtitleChallenge")
    : t("uploadSubtitle");

  return (
    <div className="box-border w-full min-w-0 max-w-full overflow-x-clip space-y-5 sm:space-y-6">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-gn-text sm:text-2xl">
          {pageTitle}
        </h1>
        <p className="mt-1 text-xs text-gn-text-secondary sm:text-sm">{pageSubtitle}</p>
      </div>

      {!urlChallengeParam && activeChallengesPick.length > 0 && playerGate === "allowed" ? (
        <div className="rounded-2xl border border-gn-border-subtle bg-gn-surface/30 p-4">
          <label className="block text-sm font-medium text-gn-text">
            {tCh("joinChallengePickerLabel")}
            <select
              suppressHydrationWarning
              value={pickerChallengeId}
              onChange={(e) => setPickerChallengeId(e.target.value)}
              className="mt-2 w-full rounded-xl border border-gn-border-subtle bg-gn-bg px-3 py-2.5 text-sm text-gn-text"
            >
              <option value="">{tCh("joinChallengePickerNone")}</option>
              {activeChallengesPick.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </label>
          <p className="mt-2 text-xs text-gn-text-tertiary">{tCh("joinChallengePickerHint")}</p>
        </div>
      ) : null}

      {isChallengeUploadFlow &&
      superAdminChallengeBypass &&
      playerGate === "allowed" ? (
        <div
          role="note"
          className="rounded-xl border border-amber-500/45 bg-amber-950/35 px-4 py-3 text-sm text-amber-100"
        >
          <p className="font-semibold tracking-tight text-amber-200">
            {tCh("challengeUploadSuperAdminBypassLabel")}
          </p>
          <p className="mt-1.5 leading-relaxed text-amber-100/90">
            {tCh("challengeUploadSuperAdminBypassNotice")}
          </p>
        </div>
      ) : null}

      {isChallengeUploadFlow ? (
        <section
          aria-label={t("challengeBannerAria")}
          className="rounded-2xl border border-gn-accent/35 bg-gn-accent/[0.08] p-4 ring-1 ring-gn-accent/15"
        >
          {challengeUrlContext.status !== "ready" ? (
            <div
              className="flex items-center gap-3 text-sm text-gn-text-secondary"
              role="status"
            >
              <div
                className="h-6 w-6 shrink-0 animate-spin rounded-full border-2 border-gn-accent border-t-transparent"
                aria-hidden
              />
              {tCommon("loading")}
            </div>
          ) : challengeUrlContext.row ? (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold tracking-tight text-gn-text">
                {challengeUrlContext.row.title}
              </h2>
              {challengeUrlContext.row.description?.trim() ? (
                <p className="text-sm leading-relaxed text-gn-text-secondary">
                  {challengeUrlContext.row.description}
                </p>
              ) : null}
              {challengeUrlContext.rules?.trim() ? (
                <div className="border-t border-gn-border-subtle pt-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-gn-text-tertiary">
                    {t("challengeRulesHeading")}
                  </h3>
                  <p className="mt-1.5 whitespace-pre-wrap text-sm text-gn-text-secondary">
                    {challengeUrlContext.rules}
                  </p>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3" role="alert">
              <p className="text-sm text-gn-text-secondary">
                {t("challengeInvalidLink")}
              </p>
              <Link
                href="/challenges"
                className={`${GN_PRIMARY_BUTTON_CLASS} inline-flex w-fit`}
              >
                {t("browseChallenges")}
              </Link>
              <button
                type="button"
                onClick={() => {
                  setIgnoreInvalidChallengeParam(true);
                  router.replace("/upload");
                }}
                className={`${GN_SECONDARY_BUTTON_CLASS} inline-flex w-fit`}
              >
                {t("continueWithoutChallenge")}
              </button>
            </div>
          )}
        </section>
      ) : null}

      {checking ? (
        <div
          className="flex min-h-[120px] flex-col items-center justify-center gap-3 rounded-2xl border border-gn-border-subtle bg-gn-surface/40 p-6"
          role="status"
        >
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-gn-accent border-t-transparent"
            aria-hidden
          />
          <p className="text-sm text-gn-text-secondary">{tCommon("loading")}</p>
        </div>
      ) : playerGate === "unknown" ? (
        <div className="rounded-2xl border border-gn-border-subtle bg-gn-surface/40 p-4">
          <p className="text-sm text-gn-text-secondary">{t("cannotVerifyRole")}</p>
        </div>
      ) : !userId ? (
        <div className="rounded-2xl border border-gn-border-subtle bg-gn-surface/40 p-4">
          <p className="text-sm text-gn-text-secondary">{t("mustBeLoggedIn")}</p>
          <Link
            href="/login"
            className="mt-4 inline-flex h-11 min-h-[2.75rem] items-center justify-center rounded-full bg-gn-accent px-6 text-sm font-semibold text-black transition-colors hover:bg-gn-accent-hover"
          >
            {tLogin("submit")}
          </Link>
        </div>
      ) : playerGate !== "allowed" ? (
        isChallengeUploadFlow ? (
          <div
            role="note"
            className="rounded-2xl border border-gn-border-subtle bg-gn-surface/40 p-4"
          >
            <p className="text-sm font-medium text-gn-text">
              {tCh("challengeUploadBlockedTitle")}
            </p>
            <p className="mt-2 text-sm text-gn-text-secondary">
              {tCh("challengeUploadBlockedBody")}
            </p>
            {staffOrScoutHint ? (
              <p className="mt-2 text-sm text-gn-text-tertiary">
                {tCh("challengeUploadBlockedStaff")}
              </p>
            ) : null}
          </div>
        ) : (
          <div className="rounded-2xl border border-gn-border-subtle bg-gn-surface/40 p-4">
            <p className="text-sm text-gn-text-secondary">{t("playerOnly")}</p>
          </div>
        )
      ) : null}

      {uploadFormRendered ? (
        showGeneralUploadSuccess ? (
          <UploadSuccessNextSteps onUploadAnother={resetUploadFormForAnother} />
        ) : (
        <div className="space-y-5">
          {wizardStep === 1 ? (
            <>
              <div className="rounded-2xl border border-gn-border-subtle bg-gn-surface/40 p-6 text-center">
                <input
                  suppressHydrationWarning
                  id="gn-upload-file-input"
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  className="sr-only"
                  aria-label={t("uploadChooseVideo")}
                  onChange={onFileInputChange}
                  disabled={isUploadBusy || challengeUrlBlocksUpload}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadBusy || challengeUrlBlocksUpload}
                  aria-busy={isUploadBusy}
                  className={`${GN_PRIMARY_BUTTON_CLASS} mx-auto min-h-[3rem] px-8 py-3 text-base disabled:cursor-not-allowed`}
                >
                  {t("uploadChooseVideo")}
                </button>
                <p className="mt-3 text-xs text-gn-text-tertiary">
                  {t("uploadMaxSize", { maxMb: VIDEO_UPLOAD_MAX_MB })}
                </p>
                {!selectedFileMeta ? (
                  <p className="mt-2 text-xs text-gn-text-secondary">{t("uploadNoFileSelected")}</p>
                ) : null}
                {selectedFileMeta ? (
                  <p
                    className={`mt-2 text-xs ${
                      selectedFileMeta.size > VIDEO_UPLOAD_MAX_BYTES
                        ? "font-medium text-amber-400/95"
                        : "text-gn-text-secondary"
                    }`}
                  >
                    {t("selectedFileDetails", {
                      name: selectedFileMeta.name,
                      size: formatVideoFileSize(selectedFileMeta.size),
                    })}
                  </p>
                ) : null}
                {videoDurationProbeFailed ? (
                  <p className="mt-2 text-xs font-medium text-amber-400/95" role="alert">
                    {t("uploadVideoDurationUnknown")}
                  </p>
                ) : null}
              </div>

              <UploadCaptionField
                id="gn-upload-caption-step1"
                value={caption}
                onChange={setCaption}
                disabled={isUploadBusy || challengeUrlBlocksUpload}
                label={t("captionLabel")}
                placeholder={t("captionPlaceholder")}
                tooLongMessage={t("captionTooLong")}
              />

              <div className="mx-auto w-full max-w-xl">
                <MusicTrackPicker
                  value={selectedMusicTrackId}
                  onChange={(id, track) => {
                    setSelectedMusicTrackId(id);
                    if (id && track) {
                      setSelectedMusicTitle((track.title ?? "").trim());
                      setSelectedMusicArtist((track.artist ?? "").trim());
                      const au = (track.audio_url ?? "").trim();
                      setSelectedMusicAudioUrl(au.length > 0 ? au : null);
                    } else {
                      setSelectedMusicTitle("");
                      setSelectedMusicArtist("");
                      setSelectedMusicAudioUrl(null);
                    }
                    const md =
                      track && typeof track.duration_seconds === "number"
                        ? track.duration_seconds
                        : null;
                    setMusicTrackDurationSec(
                      md != null && md > 0.05 ? md : null,
                    );
                  }}
                  disabled={isUploadBusy}
                />
              </div>

              <p className="text-center text-[0.7rem] leading-snug text-gn-text-secondary sm:text-xs sm:leading-relaxed">
                {t("copyrightConfirmation")}
              </p>

              {initError ? (
                <div
                  role="alert"
                  className="rounded-xl border border-gn-accent/30 bg-gn-surface/40 px-4 py-3 text-sm text-gn-text-secondary"
                >
                  {initError}
                </div>
              ) : null}
              <div
                role="status"
                aria-live="polite"
                className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
                  uploadPhase === "failed"
                    ? "border-gn-accent/40 bg-gn-accent/10 text-gn-text"
                    : uploadPhase === "success"
                      ? "border-white/15 bg-white/[0.06] text-gn-text-secondary"
                      : isUploadBusy
                        ? "border-gn-accent/30 bg-gn-surface/50 text-gn-text-secondary"
                        : "border-gn-border-subtle bg-gn-surface/30 text-gn-text-secondary"
                }`}
              >
                {statusBannerText}
              </div>

              <button
                type="button"
                onClick={continueToPreviewStep}
                disabled={!canContinueToPreview}
                className={`${GN_PRIMARY_BUTTON_CLASS} ${UPLOAD_FORM_INSET_BLOCK_CLASS} flex min-h-[3rem] justify-center px-8 py-3 text-base disabled:cursor-not-allowed`}
              >
                {t("uploadContinue")}
              </button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <h2 className="text-sm font-semibold tracking-tight text-gn-text">
                  {t("uploadPreviewHeading")}
                </h2>
                <div className="overflow-hidden rounded-2xl border border-gn-border-subtle bg-black">
                  {draftVideoObjectUrl ? (
                    <video
                      src={draftVideoObjectUrl}
                      controls
                      playsInline
                      className="mx-auto max-h-[min(50vh,22rem)] w-full object-contain"
                    />
                  ) : null}
                </div>
                {videoDurationSeconds != null && videoDurationSeconds > 0 ? (
                  <p className="text-center text-xs tabular-nums text-gn-text-secondary">
                    {t("videoFile")}: {formatTrackDuration(Math.floor(videoDurationSeconds))}
                  </p>
                ) : null}
              </div>

              <UploadCaptionField
                id="gn-upload-caption-step2"
                value={caption}
                onChange={setCaption}
                disabled={isUploadBusy}
                label={t("captionLabel")}
                placeholder={t("captionPlaceholder")}
                tooLongMessage={t("captionTooLong")}
              />

              {selectedMusicTrackId ? (
                <MusicMergeTrimPanel
                  trackTitle={
                    selectedMusicTitle.trim()
                      ? selectedMusicTitle
                      : tMusic("untitledTrack")
                  }
                  trackArtist={selectedMusicArtist || null}
                  videoDurationSec={videoDurationSeconds}
                  musicDurationSec={musicTrackDurationSec}
                  musicStart={musicStartSec}
                  musicEnd={musicEndSec}
                  musicVolume={musicVolume}
                  onTrimChange={(start, end) => {
                    setMusicStartSec(start);
                    setMusicEndSec(end);
                  }}
                  onMusicVolumeChange={setMusicVolume}
                  disabled={isUploadBusy}
                />
              ) : (
                <div className="mx-auto w-full max-w-xl rounded-xl border border-gn-border-subtle bg-gn-surface/30 px-4 py-3 text-center text-sm text-gn-text-secondary">
                  {t("uploadStep2NoMusic")}
                </div>
              )}

              <p className="text-center text-[0.7rem] leading-snug text-gn-text-secondary sm:text-xs sm:leading-relaxed">
                {t("copyrightConfirmation")}
              </p>

              {initError ? (
                <div
                  role="alert"
                  className="rounded-xl border border-gn-accent/30 bg-gn-surface/40 px-4 py-3 text-sm text-gn-text-secondary"
                >
                  {initError}
                </div>
              ) : null}
              <div
                role="status"
                aria-live="polite"
                className={`rounded-2xl border px-4 py-3 text-sm font-medium ${
                  uploadPhase === "failed"
                    ? "border-gn-accent/40 bg-gn-accent/10 text-gn-text"
                    : uploadPhase === "success"
                      ? "border-white/15 bg-white/[0.06] text-gn-text-secondary"
                      : isUploadBusy
                        ? "border-gn-accent/30 bg-gn-surface/50 text-gn-text-secondary"
                        : "border-gn-border-subtle bg-gn-surface/30 text-gn-text-secondary"
                }`}
              >
                {statusBannerText}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                <button
                  type="button"
                  onClick={backToSetupStep}
                  disabled={isUploadBusy}
                  className={`${GN_SECONDARY_BUTTON_CLASS} order-2 min-h-[3rem] w-full justify-center px-6 py-3 sm:order-1 sm:w-auto sm:min-w-[8rem]`}
                >
                  {t("uploadBack")}
                </button>
                <button
                  type="button"
                  onClick={publishDraftVideo}
                  disabled={
                    isUploadBusy ||
                    !draftVideoFile ||
                    draftVideoFile.size > VIDEO_UPLOAD_MAX_BYTES ||
                    challengeUrlBlocksUpload ||
                    videoDurationProbeFailed ||
                    captionTooLong
                  }
                  aria-busy={isUploadBusy}
                  className={`${GN_PRIMARY_BUTTON_CLASS} order-1 min-h-[3rem] w-full flex-1 justify-center px-8 py-3 text-base disabled:cursor-not-allowed sm:order-2`}
                >
                  {isUploadBusy ? t("uploading") : t("uploadPublishVideo")}
                </button>
              </div>
            </>
          )}
        </div>
        )
      ) : null}
    </div>
  );
}
