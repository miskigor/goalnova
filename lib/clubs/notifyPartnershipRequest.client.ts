import { currentUiLocale } from "@/lib/i18n/currentUiLocale";

/** Fire-and-forget staff alert after a partnership request is saved. */
export async function notifyPartnershipRequest(requestId: string): Promise<void> {
  try {
    await fetch("/api/clubs/notify-partnership-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, locale: currentUiLocale() }),
    });
  } catch {
    /* non-blocking */
  }
}
