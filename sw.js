importScripts('./js/idb.js');
const staticCacheName = 'restaurant-static-v1';
const dynamicCacheName = 'restaurant-dynamic-v1';
const allCaches = [staticCacheName, dynamicCacheName];
let dbPromise;

createDB = () => {
  dbPromise = idb.open('restaurant', 1, function(upgradeDb) {
    var store = upgradeDb.createObjectStore('restaurants', {
      keyPath: 'id'
    });
    populateDB();
  });


}

populateDB = () => {
  return fetch(`http://localhost:1337/restaurants`)
  .then(response => response.json())
    .then(function(restaurants) { // Got a success response from server!
      dbPromise.then(db => {
        const tx = db.transaction('restaurants', 'readwrite');
        const store = tx.objectStore('restaurants');
        restaurants.forEach(function(restaurant) {
          store.put(restaurant);
        });
      })
    })
    .catch(function(e) { // Oops!. Got an error from server.
      const error = (`Request failed. ${e}`);
      console.log(error);
    })
  }

  cleanCache = () => {
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(cacheName) {
          return cacheName.startsWith('restaurant-') && !allCaches.includes(cacheName);;
        }).map(function(cacheName) {
          return caches.delete(cacheName);
        })
        );
    })
  }

  self.addEventListener('install', function(event) {
    event.waitUntil(
      caches.open(staticCacheName).then(function(cache) {
        return cache.addAll([
          './',
          './restaurant.html?id=1',
          './restaurant.html?id=2',
          './restaurant.html?id=3',
          './restaurant.html?id=4',
          './restaurant.html?id=5',
          './restaurant.html?id=6',
          './restaurant.html?id=7',
          './restaurant.html?id=8',
          './restaurant.html?id=9',
          './restaurant.html?id=10',
          './css/styles.css',
          './js/main.js',
          './js/restaurant_info.js',
          './js/dbhelper.js',
          './js/idb.js',
          'https://unpkg.com/leaflet@1.3.1/dist/leaflet.css',
          'https://unpkg.com/leaflet@1.3.1/dist/leaflet.js',
          'https://unpkg.com/leaflet@1.3.1/dist/images/marker-icon.png',
          'https://unpkg.com/leaflet@1.3.1/dist/images/marker-shadow.png',
          'https://api.tiles.mapbox.com/v4/mapbox.streets/12/1206/1539.jpg70?access_token=pk.eyJ1IjoiZXZ1YXplemUiLCJhIjoiY2prNXoxeWdtMG9vNDNwcDZ5cndwYzQxZCJ9.FjM7EOBjA3p_XzecxcJzMA',
          'https://api.tiles.mapbox.com/v4/mapbox.streets/12/1206/1540.jpg70?access_token=pk.eyJ1IjoiZXZ1YXplemUiLCJhIjoiY2prNXoxeWdtMG9vNDNwcDZ5cndwYzQxZCJ9.FjM7EOBjA3p_XzecxcJzMA',
          'https://api.tiles.mapbox.com/v4/mapbox.streets/12/1205/1539.jpg70?access_token=pk.eyJ1IjoiZXZ1YXplemUiLCJhIjoiY2prNXoxeWdtMG9vNDNwcDZ5cndwYzQxZCJ9.FjM7EOBjA3p_XzecxcJzMA',
          'https://api.tiles.mapbox.com/v4/mapbox.streets/12/1207/1539.jpg70?access_token=pk.eyJ1IjoiZXZ1YXplemUiLCJhIjoiY2prNXoxeWdtMG9vNDNwcDZ5cndwYzQxZCJ9.FjM7EOBjA3p_XzecxcJzMA',
          'https://api.tiles.mapbox.com/v4/mapbox.streets/12/1205/1540.jpg70?access_token=pk.eyJ1IjoiZXZ1YXplemUiLCJhIjoiY2prNXoxeWdtMG9vNDNwcDZ5cndwYzQxZCJ9.FjM7EOBjA3p_XzecxcJzMA',
          'https://api.tiles.mapbox.com/v4/mapbox.streets/12/1207/1540.jpg70?access_token=pk.eyJ1IjoiZXZ1YXplemUiLCJhIjoiY2prNXoxeWdtMG9vNDNwcDZ5cndwYzQxZCJ9.FjM7EOBjA3p_XzecxcJzMA',
          'https://api.tiles.mapbox.com/v4/mapbox.streets/12/1204/1539.jpg70?access_token=pk.eyJ1IjoiZXZ1YXplemUiLCJhIjoiY2prNXoxeWdtMG9vNDNwcDZ5cndwYzQxZCJ9.FjM7EOBjA3p_XzecxcJzMA',
          'https://api.tiles.mapbox.com/v4/mapbox.streets/12/1208/1539.jpg70?access_token=pk.eyJ1IjoiZXZ1YXplemUiLCJhIjoiY2prNXoxeWdtMG9vNDNwcDZ5cndwYzQxZCJ9.FjM7EOBjA3p_XzecxcJzMA',
          'https://api.tiles.mapbox.com/v4/mapbox.streets/12/1204/1540.jpg70?access_token=pk.eyJ1IjoiZXZ1YXplemUiLCJhIjoiY2prNXoxeWdtMG9vNDNwcDZ5cndwYzQxZCJ9.FjM7EOBjA3p_XzecxcJzMA',
          'https://api.tiles.mapbox.com/v4/mapbox.streets/12/1208/1540.jpg70?access_token=pk.eyJ1IjoiZXZ1YXplemUiLCJhIjoiY2prNXoxeWdtMG9vNDNwcDZ5cndwYzQxZCJ9.FjM7EOBjA3p_XzecxcJzMA',
          'https://api.tiles.mapbox.com/v4/mapbox.streets/12/1203/1539.jpg70?access_token=pk.eyJ1IjoiZXZ1YXplemUiLCJhIjoiY2prNXoxeWdtMG9vNDNwcDZ5cndwYzQxZCJ9.FjM7EOBjA3p_XzecxcJzMA',
          'https://api.tiles.mapbox.com/v4/mapbox.streets/12/1203/1540.jpg70?access_token=pk.eyJ1IjoiZXZ1YXplemUiLCJhIjoiY2prNXoxeWdtMG9vNDNwcDZ5cndwYzQxZCJ9.FjM7EOBjA3p_XzecxcJzMA',
          './img/1.jpg',
          './img/2.jpg',
          './img/3.jpg',
          './img/4.jpg',
          './img/5.jpg',
          './img/6.jpg',
          './img/7.jpg',
          './img/8.jpg',
          './img/9.jpg',
          './img/10.jpg'
          ]);
      })
      );
  });

  self.addEventListener('activate', function(event) {
    event.waitUntil(createDB());
    event.waitUntil(cleanCache());
  });

  // Network First then Caches + Dynamic Cache
  self.addEventListener('fetch', function(event) {
    var request = event.request;
    event.respondWith(
      fetch(event.request)
      .then(function(response) {
        return caches.open(staticCacheName)
        .then(function(cache) {
          if (request.url.startsWith('https://api.tiles.mapbox.com')) {
          cache.put(event.request.url, response.clone());
        }
          return response;
        })
      })
      .catch(function(error) {
        return caches.match(event.request);
      })
      )
  });
