import { getServiceWorkerRegistration } from "@/lib/pwa/registerServiceWorker";

/**
 * Web Push helpers for PitchRusch.
 * Set `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and persist subscriptions server-side to enable delivery.
 */

export const PWA_PUSH_EXAMPLES = [
  { type: "scout_view", body: "👀 A scout viewed your profile." },
  { type: "new_follower", body: "⭐ You have a new follower." },
  { type: "new_challenge", body: "🏆 New Challenge available." },
  { type: "video_views", body: "📹 Your video reached 1,000 views." },
  { type: "new_message", body: "💬 New message." },
  { type: "video_like", body: "❤️ Someone liked your video." },
  { type: "club_invite", body: "🏟 Your club invited you." },
] as const;

export type PwaPushExampleType = (typeof PWA_PUSH_EXAMPLES)[number]["type"];

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) {
    output[i] = raw.charCodeAt(i);
  }
  return output;
}

export function getVapidPublicKey(): string | null {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim();
  return key || null;
}

export async function getNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export async function subscribeToWebPush(): Promise<PushSubscription | null> {
  const vapid = getVapidPublicKey();
  if (!vapid) {
    console.warn("[PitchRusch PWA] NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set");
    return null;
  }

  const permission = await requestNotificationPermission();
  if (permission !== "granted") return null;

  const reg = (await getServiceWorkerRegistration()) ?? (await navigator.serviceWorker.ready);
  if (!reg?.pushManager) return null;

  const existing = await reg.pushManager.getSubscription();
  if (existing) return existing;

  return reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapid) as BufferSource,
  });
}

/** Local preview of a push template (does not require a push server). */
export async function previewPushExample(type: PwaPushExampleType): Promise<boolean> {
  const sample = PWA_PUSH_EXAMPLES.find((item) => item.type === type);
  if (!sample) return false;

  const permission = await requestNotificationPermission();
  if (permission !== "granted") return false;

  const reg = await getServiceWorkerRegistration();
  if (reg?.showNotification) {
    await reg.showNotification("PitchRusch", {
      body: sample.body,
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: sample.type,
      data: { url: "/", type: sample.type },
    });
    return true;
  }

  if ("Notification" in window) {
    new Notification("PitchRusch", {
      body: sample.body,
      icon: "/icon-192.png",
      tag: sample.type,
    });
    return true;
  }

  return false;
}
