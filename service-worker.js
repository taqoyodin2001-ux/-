const CACHE_NAME = "my-dictionary-v8"; // ⬅️ ВАЖНО: Версия увеличена с v6 на v7

const FILES_TO_CACHE = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
];

// 1. Установка: кэшируем файлы
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Service Worker: Кэширование файлов новой версии");
      return cache.addAll(FILES_TO_CACHE);
    })
  );
  // Заставляем новый service worker активироваться немедленно
  self.skipWaiting();
});

// 2. Активация: удаляем старый кэш, чтобы не занимать место и не конфликтовать
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
  // Делаем этот service worker контроллером по умолчанию сразу
  return self.clients.claim();
});

// 3. Перехват запросов: отдаем из кэша, если есть, иначе загружаем из сети
self.addEventListener("fetch", (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
