const CACHE_NAME = "klar-v2";
const DATA_CACHE = "klar-data-v1";

const STATIC_ASSETS = [
  "/",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
];

// Supabase REST paths we want to cache for offline
const CACHEABLE_TABLES = ["vocab_cards", "grammar_questions", "grammar_lessons", "reading_texts", "listening_texts"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== DATA_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

function isCacheableSupabaseRequest(url) {
  // Match Supabase REST API calls for vocab/grammar/reading/listening tables
  if (!url.hostname.includes("supabase")) return false;
  if (!url.pathname.includes("/rest/")) return false;
  return CACHEABLE_TABLES.some((table) => url.pathname.includes(table));
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Never cache OAuth
  if (url.pathname.startsWith("/~oauth")) return;

  // Cache Supabase lesson data: network-first, fallback to cache
  if (isCacheableSupabaseRequest(url) && event.request.method === "GET") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(DATA_CACHE).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Skip other Supabase/API calls (auth, user data, etc.)
  if (url.hostname.includes("supabase") || url.pathname.startsWith("/rest/")) return;

  // Navigation: network-first, fallback to cached shell
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/"))
    );
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        // Cache JS/CSS/images for offline
        if (response.ok && (url.pathname.endsWith(".js") || url.pathname.endsWith(".css") || url.pathname.match(/\.(png|jpg|svg|woff2?)$/))) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    })
  );
});

// Listen for messages from the app
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
