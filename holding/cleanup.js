// Removes everything the retired web app left in this browser: its service
// worker (the offline copy), its caches, and its saved settings (which could
// include a Gemini API key the user chose to remember). sw.js and the
// Clear-Site-Data header in _headers do the same job; this is the fallback
// for browsers that support neither path fully.
(function () {
  try { localStorage.clear(); } catch (e) {}
  try { sessionStorage.clear(); } catch (e) {}
  if ('caches' in window) {
    caches.keys().then(function (keys) {
      keys.forEach(function (key) { caches.delete(key); });
    }).catch(function () {});
  }
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(function (regs) {
      regs.forEach(function (reg) { reg.unregister(); });
    }).catch(function () {});
  }
})();
