/* PitchRusch service worker — offline shell, asset cache, push, auto-update */
/* eslint-disable no-restricted-globals */

const CACHE_VERSION = "pitchrusch-pwa-v1";
const PRECACHE = `${CACHE_VERSION}-precache`;
const RUNTIME = `${CACHE_VERSION}-runtime`;

const PRECACHE_URLS = [
  "/",
  "/manifest.json",
  "/site.webmanifest",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-180.png",
  "/apple-touch-icon.png",
  "/brand/pitchrusch-logo.svg",
  "/favicon.ico",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PRECACHE);
      await Promise.all(
        PRECACHE_URLS.map(async (url) => {
          try {
            const res = await fetch(url, { cache: "reload" });
            if (res.ok) await cache.put(url, res);
          } catch {
            /* ignore individual precache failures */
          }
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== PRECACHE && key !== RUNTIME)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

function isCacheableGet(request) {
  if (request.method !== "GET") return false;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return false;
  if (url.pathname.startsWith("/api/")) return false;
  if (url.search.includes("token=")) return false;
  return true;
}

function isStaticAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/brand/") ||
    url.pathname.startsWith("/images/") ||
    url.pathname.startsWith("/ffmpeg-core/") ||
    /\.(?:png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf|css|js|json|webmanifest)$/i.test(
      url.pathname,
    )
  );
}

async function networkFirst(request) {
  const cache = await caches.open(RUNTIME);
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok && isCacheableGet(request)) {
      void cache.put(request, fresh.clone());
    }
    return fresh;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    const precached = await caches.match(request);
    if (precached) return precached;
    if (request.mode === "navigate") {
      const shell = await caches.match("/");
      if (shell) return shell;
    }
    return new Response("Offline", {
      status: 503,
      statusText: "Offline",
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const cache = await caches.open(RUNTIME);
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) {
      void cache.put(request, fresh.clone());
    }
    return fresh;
  } catch {
    return new Response("Offline", {
      status: 503,
      statusText: "Offline",
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (!isCacheableGet(request)) return;

  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(networkFirst(request));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(networkFirst(request));
});

/** Example notification templates (server should send matching payloads). */
const PUSH_TEMPLATES = {
  scout_view: {
    title: "PitchRusch",
    body: "👀 A scout viewed your profile.",
  },
  new_follower: {
    title: "PitchRusch",
    body: "⭐ You have a new follower.",
  },
  new_challenge: {
    title: "PitchRusch",
    body: "🏆 New Challenge available.",
  },
  video_views: {
    title: "PitchRusch",
    body: "📹 Your video reached 1,000 views.",
  },
  new_message: {
    title: "PitchRusch",
    body: "💬 New message.",
  },
  video_like: {
    title: "PitchRusch",
    body: "❤️ Someone liked your video.",
  },
  club_invite: {
    title: "PitchRusch",
    body: "🏟 Your club invited you.",
  },
};

self.addEventListener("push", (event) => {
  event.waitUntil(
    (async () => {
      let data = {};
      try {
        data = event.data ? event.data.json() : {};
      } catch {
        data = { body: event.data ? event.data.text() : "" };
      }

      const templateKey =
        typeof data.type === "string" && PUSH_TEMPLATES[data.type]
          ? data.type
          : null;
      const template = templateKey ? PUSH_TEMPLATES[templateKey] : null;

      const title = data.title || template?.title || "PitchRusch";
      const options = {
        body: data.body || template?.body || "You have a new update.",
        icon: data.icon || "/icon-192.png",
        badge: data.badge || "/icon-192.png",
        image: data.image,
        tag: data.tag || templateKey || "pitchrusch",
        renotify: Boolean(data.renotify),
        data: {
          url: data.url || data.openUrl || "/",
          ...data,
        },
        vibrate: data.vibrate || [120, 60, 120],
      };

      await self.registration.showNotification(title, options);
    })(),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl =
    (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of allClients) {
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client && targetUrl) {
            try {
              await client.navigate(targetUrl);
            } catch {
              /* navigate may be unsupported */
            }
          }
          return;
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl);
      }
    })(),
  );
});
