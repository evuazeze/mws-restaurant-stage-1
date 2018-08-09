/*
 After you have changed the settings under responsive_images
 run this with one of these options:
  "grunt" alone creates a new, completed images directory
  "grunt clean" removes the images directory
  "grunt responsive_images" re-processes images without removing the old ones
  */

  module.exports = function(grunt) {

    grunt.initConfig({
      pagespeed: {
        options: {
          nokey: true,
          url: "https://evuazeze.github.io/mws-restaurant-stage-1/"
        },
        prod: {
          options: {
            paths: ["/index.html", "/restaurant.html?id=1"],
            locale: "en_GB",
            strategy: "mobile",
            threshold: 80
          }
        },
        paths: {
          options: {
            paths: ["/index.html", "/restaurant.html?id=1"],
            locale: "en_GB",
            strategy: "desktop",
            threshold: 80
          }
        }
      },

      responsive_images: {
        dev: {
          options: {
            // engine: 'im',
            sizes: [{
              /* Change these */
              width: 720,
              quality: 30
            }]
          },

        /*
        You don't need to change this part if you don't change
        the directory structure.
        */
        files: [{
          expand: true,
          src: ['*.jpg'],
          cwd: 'img/',
          dest: 'img/'
        }]
      }
    },

    /* Clear out the images directory if it exists */
    clean: {
      dev: {
        src: ['img'],
      },
    },

    /* Generate the images directory if it is missing */
    mkdir: {
      dev: {
        options: {
          create: ['img']
        },
      },
    },

  });
    grunt.loadNpmTasks('grunt-pagespeed');
    grunt.loadNpmTasks('grunt-responsive-images');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-mkdir');
    grunt.registerTask('default', ['mkdir', 'responsive_images']);

  };
