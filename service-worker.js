const CACHE_NAME = "my-dictionary-v23";
const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Service Worker: Кэширование файлов новой версии");
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log("Service Worker: Удаление старого кэша", cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // HTML-страницы (навигация) и сам index.html: всегда сначала сеть,
  // чтобы не залипать на старой закэшированной версии.
  const isHtmlRequest =
    req.mode === "navigate" ||
    (req.method === "GET" && req.headers.get("accept")?.includes("text/html"));

  if (isHtmlRequest) {
    event.respondWith(
      fetch(req)
        .then((networkResponse) => {
          // Обновляем кэш свежей версией на будущее (для офлайн-режима)
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          return networkResponse;
        })
        .catch(() => {
          // Нет сети — отдаём то, что есть в кэше
          return caches.match(req).then((cached) => cached || caches.match("./index.html"));
        })
    );
    return;
  }

  // Остальные статичные файлы (иконки, manifest и т.д.): сначала кэш, это быстрее
  event.respondWith(
    caches.match(req).then((response) => {
      return (
        response ||
        fetch(req).then((networkResponse) => {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone));
          return networkResponse;
        })
      );
    })
  );
});
