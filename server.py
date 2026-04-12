#!/usr/bin/env python3
"""
iPad Clock — Python static file server with ICS proxy
Zero dependencies beyond the Python 3 stdlib.

Usage:  python3 server.py [port]
        PORT=8080 python3 server.py
"""

import os
import sys
import urllib.parse
import urllib.request
import http.server
import mimetypes
import ssl

PORT = int(os.environ.get('PORT', sys.argv[1] if len(sys.argv) > 1 else '8080'))
ROOT = os.path.dirname(os.path.abspath(__file__))

BLOCKED = ['key.pem', '.env', '.git']

MIME_EXTRA = {
    '.js':    'application/javascript; charset=utf-8',
    '.mjs':   'application/javascript; charset=utf-8',
    '.json':  'application/json; charset=utf-8',
    '.woff':  'font/woff',
    '.woff2': 'font/woff2',
}


class Handler(http.server.BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        # Quiet logging — only errors
        if int(args[1]) >= 400:
            super().log_message(fmt, *args)

    def do_GET(self):
        self._handle()

    def do_HEAD(self):
        self._handle(head_only=True)

    def _handle(self, head_only=False):
        parsed = urllib.parse.urlparse(self.path)
        path   = parsed.path

        # ── ICS Proxy ──────────────────────────────────────────
        if path == '/proxy':
            self._proxy(parsed.query, head_only)
            return

        # ── Static files ───────────────────────────────────────
        if path == '/' or path == '':
            path = '/index.html'

        # Block sensitive names
        lower = path.lower()
        for b in BLOCKED:
            if b in lower:
                self._respond(403, 'text/plain', b'Forbidden')
                return

        # Resolve and guard against path traversal
        file_path = os.path.realpath(os.path.join(ROOT, path.lstrip('/')))
        if not file_path.startswith(ROOT):
            self._respond(403, 'text/plain', b'Forbidden')
            return

        if not os.path.isfile(file_path):
            # Try appending .html
            candidate = file_path + '.html'
            if os.path.isfile(candidate):
                file_path = candidate
            else:
                self._respond(404, 'text/plain', b'404 Not Found')
                return

        ext = os.path.splitext(file_path)[1].lower()
        mime = MIME_EXTRA.get(ext) or mimetypes.guess_type(file_path)[0] or 'application/octet-stream'

        cache = 'no-store' if ext == '.html' else ('public, max-age=3600' if ext in ('.js', '.css') else 'public, max-age=86400')

        with open(file_path, 'rb') as f:
            data = f.read()

        headers = {
            'Content-Type':             mime,
            'Content-Length':           str(len(data)),
            'Cache-Control':            cache,
            'X-Content-Type-Options':   'nosniff',
            'X-Frame-Options':          'SAMEORIGIN',
            'Service-Worker-Allowed':   '/',
        }
        self.send_response(200)
        for k, v in headers.items():
            self.send_header(k, v)
        self.end_headers()
        if not head_only:
            self.wfile.write(data)

    def _proxy(self, query_string, head_only=False):
        """Fetch an external ICS file server-side to bypass browser CORS."""
        params = urllib.parse.parse_qs(query_string)
        url_list = params.get('url', [])
        if not url_list:
            self._respond(400, 'text/plain', b'Missing ?url= parameter')
            return

        target = url_list[0]

        # SSRF guard: only allow Google Calendar HTTPS ICS URLs
        try:
            p = urllib.parse.urlparse(target)
        except Exception:
            self._respond(400, 'text/plain', b'Invalid URL')
            return

        if (p.scheme != 'https' or
                p.hostname != 'calendar.google.com' or
                not p.path.startswith('/calendar/ical/')):
            self._respond(403, 'text/plain', b'Forbidden: only Google Calendar ICS URLs allowed')
            return

        try:
            req = urllib.request.Request(target, headers={'User-Agent': 'ipadclock/1.0'})
            # Create an SSL context that verifies certificates
            ctx = ssl.create_default_context()
            with urllib.request.urlopen(req, context=ctx, timeout=15) as resp:
                data = resp.read()
        except Exception as e:
            self._respond(502, 'text/plain', ('Proxy error: ' + str(e)).encode())
            return

        headers = {
            'Content-Type':   'text/calendar; charset=utf-8',
            'Content-Length': str(len(data)),
            'Cache-Control':  'no-store',
        }
        self.send_response(200)
        for k, v in headers.items():
            self.send_header(k, v)
        self.end_headers()
        if not head_only:
            self.wfile.write(data)

    def _respond(self, code, mime, body):
        self.send_response(code)
        self.send_header('Content-Type', mime)
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == '__main__':
    import socket

    # Find local LAN IP
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        local_ip = s.getsockname()[0]
        s.close()
    except Exception:
        local_ip = 'localhost'

    server = http.server.HTTPServer(('0.0.0.0', PORT), Handler)
    print('')
    print('  ┌─────────────────────────────────────────────┐')
    print('  │   iPad Clock — Python HTTP Server           │')
    print(f'  │   Local:   http://localhost:{PORT}               │')
    print(f'  │   Red:     http://{local_ip}:{PORT}         │')
    print('  └─────────────────────────────────────────────┘')
    print('')
    print('  Ctrl+C para detener')
    print('')
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
