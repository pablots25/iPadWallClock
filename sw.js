/* ==========================================================
   iPadWallFlipClock — sw.js
   Service Worker — offline shell caching
   Must be served from the root path (same scope as app)
   ========================================================== */

var CACHE_NAME = 'ipadclock-v34';

// Shell files to pre-cache on install
var SHELL_URLS = [
  '/',
  '/index.html',
  '/styles.css?v=42',
  '/app.js?v=27',
  '/manifest.json',
  // Google Fonts CSS is fetched dynamically; we cache on first use instead
];

// ── Install: pre-cache shell ──────────────────────────────
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      // Cache each URL individually so one failure doesn't prevent
      // the rest from being cached (cache.addAll is all-or-nothing)
      return Promise.all(
        SHELL_URLS.map(function(url) {
          return cache.add(url).catch(function(err) {
            console.warn('[SW] Failed to cache:', url, err);
          });
        })
      );
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

  // Skip non-GET requests
  if (event.request.method !== 'GET') return;

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

  // Cache-first for shell assets (HTML, CSS, JS, manifest)
  // This ensures the app loads instantly from home screen even offline.
  // The cache is refreshed in the background after responding.
  var isShell = (
    url.indexOf('.html') !== -1 ||
    url.indexOf('.css') !== -1 ||
    url.indexOf('.js') !== -1 ||
    url.indexOf('manifest.json') !== -1 ||
    event.request.mode === 'navigate'
  );

  if (isShell) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // Everything else: network-first with cache fallback
  event.respondWith(networkFirst(event.request));
});

// Strategy: serve from cache instantly, update cache in background
function cacheFirst(request) {
  return caches.match(request).then(function(cached) {
    if (!cached) {
      return caches.match(request, { ignoreSearch: true });
    }
    return cached;
  }).then(function(cached) {
    if (cached) {
      // Background: update the cache for next launch
      fetch(request).then(function(response) {
        if (response && response.ok) {
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(request, response);
          });
        }
      }).catch(function() { /* offline — ignore */ });
      return cached;
    }
    // Not in cache yet — must go to network
    return fetch(request).then(function(response) {
      if (response && response.ok) {
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(request, clone);
        });
      }
      return response;
    }).catch(function() {
      // Last resort for navigation: try shell fallbacks
      if (request.mode === 'navigate' ||
          (request.headers.get('Accept') &&
           request.headers.get('Accept').indexOf('text/html') !== -1)) {
        return caches.match('/').then(function(root) {
          if (root) return root;
          return caches.match('/index.html');
        }).then(function(shell) {
          if (shell) return shell;
          return new Response(
            '<html><body style="background:#0a0a0a;color:#444;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><p>Offline — recarga cuando tengas conexión</p></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          );
        });
      }
    });
  });
}

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
    // Try exact match first, then with ignoreSearch for query-param resilience
    return caches.match(request).then(function(cached) {
      if (cached) return cached;
      return caches.match(request, { ignoreSearch: true });
    }).then(function(cached) {
      if (cached) return cached;
      // For HTML / navigation requests, try shell fallbacks explicitly
      var isHTML = request.headers.get('Accept') &&
                  request.headers.get('Accept').indexOf('text/html') !== -1;
      if (isHTML) {
        return caches.match('/').then(function(root) {
          if (root) return root;
          return caches.match('/index.html');
        }).then(function(shell) {
          if (shell) return shell;
          return new Response(
            '<html><body style="background:#0a0a0a;color:#444;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><p>Offline — recarga cuando tengas conexión</p></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          );
        });
      }
    });
  });
}

// Removed cacheFirst — all requests now use networkFirst for cache busting
