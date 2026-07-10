let _waitUntil = null;
try {
  // Available in the Vercel serverless runtime — keeps the function alive until
  // the promise settles, so background work (emails) isn't frozen after the
  // response is sent.
  _waitUntil = require('@vercel/functions').waitUntil;
} catch (_) {
  /* not on Vercel (local dev) — the process stays alive anyway */
}

function background(promise) {
  const p = Promise.resolve(promise).catch((e) =>
    console.error('[background]', e && e.message ? e.message : e)
  );
  if (_waitUntil) {
    try {
      _waitUntil(p);
    } catch (_) {
      /* ignore */
    }
  }
  return p;
}

module.exports = { background };
