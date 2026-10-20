const CACHE_NAME = "my-dictionary-v25";
const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./app-icon-192.png",
  "./app-icon-512.png",
  "./app-icon-maskable-512.png",
  "./apple-touch-icon.png",
  "./favicon-32.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // Каждый файл кэшируем отдельно: если какого-то нет, остальные всё равно сохранятся
      Promise.all(
        FILES_TO_CACHE.map((url) =>
          cache.add(url).catch(() => console.log("Service Worker: не удалось закэшировать", url))
        )
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) return caches.delete(cacheName);
        })
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  // HTML-страницы: сначала сеть, чтобы не залипать на старой версии
  const isHtmlRequest =
    req.mode === "navigate" ||
    (req.headers.get("accept") || "").includes("text/html");

  if (isHtmlRequest) {
    event.respondWith(
      fetch(req)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return networkResponse;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match("./index.html")))
    );
    return;
  }

  // Остальное (иконки, manifest, шрифты): сначала кэш, это быстрее
  event.respondWith(
    caches.match(req).then((response) => {
      return (
        response ||
        fetch(req).then((networkResponse) => {
          if (networkResponse && (networkResponse.ok || networkResponse.type === "opaque")) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          }
          return networkResponse;
        })
      );
    })
  );
});
