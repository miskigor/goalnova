"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { supabase } from "@/lib/supabase/client";
import { logFullSupabaseError } from "@/lib/supabase/logError";
import { devLog } from "@/lib/devLog";
import {
  fetchCommentCount,
  fetchCommentsForVideo,
  fetchLikeCount,
  fetchUserHasLiked,
  insertComment,
  setVideoLiked,
  type CommentRow,
} from "@/lib/supabase/likesComments";
import { resetHomeFeedHorizontalScroll } from "@/lib/feed/feedScrollContract";

type Props = {
  videoId: string | undefined;
  /** Seeds counts before network refresh (e.g. scout discovery RPC). */
  initialLikeCount?: number | null;
  initialCommentCount?: number | null;
  /** Merged onto the root wrapper (spacing, borders). */
  className?: string;
  /** Rendered after the comment control (e.g. share). */
  trailingActions?: React.ReactNode;
  /** After share in rail mode — e.g. global sound toggle (same column / gap). */
  railSoundSlot?: React.ReactNode;
  /** Smaller controls, single row (e.g. public video page). */
  compact?: boolean;
  /** Vertical icon stack (TikTok-style rail). */
  variant?: "default" | "rail";
};

function formatCount(value: number | null): string {
  return value === null ? "—" : String(value);
}

/** Mobile home feed rail — 44px tap targets; desktop stays h-10 w-10. */
const RAIL_MOBILE_BTN =
  "flex h-11 w-11 shrink-0 flex-col items-center justify-center gap-0 rounded-full border p-0 font-semibold shadow-[0_2px_10px_rgba(0,0,0,0.4)] ring-1 ring-white/10 backdrop-blur-md transition-[color,background-color,border-color,transform] duration-200 ease-out motion-reduce:transition-colors disabled:cursor-not-allowed disabled:opacity-50 lg:h-10 lg:w-10 lg:gap-0.5 lg:shadow-[0_4px_20px_rgba(0,0,0,0.4)]";

function CommentGlyph({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      <path
        d="M8 10h8M8 14h5"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
      />
      <path
        d="M6 4.75h12A2.25 2.25 0 0 1 20.25 7v7A2.25 2.25 0 0 1 18 16.25h-3.5L9 19.5v-3.25H6A2.25 2.25 0 0 1 3.75 14V7A2.25 2.25 0 0 1 6 4.75Z"
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Prefer `content`; support legacy `body` if present in API responses. */
function commentDisplayText(c: CommentRow): string {
  const row = c as CommentRow & { body?: string | null };
  const text = row.content?.trim() || row.body?.trim() || "";
  return text || "—";
}

export function FeedVideoEngagement({
  videoId,
  initialLikeCount,
  initialCommentCount,
  className = "",
  trailingActions,
  railSoundSlot,
  compact = false,
  variant = "default",
}: Props) {
  const t = useTranslations("feedEngagement");
  const rail = variant === "rail";
  const compactUi = compact || rail;
  const tCommon = useTranslations("authCommon");
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  /** null = count query failed; number = known count */
  const [likeCount, setLikeCount] = useState<number | null>(
    () => initialLikeCount ?? null,
  );
  const [commentCount, setCommentCount] = useState<number | null>(
    () => initialCommentCount ?? null,
  );
  const [liked, setLiked] = useState(false);
  const [likesCountError, setLikesCountError] = useState<string | null>(null);
  const [commentsCountError, setCommentsCountError] = useState<string | null>(null);
  const [likedStatusError, setLikedStatusError] = useState<string | null>(null);
  const [likeToggleError, setLikeToggleError] = useState<string | null>(null);
  const [likeBusy, setLikeBusy] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [commentDraft, setCommentDraft] = useState("");
  const [postBusy, setPostBusy] = useState(false);
  const [postError, setPostError] = useState<string | null>(null);
  /** Rail komentari su `fixed` — bez portala ih `overflow-hidden` na kartici reže (ne vide se). */
  const [portalReady, setPortalReady] = useState(false);
  const railCommentInputRef = useRef<HTMLTextAreaElement | null>(null);

  useLayoutEffect(() => {
    setPortalReady(true);
  }, []);

  const refreshAuth = useCallback(async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        logFullSupabaseError("[PitchRusch feed] getSession", error);
      }
      setUserId(data.session?.user?.id ?? null);
    } catch (e) {
      logFullSupabaseError("[PitchRusch feed] getSession catch", e);
      setUserId(null);
    }
  }, []);

  const refreshCounts = useCallback(async () => {
    if (!videoId) return;
    setLikesCountError(null);
    setCommentsCountError(null);

    const likeRes = await fetchLikeCount(supabase, videoId);
    const commentRes = await fetchCommentCount(supabase, videoId);

    if (likeRes.error) {
      logFullSupabaseError(
        "[PitchRusch feed] fetchLikeCount",
        new Error(likeRes.error),
        { videoId },
      );
      setLikeCount(null);
      setLikesCountError(likeRes.error);
    } else {
      setLikeCount(likeRes.count);
    }

    if (commentRes.error) {
      logFullSupabaseError(
        "[PitchRusch feed] fetchCommentCount",
        new Error(commentRes.error),
        { videoId },
      );
      setCommentCount(null);
      setCommentsCountError(commentRes.error);
    } else {
      setCommentCount(commentRes.count);
    }
  }, [videoId]);

  const reconcileLikeCountOnly = useCallback(async () => {
    if (!videoId) return;
    const { count, error } = await fetchLikeCount(supabase, videoId);
    if (!error) {
      setLikeCount(count);
      setLikesCountError(null);
    } else {
      setLikesCountError(error);
    }
  }, [videoId]);

  const refreshLiked = useCallback(async () => {
    if (!videoId) {
      setLiked(false);
      setLikedStatusError(null);
      return;
    }
    const { liked: l, error } = await fetchUserHasLiked(supabase, videoId);
    if (error) {
      logFullSupabaseError(
        "[PitchRusch feed] fetchUserHasLiked",
        new Error(error),
        { videoId },
      );
      setLiked(false);
      setLikedStatusError(error);
    } else {
      setLiked(l);
      setLikedStatusError(null);
    }
  }, [videoId]);

  useEffect(() => {
    void refreshAuth();
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => {
      sub.subscription.unsubscribe();
    };
  }, [refreshAuth]);

  useEffect(() => {
    if (!videoId) {
      setLikeCount(null);
      setCommentCount(null);
      setLiked(false);
      setLikesCountError(null);
      setCommentsCountError(null);
      setLikedStatusError(null);
      setLikeToggleError(null);
      return;
    }
    void refreshCounts();
  }, [videoId, refreshCounts]);

  useEffect(() => {
    void refreshLiked();
  }, [refreshLiked, userId]);

  function requireAuthOrRedirect(): boolean {
    if (!userId) {
      router.push("/login");
      return false;
    }
    return true;
  }

  async function onToggleLike() {
    if (!videoId) return;
    if (!requireAuthOrRedirect()) return;

    const prevLiked = liked;
    const prevCount = likeCount;
    const nextLiked = !prevLiked;

    setLikeToggleError(null);
    setLiked(nextLiked);
    if (prevCount !== null) {
      setLikeCount(nextLiked ? prevCount + 1 : Math.max(0, prevCount - 1));
    } else {
      setLikeCount(nextLiked ? 1 : 0);
    }

    setLikeBusy(true);
    try {
      const { error } = await setVideoLiked(supabase, videoId, nextLiked);
      if (error) {
        logFullSupabaseError("[PitchRusch feed] setVideoLiked", new Error(error), {
          videoId,
        });
        setLiked(prevLiked);
        setLikeCount(prevCount);
        setLikeToggleError(t("likeFailed"));
        return;
      }
      void reconcileLikeCountOnly();
    } catch (err) {
      setLiked(prevLiked);
      setLikeCount(prevCount);
      logFullSupabaseError("[PitchRusch feed] onToggleLike catch", err, {
        videoId,
        nextLiked,
      });
      setLikeToggleError(t("likeFailed"));
    } finally {
      setLikeBusy(false);
    }
  }

  async function loadComments() {
    if (!videoId) return;
    setCommentsLoading(true);
    setCommentsError(null);
    try {
      const { comments: rows, error } = await fetchCommentsForVideo(
        supabase,
        videoId
      );
      if (error) {
        logFullSupabaseError(
          "[PitchRusch feed] fetchCommentsForVideo",
          new Error(error),
          { videoId },
        );
        setCommentsError(t("commentsLoadError"));
        setComments([]);
        return;
      }
      setComments(rows);
    } catch (err) {
      logFullSupabaseError("[PitchRusch feed] loadComments catch", err, {
        videoId,
      });
      setCommentsError(t("commentsLoadError"));
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  }

  function onToggleComments(e: React.MouseEvent<HTMLButtonElement>) {
    e.stopPropagation();
    devLog("[PitchRusch] comment clicked", videoId);
    if (!videoId) return;
    const next = !commentsOpen;
    setCommentsOpen(next);
    if (next) {
      void loadComments();
    }
  }

  const closeCommentsPanel = useCallback(() => {
    setCommentsOpen(false);
    resetHomeFeedHorizontalScroll();
    requestAnimationFrame(() => resetHomeFeedHorizontalScroll());
  }, []);

  async function onPostComment(e: FormEvent) {
    e.preventDefault();
    if (!videoId) return;
    if (!requireAuthOrRedirect()) return;
    if (!userId) return;
    if (!commentDraft.trim()) {
      setPostError(t("commentEmpty"));
      return;
    }
    setPostError(null);
    setPostBusy(true);
    try {
      const { error } = await insertComment(supabase, videoId, commentDraft);
      if (error) {
        logFullSupabaseError(
          "[PitchRusch feed] insertComment",
          new Error(error),
          { videoId },
        );
        setPostError(t("postCommentFailed"));
        return;
      }
      setCommentDraft("");
      railCommentInputRef.current?.blur();
      await loadComments();
      resetHomeFeedHorizontalScroll();
      requestAnimationFrame(() => {
        resetHomeFeedHorizontalScroll();
      });
      const commentRes = await fetchCommentCount(supabase, videoId);
      if (!commentRes.error) {
        setCommentCount(commentRes.count);
        setCommentsCountError(null);
      } else {
        setCommentCount(null);
        setCommentsCountError(commentRes.error);
      }
    } catch (err) {
      logFullSupabaseError("[PitchRusch feed] onPostComment catch", err, {
        videoId,
      });
      setPostError(t("postCommentFailed"));
    } finally {
      setPostBusy(false);
    }
  }

  if (!videoId) {
    return (
      <div
        className={`rounded-xl border border-white/[0.08] bg-black/30 px-3 py-2 text-xs text-white/50 ${className}`}
      >
        {t("noVideoId")}
      </div>
    );
  }

  return (
    <div
      className={[
        rail ? "relative flex flex-col items-center gap-1 max-lg:gap-2.5 lg:gap-1.5" : "space-y-3",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {likesCountError || commentsCountError ? (
        <div
          role="status"
          className={
            rail
              ? "rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-[10px] leading-snug text-white/70 backdrop-blur-sm"
              : "rounded-xl border border-white/[0.08] bg-black/35 px-3 py-2.5 text-xs text-white/65"
          }
        >
          <p className="mb-2 text-white/90">{t("countsLoadError")}</p>
          <button
            type="button"
            onClick={() => void refreshCounts()}
            className="text-sm font-medium text-gn-accent underline"
          >
            {t("retryLoadCounts")}
          </button>
        </div>
      ) : null}

      {likedStatusError ? (
        <p className="text-xs text-gn-text-secondary" role="status">
          {t("likeStatusError")}
        </p>
      ) : null}

      {likeToggleError ? (
        <p className="text-xs text-gn-accent" role="alert">
          {likeToggleError}
        </p>
      ) : null}

      <div
        className={
            rail
            ? "flex w-full touch-manipulation flex-col items-center gap-1 max-lg:gap-2.5 lg:gap-1.5"
            : compactUi
              ? "flex flex-nowrap items-center gap-1"
              : "flex flex-wrap items-center gap-2"
        }
      >
        <button
          type="button"
          disabled={likeBusy}
          aria-busy={likeBusy}
          onClick={(e) => {
            e.stopPropagation();
            void onToggleLike();
          }}
          aria-label={
            compactUi ? `${t("like")} ${formatCount(likeCount)}` : undefined
          }
          className={[
            rail ? RAIL_MOBILE_BTN : "inline-flex shrink-0 items-center rounded-full border font-semibold transition-[color,background-color,border-color,transform] duration-200 ease-out motion-reduce:transition-colors disabled:cursor-not-allowed disabled:opacity-50",
            rail
              ? "border-white/25 bg-black/55 text-[10px] leading-none"
              : compactUi
                ? "h-7 gap-0.5 px-1.5 py-0 text-[11px] leading-none"
                : "min-h-[2.75rem] gap-2 px-4 py-2 text-sm",
            liked
              ? "border-gn-accent/60 bg-gn-accent/20 text-gn-accent shadow-[0_0_16px_-4px_rgba(249,115,22,0.45)]"
              : "border-white/[0.12] bg-white/[0.06] text-white/85 hover:border-gn-accent/40 hover:bg-gn-accent/10 hover:text-gn-accent",
          ].join(" ")}
          aria-pressed={liked}
        >
          <span aria-hidden className={rail ? "max-lg:text-[22px] max-lg:leading-none lg:text-lg lg:leading-none" : compactUi ? "text-[13px] leading-none" : "text-base leading-none"}>
            {liked ? "♥" : "♡"}
          </span>
          {rail ? (
            <span className="max-lg:text-[13px] lg:text-[8px] font-bold tabular-nums leading-none text-white/90">
              {formatCount(likeCount)}
            </span>
          ) : compactUi ? null : (
            t("like")
          )}
          {!rail ? (
            <span
              className={
                compactUi
                  ? "tabular-nums text-[10px] font-semibold text-white/50"
                  : "tabular-nums text-sm font-medium text-white/45"
              }
            >
              {formatCount(likeCount)}
            </span>
          ) : null}
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleComments(e);
          }}
          aria-label={
            compactUi ? `${t("comment")} ${formatCount(commentCount)}` : undefined
          }
          className={[
            rail
              ? `${RAIL_MOBILE_BTN} border-white/25 bg-black/55 text-white/90 hover:border-white/35 hover:bg-white/[0.12] hover:text-white`
              : "inline-flex shrink-0 items-center rounded-full border border-white/[0.12] bg-white/[0.06] font-semibold text-white/85 transition-[color,background-color,border-color,transform] duration-200 ease-out hover:border-gn-accent/35 hover:bg-white/[0.09] hover:text-white",
            !rail && compactUi
              ? "h-7 gap-0.5 px-1.5 py-0 text-[11px] leading-none"
              : !rail
                ? "min-h-[2.75rem] gap-2 px-4 py-2 text-sm"
                : "",
          ].join(" ")}
        >
          {compactUi || rail ? (
            <CommentGlyph
              className={
                rail ? "size-3 max-lg:size-[22px] lg:size-4 shrink-0 text-current opacity-95" : "size-3.5 shrink-0 text-current opacity-90"
              }
            />
          ) : (
            t("comment")
          )}
          {rail ? (
            <span className="max-lg:text-[13px] lg:text-[8px] font-bold tabular-nums leading-none text-white/90">
              {formatCount(commentCount)}
            </span>
          ) : (
            <span
              className={
                compactUi
                  ? "tabular-nums text-[10px] font-semibold text-white/50"
                  : "tabular-nums text-sm font-medium text-white/45"
              }
            >
              {formatCount(commentCount)}
            </span>
          )}
        </button>

        {trailingActions ? (
          <div
            className={
              rail
                ? "flex flex-col items-center [&_button]:h-11 [&_button]:w-11 [&_button]:min-h-0 [&_button]:shrink-0 [&_button]:rounded-full [&_button]:border [&_button]:border-white/25 [&_button]:bg-black/55 [&_button]:p-0 [&_button]:text-white/90 [&_button]:shadow-[0_2px_10px_rgba(0,0,0,0.4)] [&_button]:ring-1 [&_button]:ring-white/10 [&_button]:backdrop-blur-md max-lg:[&_button]:h-11 max-lg:[&_button]:w-11 max-lg:[&_svg]:!h-[22px] max-lg:[&_svg]:!w-[22px] lg:[&_button]:h-10 lg:[&_button]:w-10 [&_button:hover]:border-white/35 [&_button:hover]:bg-white/[0.12]"
                : "flex shrink-0 items-center"
            }
          >
            {trailingActions}
          </div>
        ) : null}

        {rail && railSoundSlot ? railSoundSlot : null}
      </div>

      {commentsOpen && rail && portalReady
        ? createPortal(
            <>
              <button
                type="button"
                className="fixed inset-0 z-[85] cursor-default border-0 bg-black/55 p-0 backdrop-blur-[1px] min-w-0 overflow-x-clip lg:left-[15.5rem]"
                aria-label={t("closeComments")}
                onClick={closeCommentsPanel}
              />
              <div
                className="fixed inset-x-0 bottom-0 z-[90] box-border flex w-full min-h-0 min-w-0 max-h-[min(36rem,min(78svh,82dvh))] max-w-full flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-neutral-950/98 shadow-[0_-16px_48px_rgba(0,0,0,0.55)] backdrop-blur-lg lg:left-[15.5rem]"
                role="dialog"
                aria-modal="true"
                aria-labelledby="pitchrusch-feed-comments-title"
              >
                <div className="shrink-0 border-b border-white/[0.06] px-3 pb-2 pt-3">
                  <h3
                    id="pitchrusch-feed-comments-title"
                    className="text-xs font-semibold uppercase tracking-wider text-gn-text-tertiary"
                  >
                    {t("commentsHeading")}
                  </h3>
                </div>

                <div className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain px-3 pt-2">
                  {commentsLoading ? (
                    <p className="py-6 text-center text-sm text-gn-text-secondary">
                      {tCommon("loading")}
                    </p>
                  ) : null}

                  {!commentsLoading && commentsError ? (
                    <div className="space-y-2 py-2" role="alert">
                      <p className="text-sm text-gn-accent">{commentsError}</p>
                      <button
                        type="button"
                        onClick={() => void loadComments()}
                        className="text-sm text-gn-accent underline"
                      >
                        {t("retryLoadComments")}
                      </button>
                    </div>
                  ) : null}

                  {!commentsLoading && !commentsError && comments.length === 0 ? (
                    <p className="py-4 text-sm text-gn-text-tertiary">
                      {t("commentsEmpty")}
                    </p>
                  ) : null}

                  {!commentsLoading && !commentsError && comments.length > 0 ? (
                    <ul className="space-y-2 pb-2">
                      {comments.map((c) => (
                        <li
                          key={c.id}
                          className="min-w-0 rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-sm"
                        >
                          <p className="break-words text-gn-text">
                            {commentDisplayText(c)}
                          </p>
                          <p className="mt-1 min-w-0 break-words text-[10px] text-gn-text-tertiary">
                            {c.created_at
                              ? new Date(c.created_at).toLocaleString()
                              : "—"}
                          </p>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>

                <div className="shrink-0 border-t border-white/10 bg-neutral-950 px-3 pt-3 shadow-[0_-8px_24px_rgba(0,0,0,0.45)] pb-[max(1rem,calc(env(safe-area-inset-bottom,0px)+0.75rem))]">
                  {userId ? (
                    <form
                      onSubmit={(e) => void onPostComment(e)}
                      className="space-y-2"
                    >
                      <textarea
                        suppressHydrationWarning
                        ref={railCommentInputRef}
                        value={commentDraft}
                        onChange={(e) => setCommentDraft(e.target.value)}
                        placeholder={t("commentPlaceholder")}
                        rows={2}
                        className="max-h-32 w-full resize-none rounded-lg border border-gn-border bg-gn-surface px-3 py-2 text-base leading-snug text-gn-text placeholder:text-gn-text-tertiary"
                        disabled={postBusy}
                      />
                      {postError ? (
                        <p className="text-xs text-gn-accent" role="alert">
                          {postError}
                        </p>
                      ) : null}
                      <button
                        type="submit"
                        disabled={postBusy || !commentDraft.trim()}
                        aria-busy={postBusy}
                        className="w-full rounded-lg bg-gn-accent px-4 py-2.5 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                      >
                        {postBusy ? t("postingComment") : t("postComment")}
                      </button>
                    </form>
                  ) : (
                    <p className="text-sm text-gn-text-secondary">
                      <Link href="/login" className="text-gn-accent underline">
                        {t("loginToComment")}
                      </Link>
                    </p>
                  )}
                </div>
              </div>
            </>,
            document.body,
          )
        : null}

      {commentsOpen && !rail ? (
        <div className="box-border min-w-0 max-w-full rounded-xl border border-white/[0.08] bg-black/35 p-3 backdrop-blur-sm">
            <>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gn-text-tertiary">
                {t("commentsHeading")}
              </h3>

              {commentsLoading ? (
                <p className="py-4 text-center text-sm text-gn-text-secondary">
                  {tCommon("loading")}
                </p>
              ) : null}

              {!commentsLoading && commentsError ? (
                <div className="space-y-2 py-2" role="alert">
                  <p className="text-sm text-gn-accent">{commentsError}</p>
                  <button
                    type="button"
                    onClick={() => void loadComments()}
                    className="text-sm text-gn-accent underline"
                  >
                    {t("retryLoadComments")}
                  </button>
                </div>
              ) : null}

              {!commentsLoading && !commentsError && comments.length === 0 ? (
                <p className="py-3 text-sm text-gn-text-tertiary">
                  {t("commentsEmpty")}
                </p>
              ) : null}

              {!commentsLoading && !commentsError && comments.length > 0 ? (
                <ul className="max-h-60 space-y-2 overflow-y-auto">
                  {comments.map((c) => (
                    <li
                      key={c.id}
                      className="min-w-0 rounded-lg border border-white/5 bg-black/20 px-3 py-2 text-sm"
                    >
                      <p className="break-words text-gn-text">
                        {commentDisplayText(c)}
                      </p>
                      <p className="mt-1 text-[10px] text-gn-text-tertiary">
                        {c.created_at
                          ? new Date(c.created_at).toLocaleString()
                          : "—"}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : null}

              {userId ? (
                <form
                  onSubmit={(e) => void onPostComment(e)}
                  className="mt-3 space-y-2"
                >
                  <textarea
                    suppressHydrationWarning
                    value={commentDraft}
                    onChange={(e) => setCommentDraft(e.target.value)}
                    placeholder={t("commentPlaceholder")}
                    rows={2}
                    className="w-full resize-y rounded-lg border border-gn-border bg-gn-surface px-3 py-2 text-sm text-gn-text placeholder:text-gn-text-tertiary"
                    disabled={postBusy}
                  />
                  {postError ? (
                    <p className="text-xs text-gn-accent" role="alert">
                      {postError}
                    </p>
                  ) : null}
                  <button
                    type="submit"
                    disabled={postBusy || !commentDraft.trim()}
                    aria-busy={postBusy}
                    className="rounded-lg bg-gn-accent px-4 py-2 text-sm font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {postBusy ? t("postingComment") : t("postComment")}
                  </button>
                </form>
              ) : (
                <p className="mt-3 text-sm text-gn-text-secondary">
                  <Link href="/login" className="text-gn-accent underline">
                    {t("loginToComment")}
                  </Link>
                </p>
              )}
            </>
        </div>
      ) : null}
    </div>
  );
}
