let restaurant;
var newMap;


/**
 * Initialize map as soon as the page is loaded.
 */
 document.addEventListener('DOMContentLoaded', (event) => {
  initMap();
  messageListener();
});


 messageListener = () => {
  navigator.serviceWorker.addEventListener('message', event => {
    var formEl = document.getElementById('form');
    alert(event.data.msg);

    DBHelper.storeFormData({
      restaurant_id: self.restaurant.id,
      name: `${formEl[0].value}`,
      rating: document.querySelector('input[name="rating"]:checked').value,
      comments: `${formEl[6].value}`,
      createdAt: new Date()
    });
  });
}

handleConnectionChange = (event) => {
  if(event.type == "online"){
    postOfflineReviewsToServer();
  }
}


/**
 * Initialize leaflet map
 */
 initMap = () => {
  window.addEventListener('online', handleConnectionChange);
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.newMap = L.map('map', {
        center: [restaurant.latlng.lat, restaurant.latlng.lng],
        zoom: 16,
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
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.newMap);
    }
  });
}

/* window.initMap = () => {
  fetchRestaurantFromURL((error, restaurant) => {
    if (error) { // Got an error!
      console.error(error);
    } else {
      self.map = new google.maps.Map(document.getElementById('map'), {
        zoom: 16,
        center: restaurant.latlng,
        scrollwheel: false
      });
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.map);
    }
  });
} */

/**
 * Get current restaurant from page URL.
 */
 fetchRestaurantFromURL = (callback) => {
  if (self.restaurant) { // restaurant already fetched!
    callback(null, self.restaurant)
    return;
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    error = 'No restaurant id in URL'
    callback(error, null);
  } else {
    DBHelper.fetchRestaurantById(id, (error, restaurant) => {
      self.restaurant = restaurant;
      if (!restaurant) {
        console.error(error);
        return;
      }
      fillRestaurantHTML();
      callback(null, restaurant)
    });
  }
}

/**
 * Create restaurant HTML and add it to the webpage
 */
 fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.querySelector('.restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.querySelector('.restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.querySelector('.restaurant-img');
  image.className = 'restaurant-img'
  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.alt = `Image of ${restaurant.name} Restaurant`;

  const cuisine = document.querySelector('.restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  fillReviewsHTML();
  // create review form
  createReviewForm();
}

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
 fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');

  // Table Caption
  const caption = document.createElement('caption');
  caption.innerHTML = `<h3>Opening Hours</h3>`;
  hours.appendChild(caption);

  // Table Header
  const row = document.createElement('tr');

  const dayHeader = document.createElement('th');
  dayHeader.innerHTML = 'Day';
  row.appendChild(dayHeader);

  const timeHeader = document.createElement('th');
  timeHeader.innerHTML = 'Time';
  row.appendChild(timeHeader);

  hours.appendChild(row);

  // Table data
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key].replace(/,/g, '<br>');
    row.appendChild(time);

    hours.appendChild(row);
  }
}

/**
 * Create all reviews HTML and add them to the webpage.
 */
 fillReviewsHTML = () => {
  DBHelper.fetchRestaurantReviews(self.restaurant.id, (error, reviews) => {
    const container = document.querySelector('.reviews-container');

    const existingTitle = document.querySelector('#title');
    if (!existingTitle) {
      const title = document.createElement('h3');
      title.setAttribute('id', 'title');
      title.innerHTML = 'Reviews';
      container.appendChild(title);
    }

    if (!reviews) {
      const noReviews = document.createElement('p');
      noReviews.innerHTML = 'No reviews yet!';
      container.appendChild(noReviews);
      return;
    }
    const ul = document.getElementById('reviews-list');
    reviews.forEach(review => {
      ul.appendChild(createReviewHTML(review));
    });
    container.appendChild(ul);
  })
}

/**
 * Create review HTML and add it to the webpage.
 */
 createReviewHTML = (review) => {
  const li = document.createElement('li');
  const name = document.createElement('p');
  name.className = 'reviewer';
  name.innerHTML = review.name;
  li.appendChild(name);

  const date = document.createElement('p');
  const actualDate = new Date(review.createdAt);
  date.innerHTML = actualDate.toDateString();
  date.className = 'date';
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.innerHTML = `Rating: ${review.rating}`;
  rating.className = 'rating';
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  comments.className = 'comment';
  li.appendChild(comments);

  return li;
}

/**
 * Create review Form and add it to the webpage.
 */
 createReviewForm = () => {
  const container = document.querySelector('.reviews-container');

  const br1 = document.createElement('br');
  const br11 = document.createElement('br');
  container.appendChild(br1);
  container.appendChild(br11);

  const title = document.createElement('h4');
  title.innerHTML = 'Add a Review';
  container.appendChild(title);

  const form = document.createElement('form');
  form.setAttribute('id', 'form');
  form.setAttribute('method', 'post');
  form.setAttribute('action', 'http://localhost:1337/reviews/');

  form.addEventListener('submit', function(event) {
  // 1. Setup the request
  // ================================
  // 1.1 Headers
  var headers = new Headers();
  // Tell the server we want JSON back
  headers.set('Accept', 'application/json');

  // 1.2 Form Data
  // We need to properly format the submitted fields.
  // Here we will use the same format the browser submits POST forms.
  // You could use a different format, depending on your server, such
  // as JSON or XML.
  var formData = new FormData();
  formData.append('restaurant_id', self.restaurant.id);
  formData.append(form[0].name, form[0].value);
  formData.append(form[1].name, document.querySelector('input[name="rating"]:checked').value);
  formData.append(form[6].name, form[6].value);

  // 2. Make the request
  // ================================
  var url = 'http://localhost:1337/reviews/';
  var fetchOptions = {
    method: 'POST',
    headers,
    body: formData
  };

  var responsePromise = fetch(url, fetchOptions);

  event.preventDefault();
});

  const nameLabel = document.createElement('label');
  nameLabel.setAttribute('for', 'name');
  nameLabel.innerHTML = 'Name';
  form.appendChild(nameLabel);

  const nameInput = document.createElement('input');
  nameInput.setAttribute('id', 'name');
  nameInput.type = 'text';
  nameInput.setAttribute('placeholder', 'First name');
  nameInput.setAttribute('autocomplete', 'given-name');
  nameInput.setAttribute('required', '');
  nameInput.setAttribute('name', 'name');
  form.appendChild(nameInput);


  const br2 = document.createElement('br');
  form.appendChild(br2);

  form.appendChild(createStarRating());

  const br3 = document.createElement('br');
  const br4 = document.createElement('br');
  const br5 = document.createElement('br');
  const br6 = document.createElement('br');
  form.appendChild(br3);
  form.appendChild(br4);
  form.appendChild(br5);
  form.appendChild(br6);

  const reviewLabel = document.createElement('label');
  reviewLabel.setAttribute('for', 'review');
  reviewLabel.innerHTML = 'Review';
  form.appendChild(reviewLabel);

  const reviewInput = document.createElement('textarea');
  reviewInput.setAttribute('id', 'review');
  reviewInput.setAttribute('name', 'comments');
  reviewInput.setAttribute('rows', '10');
  reviewInput.setAttribute('placeholder', 'This is definitely the best place to be in town')
  reviewInput.setAttribute('required', '');
  form.appendChild(reviewInput);

  const br7 = document.createElement('br');
  const br8 = document.createElement('br');
  form.appendChild(br7);
  form.appendChild(br8);

  const submitReviewButton = document.createElement('button');
  submitReviewButton.type = 'submit';
  submitReviewButton.innerHTML = 'Submit';
  form.appendChild(submitReviewButton);

  container.appendChild(form);
}

postOfflineReviewsToServer = () => {
  // 1. Setup the request
  // ================================
  // 1.1 Headers
  var headers = new Headers();
  // Tell the server we want JSON back
  headers.set('Accept', 'application/json');

  // 1.2 Form Data
  // We need to properly format the submitted fields.
  // Here we will use the same format the browser submits POST forms.
  // You could use a different format, depending on your server, such
  // as JSON or XML.
  var data = DBHelper.readFormData();

  data
  .then(function(i) {
    for (var t = 0; t < i.length; t++) {
      let obj = i[t];
      var formData = new FormData();
      for (let key in obj) {
        var value = obj[key];
        formData.append(key, value);
      }

      var url = 'http://localhost:1337/reviews/';
      var fetchOptions = {
        method: 'POST',
        headers,
        body: formData
      };

      var response = fetch(url, fetchOptions);
      response
      .then(function(){
        DBHelper.deleteFormData();
      })

    }
  })
}

createStarRating = () => {
  const ul = document.createElement('ul');
  ul.className = 'rate-area';

  const star5 = document.createElement('input');
  star5.type = 'radio';
  star5.setAttribute('id', '5-star');
  star5.setAttribute('name', 'rating');
  star5.setAttribute('value', '5');
  ul.appendChild(star5);

  const star5Label = document.createElement('label');
  star5Label.setAttribute('for', '5-star');
  star5Label.setAttribute('title', 'Amazing');
  star5Label.innerHTML = '5 stars'
  ul.appendChild(star5Label);

  const star4 = document.createElement('input');
  star4.type = 'radio';
  star4.setAttribute('id', '4-star');
  star4.setAttribute('name', 'rating');
  star4.setAttribute('value', '4');
  ul.appendChild(star4);

  const star4Label = document.createElement('label');
  star4Label.setAttribute('for', '4-star');
  star4Label.setAttribute('title', 'Good');
  star4Label.innerHTML = '4 stars'
  ul.appendChild(star4Label);

  const star3 = document.createElement('input');
  star3.type = 'radio';
  star3.setAttribute('id', '3-star');
  star3.setAttribute('name', 'rating');
  star3.setAttribute('value', '3');
  ul.appendChild(star3);

  const star3Label = document.createElement('label');
  star3Label.setAttribute('for', '3-star');
  star3Label.setAttribute('title', 'Average');
  star3Label.innerHTML = '3 stars'
  ul.appendChild(star3Label);

  const star2 = document.createElement('input');
  star2.type = 'radio';
  star2.setAttribute('id', '2-star');
  star2.setAttribute('name', 'rating');
  star2.setAttribute('value', '2');
  ul.appendChild(star2);

  const star2Label = document.createElement('label');
  star2Label.setAttribute('for', '2-star');
  star2Label.setAttribute('title', 'Not Good');
  star2Label.innerHTML = '2 stars'
  ul.appendChild(star2Label);

  const star1 = document.createElement('input');
  star1.type = 'radio';
  star1.setAttribute('id', '1-star');
  star1.setAttribute('name', 'rating');
  star1.setAttribute('value', '1');
  ul.appendChild(star1);

  const star1Label = document.createElement('label');
  star1Label.setAttribute('for', '1-star');
  star1Label.setAttribute('title', 'Bad');
  star1Label.innerHTML = '1 stars'
  ul.appendChild(star1Label);

  return ul;

}

/**
 * Add restaurant name to the breadcrumb navigation menu
 */
 fillBreadcrumb = (restaurant=self.restaurant) => {
  const breadcrumb = document.querySelector('.breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = `<a href="/restaurant.html?id=${restaurant.id}" aria-current="page">${restaurant.name}</a>`;
  breadcrumb.appendChild(li);
}

/**
 * Get a parameter by name from page URL.
 */
 getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
  results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}
