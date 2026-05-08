/**
 * Realtime subscribe closed or errored; inbox/list UIs fall back to polling.
 * Intentionally quiet — transport blips are common and not actionable in the console.
 */
export function logNotificationsRealtimeStatus(
  scope: "inbox" | "list",
  status: string,
  err?: unknown,
): void {
  void scope;
  void status;
  void err;
}

export const NOTIFICATIONS_UNREAD_POLL_MS = 45_000;
export const NOTIFICATIONS_LIST_POLL_MS = 45_000;
