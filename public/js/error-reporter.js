/**
 * Phase 5 — Browser-side error reporter.
 *
 * Forwards `window.onerror` and `unhandledrejection` events to the backend
 * (`POST /api/log/client-error`), where they are logged and (if configured)
 * forwarded to Sentry. No external dependency.
 *
 * Policies:
 *   - Throttled (max 1 per second per page) — prevents flood loops.
 *   - Capped (max 20 reports per page lifetime).
 *   - Best-effort: failures here are swallowed (never crash the app).
 *   - Skips errors clearly originating from third-party scripts (CORS errors).
 */
(function () {
  'use strict';
  if (typeof window === 'undefined') return;

  var ENDPOINT = '/api/log/client-error';
  var MAX_REPORTS = 20;
  var MIN_INTERVAL_MS = 1000;

  var sent = 0;
  var lastSentAt = 0;

  function safeStr(v, max) {
    try {
      if (v == null) return '';
      var s = (typeof v === 'string') ? v : String(v);
      return s.length > max ? s.slice(0, max) : s;
    } catch (_) { return ''; }
  }

  function send(payload) {
    if (sent >= MAX_REPORTS) return;
    var now = Date.now();
    if (now - lastSentAt < MIN_INTERVAL_MS) return;
    sent += 1;
    lastSentAt = now;
    try {
      var body = JSON.stringify(payload);
      if (navigator && typeof navigator.sendBeacon === 'function') {
        var blob = new Blob([body], { type: 'application/json' });
        navigator.sendBeacon(ENDPOINT, blob);
        return;
      }
      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body,
        credentials: 'same-origin',
        keepalive: true
      }).catch(function () { /* swallow */ });
    } catch (_) { /* swallow */ }
  }

  window.addEventListener('error', function (ev) {
    if (!ev) return;
    var msg = safeStr(ev.message || (ev.error && ev.error.message), 500);
    if (!msg) return;
    if (msg === 'Script error.' || msg === 'Script error') return;
    send({
      message: msg,
      url: safeStr(ev.filename || (window.location && window.location.href), 500),
      lineno: ev.lineno || null,
      colno: ev.colno || null,
      stack: safeStr(ev.error && ev.error.stack, 4000),
      buildId: safeStr(window.__BUILD_ID__, 50)
    });
  });

  window.addEventListener('unhandledrejection', function (ev) {
    if (!ev) return;
    var reason = ev.reason;
    var msg = '';
    var stack = '';
    if (reason instanceof Error) {
      msg = safeStr(reason.message || reason.name, 500);
      stack = safeStr(reason.stack, 4000);
    } else {
      msg = safeStr(reason, 500);
    }
    if (!msg) msg = 'unhandledrejection';
    send({
      message: 'unhandledrejection: ' + msg,
      url: safeStr(window.location && window.location.href, 500),
      stack: stack,
      buildId: safeStr(window.__BUILD_ID__, 50)
    });
  });
})();
