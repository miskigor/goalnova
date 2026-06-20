"use client";

import { Suspense } from "react";
import { AppMobileBottomNav } from "@/components/layout/AppMobileBottomNav";

/** Next.js requires Suspense around `useSearchParams()` (used inside bottom nav). */
export function AppMobileBottomNavSlot() {
  return (
    <Suspense fallback={null}>
      <AppMobileBottomNav />
    </Suspense>
  );
}
