"use client";

import { useLayoutEffect } from "react";
import { syncInAppBrowserDocumentFlag } from "@/lib/auth/inAppBrowser";

/** Keeps `data-gn-in-app-browser` in sync after hydration (inline head script sets it first). */
export function InAppBrowserDocumentSync() {
  useLayoutEffect(() => {
    syncInAppBrowserDocumentFlag();
  }, []);

  return null;
}
