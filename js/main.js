let restaurants,
neighborhoods,
cuisines
var newMap
var markers = []


/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
 document.addEventListener('DOMContentLoaded', (event) => {
  registerServiceWorker();
  initMap(); // added
  fetchNeighborhoods();
  fetchCuisines();
});

 registerServiceWorker = () => {
  if (!navigator.serviceWorker) return;

  navigator.serviceWorker.register('./sw.js').then(function(reg) {
    if (!navigator.serviceWorker.controller) {
      return;
    }
  });

  // Ensure refresh is only called once.
  // This works around a bug in "force update on reload".
  let refreshing;
  navigator.serviceWorker.addEventListener('controllerchange', function() {
    if (refreshing) return;
    window.location.reload();
    refreshing = true;
  });
}

/**
 * Fetch all neighborhoods and set their HTML.
 */
 fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods((error, neighborhoods) => {
    if (error) { // Got an error
      console.error(error);
    } else {
      self.neighborhoods = neighborhoods;
      fillNeighborhoodsHTML();
    }
  });
}

/**
 * Set neighborhoods HTML.
 */
 fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
}

/**
 * Fetch all cuisines and set their HTML.
 */
 fetchCuisines = () => {
  DBHelper.fetchCuisines((error, cuisines) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.cuisines = cuisines;
      fillCuisinesHTML();
    }
  });
}

/**
 * Set cuisines HTML.
 */
 fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
}

/**
 * Initialize leaflet map, called from HTML.
 */
 initMap = () => {
  self.newMap = L.map('map', {
    center: [40.722216, -73.987501],
    zoom: 12,
    scrollWheelZoom: false
  });
  L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
    mapboxToken: 'pk.eyJ1IjoiZXZ1YXplemUiLCJhIjoiY2prNXoxeWdtMG9vNDNwcDZ5cndwYzQxZCJ9.FjM7EOBjA3p_XzecxcJzMA',
    maxZoom: 18,
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
    '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
    'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    id: 'mapbox.streets'
  }).addTo(newMap);

  updateRestaurants();
}
/* window.initMap = () => {
  let loc = {
    lat: 40.722216,
    lng: -73.987501
  };
  self.map = new google.maps.Map(document.getElementById('map'), {
    zoom: 12,
    center: loc,
    scrollwheel: false
  });
  updateRestaurants();
} */

/**
 * Update page, database and map for current restaurants.
 */
 updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, (error, restaurants) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      // populateDatabase(restaurants)
      resetRestaurants(restaurants);
      fillRestaurantsHTML();
    }
  })
}

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
 resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.querySelector('.restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  if (self.markers) {
    self.markers.forEach(marker => marker.remove());
  }
  self.markers = [];
  self.restaurants = restaurants;
}

/**
 * Create all restaurants HTML and add them to the webpage.
 */
 fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.querySelector('.restaurants-list');
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
}

/**
 * Create restaurant HTML.
 */
 createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');

  const image = document.createElement('img');
  image.className = 'restaurant-img';
  image.src = restaurant.photograph;
  image.alt = `Image of ${restaurant.name} Restaurant`;
  li.append(image);

  li.append(createFavouriteButton(restaurant));

  const name = document.createElement('h3');
  name.innerHTML = restaurant.name;
  li.append(name);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  li.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  li.append(address);

  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.href = DBHelper.urlForRestaurant(restaurant);
  li.append(more)

  return li
}

createFavouriteButton = (restaurant) => {
  const favoriteButtonArea = document.createElement('div');
  favoriteButtonArea.setAttribute('class', 'favorite-button');

  const favoriteButtonContainer = document.createElement('div');
  favoriteButtonArea.append(favoriteButtonContainer);

  const checkBox = document.createElement('input');
  checkBox.type = 'checkbox';
  checkBox.setAttribute('id', `${restaurant.id}`);
  checkBox.setAttribute('aria-label', `${restaurant.name} favorite button`);
  checkBox.className = 'love';
  favoriteButtonContainer.append(checkBox);

  if (restaurant.is_favorite === 'true') {
    checkBox.setAttribute('checked', 'true');
  }

  checkBox.addEventListener( 'change', function() {
    if(this.checked) {
        // Favorite button is checked
        var headers = new Headers();
        // Tell the server we want JSON back
        headers.set('Content-Length', '0');

        var url = `http://localhost:1337/restaurants/${restaurant.id}/?is_favorite=true`;
        var fetchOptions = {
          method: 'PUT',
          headers
        };

        fetch(url, fetchOptions);

      } else {
        // Favorite is not checked
        var headers = new Headers();
        headers.set('Content-Length', '0');

        var url = `http://localhost:1337/restaurants/${restaurant.id}/?is_favorite=false`;
        var fetchOptions = {
          method: 'PUT',
          headers
        };

        fetch(url, fetchOptions);
      }
    });

  const favoriteLabel = document.createElement('label');
  favoriteLabel.setAttribute('for', `${restaurant.id}`);
  favoriteButtonContainer.append(favoriteLabel);

  const favoriteSVG = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  // favoriteSVG.setAttribute('id', 'heart-svg');
  favoriteSVG.className = 'heart-svg';
  favoriteSVG.setAttribute('viewBox', '467 392 58 57');
  // favoriteSVG.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  favoriteLabel.append(favoriteSVG);

  const favoriteG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  // favoriteG.setAttribute('id', 'Group');
  favoriteG.className = 'Group';
  favoriteG.setAttribute('fill', 'none');
  favoriteG.setAttribute('fill-rule', 'evenodd');
  favoriteG.setAttribute('transform', 'translate(467 392)');
  favoriteSVG.append(favoriteG);

  const favoritePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  favoritePath.setAttribute('d', 'M29.144 20.773c-.063-.13-4.227-8.67-11.44-2.59C7.63 28.795 28.94 43.256 29.143 43.394c.204-.138 21.513-14.6 11.44-25.213-7.214-6.08-11.377 2.46-11.44 2.59z');
  favoritePath.setAttribute('class', 'heart');
  favoritePath.setAttribute('fill', '#AAB8C2');
  favoriteG.append(favoritePath);

  const favoriteCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  favoriteCircle.setAttribute('class', 'main-circ');
  favoriteCircle.setAttribute('fill', '#E2264D');
  favoriteCircle.setAttribute('opacity', '0');
  favoriteCircle.setAttribute('cx', '29.5');
  favoriteCircle.setAttribute('cy', '29.5');
  favoriteCircle.setAttribute('r', '1.5');
  favoriteG.append(favoriteCircle);

  return favoriteButtonArea;
  }

/**
 * Add markers for current restaurants to the map.
 */
 addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.newMap);
    marker.on("click", onClick);
    function onClick() {
      window.location.href = marker.options.url;
    }
    self.markers.push(marker);
  });

}
/* addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.map);
    google.maps.event.addListener(marker, 'click', () => {
      window.location.href = marker.url
    });
    self.markers.push(marker);
  });
} */

