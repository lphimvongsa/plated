const CACHE = "plated-shell-v2";
const SHELL = ["/manifest.webmanifest", "/icons/icon-192.png"];

function isCacheableAsset(url) {
  if (url.origin !== self.location.origin) return false;
  const { pathname } = url;
  if (pathname.startsWith("/_next/static/")) return true;
  if (pathname.startsWith("/icons/")) return true;
  if (pathname.startsWith("/photos/")) return true;
  if (pathname === "/manifest.webmanifest") return true;
  if (/\.(?:js|css|woff2?|png|jpe?g|webp|svg|ico|map)$/i.test(pathname)) return true;
  return false;
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  // Never cache HTML documents, RSC payloads, invite pages, or API responses.
  // Caching those caused sticky "Application error" screens on invite/RSVP links.
  if (!isCacheableAsset(url)) return;

  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(event.request);
      if (cached) return cached;
      const response = await fetch(event.request);
      if (response.ok) {
        cache.put(event.request, response.clone());
      }
      return response;
    }),
  );
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "plated.", {
      body: data.body || "Dinner update",
      data: { url: data.url || "/app" },
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/app";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      const match = wins.find((w) => "focus" in w);
      return match ? (match.navigate(url), match.focus()) : clients.openWindow(url);
    }),
  );
});
