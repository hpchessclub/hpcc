const CACHE_NAME = "hpcc-pwa-v2";
const OFFLINE_URL = "/offline";
const CORE_ASSETS = ["/", "/offline", "/manifest.webmanifest", "/logo.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  // Never cache admin/API/payment data or Next.js server-component responses.
  // Withdrawal must immediately disappear from public confirmed-player lists.
  if (url.origin !== self.location.origin || request.headers.get("RSC") || url.searchParams.has("_rsc") || /^\/(club-admin|admin|api|auth|payment)(\/|$)/.test(url.pathname)) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)));
    return;
  }
  // Cache static public assets only. Tournament/player responses always use network.
  if (!(url.pathname.startsWith("/_next/static/") || /\.(png|jpe?g|webp|svg|ico|woff2?|css|js)$/i.test(url.pathname))) return;
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
    const copy = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy)).catch(() => {});
    return response;
  }).catch(() => cached)));
});
