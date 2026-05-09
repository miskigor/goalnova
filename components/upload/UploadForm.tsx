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
import {
  VIDEO_UPLOAD_MAX_BYTES,
  VIDEO_UPLOAD_MAX_MB,
  formatVideoFileSize,
  isStorageOrUploadSizeLimitError,
} from "@/lib/upload/videoUploadLimits";
import { isPublishWithMusicBlocked } from "@/lib/upload/musicMergePublish";
import { probeLocalVideoDuration } from "@/lib/upload/videoDurationProbe";
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
  const [initError, setInitError] = useState<string | null>(null);
  const [selectedMusicTrackId, setSelectedMusicTrackId] = useState<string | null>(
    null,
  );
  const [selectedMusicTitle, setSelectedMusicTitle] = useState("");
  const [selectedMusicArtist, setSelectedMusicArtist] = useState("");
  const [musicTrackDurationSec, setMusicTrackDurationSec] = useState<number | null>(
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

  const draftVideoObjectUrl = useMemo(() => {
    if (!draftVideoFile) return null;
    return URL.createObjectURL(draftVideoFile);
  }, [draftVideoFile]);

  useEffect(() => {
    return () => {
      if (draftVideoObjectUrl) URL.revokeObjectURL(draftVideoObjectUrl);
    };
  }, [draftVideoObjectUrl]);

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
        setUploadPhase("idle");
        setSelectedMusicTrackId(null);
        setSelectedMusicTitle("");
        setSelectedMusicArtist("");
        setMusicTrackDurationSec(null);
        setVideoDurationSeconds(null);
        setMusicStartSec(0);
        setMusicEndSec(0);
        setMusicVolume(1);
        setSelectedFileMeta(null);
        setWizardStep(1);
        setDraftVideoFile(null);
        setVideoDurationProbeFailed(false);
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
      case "success":
        return effectiveJoinChallengeId.trim()
          ? lastChallengeAiOk
            ? t("challengeUploadCompleteSuccess")
            : t("challengeUploadAiIncomplete")
          : t("videoUploadedSuccess");
      case "failed":
        return `${t("uploadStatusFailedPrefix")}${failureDetail ?? tCommon("genericError")}`;
      default:
        return t("uploadStatusIdleSimple");
    }
  }, [
    uploadPhase,
    failureDetail,
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
      setInitError(null);
      setSelectedFileMeta({ name: file.name, size: file.size });

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
         * Music publish policy (strict — no fake “with music” success):
         * - TEMP: `TEMP_BLOCK_PUBLISH_WITH_MUSIC` or `NEXT_PUBLIC_DISABLE_MUSIC_MERGE_PUBLISH` ⇒
         *   block without calling merge (re-enable merge with `NEXT_PUBLIC_ALLOW_PUBLISH_WITH_MUSIC=true`).
         * - Otherwise: merge API must return `ok === true` + non-empty `processed_video_url`.
         * - On block/failure: delete raw upload, show `mergeMusicFailed` (hr: "Video nije bilo moguće objaviti s glazbom.").
         */
        if (musicId) {
          setUploadPhase("processing_merge");
          if (isPublishWithMusicBlocked()) {
            mergeFailed = true;
            console.info(
              "[PitchRusch upload] publish-with-music blocked (temp gate or NEXT_PUBLIC_DISABLE_MUSIC_MERGE_PUBLISH; allow via NEXT_PUBLIC_ALLOW_PUBLISH_WITH_MUSIC=true)",
            );
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
              try {
              /** Music merge: `POST /api/videos/merge-music` — `app/api/videos/merge-music/route.ts` */
              const mergeEndpoint =
                typeof window !== "undefined"
                  ? `${window.location.origin}/api/videos/merge-music`
                  : "/api/videos/merge-music";
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
              console.info("[PitchRusch upload] merge API full response", {
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
                console.info("[PitchRusch upload] merge accepted merged video", {
                  processed_video_url: processedVideoUrl,
                });
              } else {
                mergeFailed = true;
                const parseState = !trimmed
                  ? "empty_body"
                  : !parseOk
                    ? "invalid_json"
                    : isEmptyObject
                      ? "empty_object_json"
                      : "missing_processed_video_url";
                const mergeDiagnostics = {
                  httpStatus: mergeRes.status,
                  mergeResOk: mergeRes.ok,
                  mergeApiHeader,
                  parseState,
                  jsonOk: mergeJson.ok,
                  processed_video_url_length: processedVideoUrlFromApi.length,
                  mergeEndpoint,
                  rawBodyLength: rawBody.length,
                  rawBodyPreview: rawBody.slice(0, 500),
                  parsedKeys: parseOk ? Object.keys(mergeJson) : [],
                  fullParsedBody: parseOk ? mergeJson : null,
                };
                console.error(
                  `[PitchRusch upload] merge API missing required processed_video_url (aliases ignored) ${JSON.stringify(
                    mergeDiagnostics,
                  )}`,
                );
              }
            } catch (mergeErr) {
              console.error("[PitchRusch upload] merge-music network/parse error", mergeErr);
              mergeFailed = true;
            }
            }
          }
        }

        const hasProcessedMergedVideo =
          typeof processedVideoUrl === "string" && processedVideoUrl.trim().length > 0;
        /** Music chosen ⇒ merged asset URL is mandatory; no silent fallback to plain video publish. */
        const musicPublishBlocked =
          Boolean(musicId) && (mergeFailed || !hasProcessedMergedVideo);
        if (musicPublishBlocked) {
          console.error(
            "[PitchRusch upload] music selected but merge did not yield processed_video_url — blocking publish (no fallback)",
            {
              musicId,
              storagePath: uploadData.path,
              mergeFailed,
              hasProcessedMergedVideo,
            },
          );
          try {
            await supabase.storage.from(activeBucket).remove([uploadData.path]);
          } catch (rmErr) {
            console.error("[PitchRusch upload] cleanup after merge failure (remove raw upload)", rmErr);
          }
          setUploadPhase("failed");
          setFailureDetail(t("mergeMusicFailed"));
          return;
        }

        if (hasProcessedMergedVideo) {
          console.info("[PitchRusch upload] merge succeeded — will persist processed_video_url", {
            video_url: publishUrl,
            processed_video_url: processedVideoUrl,
            source_video_url: sourceUrl,
          });
        }

        setUploadPhase("saving_metadata");

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
        const insertPayload: Database["public"]["Tables"]["videos"]["Insert"] = {
          user_id: authUserId,
          video_url: publishUrl,
          source_video_url: sourceUrl,
          processed_video_url: processedVideoUrl,
          caption: null,
          skill_type: null,
          city: null,
          country: null,
          selected_music_track_id: hasProcessedMergedVideo ? storeMusicId : null,
          music_start_seconds: hasProcessedMergedVideo ? normalizedMusicStartSeconds : 0,
          music_end_seconds: hasProcessedMergedVideo ? normalizedMusicEndSeconds : null,
          music_volume: hasProcessedMergedVideo ? storeVol : 1,
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

        const rowMusicId = (insertedRow?.selected_music_track_id ?? "").trim();
        const rowProcessed = (insertedRow?.processed_video_url ?? "").trim();
        if (rowMusicId.length > 0 && rowProcessed.length === 0) {
          console.error(
            "[PitchRusch upload] DB row has music id but no processed_video_url — rejecting fake music publish",
            { videoId: insertedRow?.id, rowMusicId },
          );
          if (insertedRow?.id) {
            await supabase.from("videos").delete().eq("id", insertedRow.id);
          }
          setUploadPhase("failed");
          setFailureDetail(t("mergeMusicFailed"));
          return;
        }

        const newVideoId = insertedRow?.id ?? null;
        let aiAnalysisOk = true;

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
        setVideoDurationSeconds(null);
        setMusicStartSec(0);
        setMusicEndSec(0);
        setMusicVolume(1);
        setSelectedFileMeta(null);
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
    ],
  );

  async function onFileInputChange(e: ChangeEvent<HTMLInputElement>) {
    const next = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!next) return;

    setSelectedFileMeta({ name: next.name, size: next.size });
    setFailureDetail(null);
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

  function publishDraftVideo() {
    if (isUploadBusy) return;
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
    !challengeUrlBlocksUpload;

  const isChallengeUploadFlow = effectiveJoinChallengeId.trim().length > 0;
  const uploadFormRendered = Boolean(userId) && playerGate === "allowed";

  const pageTitle = t("uploadTitle");
  const pageSubtitle = isChallengeUploadFlow
    ? t("uploadVideoOnlySubtitleChallenge")
    : t("uploadSubtitle");

  return (
    <div className="mx-auto w-full min-w-0 max-w-lg space-y-5 sm:space-y-6">
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
        <div className="space-y-5">
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

              <div className="mx-auto w-full max-w-xl">
                <MusicTrackPicker
                  value={selectedMusicTrackId}
                  onChange={(id, track) => {
                    setSelectedMusicTrackId(id);
                    if (id && track) {
                      setSelectedMusicTitle((track.title ?? "").trim());
                      setSelectedMusicArtist((track.artist ?? "").trim());
                    } else {
                      setSelectedMusicTitle("");
                      setSelectedMusicArtist("");
                    }
                    const md =
                      track && typeof track.duration_seconds === "number"
                        ? track.duration_seconds
                        : null;
                    setMusicTrackDurationSec(md);
                  }}
                  disabled={isUploadBusy}
                />
              </div>

              <p className="text-center text-[0.7rem] leading-snug text-gn-text-secondary sm:text-xs sm:leading-relaxed">
                {t("copyrightConfirmation")}
              </p>

              <button
                type="button"
                onClick={continueToPreviewStep}
                disabled={!canContinueToPreview}
                className={`${GN_PRIMARY_BUTTON_CLASS} flex min-h-[3rem] w-full justify-center px-8 py-3 text-base disabled:cursor-not-allowed`}
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
                    videoDurationProbeFailed
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
      ) : null}
    </div>
  );
}
