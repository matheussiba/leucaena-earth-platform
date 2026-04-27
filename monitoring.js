/**
 * Phase 5 — Lightweight Sentry wrapper.
 *
 * Goals:
 *   - Optional dependency: app boots fine if `SENTRY_DSN` is empty (or `@sentry/node` is missing).
 *   - PII conscious: drops Authorization header and login/password bodies before sending.
 *   - Clean exports: `init()`, `captureException()`, `expressRequestHandler()`, `expressErrorHandler()`.
 *
 * Recommended env vars:
 *   SENTRY_DSN                — leave empty to disable.
 *   SENTRY_ENVIRONMENT        — 'production' / 'staging' / 'development' (defaults to NODE_ENV).
 *   SENTRY_TRACES_SAMPLE_RATE — float 0..1 (default 0 — events only, no perf traces; cheap).
 *   SENTRY_RELEASE            — optional release id (e.g. git SHA).
 */

let _Sentry = null;
let _enabled = false;

const SENSITIVE_HEADERS = new Set(['authorization', 'cookie', 'set-cookie', 'x-api-key']);
const SENSITIVE_BODY_KEYS = new Set([
  'password', 'pwd', 'pass', 'currentPassword', 'newPassword',
  'token', 'apiKey', 'api_key', 'secret', 'accessToken', 'refreshToken'
]);

function _scrubBody(body) {
  if (!body || typeof body !== 'object') return body;
  const clean = {};
  for (const [k, v] of Object.entries(body)) {
    if (SENSITIVE_BODY_KEYS.has(k)) clean[k] = '[Filtered]';
    else if (v && typeof v === 'object') clean[k] = _scrubBody(v);
    else clean[k] = v;
  }
  return clean;
}

function _beforeSend(event) {
  try {
    if (event && event.request) {
      if (event.request.headers) {
        for (const h of Object.keys(event.request.headers)) {
          if (SENSITIVE_HEADERS.has(h.toLowerCase())) {
            event.request.headers[h] = '[Filtered]';
          }
        }
      }
      if (event.request.data) {
        event.request.data = _scrubBody(event.request.data);
      }
      if (event.request.cookies) event.request.cookies = '[Filtered]';
    }
    if (event.user) {
      // Keep username only — drop email/ip even if Sentry tries to attach them.
      event.user = event.user.username ? { username: event.user.username } : undefined;
    }
  } catch (_) { /* swallow scrub errors — always let event through */ }
  return event;
}

function init() {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    _enabled = false;
    return false;
  }
  try {
    _Sentry = require('@sentry/node');
  } catch (e) {
    console.warn('[monitoring] SENTRY_DSN set but @sentry/node not installed — skipping.');
    _enabled = false;
    return false;
  }
  try {
    _Sentry.init({
      dsn,
      environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development',
      release: process.env.SENTRY_RELEASE || undefined,
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0'),
      sendDefaultPii: false,
      beforeSend: _beforeSend
    });
    _enabled = true;
    console.log('[monitoring] Sentry initialized (env=' + (process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || 'development') + ')');
    return true;
  } catch (e) {
    console.warn('[monitoring] Sentry init failed:', e && e.message);
    _enabled = false;
    return false;
  }
}

function isEnabled() { return _enabled; }

function captureException(err, context) {
  if (!_enabled || !_Sentry) return;
  try {
    if (context) {
      _Sentry.withScope(scope => {
        for (const [k, v] of Object.entries(context)) scope.setExtra(k, v);
        _Sentry.captureException(err);
      });
    } else {
      _Sentry.captureException(err);
    }
  } catch (_) { /* never let monitoring crash the request */ }
}

function captureMessage(message, level = 'info', context) {
  if (!_enabled || !_Sentry) return;
  try {
    if (context) {
      _Sentry.withScope(scope => {
        for (const [k, v] of Object.entries(context)) scope.setExtra(k, v);
        _Sentry.captureMessage(message, level);
      });
    } else {
      _Sentry.captureMessage(message, level);
    }
  } catch (_) { /* swallow */ }
}

/**
 * Express middleware — runs before routes, attaches request metadata to scope.
 * No-op if disabled.
 */
function expressRequestHandler() {
  return (req, _res, next) => {
    if (!_enabled || !_Sentry) return next();
    try {
      _Sentry.getCurrentScope().setContext('request', {
        method: req.method,
        url: req.originalUrl || req.url,
        ip: '[Filtered]'
      });
      if (req.username) _Sentry.getCurrentScope().setUser({ username: req.username });
    } catch (_) { /* swallow */ }
    next();
  };
}

/**
 * Express error-handler middleware — must come AFTER routes, BEFORE the default handler.
 * Captures the exception then forwards to next(err) so Express still responds.
 */
function expressErrorHandler() {
  return (err, req, res, next) => {
    captureException(err, {
      method: req.method,
      url: req.originalUrl || req.url,
      username: req.username || null,
      statusCode: res.statusCode
    });
    next(err);
  };
}

/**
 * Install global handlers for uncaught exceptions / unhandled rejections.
 * Logs always; forwards to Sentry only if enabled.
 */
function installGlobalHandlers() {
  process.on('uncaughtException', (err) => {
    console.error('[uncaughtException]', err);
    captureException(err, { kind: 'uncaughtException' });
  });
  process.on('unhandledRejection', (reason) => {
    console.error('[unhandledRejection]', reason);
    const err = reason instanceof Error ? reason : new Error(String(reason));
    captureException(err, { kind: 'unhandledRejection' });
  });
}

module.exports = {
  init,
  isEnabled,
  captureException,
  captureMessage,
  expressRequestHandler,
  expressErrorHandler,
  installGlobalHandlers
};
