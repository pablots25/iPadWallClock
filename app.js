/* ==========================================================
   iPadWallFlipClock — app.js
   Target: iPad Air, iOS 12.5 Safari
   ES5/ES6 compatible — no optional chaining, no nullish
   coalescing, no replaceAll(), no top-level await
   ========================================================== */

(function() {
  'use strict';

  /* ── Locale strings (Spanish) ──────────────────────── */
  var DAYS = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  var DAYS_SHORT = ['DOM','LUN','MAR','MIÉ','JUE','VIE','SÁB'];
  var MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  var MONTHS_SHORT = ['ENE','FEB','MAR','ABR','MAY','JUN',
                      'JUL','AGO','SEP','OCT','NOV','DIC'];

  /* ── WMO Weather Code → icon + label ───────────────── */
  var WMO_MAP = {
    // Clear
    0:  { label: 'Despejado',   icon: 'sun' },
    1:  { label: 'Mayorm. desp.', icon: 'sun-cloud' },
    2:  { label: 'Parcialm. nub.', icon: 'cloud' },
    3:  { label: 'Nublado',     icon: 'cloud' },
    // Fog
    45: { label: 'Niebla',      icon: 'fog' },
    48: { label: 'Niebla helada', icon: 'fog' },
    // Drizzle
    51: { label: 'Llovizna',    icon: 'rain' },
    53: { label: 'Llovizna',    icon: 'rain' },
    55: { label: 'Llovizna int.', icon: 'rain' },
    // Rain
    61: { label: 'Lluvia suave', icon: 'rain' },
    63: { label: 'Lluvia mod.', icon: 'rain' },
    65: { label: 'Lluvia fuerte', icon: 'rain' },
    66: { label: 'Lluvia/hielo', icon: 'rain' },
    67: { label: 'Lluvia/hielo', icon: 'rain' },
    // Snow
    71: { label: 'Nieve suave', icon: 'snow' },
    73: { label: 'Nieve mod.', icon: 'snow' },
    75: { label: 'Nevada fuerte', icon: 'snow' },
    77: { label: 'Nieve granulada', icon: 'snow' },
    // Showers
    80: { label: 'Chubascos',   icon: 'rain' },
    81: { label: 'Chubascos mod.', icon: 'rain' },
    82: { label: 'Chubascos int.', icon: 'rain' },
    // Thunderstorm
    95: { label: 'Tormenta',    icon: 'storm' },
    96: { label: 'Tormenta/granizo', icon: 'storm' },
    99: { label: 'Tormenta/granizo', icon: 'storm' }
  };

  function getWmoInfo(code) {
    var info = WMO_MAP[code];
    if (info) return info;
    // fallback grouping
    if (code >= 0 && code <= 1)   return { label: 'Despejado', icon: 'sun' };
    if (code >= 2 && code <= 3)   return { label: 'Nublado', icon: 'cloud' };
    if (code >= 45 && code <= 48) return { label: 'Niebla', icon: 'fog' };
    if (code >= 51 && code <= 67) return { label: 'Lluvia', icon: 'rain' };
    if (code >= 71 && code <= 77) return { label: 'Nieve', icon: 'snow' };
    if (code >= 80 && code <= 82) return { label: 'Chubascos', icon: 'rain' };
    if (code >= 95 && code <= 99) return { label: 'Tormenta', icon: 'storm' };
    return { label: 'Desconocido', icon: 'cloud' };
  }

  /* Weather icon SVG strings */
  function getWeatherSVG(type) {
    var BLUE = '#00f0ff', GREEN = '#00ff88', AMBER = '#ffaa00', WHITE = '#aaaacc';
    var svgs = {
      'sun': '<svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<circle cx="18" cy="18" r="7" fill="' + AMBER + '" opacity="0.9"/>' +
        '<g stroke="' + AMBER + '" stroke-width="2" stroke-linecap="round" opacity="0.7">' +
        '<line x1="18" y1="2" x2="18" y2="6"/><line x1="18" y1="30" x2="18" y2="34"/>' +
        '<line x1="2" y1="18" x2="6" y2="18"/><line x1="30" y1="18" x2="34" y2="18"/>' +
        '<line x1="6.5" y1="6.5" x2="9.3" y2="9.3"/><line x1="26.7" y1="26.7" x2="29.5" y2="29.5"/>' +
        '<line x1="6.5" y1="29.5" x2="9.3" y2="26.7"/><line x1="26.7" y1="9.3" x2="29.5" y2="6.5"/>' +
        '</g></svg>',
      'sun-cloud': '<svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<circle cx="14" cy="13" r="5" fill="' + AMBER + '" opacity="0.7"/>' +
        '<path d="M10 22 Q10 17 15 17 Q16 13 21 13 Q26 13 26 18 Q29 18 29 22 Z" fill="' + WHITE + '" opacity="0.6"/>' +
        '</svg>',
      'cloud': '<svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M8 26 Q8 20 13.5 20 Q14.5 15 20 15 Q26 15 26 20 Q30 20.5 30 25 Q30 30 24 30 L12 30 Q8 30 8 26 Z" fill="' + WHITE + '" opacity="0.4"/>' +
        '</svg>',
      'fog': '<svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<g stroke="' + WHITE + '" stroke-width="2" stroke-linecap="round" opacity="0.5">' +
        '<line x1="6" y1="14" x2="30" y2="14"/><line x1="9" y1="19" x2="27" y2="19"/>' +
        '<line x1="6" y1="24" x2="30" y2="24"/></g></svg>',
      'rain': '<svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M8 18 Q8 12 13.5 12 Q14.5 7 20 7 Q26 7 26 12 Q30 12.5 30 17 Q30 22 24 22 L12 22 Q8 22 8 18 Z" fill="' + WHITE + '" opacity="0.35"/>' +
        '<g stroke="' + BLUE + '" stroke-width="1.5" stroke-linecap="round" opacity="0.8">' +
        '<line x1="12" y1="26" x2="10" y2="32"/><line x1="18" y1="26" x2="16" y2="32"/>' +
        '<line x1="24" y1="26" x2="22" y2="32"/></g></svg>',
      'snow': '<svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M8 18 Q8 12 13.5 12 Q14.5 7 20 7 Q26 7 26 12 Q30 12.5 30 17 Q30 22 24 22 L12 22 Q8 22 8 18 Z" fill="' + WHITE + '" opacity="0.35"/>' +
        '<g fill="' + BLUE + '" opacity="0.8">' +
        '<circle cx="12" cy="28" r="2"/><circle cx="18" cy="30" r="2"/><circle cx="24" cy="28" r="2"/>' +
        '</g></svg>',
      'storm': '<svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M7 18 Q7 12 13 12 Q14 7 20 7 Q27 7 27 13 Q31 13 31 18 Q31 23 25 23 L11 23 Q7 23 7 18 Z" fill="' + WHITE + '" opacity="0.3"/>' +
        '<polyline points="20,24 16,30 20,30 15,36" stroke="' + AMBER + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>' +
        '</svg>'
    };
    return svgs[type] || svgs['cloud'];
  }

  /* ── Utility: zero-pad ─────────────────────────────── */
  function pad(n) {
    return n < 10 ? '0' + n : '' + n;
  }

  /* ── DOM References ────────────────────────────────── */
  // Flip-card elements: [hh-0, hh-1, mm-0, mm-1, ss-0, ss-1]
  var flipCards = {
    hh: [
      document.getElementById('flip-hh-0'),
      document.getElementById('flip-hh-1')
    ],
    mm: [
      document.getElementById('flip-mm-0'),
      document.getElementById('flip-mm-1')
    ],
    ss: [
      document.getElementById('flip-ss-0'),
      document.getElementById('flip-ss-1')
    ]
  };
  var elClockDay  = document.getElementById('clock-day');
  var elClockDate = document.getElementById('clock-date');
  var elClockAmpm = document.getElementById('clock-ampm');
  var elWeatherIcon = document.getElementById('weather-icon');
  var elWeatherTemp = document.getElementById('weather-temp');
  var elWeatherLbl  = document.getElementById('weather-label');
  var elCalList     = document.getElementById('calendar-list');

  /* Minimalism theme elements */
  var elMinimalismAmpm         = document.getElementById('minimalism-ampm');
  var elMinimalismDate         = document.getElementById('minimalism-date');
  var elCornerWeatherIcon      = document.getElementById('corner-weather-icon');
  var elCornerWeatherTemp      = document.getElementById('corner-weather-temp');
  var elCornerWeatherLabel     = document.getElementById('corner-weather-label');
  var elMinimalismSecondsGroup = document.getElementById('minimalism-seconds-group');
  var elMinimalismSizeGroup    = document.getElementById('minimalism-size-group');
  var elCalTodayBadge          = document.getElementById('cal-today-badge');

  /* Calendar slide-up panel elements */
  var elCalPanel     = document.getElementById('cal-panel');
  var elCalPanelOvl  = document.getElementById('cal-panel-overlay');
  var elCalPanelDrag    = document.getElementById('cal-panel-drag');
  var elCalHandleRow     = document.getElementById('cal-panel-handle-row');
  var elCpSections   = [document.getElementById('cp-section-0'), document.getElementById('cp-section-1')];
  var elCpHeaders    = [document.getElementById('cp-header-0'),  document.getElementById('cp-header-1')];
  var elCpDots       = [document.getElementById('cp-dot-0'),     document.getElementById('cp-dot-1')];
  var elCpNames      = [document.getElementById('cp-name-0'),    document.getElementById('cp-name-1')];
  var elCpLists      = [document.getElementById('cp-list-0'),    document.getElementById('cp-list-1')];

  /* Phases 2-5 new elements */
  var elWdSunup        = document.getElementById('wd-sunup');
  var elWdSundown      = document.getElementById('wd-sundown');
  var elWdUv           = document.getElementById('wd-uv');
  var elWeatherForecast = document.getElementById('weather-forecast');
  var elWeatherUpdated = document.getElementById('weather-updated');
  var elCalCountdown   = document.getElementById('cal-countdown');
  var elDimOverlay     = document.getElementById('dim-overlay');
  var elColorBtn       = document.getElementById('btn-color');
  var elWakeLockHint   = document.getElementById('wake-lock-hint');

  var elSettingsBtn = document.getElementById('settings-btn');
  var elSettingsOvl = document.getElementById('settings-overlay');
  var elSettingsPanel = document.getElementById('settings-panel');
  var elSettingsClose = document.getElementById('settings-close');
  var elSettingsSave  = document.getElementById('settings-save');
  var elFeed1Url    = document.getElementById('feed1-url');
  var elFeed1Color  = document.getElementById('feed1-color');
  var elFeed1Name   = document.getElementById('feed1-name');
  var elFeed2Url    = document.getElementById('feed2-url');
  var elFeed2Color  = document.getElementById('feed2-color');
  var elFeed2Name   = document.getElementById('feed2-name');
  var elSettingsName0 = document.getElementById('settings-name-0');
  var elSettingsName1 = document.getElementById('settings-name-1');
  var elSettingsLat   = document.getElementById('settings-lat');
  var elSettingsLon   = document.getElementById('settings-lon');
  var elLocationStatus     = document.getElementById('location-status');
  var elLocationStatusText = document.getElementById('location-status-text');

  /* ── Flip card helper ──────────────────────────────── */
  // Each .flip-card holds:
  //   .flip-static-top span  — shows top-half of CURRENT value
  //   .flip-static-bot span  — shows bot-half of CURRENT value
  //   .flip-anim-top span    — animated flap: top-half of OLD value (folds away)
  //   .flip-anim-bot span    — animated flap: bot-half of NEW value (unfolds in)
  var flipValues = { hh: ['0','0'], mm: ['0','0'], ss: ['0','0'] };

  function setFlipDigit(card, oldChar, newChar) {
    if (oldChar === newChar) return;
    // Write OLD value into the animated top flap (it will fold away)
    var animTop = card.querySelector('.flip-anim-top span');
    var animBot = card.querySelector('.flip-anim-bot span');
    var statTop = card.querySelector('.flip-static-top span');
    var statBot = card.querySelector('.flip-static-bot span');

    // Phase 1: animTop (showing oldChar) folds away, revealing statTop (newChar)
    // Phase 2: animBot (showing newChar) unfolds in over statBot
    // Resting state: animTop covers top, statBot visible on bottom
    animTop.textContent = oldChar;  // fold-away flap shows old value
    animBot.textContent = newChar;  // unfold-in flap shows new value
    statTop.textContent = newChar;  // revealed under fold — new value
    statBot.textContent = oldChar;  // visible during phase 1 — must still show old value

    // Reset animation by removing class, force reflow, add back
    card.className = card.className.replace(' flipping', '').replace('flipping', '');
    // eslint-disable-next-line no-unused-expressions
    card.offsetWidth; // reflow trigger (iOS 12 safe)
    card.className = card.className + ' flipping';

    // After animation: update resting-state elements before snapping back
    // animTop snaps to rotateX(0deg) → must show newChar; statBot becomes visible → must show newChar
    setTimeout(function() {
      animTop.textContent = newChar;
      statBot.textContent = newChar;
      card.className = card.className.replace(' flipping', '').replace('flipping', '');
    }, 500);
  }


  /* ── Clock: requestAnimationFrame loop ─────────────── */
  var lastSecond = -1;

  function updateClock() {
    var now = new Date();
    var s   = now.getSeconds();
    var m   = now.getMinutes();
    var h   = now.getHours();

    if (s !== lastSecond) {
      lastSecond = s;
      var hStr = pad(h);
      var mStr = pad(m);
      var sStr = pad(s);

      var hh0 = hStr.charAt(0); var hh1 = hStr.charAt(1);
      var mm0 = mStr.charAt(0); var mm1 = mStr.charAt(1);
      var ss0 = sStr.charAt(0); var ss1 = sStr.charAt(1);

      setFlipDigit(flipCards.hh[0], flipValues.hh[0], hh0);
      setFlipDigit(flipCards.hh[1], flipValues.hh[1], hh1);
      setFlipDigit(flipCards.mm[0], flipValues.mm[0], mm0);
      setFlipDigit(flipCards.mm[1], flipValues.mm[1], mm1);
      setFlipDigit(flipCards.ss[0], flipValues.ss[0], ss0);
      setFlipDigit(flipCards.ss[1], flipValues.ss[1], ss1);

      flipValues.hh = [hh0, hh1];
      flipValues.mm = [mm0, mm1];
      flipValues.ss = [ss0, ss1];

      if (elClockAmpm) { elClockAmpm.textContent = h >= 12 ? 'PM' : 'AM'; }
      if (elMinimalismAmpm) { elMinimalismAmpm.textContent = h >= 12 ? 'PM' : 'AM'; }
      if (elClockDay)  { elClockDay.textContent  = DAYS[now.getDay()].toUpperCase(); }
      if (elClockDate) { elClockDate.textContent = pad(now.getDate()) + '.' +
        MONTHS[now.getMonth()].substring(0, 3).toUpperCase() + '.' +
        now.getFullYear(); }
      if (elMinimalismDate) {
        elMinimalismDate.textContent = DAYS_SHORT[now.getDay()] + ' · ' +
          pad(now.getDate()) + ' ' + MONTHS_SHORT[now.getMonth()];
      }
    }

    // Dim check once per minute (inexpensive)
    var dimMinute = Math.floor(Date.now() / 60000);
    if (dimMinute !== lastDimCheck) {
      lastDimCheck = dimMinute;
      updateDimming();
    }

    if (!clockPaused) { requestAnimationFrame(updateClock); }
  }

  requestAnimationFrame(updateClock);

  /* ── Weather Module ────────────────────────────────── */
  var lastLat = null;
  var lastLon = null;
  var weatherTimer = null;

  /* Phase 2 / 6 state */
  var lastSunrise      = null;
  var lastSunset       = null;
  var dimOverrideUntil = 0;
  var lastDimCheck     = -1;
  var clockPaused      = false;
  var calendarTimer    = null;
  /* Phase 1 state */
  var wakeLockActive   = false;
  var wakeLockTimer    = null;
  var wakeLockAudioCtx = null;

  function fetchWeather(lat, lon) {
    var url = 'https://api.open-meteo.com/v1/forecast' +
      '?latitude=' + lat +
      '&longitude=' + lon +
      '&current_weather=true' +
      '&current=apparent_temperature,relative_humidity_2m,wind_speed_10m,precipitation_probability' +
      '&daily=sunrise,sunset,uv_index_max,temperature_2m_max,temperature_2m_min,weathercode' +
      '&timezone=auto' +
      '&wind_speed_unit=kmh';

    fetch(url)
      .then(function(resp) {
        if (!resp.ok) { throw new Error('HTTP ' + resp.status); }
        return resp.json();
      })
      .then(function(data) {
        var cw   = data.current_weather;
        var temp = Math.round(cw.temperature);
        var code = cw.weathercode;
        var info = getWmoInfo(code);

        if (elWeatherIcon) { elWeatherIcon.innerHTML = getWeatherSVG(info.icon); }
        if (elWeatherTemp) { elWeatherTemp.textContent = temp + '°C'; }
        if (elWeatherLbl)  { elWeatherLbl.textContent  = info.label; }

        /* Sunrise / sunset / UV from daily data */
        var daily = data.daily || {};
        var dSunrise = (daily.sunrise && daily.sunrise[0]) ? daily.sunrise[0] : null;
        var dSunset  = (daily.sunset  && daily.sunset[0])  ? daily.sunset[0]  : null;
        var dMaxTemp = (daily.temperature_2m_max && daily.temperature_2m_max[0] !== undefined && daily.temperature_2m_max[0] !== null)
          ? Math.round(daily.temperature_2m_max[0]) : null;
        var dMinTemp = (daily.temperature_2m_min && daily.temperature_2m_min[0] !== undefined && daily.temperature_2m_min[0] !== null)
          ? Math.round(daily.temperature_2m_min[0]) : null;
        var dCode = (daily.weathercode && daily.weathercode[0] !== undefined && daily.weathercode[0] !== null)
          ? daily.weathercode[0] : null;
        var dInfo = dCode !== null ? getWmoInfo(dCode) : null;
        if (dSunrise) { lastSunrise = new Date(dSunrise); }
        if (dSunset)  { lastSunset  = new Date(dSunset); }
        updateDimming();

        if (elWdSunup) {
          elWdSunup.textContent = lastSunrise
            ? '\u2191 ' + pad(lastSunrise.getHours()) + ':' + pad(lastSunrise.getMinutes())
            : '\u2191 --:--';
        }
        if (elWdSundown) {
          elWdSundown.textContent = lastSunset
            ? '\u2193 ' + pad(lastSunset.getHours()) + ':' + pad(lastSunset.getMinutes())
            : '\u2193 --:--';
        }
        if (elWdUv) {
          var uvArr = daily.uv_index_max;
          elWdUv.textContent = (uvArr && uvArr[0] !== undefined && uvArr[0] !== null)
            ? Math.round(uvArr[0]) : '-';
        }
        if (elWeatherForecast) {
          var forecastParts = [];
          if (dInfo && dInfo.label) { forecastParts.push(dInfo.label); }
          if (dMinTemp !== null || dMaxTemp !== null) {
            forecastParts.push((dMinTemp !== null ? dMinTemp : '--') + '°/' + (dMaxTemp !== null ? dMaxTemp : '--') + '°');
          }
          elWeatherForecast.textContent = 'PREVISIÓN HOY: ' + (forecastParts.length ? forecastParts.join(' · ') : '--');
        }
        if (elWeatherUpdated) {
          var nowU = new Date();
          elWeatherUpdated.textContent = 'ACT: ' + pad(nowU.getHours()) + ':' + pad(nowU.getMinutes());
        }
        /* Populate Minimalism corner weather */
        if (elCornerWeatherTemp)  { elCornerWeatherTemp.textContent  = temp + '\u00b0C'; }
        if (elCornerWeatherLabel) { elCornerWeatherLabel.textContent = info.label; }
        if (elCornerWeatherIcon)  { elCornerWeatherIcon.innerHTML    = getWeatherSVG(info.icon).replace(/width="36" height="36"/g, 'width="36" height="36"'); }
        /* Reset weather temp color to let CSS rule (var(--lcd2)) apply */
        if (elWeatherTemp) { elWeatherTemp.style.color = ''; }
      })
      .catch(function(err) {
        console.warn('[Weather] Error:', err);
        if (elWeatherLbl) { elWeatherLbl.innerHTML = '<span class="weather-error">Sin datos del tiempo</span>'; }
        if (elWeatherForecast) { elWeatherForecast.textContent = 'PREVISIÓN HOY: --'; }
      });
  }

  /* ── Manual Location helpers ───────────────────────── */
  function loadManualLocation() {
    try {
      var raw = localStorage.getItem('manual-location');
      if (!raw) return null;
      var obj = JSON.parse(raw);
      var lat = parseFloat(obj.lat);
      var lon = parseFloat(obj.lon);
      if (isNaN(lat) || isNaN(lon)) return null;
      if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
      return { lat: lat, lon: lon };
    } catch (e) { return null; }
  }

  function saveManualLocation(lat, lon) {
    try {
      localStorage.setItem('manual-location', JSON.stringify({ lat: lat, lon: lon }));
    } catch (e) { console.warn('[Location] save error:', e); }
  }

  function updateLocationStatus(type) {
    if (!elLocationStatus || !elLocationStatusText) return;
    if (type === 'gps') {
      elLocationStatus.className = 'settings-hint settings-hint--location loc-ok';
      elLocationStatusText.textContent = '✓ GPS activo (' + lastLat.toFixed(2) + ', ' + lastLon.toFixed(2) + ')';
    } else if (type === 'manual') {
      elLocationStatus.className = 'settings-hint settings-hint--location loc-manual';
      elLocationStatusText.textContent = '◉ Ubicación manual (' + lastLat.toFixed(2) + ', ' + lastLon.toFixed(2) + ')';
    } else {
      elLocationStatus.className = 'settings-hint settings-hint--location loc-error';
      elLocationStatusText.textContent = '✗ Sin ubicación — configura en ⚙';
    }
  }

  function startWeatherWithCoords(lat, lon) {
    lastLat = lat;
    lastLon = lon;
    fetchWeather(lastLat, lastLon);
    if (weatherTimer) { clearInterval(weatherTimer); }
    weatherTimer = setInterval(function() {
      if (lastLat !== null) { fetchWeather(lastLat, lastLon); }
    }, 30 * 60 * 1000);
  }

  function onGeoSuccess(pos) {
    startWeatherWithCoords(pos.coords.latitude, pos.coords.longitude);
    updateLocationStatus('gps');
  }

  function onGeoError() {
    var manual = loadManualLocation();
    if (manual) {
      startWeatherWithCoords(manual.lat, manual.lon);
      updateLocationStatus('manual');
    } else {
      if (elWeatherLbl)  { elWeatherLbl.innerHTML  = '<span class="weather-error">Configura ubicación en ⚙</span>'; }
      if (elWeatherTemp) { elWeatherTemp.textContent = '--°C'; }
      if (elWeatherIcon) { elWeatherIcon.innerHTML   = getWeatherSVG('cloud'); }
      updateLocationStatus('error');
    }
  }

  /* ── Night Dimming ─────────────────────────────────────── */
  function updateDimming() {
    if (!elDimOverlay) return;
    var nowMs = Date.now();
    var isDark = false;
    if (lastSunrise !== null && lastSunset !== null) {
      isDark = (nowMs < lastSunrise.getTime() || nowMs > lastSunset.getTime());
    }
    if (dimOverrideUntil > nowMs) { isDark = false; }
    if (isDark) {
      if (elDimOverlay.className.indexOf('dim-active') === -1) {
        elDimOverlay.className = elDimOverlay.className + ' dim-active';
      }
    } else {
      elDimOverlay.className = elDimOverlay.className.replace(' dim-active', '').replace('dim-active', '');
    }
  }

  /* Any touch dismisses the dim overlay for 5 minutes */
  document.addEventListener('touchstart', function() {
    if (!elDimOverlay) return;
    if (elDimOverlay.className.indexOf('dim-active') === -1) return;
    dimOverrideUntil = Date.now() + 5 * 60 * 1000;
    updateDimming();
  }, { passive: true });

  /* ── Wake Lock via silent AudioContext ─────────────────── */
  function initWakeLock() {
    if (wakeLockActive) return;
    try {
      var AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!wakeLockAudioCtx) { wakeLockAudioCtx = new AudioCtx(); }
      var playSilent = function() {
        try {
          var buf = wakeLockAudioCtx.createBuffer(1, 1, 22050);
          var src = wakeLockAudioCtx.createBufferSource();
          src.buffer = buf;
          src.connect(wakeLockAudioCtx.destination);
          src.start(0);
        } catch (e2) {}
      };
      playSilent();
      wakeLockTimer = setInterval(playSilent, 20000);
      wakeLockActive = true;
      if (elWakeLockHint) { elWakeLockHint.style.display = 'none'; }
      try { localStorage.setItem('wake-lock', '1'); } catch(e2) {}
    } catch(e) {
      console.warn('[WakeLock] AudioContext error:', e);
    }
  }

  document.addEventListener('touchstart', initWakeLock, { passive: true });

  /* Show hint if wake lock has never been activated on this device */
  (function showWakeLockHint() {
    var prev = null;
    try { prev = localStorage.getItem('wake-lock'); } catch(e) {}
    if (elWakeLockHint && prev !== '1') {
      elWakeLockHint.style.display = 'block';
    }
  })();

  function initWeather() {
    if (!navigator.geolocation) {
      onGeoError(); /* will try manual fallback */
      return;
    }
    navigator.geolocation.getCurrentPosition(onGeoSuccess, onGeoError, {
      timeout: 10000,
      maximumAge: 300000
    });
  }

  initWeather();

  /* ── ICS Parser ────────────────────────────────────── */

  // Remove RFC 5545 line folds: CRLF followed by space or tab
  function unfoldICS(text) {
    return text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
  }

  // Parse a date string from ICS format to JS Date
  function parseICSDate(val) {
    // Remove any trailing param junk that crept in
    val = (val || '').split(';')[0].split(':').pop().trim();

    var isUTC = val.charAt(val.length - 1) === 'Z';
    if (val.indexOf('T') !== -1) {
      var dt = isUTC ? val.slice(0, -1) : val;
      var yr = parseInt(dt.substring(0,4), 10);
      var mo = parseInt(dt.substring(4,6), 10) - 1;
      var dy = parseInt(dt.substring(6,8), 10);
      var hh = parseInt(dt.substring(9,11), 10);
      var mm = parseInt(dt.substring(11,13), 10);
      var ss = parseInt(dt.substring(13,15), 10);
      if (isUTC) {
        return new Date(Date.UTC(yr, mo, dy, hh, mm, ss));
      }
      return new Date(yr, mo, dy, hh, mm, ss);
    } else {
      // All-day
      var yr2 = parseInt(val.substring(0,4), 10);
      var mo2 = parseInt(val.substring(4,6), 10) - 1;
      var dy2 = parseInt(val.substring(6,8), 10);
      return new Date(yr2, mo2, dy2);
    }
  }

  // Parse one VEVENT's property line into key/value
  // Returns { key, value } — key is normalized (strip params)
  function parseProp(line) {
    var colonIdx = line.indexOf(':');
    if (colonIdx === -1) return null;
    var rawKey = line.substring(0, colonIdx);
    var value  = line.substring(colonIdx + 1);
    // Strip param values to get bare property name
    var semiIdx = rawKey.indexOf(';');
    var key = semiIdx !== -1 ? rawKey.substring(0, semiIdx) : rawKey;
    return { key: key.toUpperCase(), value: value, rawKey: rawKey };
  }

  // Parse ICS text → array of event objects
  function parseICS(text) {
    var lines  = unfoldICS(text).split(/\r?\n/);
    var events = [];
    var cur    = null;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      if (line === 'BEGIN:VEVENT') {
        cur = {};
      } else if (line === 'END:VEVENT') {
        if (cur !== null) {
          events.push(cur);
          cur = null;
        }
      } else if (cur !== null) {
        var prop = parseProp(line);
        if (!prop) continue;
        switch (prop.key) {
          case 'DTSTART':
            cur.dtstart = parseICSDate(prop.value);
            break;
          case 'DTEND':
            cur.dtend = parseICSDate(prop.value);
            break;
          case 'SUMMARY':
            cur.summary = prop.value.replace(/\\n/g, ' ').replace(/\\,/g, ',').trim();
            break;
          case 'UID':
            cur.uid = prop.value;
            break;
          case 'RRULE':
            cur.rrule = prop.value;
            break;
        }
      }
    }
    return events;
  }

  // Parse RRULE string into object
  function parseRRule(rrule) {
    var parts  = (rrule || '').split(';');
    var result = { FREQ: null, INTERVAL: 1, BYDAY: null, UNTIL: null, COUNT: null };
    for (var i = 0; i < parts.length; i++) {
      var eq = parts[i].indexOf('=');
      if (eq === -1) continue;
      var k = parts[i].substring(0, eq).toUpperCase();
      var v = parts[i].substring(eq + 1);
      if (k === 'FREQ')     { result.FREQ = v; }
      if (k === 'INTERVAL') { result.INTERVAL = parseInt(v, 10) || 1; }
      if (k === 'BYDAY')    { result.BYDAY = v; }
      if (k === 'UNTIL')    { result.UNTIL = parseICSDate(v); }
      if (k === 'COUNT')    { result.COUNT = parseInt(v, 10); }
    }
    return result;
  }

  // Add months to a date, clamping to last day of resulting month
  function addMonths(date, months) {
    var d = new Date(date.getTime());
    var targetMonth = d.getMonth() + months;
    var targetYear  = d.getFullYear() + Math.floor(targetMonth / 12);
    targetMonth = ((targetMonth % 12) + 12) % 12;
    var lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
    d.setFullYear(targetYear);
    d.setMonth(targetMonth);
    d.setDate(Math.min(d.getDate(), lastDay));
    return d;
  }

  var DAY_NAMES = ['SU','MO','TU','WE','TH','FR','SA'];

  // Get the next occurrence of an event at or after `after`
  function getNextOccurrence(event, after) {
    if (!event.dtstart) return null;
    // No recurrence
    if (!event.rrule) {
      return event.dtstart >= after ? event.dtstart : null;
    }

    var rr       = parseRRule(event.rrule);
    var freq     = rr.FREQ;
    var interval = rr.INTERVAL;
    var cur      = new Date(event.dtstart.getTime());
    var count    = 0;
    var maxIter  = 1000; // safety cap

    if (!freq) {
      return event.dtstart >= after ? event.dtstart : null;
    }

    for (var iter = 0; iter < maxIter; iter++) {
      // Check UNTIL / COUNT limits
      if (rr.UNTIL !== null && cur > rr.UNTIL) return null;
      if (rr.COUNT !== null && count >= rr.COUNT) return null;

      // BYDAY filter for WEEKLY
      var dayOk = true;
      if (freq === 'WEEKLY' && rr.BYDAY) {
        var curDayName = DAY_NAMES[cur.getDay()];
        dayOk = rr.BYDAY.indexOf(curDayName) !== -1;
      }

      if (dayOk) {
        count++;
        if (cur >= after) {
          return new Date(cur.getTime());
        }
      }

      // Advance
      if (freq === 'DAILY') {
        cur.setDate(cur.getDate() + interval);
      } else if (freq === 'WEEKLY') {
        cur.setDate(cur.getDate() + interval * 7);
      } else if (freq === 'MONTHLY') {
        cur = addMonths(cur, interval);
      } else if (freq === 'YEARLY') {
        cur.setFullYear(cur.getFullYear() + interval);
      } else {
        break;
      }
    }
    return null;
  }

  // Format a Date for display in the event list
  function formatEventDate(date) {
    var now   = new Date();
    var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var tom   = new Date(today.getTime() + 86400000);
    var evDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());

    var timeStr = pad(date.getHours()) + ':' + pad(date.getMinutes());

    if (evDay.getTime() === today.getTime()) {
      return 'Hoy ' + timeStr;
    } else if (evDay.getTime() === tom.getTime()) {
      return 'Mañana ' + timeStr;
    } else {
      return pad(date.getDate()) + '/' + pad(date.getMonth() + 1) + ' ' + timeStr;
    }
  }

  // Determine if a date is today
  function isToday(date) {
    var now   = new Date();
    return date.getFullYear() === now.getFullYear() &&
           date.getMonth()    === now.getMonth()    &&
           date.getDate()     === now.getDate();
  }

  // ── Calendar Data ──
  var calendarFeeds = []; // [{ url, color, name, events }]

  function formatCountdown(ms) {
    if (ms <= 0) { return 'AHORA'; }
    if (ms < 60000) { return 'AHORA'; }
    if (ms < 3600000) { return 'en ' + Math.floor(ms / 60000) + 'm'; }
    if (ms < 172800000) {
      var hc = Math.floor(ms / 3600000);
      var mc = Math.floor((ms % 3600000) / 60000);
      return mc > 0 ? 'en ' + hc + 'h ' + mc + 'm' : 'en ' + hc + 'h';
    }
    return 'en ' + Math.floor(ms / 86400000) + 'd';
  }

  function renderCalendar() {
    if (!elCalList) return;
    var now = new Date();
    var upcoming = [];

    for (var fi = 0; fi < calendarFeeds.length; fi++) {
      var feed   = calendarFeeds[fi];
      var events = feed.events || [];
      for (var ei = 0; ei < events.length; ei++) {
        var ev   = events[ei];
        var next = getNextOccurrence(ev, now);
        if (next !== null) {
          upcoming.push({
            title: ev.summary || '(Sin título)',
            date:  next,
            color: feed.color,
            name:  feed.name
          });
        }
      }
    }

    // Sort by date
    upcoming.sort(function(a, b) { return a.date - b.date; });
    // Take 5
    upcoming = upcoming.slice(0, 5);

    /* ── Countdown to next event ── */
    if (elCalCountdown) {
      if (upcoming.length > 0) {
        var nextEv  = upcoming[0];
        var cdDiff  = nextEv.date - now;
        var cdTime  = pad(nextEv.date.getHours()) + ':' + pad(nextEv.date.getMinutes());
        var cdEvDay = new Date(nextEv.date.getFullYear(), nextEv.date.getMonth(), nextEv.date.getDate());
        var cdToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        var cdTom   = new Date(cdToday.getTime() + 86400000);
        var cdLabel;
        if (cdEvDay.getTime() === cdToday.getTime()) {
          cdLabel = 'hoy';
        } else if (cdEvDay.getTime() === cdTom.getTime()) {
          cdLabel = 'ma\u00F1ana';
        } else {
          cdLabel = pad(nextEv.date.getDate()) + '/' + pad(nextEv.date.getMonth() + 1);
        }
        elCalCountdown.innerHTML = 'PR\u00D3XIMO: ' + cdLabel + ' ' + cdTime +
          ' &middot; ' + formatCountdown(cdDiff);
      } else {
        elCalCountdown.textContent = '';
      }
    }

    if (upcoming.length === 0) {
      elCalList.innerHTML = '<div class="event-empty">No hay eventos próximos.</div>';
      return;
    }

    var html = '';
    for (var i = 0; i < upcoming.length; i++) {
      var item     = upcoming[i];
      var todayCls = isToday(item.date) ? ' today' : '';
      var title    = item.title.length > 38 ? item.title.substring(0, 36) + '…' : item.title;
      html += '<div class="event-item' + todayCls + '">' +
        '<span class="event-dot" style="background:' + item.color + ';color:' + item.color + '"></span>' +
        '<div class="event-body">' +
          '<div class="event-time">' + formatEventDate(item.date) +
            ' <span class="event-feed-label">' + item.name + '</span></div>' +
          '<div class="event-title">' + escapeHtml(title) + '</div>' +
        '</div>' +
      '</div>';
    }
    elCalList.innerHTML = html;
    renderCalendarPanel();
  }

  /* ── Calendar Panel: render events per feed ─────────────── */
  function renderCalendarPanel() {
    if (!elCpLists[0] && !elCpLists[1]) return;
    var now      = new Date();
    var settings = loadSettings();
    var horizon  = new Date(now.getTime() + 14 * 86400000); // 14 days ahead

    for (var fi = 0; fi < 2; fi++) {
      var cfg  = settings[fi] || { color: '#444444', name: 'Cal ' + (fi + 1) };
      var feed = calendarFeeds[fi] || null;

      if (elCpDots[fi])  { elCpDots[fi].style.background  = cfg.color || '#444'; }
      if (elCpNames[fi]) { elCpNames[fi].value = cfg.name  || ('Cal ' + (fi + 1)); }
      if (!elCpLists[fi]) continue;

      if (!feed || !feed.events || feed.events.length === 0) {
        elCpLists[fi].innerHTML = '<div class="cp-empty">Sin eventos próximos.</div>';
        continue;
      }

      var items = [];
      for (var ei = 0; ei < feed.events.length; ei++) {
        var ev   = feed.events[ei];
        var next = getNextOccurrence(ev, now);
        if (next !== null && next <= horizon) {
          items.push({ title: ev.summary || '(Sin título)', date: next });
        }
      }
      items.sort(function(a, b) { return a.date - b.date; });
      items = items.slice(0, 10);

      if (items.length === 0) {
        elCpLists[fi].innerHTML = '<div class="cp-empty">Sin eventos próximos (14 días).</div>';
        continue;
      }

      var html = '';
      for (var i = 0; i < items.length; i++) {
        var item  = items[i];
        var title = item.title.length > 42 ? item.title.substring(0, 40) + '…' : item.title;
        html += '<div class="cp-ev">' +
          '<span class="cp-ev-time">' + formatEventDate(item.date) + '</span>' +
          '<span class="cp-ev-title">' + escapeHtml(title) + '</span>' +
        '</div>';
      }
      elCpLists[fi].innerHTML = html;
    }

    /* Update today badge on drag handle */
    updateTodayBadge();
  }

  function updateTodayBadge() {
    if (!elCalTodayBadge) return;
    var todayCount = 0;
    var nowBadge   = new Date();
    for (var fb = 0; fb < calendarFeeds.length; fb++) {
      var feedB = calendarFeeds[fb];
      if (!feedB || !feedB.events) continue;
      for (var eb = 0; eb < feedB.events.length; eb++) {
        var nextB = getNextOccurrence(feedB.events[eb], nowBadge);
        if (nextB && isToday(nextB)) { todayCount++; }
      }
    }
    if (todayCount > 0) {
      elCalTodayBadge.textContent = todayCount + ' hoy';
      if (elCalTodayBadge.className.indexOf('has-events') === -1) {
        elCalTodayBadge.className = (elCalTodayBadge.className + ' has-events').trim();
      }
    } else {
      elCalTodayBadge.className = elCalTodayBadge.className.replace(/\s*has-events/g, '').trim();
    }
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function fetchFeed(feed) {
    // Route external calendar URLs through the server-side proxy to avoid CORS blocks
    var url = feed.url;
    try {
      var parsed = new URL(url);
      if (parsed.hostname !== window.location.hostname) {
        url = '/proxy?url=' + encodeURIComponent(url);
      }
    } catch (e) { /* keep url as-is */ }

    return fetch(url)
      .then(function(resp) {
        if (!resp.ok) { throw new Error('HTTP ' + resp.status); }
        return resp.text();
      })
      .then(function(text) {
        return parseICS(text);
      });
  }

  function refreshCalendars() {
    var feeds = loadSettings();
    calendarFeeds = [];

    var anyUrl = false;
    for (var i = 0; i < feeds.length; i++) {
      if (!feeds[i].url || !feeds[i].url.trim()) continue;
      anyUrl = true;
    }

    if (!anyUrl) {
      elCalList.innerHTML = '<div class="event-empty">Sin calendarios configurados.<br>Pulsa ⚙ para añadir tus URLs de Google Calendar.</div>';
      return;
    }

    elCalList.innerHTML = '<div class="event-empty">Cargando calendarios…</div>';

    // Kick off all feed fetches
    var pending = 0;
    for (var fi = 0; fi < feeds.length; fi++) {
      if (!feeds[fi].url || !feeds[fi].url.trim()) continue;
      pending++;
      (function(f) {
        var feedEntry = { url: f.url, color: f.color, name: f.name, events: [] };
        calendarFeeds.push(feedEntry);

        fetchFeed(f)
          .then(function(events) {
            feedEntry.events = events;
          })
          .catch(function(err) {
            console.warn('[Calendar] Error fetching feed "' + f.name + '":', err);
            feedEntry.events = [];
            // Show per-feed CORS error hint if URL looks like external origin
            feedEntry.error = 'Error al cargar ' + f.name + ' (¿CORS?)';
          })
          .then(function() {
            pending--;
            if (pending <= 0) {
              renderCalendar();
              updateTodayBadge();
              // Show any CORS errors
              var errorMsgs = [];
              for (var ci = 0; ci < calendarFeeds.length; ci++) {
                if (calendarFeeds[ci].error) {
                  errorMsgs.push(calendarFeeds[ci].error);
                }
              }
              if (errorMsgs.length > 0 && calendarFeeds.every(function(cf) { return cf.events.length === 0; })) {
                elCalList.innerHTML = '<div class="event-empty" style="color:var(--amber)">' +
                  errorMsgs.join('<br>') +
                  '<br><small>Usa la URL "Dirección secreta en formato iCal" de Google Calendar.</small></div>';
              }
            }
          });
      })(feeds[fi]);
    }
  }

  /* ── Settings Module ───────────────────────────────── */

  var DEFAULT_FEEDS = [
    { url: '', color: '#00f0ff', name: 'Yo' },
    { url: '', color: '#00ff88', name: 'Pareja' }
  ];

  function loadSettings() {
    var raw = null;
    try {
      raw = localStorage.getItem('feeds');
    } catch(e) {}
    if (raw !== null && raw !== undefined) {
      try {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length === 2) {
          return parsed;
        }
      } catch(e2) {}
    }
    return [
      { url: '', color: '#00f0ff', name: 'Yo' },
      { url: '', color: '#00ff88', name: 'Pareja' }
    ];
  }

  function saveSettings() {
    var feeds = [
      {
        url:   elFeed1Url.value.trim(),
        color: elFeed1Color.value,
        name:  (elSettingsName0 && elSettingsName0.value.trim()) || elFeed1Name.value.trim() || 'Yo'
      },
      {
        url:   elFeed2Url.value.trim(),
        color: elFeed2Color.value,
        name:  (elSettingsName1 && elSettingsName1.value.trim()) || elFeed2Name.value.trim() || 'Pareja'
      }
    ];
    try {
      localStorage.setItem('feeds', JSON.stringify(feeds));
    } catch(e) {
      console.warn('[Settings] localStorage error:', e);
    }
    if (elSettingsSave) {
      elSettingsSave.textContent = '\u2713 GUARDADO';
      elSettingsSave.disabled = true;
    }
    /* ── Save manual location ── */
    var latVal = elSettingsLat ? elSettingsLat.value.trim() : '';
    var lonVal = elSettingsLon ? elSettingsLon.value.trim() : '';
    if (latVal !== '' && lonVal !== '') {
      var lat = parseFloat(latVal);
      var lon = parseFloat(lonVal);
      if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
        saveManualLocation(lat, lon);
        startWeatherWithCoords(lat, lon);
        updateLocationStatus('manual');
      }
    }

    setTimeout(function() {
      if (elSettingsSave) {
        elSettingsSave.textContent = 'GUARDAR';
        elSettingsSave.disabled = false;
      }
      closeSettings();
      refreshCalendars();
    }, 1200);
  }

  function populateSettingsUI() {
    var feeds = loadSettings();
    var f1 = feeds[0] || DEFAULT_FEEDS[0];
    var f2 = feeds[1] || DEFAULT_FEEDS[1];
    elFeed1Url.value   = f1.url   || '';
    elFeed1Color.value = f1.color || '#00f0ff';
    elFeed1Name.value  = f1.name  || 'Yo';
    elFeed2Url.value   = f2.url   || '';
    elFeed2Color.value = f2.color || '#00ff88';
    elFeed2Name.value  = f2.name  || 'Pareja';
    if (elSettingsName0) { elSettingsName0.value = f1.name || 'Yo'; }
    if (elSettingsName1) { elSettingsName1.value = f2.name || 'Pareja'; }

    /* ── Populate manual location ── */
    var manual = loadManualLocation();
    if (manual && elSettingsLat && elSettingsLon) {
      elSettingsLat.value = manual.lat;
      elSettingsLon.value = manual.lon;
    }
  }

  function openSettings() {
    populateSettingsUI();
    // iOS 12 compat: avoid classList.toggle, use explicit add/remove
    if (elSettingsPanel.className.indexOf('is-open') === -1) {
      elSettingsPanel.className = elSettingsPanel.className + ' is-open';
    }
    if (elSettingsOvl.className.indexOf('is-open') === -1) {
      elSettingsOvl.className = elSettingsOvl.className + ' is-open';
    }
  }

  function closeSettings() {
    elSettingsPanel.className = elSettingsPanel.className.replace(' is-open', '').replace('is-open', '');
    elSettingsOvl.className   = elSettingsOvl.className.replace(' is-open', '').replace('is-open', '');
  }

  elSettingsBtn.addEventListener('click', openSettings);
  elSettingsClose.addEventListener('click', closeSettings);
  elSettingsOvl.addEventListener('click', closeSettings);
  elSettingsSave.addEventListener('click', saveSettings);

  /* ── Collapsible settings sections ─────────────────────── */
  (function initCollapsibleSections() {
    var sections = elSettingsPanel.querySelectorAll('.settings-section');
    var stored = null;
    try { stored = JSON.parse(localStorage.getItem('settings-collapsed') || '{}'); } catch(e) { stored = {}; }

    for (var i = 0; i < sections.length; i++) {
      var label = sections[i].querySelector('.settings-section-label');
      if (!label) continue;
      var key = label.textContent.trim().replace(/\s+/g, '-').toLowerCase();
      sections[i].setAttribute('data-section-key', key);

      if (stored[key]) {
        sections[i].className = sections[i].className + ' is-collapsed';
      }

      (function(section, sKey) {
        section.querySelector('.settings-section-label').addEventListener('click', function(e) {
          if (e.target.tagName === 'INPUT') return; /* don't collapse when editing inline input */
          var isCollapsed = section.className.indexOf('is-collapsed') !== -1;
          if (isCollapsed) {
            section.className = section.className.replace(' is-collapsed', '').replace('is-collapsed', '');
          } else {
            section.className = section.className + ' is-collapsed';
          }
          /* persist state */
          var state = {};
          try { state = JSON.parse(localStorage.getItem('settings-collapsed') || '{}'); } catch(e2) { state = {}; }
          state[sKey] = !isCollapsed;
          try { localStorage.setItem('settings-collapsed', JSON.stringify(state)); } catch(e2) {}
        });
      })(sections[i], key);
    }
  })();

  /* ── Name change handlers (calendar panel + settings) ──── */
  function saveNameChanges() {
    var feeds = loadSettings();
    if (elCpNames[0]) { feeds[0].name = elCpNames[0].value.trim() || 'Yo'; }
    if (elCpNames[1]) { feeds[1].name = elCpNames[1].value.trim() || 'Pareja'; }
    if (elSettingsName0) { feeds[0].name = elSettingsName0.value.trim() || 'Yo'; }
    if (elSettingsName1) { feeds[1].name = elSettingsName1.value.trim() || 'Pareja'; }
    try {
      localStorage.setItem('feeds', JSON.stringify(feeds));
    } catch(e) {
      console.warn('[Settings] localStorage error:', e);
    }
    renderCalendarPanel();
    if (elSettingsName0) { elSettingsName0.value = feeds[0].name; }
    if (elSettingsName1) { elSettingsName1.value = feeds[1].name; }
    if (elCpNames[0]) { elCpNames[0].value = feeds[0].name; }
    if (elCpNames[1]) { elCpNames[1].value = feeds[1].name; }
  }

  if (elCpNames[0]) {
    elCpNames[0].addEventListener('change', saveNameChanges);
    elCpNames[0].addEventListener('blur', saveNameChanges);
    elCpNames[0].addEventListener('click', function(e) { e.stopPropagation(); });
  }
  if (elCpNames[1]) {
    elCpNames[1].addEventListener('change', saveNameChanges);
    elCpNames[1].addEventListener('blur', saveNameChanges);
    elCpNames[1].addEventListener('click', function(e) { e.stopPropagation(); });
  }
  if (elSettingsName0) {
    elSettingsName0.addEventListener('change', saveNameChanges);
    elSettingsName0.addEventListener('blur', saveNameChanges);
  }
  if (elSettingsName1) {
    elSettingsName1.addEventListener('change', saveNameChanges);
    elSettingsName1.addEventListener('blur', saveNameChanges);
  }

  /* ── Color Theme ──────────────────────────────────── */
  var COLOR_THEMES = ['amber', 'green', 'blue', 'red', 'white'];
  var COLOR_HEX    = { amber: '#c8a84b', green: '#39ff14', blue: '#00d4ff', red: '#ff3c28', white: '#aaaaaa' };

  function applyColor(colorName) {
    document.body.setAttribute('data-color', colorName);
    try { localStorage.setItem('clock-color', colorName); } catch(e) {}
    var fill = COLOR_HEX[colorName] || '#c8a84b';
    var circle = document.getElementById('btn-color-fill');
    if (circle) { circle.setAttribute('fill', fill); }
  }

  var elColorPicker = document.getElementById('color-picker');

  function syncColorSwatches() {
    var current = document.body.getAttribute('data-color') || 'amber';
    if (!elColorPicker) return;
    var swatches = elColorPicker.querySelectorAll('.color-swatch');
    for (var i = 0; i < swatches.length; i++) {
      swatches[i].classList.toggle('is-active', swatches[i].dataset.color === current);
    }
  }

  function toggleColorPicker() {
    if (!elColorPicker) return;
    elColorPicker.classList.toggle('cp-open');
    syncColorSwatches();
  }

  if (elColorBtn) { elColorBtn.addEventListener('click', toggleColorPicker); }

  if (elColorPicker) {
    elColorPicker.addEventListener('click', function(e) {
      var swatch = e.target.closest('.color-swatch');
      if (!swatch) return;
      applyColor(swatch.dataset.color);
      syncColorSwatches();
      elColorPicker.classList.remove('cp-open');
    });
  }

  document.addEventListener('click', function(e) {
    if (!elColorPicker || !elColorPicker.classList.contains('cp-open')) return;
    if (!elColorPicker.contains(e.target) && !(elColorBtn && elColorBtn.contains(e.target))) {
      elColorPicker.classList.remove('cp-open');
    }
  });

  /* Restore persisted theme — always minimalism */
  document.body.setAttribute('data-theme', 'minimalism');

  (function initColor() {
    var saved = null;
    try { saved = localStorage.getItem('clock-color'); } catch(e) {}
    if (saved && COLOR_THEMES.indexOf(saved) !== -1) {
      applyColor(saved);
    } else {
      applyColor('amber');
    }
  })();

  /* ── Minimalism options: seconds toggle + size ────────────── */
  function syncGroupBtns(group, attrName, val) {
    if (!group) return;
    var btns = group.querySelectorAll('.settings-group-btn');
    for (var i = 0; i < btns.length; i++) {
      var active = btns[i].getAttribute(attrName) === val;
      btns[i].className = active
        ? btns[i].className.replace('is-active', '').trim() + ' is-active'
        : btns[i].className.replace(/\s*is-active/g, '');
    }
  }

  function applyMinimalismSeconds(val) {
    document.body.setAttribute('data-minimalism-seconds', val);
    try { localStorage.setItem('minimalism-seconds', val); } catch(e) {}
    syncGroupBtns(elMinimalismSecondsGroup, 'data-seconds', val);
  }

  function applyMinimalismSize(val) {
    document.body.setAttribute('data-minimalism-size', val);
    try { localStorage.setItem('minimalism-size', val); } catch(e) {}
    syncGroupBtns(elMinimalismSizeGroup, 'data-size', val);
  }

  if (elMinimalismSecondsGroup) {
    elMinimalismSecondsGroup.addEventListener('click', function(e) {
      var btn = e.target;
      while (btn && btn !== elMinimalismSecondsGroup) {
        if (btn.getAttribute('data-seconds')) { break; }
        btn = btn.parentNode;
      }
      var val = btn && btn.getAttribute('data-seconds');
      if (val) { applyMinimalismSeconds(val); }
    });
  }

  if (elMinimalismSizeGroup) {
    elMinimalismSizeGroup.addEventListener('click', function(e) {
      var btn = e.target;
      while (btn && btn !== elMinimalismSizeGroup) {
        if (btn.getAttribute('data-size')) { break; }
        btn = btn.parentNode;
      }
      var val = btn && btn.getAttribute('data-size');
      if (val) { applyMinimalismSize(val); }
    });
  }

  (function initMinimalismOptions() {
    var sec = null, sz = null;
    try {
      sec = localStorage.getItem('minimalism-seconds');
      sz  = localStorage.getItem('minimalism-size');
    } catch(e) {}
    applyMinimalismSeconds(sec === 'hide' ? 'hide' : 'show');
    applyMinimalismSize(sz === 'small' || sz === 'large' ? sz : 'medium');
  })();

  /* ── Initial calendar load ─────────────────────────── */
  refreshCalendars();

  /* ── Periodic calendar refresh (near-real-time: every 60 s) ── */
  calendarTimer = setInterval(refreshCalendars, 60 * 1000);

  /* ── Calendar Slide-up Panel ───────────────────────── */
  function openCalPanel() {
    /* Dismiss the swipe hint on first use */
    var elCalHint = document.getElementById('cal-hint');
    if (elCalHint && elCalHint.style.display !== 'none') {
      elCalHint.style.display = 'none';
      try { localStorage.setItem('cal-hint-dismissed', '1'); } catch(e) {}
    }
    renderCalendarPanel();
    /* Auto-expand both sections */
    for (var i = 0; i < 2; i++) {
      var sec = elCpSections[i];
      if (sec && sec.className.indexOf('is-open') === -1) {
        sec.className = sec.className + ' is-open';
      }
    }
    if (elCalPanel && elCalPanel.className.indexOf('cp-open') === -1) {
      elCalPanel.className = elCalPanel.className + ' cp-open';
    }
    if (elCalPanelOvl && elCalPanelOvl.className.indexOf('cp-open') === -1) {
      elCalPanelOvl.className = elCalPanelOvl.className + ' cp-open';
    }
    /* Hide badge */
    if (elCalTodayBadge) {
      elCalTodayBadge.className = (elCalTodayBadge.className + ' is-hidden').trim();
    }
  }

  function closeCalPanel() {
    if (elCalPanel)    { elCalPanel.className    = elCalPanel.className.replace(/\s*cp-open/g, ''); }
    if (elCalPanelOvl) { elCalPanelOvl.className = elCalPanelOvl.className.replace(/\s*cp-open/g, ''); }
    /* Show badge */
    if (elCalTodayBadge) {
      elCalTodayBadge.className = elCalTodayBadge.className.replace(/\s*is-hidden/g, '').trim();
    }
  }

  /* Overlay tap → close */
  if (elCalPanelOvl) { elCalPanelOvl.addEventListener('click', closeCalPanel); }

  /* Drag handle tap → toggle */
  var _handleTapTarget = elCalHandleRow || elCalPanelDrag;
  if (_handleTapTarget) {
    _handleTapTarget.addEventListener('click', function() {
      if (elCalPanel && elCalPanel.className.indexOf('cp-open') !== -1) {
        closeCalPanel();
      } else {
        openCalPanel();
      }
    });
  }

  /* ── Accordion toggles ─────────────────────────────── */
  (function initAccordion() {
    for (var i = 0; i < 2; i++) {
      (function(idx) {
        var hdr = elCpHeaders[idx];
        if (!hdr) return;
        hdr.addEventListener('click', function() {
          var sec = elCpSections[idx];
          if (!sec) return;
          if (sec.className.indexOf('is-open') === -1) {
            sec.className = sec.className + ' is-open';
          } else {
            sec.className = sec.className.replace(/\s*is-open/g, '');
          }
        });
      })(i);
    }
  })();

  /* ── Swipe-up gesture to open calendar panel ──────── */
  (function initSwipeGesture() {
    var PEEK_PX     = 44;   /* px always visible when collapsed */
    var DISMISS_VEL = 0.4;  /* px/ms — fast enough flick to dismiss */
    var DISMISS_PX  = 80;   /* px dragged down past open position to dismiss */

    /* ── Panel drag state ── */
    var dragActive  = false;
    var dragStartY  = 0;
    var dragLastY   = 0;
    var dragLastT   = 0;
    var dragVelY    = 0;  /* px/ms, positive = downward */
    var panelOpenH  = 0;  /* panel height at drag-start */

    function isPanelOpen() {
      return elCalPanel && elCalPanel.className.indexOf('cp-open') !== -1;
    }

    function getPanelHeight() {
      return elCalPanel ? elCalPanel.offsetHeight : 0;
    }

    function setTranslate(py) {
      /* Clamp: can only drag downward from open position */
      var h    = getPanelHeight();
      var minY = 0;                      /* fully open   */
      var maxY = h - PEEK_PX;            /* peeking only */
      py = Math.max(minY, Math.min(maxY, py));
      elCalPanel.style.webkitTransition = 'none';
      elCalPanel.style.transition       = 'none';
      elCalPanel.style.webkitTransform  = 'translateY(' + py + 'px)';
      elCalPanel.style.transform        = 'translateY(' + py + 'px)';
      /* Show background only when meaningfully extended */
      var ratio = py / maxY;   /* 0 = open, 1 = collapsed */
      elCalPanel.style.background  = ratio < 0.5 ? '#0c0c0c' : 'transparent';
      elCalPanel.style.borderTop   = ratio < 0.5 ? '1px solid rgba(255,255,255,0.09)' : 'none';
    }

    function restoreTransition() {
      elCalPanel.style.webkitTransition = '';
      elCalPanel.style.transition       = '';
      elCalPanel.style.webkitTransform  = '';
      elCalPanel.style.transform        = '';
      elCalPanel.style.background       = '';
      elCalPanel.style.borderTop        = '';
    }

    /* ── touchstart on the panel ── */
    if (elCalPanel) {
      elCalPanel.addEventListener('touchstart', function(e) {
        if (!isPanelOpen()) return;  /* only drag when open */
        /* skip if touch started on a scrollable list that has content */
        var inner = elCalPanel.querySelector('#cal-panel-inner');
        if (inner && inner.contains(e.target) && inner.scrollTop > 0) return;
        dragActive  = true;
        dragStartY  = e.touches[0].clientY;
        dragLastY   = dragStartY;
        dragLastT   = Date.now();
        dragVelY    = 0;
        panelOpenH  = getPanelHeight();
        e.stopPropagation();
      }, false);

      elCalPanel.addEventListener('touchmove', function(e) {
        if (!dragActive) return;
        var now = Date.now();
        var y   = e.touches[0].clientY;
        var dt  = now - dragLastT || 1;
        dragVelY  = (y - dragLastY) / dt;
        dragLastY = y;
        dragLastT = now;
        var dy    = y - dragStartY;   /* positive = dragging down */
        if (dy < 0) { dy = 0; }      /* don't allow dragging up beyond open */
        setTranslate(dy);
        e.preventDefault();
      }, { passive: false });

      elCalPanel.addEventListener('touchend', function(e) {
        if (!dragActive) return;
        dragActive = false;
        var dy = dragLastY - dragStartY;
        restoreTransition();
        /* dismiss if dragged far enough OR flicked down fast */
        if (dy > DISMISS_PX || dragVelY > DISMISS_VEL) {
          closeCalPanel();
        } else {
          /* snap back open */
          openCalPanel();
        }
      }, false);
    }

    /* ── Global touch: swipe-up from outside panel to open ── */
    var globStartY = 0;
    var globStartX = 0;
    var globTarget = null;

    document.addEventListener('touchstart', function(e) {
      globStartY = e.touches[0].clientY;
      globStartX = e.touches[0].clientX;
      globTarget = e.target;
    }, false);

    document.addEventListener('touchend', function(e) {
      /* Ignore if settings panel is open */
      if (elSettingsPanel && elSettingsPanel.className.indexOf('is-open') !== -1) return;
      /* Ignore touches that started inside the panel */
      if (elCalPanel && elCalPanel.contains(globTarget)) return;

      var dy = globStartY - e.changedTouches[0].clientY;  /* positive = upward */
      var dx = Math.abs(globStartX - e.changedTouches[0].clientX);

      /* Open: swipe-up from bottom half of screen */
      if (!isPanelOpen() && dy > 55 && dx < 80 && globStartY > window.innerHeight * 0.55) {
        openCalPanel();
      }
    }, false);
  })();

  /* ── Cal hint: hide on load if already dismissed ────── */
  (function initCalHint() {
    var dismissed = null;
    try { dismissed = localStorage.getItem('cal-hint-dismissed'); } catch(e) {}
    if (dismissed) {
      var elCalHint = document.getElementById('cal-hint');
      if (elCalHint) { elCalHint.style.display = 'none'; }
    }
  })();

  /* ── Page Visibility: pause when hidden, resume + refresh when visible ── */
  document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
      clockPaused = true;
      if (weatherTimer)  { clearInterval(weatherTimer);  weatherTimer  = null; }
      if (calendarTimer) { clearInterval(calendarTimer); calendarTimer = null; }
    } else {
      clockPaused = false;
      requestAnimationFrame(updateClock);
      if (lastLat !== null) { fetchWeather(lastLat, lastLon); }
      refreshCalendars();
      if (weatherTimer) { clearInterval(weatherTimer); }
      weatherTimer = setInterval(function() {
        if (lastLat !== null) { fetchWeather(lastLat, lastLon); }
      }, 30 * 60 * 1000);
      if (calendarTimer) { clearInterval(calendarTimer); }
      calendarTimer = setInterval(refreshCalendars, 60 * 1000);
    }
  });

})();
