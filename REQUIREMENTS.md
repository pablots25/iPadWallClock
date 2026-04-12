# Requirements — iPad Casio Clock

## Functional Requirements

### FR1 — Real-Time Clock Display

- The app shall display the current local time in HH:MM:SS format, updating every second.
- Each digit shall be rendered as a flip card with a 3D rotation animation (fold + unfold, 500 ms total duration).
- The colon separators shall blink in LCD theme and be static in Flip theme.
- The current date (weekday name, day, month, year) shall be displayed below the clock.

### FR2 — Dual Visual Themes

- The app shall provide two themes selectable by the user:
  - **Flip Clock** (default): large animated flip cards, dark glassmorphism UI.
  - **LCD Retro**: 7-segment aesthetic with amber LED glow effect and blinking colon.
- The selected theme shall be persisted across sessions using `localStorage`.

### FR3 — Live Weather Display

- The app shall request the device's current location via the Geolocation API.
- Upon obtaining coordinates, the app shall fetch current weather conditions from the Open-Meteo API (no API key required).
- Weather data shall include: temperature (°C), apparent temperature, humidity, wind speed, and a condition label with icon.
- WMO weather codes returned by the API shall be mapped to human-readable Spanish labels and corresponding SVG icons.
- Weather data shall be refreshed every 30 minutes.
- If geolocation is denied or unavailable, the weather widget shall be hidden gracefully.

### FR4 — Google Calendar Integration

- The app shall support up to 3 Google Calendar feeds configured by the user.
- Each calendar feed shall be fetched via ICS (iCalendar) format.
- The ICS parser shall support:
  - Single events (`VEVENT`)
  - Recurring events with `RRULE`, including: `FREQ`, `INTERVAL`, `BYDAY`, `UNTIL`, `COUNT`
- The app shall display the next 5 upcoming events across all configured calendars.
- Each event shall show its title, date/time, and the calendar's configured colour.
- Calendar data shall be refreshed every 15 minutes.

### FR5 — Settings Panel

- The app shall provide a settings panel accessible via a gear icon.
- The user shall be able to configure:
  - Up to 3 calendar ICS feed URLs, each with a display name and colour.
  - Theme selection (Flip / LCD).
- All settings shall be persisted in `localStorage` and applied immediately on save.

### FR6 — Offline Support

- The app shall register a Service Worker to enable offline functionality.
- The Service Worker shall apply the following caching strategies:
  - **Cache-first**: app shell files (HTML, CSS, JS) and web fonts.
  - **Network-first**: live API calls (weather, calendar ICS feeds).
  - **Offline fallback**: return a cached HTML response if the network is unavailable and the shell is not yet cached.
- The app shall remain fully functional for clock display and last-fetched weather/calendar data when offline.

### FR7 — Progressive Web App (PWA)

- The app shall be installable on iPad via Safari's "Add to Home Screen".
- When launched from the home screen, the app shall run in fullscreen with no browser chrome (`apple-mobile-web-app-capable`).
- A splash screen shall be displayed on launch.
- The app icon and splash image shall reflect the Casio clock aesthetic.

### FR8 — CORS Proxy for Calendar Feeds

- The local server shall expose a `/proxy?url=<ICS-URL>` endpoint.
- This endpoint shall fetch the requested ICS URL server-side and return the content to the browser, bypassing CORS restrictions.
- Only Google Calendar HTTPS URLs are permitted (see NFR3).

---

## Non-Functional Requirements

### NFR1 — Browser and OS Compatibility

- The app shall be compatible with Safari on iOS 12.5 and later.
- The JavaScript codebase shall not use syntax or APIs unavailable in iOS 12.5 Safari, including:
  - Optional chaining (`?.`)
  - Nullish coalescing (`??`)
  - `String.prototype.replaceAll()`
  - Top-level `await`
- ES6 features (arrow functions, `const`/`let`, template literals, `Promise`) are permitted.

### NFR2 — Zero External Runtime Dependencies

- The server (both Node.js and Python variants) shall use only the language's standard library.
- No `npm install`, `pip install`, or any other package manager command shall be required to run the app.
- All frontend logic shall be vanilla JavaScript with no framework or bundler.

### NFR3 — Server Security

- **SSRF protection**: The `/proxy` endpoint shall only accept URLs that begin with `https://calendar.google.com/`. All other URLs shall be rejected with HTTP 400.
- **Path traversal protection**: Static file serving shall resolve paths against the project root and reject any request that resolves outside it.
- **Blocked file types**: The server shall refuse to serve files with extensions `.pem`, `.key`, `.env`, and `.git` with HTTP 403.
- **Security headers** on all responses:
  - `X-Content-Type-Options: nosniff`
  - `X-Frame-Options: SAMEORIGIN`
  - `Strict-Transport-Security: max-age=31536000` (HTTPS server only)

### NFR4 — Localisation

- The app UI shall be in Spanish.
- Day names, month names, and weather condition descriptions shall be hardcoded in Spanish.
- No internationalisation (i18n) framework is required; locale is fixed.

### NFR5 — Responsive Layout

- The layout shall adapt to iPad portrait and landscape orientations without horizontal scrolling.
- Sizing shall use CSS `clamp()` for fluid scaling across screen sizes.
- Safe-area insets (`env(safe-area-inset-*)`) shall be applied to accommodate the iPad home indicator and notch.

### NFR6 — Performance

- Cache-control headers on served files shall be:
  - `no-store` for `index.html` (always fetch latest shell)
  - `max-age=3600` (1 hour) for JS and CSS files
  - `max-age=86400` (24 hours) for other static assets
- The flip animation shall complete within 500 ms (fold: 250 ms + unfold: 250 ms) without dropping frames.

### NFR7 — Accessibility

- Interactive elements shall have accessible labels (ARIA attributes or visible text).
- The app shall use semantic HTML5 elements where appropriate.
- Body text and UI labels shall use the system font stack for legibility and native rendering.

---

## External Dependencies

| Dependency | Type | Auth | Notes |
|-----------|------|------|-------|
| [Open-Meteo API](https://open-meteo.com/) | REST (JSON) | None | Free; no API key; rate limit: 10 000 req/day |
| Google Calendar | ICS feed URL | None (secret URL) | User-configured; fetched server-side via `/proxy` |

---

## Technical Constraints

| Constraint | Detail |
|-----------|--------|
| HTTPS required for device | Geolocation API and Service Worker registration are blocked by Safari over HTTP on non-localhost origins |
| Local certificate authority | mkcert must be installed and its root CA trusted on the iPad for the self-signed LAN certificate to be accepted |
| LAN connectivity | The iPad and server machine must be on the same local network |
| Server runtime | Either Node.js (any recent version) or Python 3.6+ must be available on the host machine |
