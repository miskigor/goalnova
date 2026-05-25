"use client";

import type { ReactNode } from "react";
import { devWarn } from "@/lib/devLog";

/**
 * @deprecated V2 shell disabled — use {@link AppMobileChromePortal} via {@link AppChromeLayout}.
 */
export function MobileAppShell({ children }: { children: ReactNode }) {
  devWarn(
    "[layout] MobileAppShell (V2) is disabled; rendering children without V2 chrome.",
  );
  return <>{children}</>;
}
