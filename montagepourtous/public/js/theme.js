// Thème « sang » (par défaut) ou « classique », mémorisé dans le navigateur. À charger dans <head>.
(function () {
  var t = 'sang'; try { var s = localStorage.getItem('mpt-theme'); if (s === 'sang' || s === 'classique') t = s; } catch (e) {}
  document.documentElement.setAttribute('data-theme', t);
  if (!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)) {
    var att = false; window.addEventListener('scroll', function () { if (att) return; att = true; requestAnimationFrame(function () { document.body.style.setProperty('--defil', (-window.scrollY) + 'px'); att = false; }); }, { passive: true });
  }
  document.addEventListener('DOMContentLoaded', function () {
    var b = document.querySelectorAll('[data-theme-toggle]');
    function maj() { var c = document.documentElement.getAttribute('data-theme'); b.forEach(function (x) { x.textContent = c === 'sang' ? '☀️ Thème classique' : '🌙 Thème sang'; }); }
    b.forEach(function (x) { x.addEventListener('click', function () { var n = document.documentElement.getAttribute('data-theme') === 'sang' ? 'classique' : 'sang'; document.documentElement.setAttribute('data-theme', n); try { localStorage.setItem('mpt-theme', n); } catch (e) {} }); });
    new MutationObserver(maj).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] }); maj();
  });
  // Pellicule du cadre : défile pendant la lecture d'un montage, avec un bouton pause (mémorisé).
  var racine = document.documentElement, lecture = false, pref = true;
  try { var d = localStorage.getItem('mpt-defile'); pref = d ? d === 'on' : !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) {}
  function majDefile() { racine.classList.toggle('defile-off', !pref); racine.classList.toggle('defile', pref && lecture); document.dispatchEvent(new CustomEvent('mpt-defile-etat', { detail: { actif: pref } })); }
  window.addEventListener('mpt-lecture', function (e) { lecture = !!(e.detail && e.detail.en); majDefile(); });
  document.addEventListener('mpt-defile-bascule', function () { pref = !pref; try { localStorage.setItem('mpt-defile', pref ? 'on' : 'off'); } catch (e) {} majDefile(); });
  majDefile();
})();
