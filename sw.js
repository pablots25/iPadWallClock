/* ==========================================================
   iPadWallFlipClock — sw.js
   Service Worker — offline shell caching
   Must be served from the root path (same scope as app)
   ========================================================== */

var CACHE_NAME = 'ipadclock-v8';

// Shell files to pre-cache on install
var SHELL_URLS = [
  '/index.html',
  '/styles.css',
  '/app.js',
  // Google Fonts CSS is fetched dynamically; we cache on first use instead
];

// ── Install: pre-cache shell ──────────────────────────────
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(SHELL_URLS);
    }).then(function() {
      // Activate immediately without waiting for old tabs to close
      return self.skipWaiting();
    })
  );
});

// ── Activate: clean up old caches ────────────────────────
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.map(function(key) {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// ── Fetch: strategy by URL type ──────────────────────────
self.addEventListener('fetch', function(event) {
  var url = event.request.url;

  // Network-first: live data (weather API, ICS feeds)
  var isLiveData = (
    url.indexOf('open-meteo.com') !== -1 ||
    url.indexOf('calendar.google.com') !== -1 ||
    url.indexOf('.ics') !== -1 ||
    url.indexOf('ical') !== -1 ||
    url.indexOf('webcal') !== -1
  );

  if (isLiveData) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Cache-first: shell files, fonts, static assets
  event.respondWith(cacheFirst(event.request));
});

// Strategy: try network, fall back to cache
function networkFirst(request) {
  return fetch(request).then(function(response) {
    if (response && response.ok) {
      var clone = response.clone();
      caches.open(CACHE_NAME).then(function(cache) {
        cache.put(request, clone);
      });
    }
    return response;
  }).catch(function() {
    return caches.match(request);
  });
}

// Strategy: try cache, fall back to network; cache successful responses
function cacheFirst(request) {
  return caches.match(request).then(function(cached) {
    if (cached) {
      return cached;
    }
    return fetch(request).then(function(response) {
      if (response && response.ok) {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(request, clone);
        });
      }
      return response;
    }).catch(function() {
      // Return a minimal offline response for HTML requests
      if (request.headers.get('Accept') &&
          request.headers.get('Accept').indexOf('text/html') !== -1) {
        return new Response(
          '<html><body style="background:#0a0a0a;color:#444;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><p>Offline — recarga cuando tengas conexión</p></body></html>',
          { headers: { 'Content-Type': 'text/html' } }
        );
      }
    });
  });
}
