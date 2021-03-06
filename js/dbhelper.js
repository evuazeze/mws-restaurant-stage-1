/*
Copyright 2016 Google Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
'use strict';

(function() {
  function toArray(arr) {
    return Array.prototype.slice.call(arr);
  }

  function promisifyRequest(request) {
    return new Promise(function(resolve, reject) {
      request.onsuccess = function() {
        resolve(request.result);
      };

      request.onerror = function() {
        reject(request.error);
      };
    });
  }

  function promisifyRequestCall(obj, method, args) {
    var request;
    var p = new Promise(function(resolve, reject) {
      request = obj[method].apply(obj, args);
      promisifyRequest(request).then(resolve, reject);
    });

    p.request = request;
    return p;
  }

  function promisifyCursorRequestCall(obj, method, args) {
    var p = promisifyRequestCall(obj, method, args);
    return p.then(function(value) {
      if (!value) return;
      return new Cursor(value, p.request);
    });
  }

  function proxyProperties(ProxyClass, targetProp, properties) {
    properties.forEach(function(prop) {
      Object.defineProperty(ProxyClass.prototype, prop, {
        get: function() {
          return this[targetProp][prop];
        }
      });
    });
  }

  function proxyRequestMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function(prop) {
      if (!(prop in Constructor.prototype)) return;
      ProxyClass.prototype[prop] = function() {
        return promisifyRequestCall(this[targetProp], prop, arguments);
      };
    });
  }

  function proxyMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function(prop) {
      if (!(prop in Constructor.prototype)) return;
      ProxyClass.prototype[prop] = function() {
        return this[targetProp][prop].apply(this[targetProp], arguments);
      };
    });
  }

  function proxyCursorRequestMethods(ProxyClass, targetProp, Constructor, properties) {
    properties.forEach(function(prop) {
      if (!(prop in Constructor.prototype)) return;
      ProxyClass.prototype[prop] = function() {
        return promisifyCursorRequestCall(this[targetProp], prop, arguments);
      };
    });
  }

  function Index(index) {
    this._index = index;
  }

  proxyProperties(Index, '_index', [
    'name',
    'keyPath',
    'multiEntry',
    'unique'
    ]);

  proxyRequestMethods(Index, '_index', IDBIndex, [
    'get',
    'getKey',
    'getAll',
    'getAllKeys',
    'count'
    ]);

  proxyCursorRequestMethods(Index, '_index', IDBIndex, [
    'openCursor',
    'openKeyCursor'
    ]);

  function Cursor(cursor, request) {
    this._cursor = cursor;
    this._request = request;
  }

  proxyProperties(Cursor, '_cursor', [
    'direction',
    'key',
    'primaryKey',
    'value'
    ]);

  proxyRequestMethods(Cursor, '_cursor', IDBCursor, [
    'update',
    'delete'
    ]);

  // proxy 'next' methods
  ['advance', 'continue', 'continuePrimaryKey'].forEach(function(methodName) {
    if (!(methodName in IDBCursor.prototype)) return;
    Cursor.prototype[methodName] = function() {
      var cursor = this;
      var args = arguments;
      return Promise.resolve().then(function() {
        cursor._cursor[methodName].apply(cursor._cursor, args);
        return promisifyRequest(cursor._request).then(function(value) {
          if (!value) return;
          return new Cursor(value, cursor._request);
        });
      });
    };
  });

  function ObjectStore(store) {
    this._store = store;
  }

  ObjectStore.prototype.createIndex = function() {
    return new Index(this._store.createIndex.apply(this._store, arguments));
  };

  ObjectStore.prototype.index = function() {
    return new Index(this._store.index.apply(this._store, arguments));
  };

  proxyProperties(ObjectStore, '_store', [
    'name',
    'keyPath',
    'indexNames',
    'autoIncrement'
    ]);

  proxyRequestMethods(ObjectStore, '_store', IDBObjectStore, [
    'put',
    'add',
    'delete',
    'clear',
    'get',
    'getAll',
    'getAllKeys',
    'count'
    ]);

  proxyCursorRequestMethods(ObjectStore, '_store', IDBObjectStore, [
    'openCursor',
    'openKeyCursor'
    ]);

  proxyMethods(ObjectStore, '_store', IDBObjectStore, [
    'deleteIndex'
    ]);

  function Transaction(idbTransaction) {
    this._tx = idbTransaction;
    this.complete = new Promise(function(resolve, reject) {
      idbTransaction.oncomplete = function() {
        resolve();
      };
      idbTransaction.onerror = function() {
        reject(idbTransaction.error);
      };
    });
  }

  Transaction.prototype.objectStore = function() {
    return new ObjectStore(this._tx.objectStore.apply(this._tx, arguments));
  };

  proxyProperties(Transaction, '_tx', [
    'objectStoreNames',
    'mode'
    ]);

  proxyMethods(Transaction, '_tx', IDBTransaction, [
    'abort'
    ]);

  function UpgradeDB(db, oldVersion, transaction) {
    this._db = db;
    this.oldVersion = oldVersion;
    this.transaction = new Transaction(transaction);
  }

  UpgradeDB.prototype.createObjectStore = function() {
    return new ObjectStore(this._db.createObjectStore.apply(this._db, arguments));
  };

  proxyProperties(UpgradeDB, '_db', [
    'name',
    'version',
    'objectStoreNames'
    ]);

  proxyMethods(UpgradeDB, '_db', IDBDatabase, [
    'deleteObjectStore',
    'close'
    ]);

  function DB(db) {
    this._db = db;
  }

  DB.prototype.transaction = function() {
    return new Transaction(this._db.transaction.apply(this._db, arguments));
  };

  proxyProperties(DB, '_db', [
    'name',
    'version',
    'objectStoreNames'
    ]);

  proxyMethods(DB, '_db', IDBDatabase, [
    'close'
    ]);

  // Add cursor iterators
  // TODO: remove this once browsers do the right thing with promises
  ['openCursor', 'openKeyCursor'].forEach(function(funcName) {
    [ObjectStore, Index].forEach(function(Constructor) {
      Constructor.prototype[funcName.replace('open', 'iterate')] = function() {
        var args = toArray(arguments);
        var callback = args[args.length - 1];
        var request = (this._store || this._index)[funcName].apply(this._store, args.slice(0, -1));
        request.onsuccess = function() {
          callback(request.result);
        };
      };
    });
  });

  // polyfill getAll
  [Index, ObjectStore].forEach(function(Constructor) {
    if (Constructor.prototype.getAll) return;
    Constructor.prototype.getAll = function(query, count) {
      var instance = this;
      var items = [];

      return new Promise(function(resolve) {
        instance.iterateCursor(query, function(cursor) {
          if (!cursor) {
            resolve(items);
            return;
          }
          items.push(cursor.value);

          if (count !== undefined && items.length == count) {
            resolve(items);
            return;
          }
          cursor.continue();
        });
      });
    };
  });

  var exp = {
    open: function(name, version, upgradeCallback) {
      var p = promisifyRequestCall(indexedDB, 'open', [name, version]);
      var request = p.request;

      request.onupgradeneeded = function(event) {
        if (upgradeCallback) {
          upgradeCallback(new UpgradeDB(request.result, event.oldVersion, request.transaction));
        }
      };

      return p.then(function(db) {
        return new DB(db);
      });
    },
    delete: function(name) {
      return promisifyRequestCall(indexedDB, 'deleteDatabase', [name]);
    }
  };

  if (typeof module !== 'undefined') {
    module.exports = exp;
  }
  else {
    self.idb = exp;
  }
}());




/**
 * Common database helper functions.
 */
 class DBHelper {
  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
   static get DATABASE_URL() {
    const port = 1337 // Change this to your server port
    return `http://localhost:${port}/restaurants`;
  }

  static get firebaseData() {
    firebase.database().ref('/restaurantReviews/data/restaurants').once('value')
  }

  static readSavedRestaurants() {
    return idb.open('restaurant', 1).then(function(db) {
      var tx = db.transaction(['restaurants'], 'readonly');
      var store = tx.objectStore('restaurants');
      return store.getAll();
    })
  }


  static saveFailedPostReview(data) {
    idb.open('restaurant', 1).then(function(db) {
      const tx = db.transaction('form_data', 'readwrite');
      const store = tx.objectStore('form_data');
      store.put(data);
    })
  }

  static deleteFailedPostReview() {
    idb.open('restaurant', 1).then(function(db) {
      const tx = db.transaction('form_data', 'readwrite');
      const store = tx.objectStore('form_data');
      store.clear();
    })
  }

  static saveServerReviews(reviews) {
    idb.open('restaurant', 1).then(function(db) {
      const tx = db.transaction('reviews', 'readwrite');
      const store = tx.objectStore('reviews');
      // store.put(data);
      reviews.forEach(function(review) {
        store.put(review);
      })
    })
  }

  static readFailedPostReviews() {
    return idb.open('restaurant', 1).then(function(db) {
      var tx = db.transaction(['form_data'], 'readonly');
      var store = tx.objectStore('form_data');
      return store.getAll();
    })
  }

  static readSavedServerReviews() {
    return idb.open('restaurant', 1).then(function(db) {
      var tx = db.transaction(['reviews'], 'readonly');
      var store = tx.objectStore('reviews');
      return store.getAll();
    })
  }

  static writeComment(comment) {
    firebase.database().ref('/restaurantReviews/data/reviews').push(comment);
  }

  /**
   * Fetch all restaurants.
   */
   static fetchRestaurants(callback) {
    return new Promise(function(resolve, reject) {
      firebase.database().ref('/restaurantReviews/data/restaurants').once('value')
      .then(function(snapshot) {
        if (snapshot.val()) {
          callback(null, snapshot.val());
          return resolve();
        }
        return reject();
      })
    })
    .catch(function(e) { // Oops!. Got an error from server. Fallback to IndexedDB.
      DBHelper.readSavedRestaurants()
      .then(function(restaurants) {
        callback(null, restaurants);
      })


    // fetch(DBHelper.DATABASE_URL)
    // .then(response => response.json())
    // .then(function(data) { // Got a success response from server!
    //   callback(null, data);
    // })
    // .catch(function(e) { // Oops!. Got an error from server. Fallback to IndexedDB.
    //   DBHelper.readSavedRestaurants()
    //   .then(function(restaurants) {
    //     callback(null, restaurants);
    //   })

      // console.log(restaurants);

      // callback(null, restaurants);
      // get(key) {
      //   return dbPromise.then(db => {
      //     return db.transaction('keyval')
      //     .objectStore('keyval').get(key);
      //   });
      // }
      // const error = (`Request failed. ${e}`);
      // callback(error, null);
    })



  }


    /**
   * Fetch all restaurant reveiws.
   */
   static fetchRestaurantReviews(id, callback) {
    return new Promise(function(resolve, reject) {
      firebase.database().ref('/restaurantReviews/data/reviews/').once('value')
      .then(function(reviews) {
        var comments = [];
        var count = 0;
        for (var key in reviews.val()) {
          comments[count] = reviews.val()[key];
          comments[count].id = count;
          count = count + 1;
        }

        // console.log(comments);
        // var comments = Object.entries(reviews.val()).map(([]) => ({}));
        // console.log(comments);
        return comments.filter(review => id == review['restaurant_id']);
      })
      .then(function(data) { // Got a success response from server!
        DBHelper.saveServerReviews(data);
        callback(null, data.reverse());
        return resolve();
      })
    })
    .catch(function(e) { // Oops!. Got an error from server. Fallback to IndexedDB.
      let failedPostReviews = DBHelper.readFailedPostReviews();
      failedPostReviews
      .then(function(reviews) {
        return reviews.filter(review => id == review['restaurant_id']);
      })
      .then(function(restaurantReviews) {
        callback(null, restaurantReviews.reverse());
      })
      .then(function() {

        let savedServerReviews = DBHelper.readSavedServerReviews();
        savedServerReviews
        .then(function(reviews) {
         return reviews.filter(review => id == review['restaurant_id']);
       })
        .then(function(restaurantReviews) {
          callback(null, restaurantReviews.reverse());
        })

      })
    })
  }

  /**
   * Fetch a restaurant by its ID.
   */
   static fetchRestaurantById(id, callback) {
    // fetch all restaurants with proper error handling.
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        const restaurant = restaurants.find(r => r.id == id);
        if (restaurant) { // Got the restaurant
          callback(null, restaurant);
        } else { // Restaurant does not exist in the database
          callback('Restaurant does not exist', null);
        }
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
   static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
   static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
   static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }



  /**
   * Fetch all neighborhoods with proper error handling.
   */
   static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
   static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /**
   * Restaurant page URL.
   */
   static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
   static imageUrlForRestaurant(restaurant) {
    return (`/img/${restaurant.id}.jpg`);
  }

  /**
   * Map marker for a restaurant.
   */
   static mapMarkerForRestaurant(restaurant, map) {
    // https://leafletjs.com/reference-1.3.0.html#marker
    const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng],
      {title: restaurant.name,
        alt: restaurant.name,
        url: DBHelper.urlForRestaurant(restaurant)
      })
    marker.addTo(newMap);
    return marker;
  }
  /* static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  } */

}

