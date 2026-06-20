"use client";

import { createContext, useContext } from "react";

export type ShowSuccessOptions = { durationMs?: number };

export type FeedbackContextValue = {
  showSuccess: (message: string, options?: ShowSuccessOptions) => void;
  showError: (message: string) => void;
};

export const FeedbackContext = createContext<FeedbackContextValue | null>(null);

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
