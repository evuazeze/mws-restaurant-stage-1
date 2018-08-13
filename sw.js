const dynamicCacheName = 'restaurant-dynamic-v15';
const allCaches = [dynamicCacheName];

self.addEventListener('activate', function(event) {
  console.log("activate running!");
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(cacheName) {
          return cacheName.startsWith('restaurant-') && !allCaches.includes(cacheName);;
        }).map(function(cacheName) {
          return caches.delete(cacheName);
        })
        );
    })
    );
});

// Network First then Caches + Dynamic Cache
self.addEventListener('fetch', function(event) {
  var request = event.request;
  event.respondWith(
    fetch(event.request)
    .then(function(response) {
      return caches.open(dynamicCacheName)
      .then(function(cache) {
        cache.put(event.request.url, response.clone());
        return response;
      })
    })
    .catch(function(error) {
      return caches.match(event.request);
    })
    )
});
