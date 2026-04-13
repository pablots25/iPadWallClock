/**
 * iPadWallFlipClock — server.js
 * ====================================
 * Tiny HTTPS static file server using Node.js stdlib only.
 * Zero npm dependencies.
 *
 * SETUP (first time only):
 * ─────────────────────────
 * 1. Install mkcert:
 *      macOS:   brew install mkcert && mkcert -install
 *      Linux:   https://github.com/FiloSottile/mkcert#linux
 *      Windows: scoop install mkcert && mkcert -install
 *
 * 2. Find your machine's LAN IP:
 *      macOS/Linux: ipconfig getifaddr en0   (or: hostname -I)
 *      Windows:     ipconfig
 *
 * 3. Generate certificates in this directory:
 *      mkcert -key-file key.pem -cert-file cert.pem 192.168.x.x localhost 127.0.0.1
 *      (replace 192.168.x.x with your actual LAN IP)
 *
 * 4. Trust the root CA on iPad:
 *      a) On the Mac running mkcert, find the rootCA.pem file:
 *           mkcert -CAROOT   ← shows the directory
 *      b) Send rootCA.pem to your iPad (AirDrop, email, etc.)
 *      c) iPad: tap the file → "Profile Downloaded" → Settings → General
 *         → VPN & Device Management → tap profile → Install
 *      d) iPad: Settings → General → About → Certificate Trust Settings
 *         → enable trust for the mkcert CA
 *
 * 5. Start the server:
 *      node server.js
 *      (or: PORT=8443 node server.js)
 *
 * 6. On iPad: open https://192.168.x.x:8443 in Safari
 *    Then: Share → Add to Home Screen
 */

'use strict';

var https = require('https');
var http  = require('http');
var fs    = require('fs');
var path  = require('path');

/* ── Config ───────────────────────────────────────────── */
var PORT    = parseInt(process.env.PORT || '8443', 10);
var ROOT    = __dirname;
var CERT_FILE = path.join(ROOT, 'cert.pem');
var KEY_FILE  = path.join(ROOT, 'key.pem');

/* ── MIME types ───────────────────────────────────────── */
var MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.ttf':  'font/ttf',
  '.txt':  'text/plain; charset=utf-8',
  '.pem':  'text/plain' // for cert download if ever needed — blocked below
};

/* ── Security: blocked extensions / paths ─────────────── */
var BLOCKED_NAMES = ['key.pem', '.env', '.git'];

function isBlockedPath(reqPath) {
  var normalized = reqPath.toLowerCase();
  for (var i = 0; i < BLOCKED_NAMES.length; i++) {
    if (normalized.indexOf(BLOCKED_NAMES[i]) !== -1) {
      return true;
    }
  }
  return false;
}

/* ── ICS Proxy ─────────────────────────────────────────
   GET /proxy?url=<encoded-ics-url>
   Only allows HTTPS URLs from calendar.google.com to
   prevent SSRF abuse.
   ─────────────────────────────────────────────────────*/
function handleProxy(req, res) {
  var parsed   = require('url').parse(req.url, true);
  var targetUrl = parsed.query && parsed.query.url;

  if (!targetUrl) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Missing ?url= parameter');
    return;
  }

  // SSRF guard: only allow Google Calendar HTTPS ICS URLs
  var targetParsed;
  try {
    targetParsed = require('url').parse(targetUrl);
  } catch (e) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Invalid URL');
    return;
  }

  if (targetParsed.protocol !== 'https:' ||
      targetParsed.hostname !== 'calendar.google.com' ||
      targetParsed.pathname.indexOf('/calendar/ical/') !== 0) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden: only Google Calendar ICS URLs are allowed');
    return;
  }

  var options = {
    hostname: targetParsed.hostname,
    path:     targetParsed.path,
    method:   'GET',
    headers:  { 'User-Agent': 'ipadclock/1.0' }
  };

  var proxyReq = https.request(options, function(proxyRes) {
    // Follow one redirect (Google Calendar sometimes issues one)
    if ((proxyRes.statusCode === 301 || proxyRes.statusCode === 302) && proxyRes.headers.location) {
      proxyRes.resume();
      var loc = proxyRes.headers.location;
      var locParsed;
      try { locParsed = require('url').parse(loc); } catch(e) { locParsed = null; }
      if (!locParsed || locParsed.protocol !== 'https:' || locParsed.hostname !== 'calendar.google.com') {
        res.writeHead(502, { 'Content-Type': 'text/plain' });
        res.end('Bad redirect from upstream');
        return;
      }
      var redOptions = {
        hostname: locParsed.hostname,
        path:     locParsed.path,
        method:   'GET',
        headers:  { 'User-Agent': 'ipadclock/1.0' }
      };
      https.request(redOptions, function(redRes) {
        res.writeHead(redRes.statusCode, {
          'Content-Type': 'text/calendar; charset=utf-8',
          'Cache-Control': 'no-store'
        });
        redRes.pipe(res);
      }).on('error', function(err) {
        res.writeHead(502, { 'Content-Type': 'text/plain' });
        res.end('Proxy error: ' + err.message);
      }).end();
      return;
    }

    res.writeHead(proxyRes.statusCode, {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': 'no-store'
    });
    proxyRes.pipe(res);
  });

  proxyReq.on('error', function(err) {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Proxy error: ' + err.message);
  });

  proxyReq.end();
}

/* ── Request handler ──────────────────────────────────── */
function handleRequest(req, res) {
  // Only allow GET and HEAD
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain' });
    res.end('Method Not Allowed');
    return;
  }

  // Parse URL, strip query string
  var urlPath = req.url.split('?')[0].split('#')[0];

  // Route proxy requests
  if (urlPath === '/proxy') {
    handleProxy(req, res);
    return;
  }

  // Default to index.html
  if (urlPath === '/' || urlPath === '') {
    urlPath = '/index.html';
  }

  // Block sensitive files
  if (isBlockedPath(urlPath)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  // Resolve file path and guard against path traversal
  var filePath = path.resolve(path.join(ROOT, urlPath));
  if (filePath.indexOf(ROOT) !== 0) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  // Determine MIME type
  var ext      = path.extname(filePath).toLowerCase();
  var mimeType = MIME[ext] || 'application/octet-stream';

  // Security headers (for every response)
  var headers = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Strict-Transport-Security': 'max-age=31536000',
    // Allow SW to control the full scope
    'Service-Worker-Allowed': '/'
  };

  // Cache headers by file type
  if (ext === '.html') {
    headers['Cache-Control'] = 'no-store';
  } else if (ext === '.js' || ext === '.css') {
    headers['Cache-Control'] = 'public, max-age=3600';
  } else {
    headers['Cache-Control'] = 'public, max-age=86400';
  }

  // Check if file exists and serve it
  fs.stat(filePath, function(statErr, stat) {
    if (statErr || !stat.isFile()) {
      // Try appending .html
      var fallback = filePath + '.html';
      fs.stat(fallback, function(fbErr, fbStat) {
        if (!fbErr && fbStat.isFile()) {
          serveFile(fallback, 'text/html; charset=utf-8', headers, req, res);
        } else {
          res.writeHead(404, Object.assign({}, headers, { 'Content-Type': 'text/plain' }));
          res.end('404 Not Found: ' + urlPath);
        }
      });
      return;
    }
    serveFile(filePath, mimeType, headers, req, res);
  });
}

function serveFile(filePath, mimeType, headers, req, res) {
  fs.readFile(filePath, function(err, data) {
    if (err) {
      res.writeHead(500, Object.assign({}, headers, { 'Content-Type': 'text/plain' }));
      res.end('500 Internal Server Error');
      return;
    }
    headers['Content-Type']   = mimeType;
    headers['Content-Length'] = data.length;
    res.writeHead(200, headers);
    if (req.method === 'HEAD') {
      res.end();
    } else {
      res.end(data);
    }
  });
}

/* ── Start server ─────────────────────────────────────── */
function startServer() {
  // Try HTTPS first
  if (fs.existsSync(CERT_FILE) && fs.existsSync(KEY_FILE)) {
    var tlsOptions = {
      key:  fs.readFileSync(KEY_FILE),
      cert: fs.readFileSync(CERT_FILE)
    };
    var server = https.createServer(tlsOptions, handleRequest);
    server.listen(PORT, '0.0.0.0', function() {
      var addr = getLocalIP();
      console.log('');
      console.log('  ┌─────────────────────────────────────────────┐');
      console.log('  │   iPad Clock — HTTPS Server running         │');
      console.log('  ├─────────────────────────────────────────────┤');
      console.log('  │   Local:    https://localhost:' + PORT + '         │');
      console.log('  │   Network:  https://' + addr + ':' + PORT + '    │');
      console.log('  └─────────────────────────────────────────────┘');
      console.log('');
      console.log('  Open on iPad: https://' + addr + ':' + PORT);
      console.log('  Then: Share → Add to Home Screen');
      console.log('');
    });
    server.on('error', function(err) {
      console.error('[Server] HTTPS error:', err.message);
      if (err.code === 'EADDRINUSE') {
        console.error('  Port ' + PORT + ' is in use. Try: PORT=8444 node server.js');
      }
      process.exit(1);
    });
  } else {
    // Fallback to HTTP (SW won't work on iPad from LAN, but useful for localhost dev)
    console.warn('');
    console.warn('  ⚠  cert.pem / key.pem not found — starting HTTP server.');
    console.warn('  ⚠  Service Worker will NOT register on iPad over HTTP.');
    console.warn('  ⚠  Run: mkcert -key-file key.pem -cert-file cert.pem <your-LAN-IP> localhost');
    console.warn('');
    var fallbackPort = PORT === 8443 ? 8080 : PORT;
    var httpServer = http.createServer(handleRequest);
    httpServer.listen(fallbackPort, '0.0.0.0', function() {
      console.log('  HTTP server: http://localhost:' + fallbackPort);
    });
    httpServer.on('error', function(err) {
      console.error('[Server] HTTP error:', err.message);
      process.exit(1);
    });
  }
}

/* ── Helper: get first non-loopback IPv4 ─────────────── */
function getLocalIP() {
  var os = require('os');
  var interfaces = os.networkInterfaces();
  var keys = Object.keys(interfaces);
  for (var i = 0; i < keys.length; i++) {
    var list = interfaces[keys[i]];
    for (var j = 0; j < list.length; j++) {
      var iface = list[j];
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

startServer();
