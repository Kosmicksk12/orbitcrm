// OrbitCRM service worker
// Strategy:
//  - App shell / static assets (icons, manifest, offline page): cache-first
//  - Next.js built assets (/_next/static/*): cache-first (immutable, hashed filenames)
//  - Page navigations: network-first, falling back to cache then offline.html
//  - Everything else (including all Supabase/API calls, cross-origin requests):
//    pass straight through to the network — we never cache or intercept
//    data requests, so the CRM always shows live, correct records.

const VERSION = "v1";
const SHELL_CACHE = `orbitcrm-shell-${VERSION}`;
const RUNTIME_CACHE = `orbitcrm-runtime-${VERSION}`;

const SHELL_ASSETS = [
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL_ASSETS)).then(() => {
      // Don't auto-activate; we wait for an explicit SKIP_WAITING message
      // from the client so users control when the app updates.
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== SHELL_CACHE && key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (!isSameOrigin(url)) return; // never touch cross-origin (Supabase, fonts CDN, etc.)

  // Page navigations: network-first with offline fallback.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(
          async () =>
            (await caches.match(request)) ||
            (await caches.match("/offline.html")) ||
            Response.error()
        )
    );
    return;
  }

  // Hashed, immutable Next.js build assets: cache-first.
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
            return response;
          })
      )
    );
    return;
  }

  // Icons/manifest/offline page: cache-first, refresh in background.
  if (SHELL_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const network = fetch(request)
          .then((response) => {
            const copy = response.clone();
            caches.open(SHELL_CACHE).then((cache) => cache.put(request, copy));
            return response;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // Default: try network, fall back to runtime cache if present.
  event.respondWith(fetch(request).catch(() => caches.match(request)));
});
