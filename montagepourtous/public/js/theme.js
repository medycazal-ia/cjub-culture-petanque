// Thème « sang » (par défaut) ou « classique », mémorisé dans le navigateur. À charger dans <head>.
(function () {
  var t = 'sang'; try { var s = localStorage.getItem('mpt-theme'); if (s === 'sang' || s === 'classique') t = s; } catch (e) {}
  document.documentElement.setAttribute('data-theme', t);
  document.addEventListener('DOMContentLoaded', function () {
    var b = document.querySelectorAll('[data-theme-toggle]');
    function maj() { var c = document.documentElement.getAttribute('data-theme'); b.forEach(function (x) { x.textContent = c === 'sang' ? '☀️ Thème classique' : '🌙 Thème sang'; }); }
    b.forEach(function (x) { x.addEventListener('click', function () { var n = document.documentElement.getAttribute('data-theme') === 'sang' ? 'classique' : 'sang'; document.documentElement.setAttribute('data-theme', n); try { localStorage.setItem('mpt-theme', n); } catch (e) {} }); });
    new MutationObserver(maj).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] }); maj();
  });
})();
