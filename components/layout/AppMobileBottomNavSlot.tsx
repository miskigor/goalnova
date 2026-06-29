"use client";

import { Suspense, useLayoutEffect, useState } from "react";
import { AppMobileBottomNav } from "@/components/layout/AppMobileBottomNav";
import { InAppBrowserDocumentSync } from "@/components/layout/InAppBrowserDocumentSync";
import { isLikelyInAppBrowser } from "@/lib/auth/inAppBrowser";

/** Next.js requires Suspense around `useSearchParams()` (used inside bottom nav). */
export function AppMobileBottomNavSlot() {
  const [hideForInAppBrowser, setHideForInAppBrowser] = useState(false);

  useLayoutEffect(() => {
    setHideForInAppBrowser(isLikelyInAppBrowser());
  }, []);

  return (
    <Suspense fallback={null}>
      <InAppBrowserDocumentSync />
      {hideForInAppBrowser ? null : <AppMobileBottomNav />}
    </Suspense>
  );
}
