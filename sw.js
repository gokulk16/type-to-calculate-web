// sw.js
const CACHE_NAME = "ttc-cache-v1";

// Fetch event: Cache responses immediately after fetching
self.addEventListener("fetch", (event) => {
  if (!event.request.url.startsWith('http')) {
    return;
    //skip request
  }
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      // If a match is found in the cache, return it; otherwise, fetch from network
      return (
        cachedResponse ||
        fetch(event.request).then((networkResponse) => {
          // Check if we received a valid response
          if (
            !networkResponse ||
            networkResponse.status !== 200 ||
            networkResponse.type !== "basic"
          ) {
            return networkResponse; // Return the response if it's not valid for caching
          }

          // Clone the response because we can only use it once
          const responseToCache = networkResponse.clone();

          // Open the cache and store the response
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });

          return networkResponse; // Return the original network response
        })
      );
    })
  );
});

// Activate event: Clean up old caches if necessary
self.addEventListener("activate", (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});