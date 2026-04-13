# iPadWallFlipClock

A retro flip-style digital clock web app for iPad, designed to be installed as a PWA (Progressive Web App) directly from Safari. Displays a flip-card clock with live weather, Google Calendar integration, and a slide-up calendar panel.

## Features

- **Flip-card clock** — animated HH:MM:SS display with 3D card-flip transitions every second, minimalism theme
- **Display options** — toggle seconds on/off, choose between 3 sizes (small/medium/large) from the settings panel
- **5 color themes** — Amber (default), Green phosphor, Blue/cyan, Red, White/daylight; pick from the color palette button
- **Live weather** — current conditions, sunrise/sunset times, UV index, rain, humidity, wind, and last-updated timestamp via Open-Meteo (free, no API key); corner weather widget always visible
- **Google Calendar** — up to 2 ICS feeds, recurring events (RRULE), top-5 upcoming events with countdown; refreshes every 60 seconds
- **Calendar panel** — slide-up panel triggered by swipe-up gesture or drag handle tap; accordion sections per feed, today badge showing number of events today
- **Night auto-dim** — screen fades to 50 % brightness after sunset and restores at sunrise; tap to dismiss for 5 minutes
- **Anti-sleep** — silent AudioContext trick keeps the screen on after first touch (iOS 12 compatible)
- **Page Visibility optimisation** — RAF loop and polling pause when the app is backgrounded; resume and refresh immediately on return
- **Offline support** — Service Worker caching; fully functional without network after first load
- **PWA / Add to Home Screen** — fullscreen, splash screen, runs like a native app on iPad
- **Zero npm dependencies** — Node.js or Python 3 stdlib only

## Prerequisites

| Tool | Purpose |
|------|---------|
| Node.js (any recent version) or Python 3 | Run the local server |
| [mkcert](https://github.com/FiloSottile/mkcert) | Generate trusted local HTTPS certificates (required for iPad) |

Install mkcert on macOS:

```bash
brew install mkcert
```

## Quick Start

### Development (HTTP, same machine only)

```bash
./start.sh
```

Opens at `http://localhost:8080`. The Service Worker and Geolocation API will **not** work over HTTP on iPad.

### iPad (HTTPS over LAN) — recommended

```bash
./start-https.sh
```

This script will:
1. Auto-detect your LAN IP address
2. Generate a trusted `cert.pem` / `key.pem` via mkcert (or regenerate if the IP changed)
3. Print the URL to visit on your iPad

Default port is `8443`. To use a different port:

```bash
./start-https.sh 9443
```

## iPad Setup

1. On your iPad, open Safari and navigate to `https://<your-LAN-IP>:8443`
2. The script provides a `rootCA.pem` URL — download and install it as a profile:
   - **Settings → General → VPN & Device Management** → install the profile
   - **Settings → General → About → Certificate Trust Settings** → enable full trust for the mkcert CA
3. Reload the page in Safari
4. Tap **Share → Add to Home Screen**
5. Launch from the home screen — it opens fullscreen with no browser chrome

> The CA trust step is only needed once per device. Certificates are regenerated automatically if your LAN IP changes.

## Configuration

All settings are accessed via the gear icon (⚙) in the bottom-right corner:

| Setting | Description |
|---------|-------------|
| **Seconds** | Show or hide the seconds digits |
| **Size** | Clock size: P (small), M (medium), G (large) |
| **Color** | Pick from 5 color themes via the color palette button (bottom-right) |
| **Calendar 1–2** | ICS feed URL, display name, and color for each Google Calendar |

Settings are persisted in `localStorage`. Weather is fetched automatically using the device's Geolocation API (refreshed every 30 minutes).

To get a Google Calendar ICS URL: Google Calendar → Settings → your calendar → **Secret address in iCal format**.

### Calendar Panel

Swipe up from the bottom half of the screen or tap the drag handle to open the calendar panel. Each feed is shown as a collapsible accordion section. A badge next to the handle shows how many events you have today. Swipe down or tap the overlay to close.

### Night Dimming

The app automatically dims to 50 % brightness from sunset to sunrise, using sunrise/sunset data from the same Open-Meteo weather call. Tap the dim overlay to dismiss it for 5 minutes.

### Screen Always On

To keep the iPad screen from locking, go to **Settings → Display & Brightness → Auto-Lock → Never**. The app also uses a silent AudioContext trick to prevent the screen from sleeping after the first touch.

## Project Structure

| File | Description |
|------|-------------|
| `index.html` | App shell, PWA meta tags, flip-card markup, calendar panel, settings panel, dim overlay, corner weather |
| `app.js` | Clock logic, flip animations, weather (incl. sunrise/UV), calendar parser, countdown, slide-up panel, swipe gestures, anti-sleep, color themes, page visibility |
| `styles.css` | Minimalism theme × 5 color themes, flip animations, calendar panel, dim overlay, responsive grid, safe-area insets |
| `sw.js` | Service Worker — cache-first for shell, network-first for APIs |
| `server.js` | HTTPS static server + CORS proxy (Node.js, no npm deps) |
| `server.py` | HTTP static server + CORS proxy (Python 3, stdlib only) |
| `start.sh` | Launch HTTP dev server and open browser |
| `start-https.sh` | Generate mkcert certificates and launch HTTPS server for iPad access over LAN |
| `start-https.sh` | Launch HTTPS server with automatic mkcert cert management |

## Architecture Overview

```
Browser (iPad Safari)
├── app.js          ← clock, weather, calendar, settings
├── styles.css      ← flip theme + LCD theme
├── sw.js           ← offline caching
└── index.html      ← structure + PWA manifest

Local Server (Node / Python)
├── GET /*          ← serve static files with cache headers
└── GET /proxy?url= ← CORS proxy (Google Calendar ICS only)

External APIs
├── api.open-meteo.com   ← weather (no key, free)
└── calendar.google.com  ← ICS feeds (via /proxy)
```

## Security

The server enforces several protections:

- **SSRF guard** on `/proxy`: only `https://calendar.google.com/` URLs are allowed
- **Path traversal protection**: requests cannot escape the project directory
- **Blocked extensions**: `.pem`, `.env`, `.key`, `.git` files are never served
- **Security headers**: `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`

## Design Decisions

These decisions were made during the design phase of the project. They document *why* things are the way they are.

### Multi-file architecture instead of a single HTML file

The original brief called for a single `.html` file. We moved to a multi-file layout (`index.html` + `app.js` + `styles.css` + `sw.js` + `server.js`/`server.py`) because it keeps each concern separate and is easier to maintain, without adding any build step, bundler, or npm dependency.

### Local home server instead of Vercel

Vercel was considered for HTTPS hosting (required by the Service Worker and Geolocation API), but the decision was made to self-host on a home server. The `server.js` (Node.js) and `server.py` (Python 3) servers use only the standard library — no npm install required. HTTPS is handled locally via `mkcert`.

### HTTPS via mkcert instead of plain HTTP

Service Workers and the Geolocation API require a secure context. `mkcert` generates a locally-trusted certificate so Safari on iPad accepts the connection. The `start-https.sh` script automates certificate generation and detects IP changes automatically.

### ICS feeds instead of the Google Calendar embed

Google Calendar's `/embed?src=…` URL returns an iframe with Google's own rendered UI — there is no way to extract event data from it for custom rendering. The ICS format (`/calendar/ical/…/basic.ics`) returns raw event data that can be parsed and displayed with full control over layout, colors, and filtering.

The downside of ICS is CORS: browsers block direct `fetch()` calls to `calendar.google.com` from a different origin. This is solved by the server-side `/proxy?url=` endpoint, which fetches the ICS on behalf of the browser and relays the response. Direct embed or OAuth were rejected because they tie the UI to Google's design or require user authentication infrastructure.

### Two calendar feeds (instead of three)

The app was designed for personal use by two people (user + partner). Supporting exactly two feeds keeps the settings panel simple. The feeds are color-coded independently.

### Flip-card clock instead of analog SVG or LCD digits

The project went through two clock designs before settling on the flip card:

1. **Analog SVG** — first implementation; removed because the requirement is a digital flip clock.
2. **LCD / 7-segment digits** — second implementation; removed in favor of the flip card.
3. **Flip card (current)** — inspired by minimalism flip clock aesthetics. Each digit is a CSS 3D card with four layers (static top, static bottom, fold-away flap, unfold-in flap). Only digits that actually change animate, so the seconds group flips every tick while the hours group barely moves.

Both the Flip and LCD clock are rendered simultaneously — CSS `display:none` hides whichever is inactive. This avoids re-initialising flip-card state on theme toggle.

### Colour themes via CSS custom property overrides

Each colour theme (`amber`, `green`, `blue`, `red`, `white`) is implemented as a `[data-color="…"]` block on `<body>` that overrides the CSS variables declared in `:root`. The display theme (`flip`/`lcd`) and the colour theme are fully orthogonal — all 10 combinations work without any extra JS logic.

### Anti-sleep via silent AudioContext

The Web Lock API is not available on iOS 12. The reliable workaround is to play a 1-sample silent audio buffer via `AudioContext` / `webkitAudioContext` every 20 seconds. This is triggered on the first `touchstart` event (user gesture required to unlock audio on iOS). A dismissible banner prompts the user to tap if they have not yet done so.

### Night dimming via sunrise/sunset from Open-Meteo

Sunrise and sunset times are already returned by the `&daily=sunrise,sunset` parameter of the same weather API call. Storing them as module-level `Date` objects lets a once-per-minute check in the RAF loop apply a full-viewport `rgba(0,0,0,0.5)` overlay with no extra network requests.

### Page Visibility API for battery and performance

When the app is backgrounded (e.g. the iPad is locked or another app is in the foreground), the `requestAnimationFrame` loop and all `setInterval` timers are paused. On return, the RAF loop restarts and an immediate weather + calendar refresh runs before the interval timers resume. This avoids wasting CPU and battery while the screen is off.

### Warm amber palette instead of neon

The original design used electric blue (`#00f0ff`) and acid green (`#00ff88`) neon accents. This was changed to a warm amber/gold (`#c8a84b`) and muted green (`#8fb87a`) palette for a classic retro feel. System fonts replace decorative display fonts for all UI labels.

### Near-real-time calendar polling (60 seconds)

The initial polling interval for calendar feeds was 15 minutes. This was reduced to 60 seconds to keep the displayed events current throughout the day, at the cost of slightly more network traffic (one small ICS file fetch per feed per minute, proxied locally).

### No Vue, React, or any JS framework

Vanilla ES6 only. The target is iOS 12.5 Safari, which predates many modern JS features. A framework would require either a build step or a large runtime bundle. The app is simple enough that vanilla JS is the right tool.

## Notes

- The app UI is in **Spanish** (days, months, weather descriptions are hardcoded)
- Compatible with **iOS 12.5+** — no optional chaining, nullish coalescing, or `replaceAll()` used
- Weather refreshes every **30 minutes**; calendar refreshes every **60 seconds**
