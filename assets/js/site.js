/* Click-through for cards and buttons that carry data-href. */
document.addEventListener('click', function (e) {
  var el = e.target.closest('[data-href]');
  if (!el || e.defaultPrevented) return;
  var a = e.target.closest('a[href]');
  if (a && a !== el) return;            // let inner real links win
  e.preventDefault();
  location.href = el.getAttribute('data-href');
});
document.querySelectorAll('[data-href]').forEach(function (el) { el.style.cursor = 'pointer'; });
/* Keyboard access for [data-href]: focusable, link role, Enter/Space follow it. */
document.querySelectorAll('[data-href]').forEach(function (el) {
  if (!el.matches('a[href],button,input,select,textarea')) {
    if (!el.hasAttribute('tabindex')) el.tabIndex = 0;
    if (!el.hasAttribute('role')) el.setAttribute('role', 'link');
  }
});
document.addEventListener('keydown', function (e) {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  var el = e.target.closest && e.target.closest('[data-href]');
  if (!el || el !== e.target || e.defaultPrevented || el.matches('a[href],button,input,select,textarea')) return;
  e.preventDefault();
  location.href = el.getAttribute('data-href');
});
