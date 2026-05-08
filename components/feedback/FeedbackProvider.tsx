"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ToastState =
  | null
  | { kind: "error"; message: string; durationMs: number }
  | { kind: "success"; message: string; durationMs: number };

type ShowSuccessOptions = { durationMs?: number };

type FeedbackContextValue = {
  /** Short-lived success toast (e.g. DM removed from your view). */
  showSuccess: (message: string, options?: ShowSuccessOptions) => void;
  showError: (message: string) => void;
};

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

const AUTO_DISMISS_MS = 3200;

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState>(null);

  const showSuccess = useCallback((message: string, options?: ShowSuccessOptions) => {
    const durationMs = options?.durationMs ?? AUTO_DISMISS_MS;
    setToast({ kind: "success", message, durationMs });
  }, []);

  const showError = useCallback((message: string) => {
    setToast({ kind: "error", message, durationMs: AUTO_DISMISS_MS });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), toast.durationMs);
    return () => window.clearTimeout(id);
  }, [toast]);

  const value = useMemo(
    () => ({ showSuccess, showError }),
    [showSuccess, showError],
  );

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      {toast ? (
        <div
          role={toast.kind === "error" ? "alert" : "status"}
          aria-live={toast.kind === "error" ? "assertive" : "polite"}
          className={
            toast.kind === "error"
              ? "pointer-events-none fixed inset-x-4 bottom-24 z-[95] mx-auto w-auto max-w-[24rem] break-words rounded-2xl border border-red-500/40 bg-red-950/92 px-5 py-3.5 text-center text-sm font-semibold leading-snug tracking-tight text-red-50 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.75)] backdrop-blur-md motion-safe:animate-[gn-toast-enter_0.42s_var(--gn-ease-smooth)_both] motion-reduce:animate-none lg:bottom-8"
              : "pointer-events-none fixed inset-x-4 bottom-24 z-[95] mx-auto w-auto max-w-[24rem] break-words rounded-2xl border border-emerald-500/35 bg-emerald-950/90 px-5 py-3.5 text-center text-sm font-semibold leading-snug tracking-tight text-emerald-50 shadow-[0_16px_48px_-12px_rgba(0,0,0,0.75)] backdrop-blur-md motion-safe:animate-[gn-toast-enter_0.42s_var(--gn-ease-smooth)_both] motion-reduce:animate-none lg:bottom-8"
          }
        >
          {toast.message}
        </div>
      ) : null}
    </FeedbackContext.Provider>
  );
}

export function useAppFeedback(): FeedbackContextValue {
  const ctx = useContext(FeedbackContext);
  return (
    ctx ?? {
      showSuccess: () => {
        /* no-op when FeedbackProvider is missing */
      },
      showError: () => {},
    }
  );
}
