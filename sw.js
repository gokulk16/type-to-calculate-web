// sw.js
const CACHE_NAME = "ttc-cache-v1";
const urlsToCache = [
  "/",
  "/index.html",
  "/css/*.css",
  "/js/editor.js",
  "/favicon-150.png",
  "/favicon-48.png",
  "/favicon-512.png",
  "/favicon-192.png",
];

// Install the service worker
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

// Fetch the cached assets
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
