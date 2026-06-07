import { needsRoleOnboardingPage } from "@/lib/onboarding/roleOnboarding";

const DEFAULT_MS = 4_000;

/** Role check with a hard cap so login gates cannot spin forever on slow DB. */
export async function needsRoleOnboardingWithTimeout(
  userId?: string | null,
  timeoutMs = DEFAULT_MS,
): Promise<boolean> {
  try {
    return await Promise.race([
      needsRoleOnboardingPage(userId),
      new Promise<boolean>((resolve) => {
        window.setTimeout(() => resolve(false), timeoutMs);
      }),
    ]);
  } catch {
    return false;
  }
}
