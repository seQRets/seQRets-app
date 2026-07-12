// Service-worker registration (production only — the dev server renders an
// inline unregister/heal script instead; see src/app/layout.tsx).
//
// This lives in a static external file rather than an inline <script> so the
// production CSP can eventually drop script-src 'unsafe-inline' (security
// item 1.3): external same-origin scripts are covered by 'self' and need no
// per-build hash.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(function (reg) {
      reg.addEventListener('updatefound', function () {
        var newSW = reg.installing;
        if (!newSW) return;
        newSW.addEventListener('statechange', function () {
          if (newSW.state === 'activated' && navigator.serviceWorker.controller) {
            var d = document.createElement('div');
            d.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);z-index:40;background:#231f20;color:#fff;padding:12px 20px;border-radius:8px;font-size:14px;font-family:system-ui,sans-serif;box-shadow:0 4px 12px rgba(0,0,0,.3);display:flex;align-items:center;gap:12px';
            d.innerHTML = 'A new version is available <button style="background:#f59e0b;color:#231f20;border:none;padding:4px 12px;border-radius:4px;font-weight:600;cursor:pointer;font-size:13px" onclick="window.location.reload()">Refresh</button>';
            document.body.appendChild(d);
          }
        });
      });
    }).catch(function () {});
  });
}
