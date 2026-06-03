import { isMobileLayoutStableV2Enabled } from "@/lib/layout/mobileLayoutStableV2Flag";

/** Temporary dev diagnostics for /profile video grid (V1 vs V2). */
export function profileVideosDebug(
  message: string,
  payload: Record<string, unknown> = {},
): void {
  if (process.env.NODE_ENV === "production") return;
  console.warn(
    `[profile-videos] ${message}`,
    {
      v2: isMobileLayoutStableV2Enabled(),
      v2Env: process.env.NEXT_PUBLIC_MOBILE_LAYOUT_STABLE_V2 ?? "(unset)",
      ...payload,
    },
  );
}
