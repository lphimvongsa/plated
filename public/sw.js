const CACHE = "plated-shell-v1";
const SHELL = ["/", "/app", "/manifest.webmanifest", "/icons/icon-192.png"];
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))));
  self.clients.claim();
});
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(fetch(event.request).then((response) => {
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match(event.request).then((cached) => cached || caches.match("/"))));
});

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = { body: event.data ? event.data.text() : "" }; }
  event.waitUntil(self.registration.showNotification(data.title || "plated.", { body: data.body || "Dinner update", data: { url: data.url || "/app" }, icon: "/icons/icon-192.png", badge: "/icons/icon-192.png" }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/app";
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => { const match = wins.find((w) => "focus" in w); return match ? (match.navigate(url), match.focus()) : clients.openWindow(url); }));
});
