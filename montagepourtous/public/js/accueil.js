(function () {
  var $ = function (id) { return document.getElementById(id); };
  // décor : barre à LED animée
  var d = $('deco'), n = 48, segs = [];
  for (var i = 0; i < n; i++) { var s = document.createElement('i'); s.style.color = i / n < 0.6 ? '#37ff7a' : i / n < 0.85 ? '#ffd23d' : '#ff3b4a'; d.appendChild(s); segs.push(s); }
  var reduit = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function anim(t) { var v = reduit ? 0.7 : 0.55 + 0.4 * Math.sin(t / 700) * Math.sin(t / 1900 + 1); var m = Math.round(v * n); segs.forEach(function (s, i) { s.classList.toggle('on', i < m); }); if (!reduit) requestAnimationFrame(anim); }
  requestAnimationFrame(anim);

  function onglet(ins) { $('f-ins').hidden = !ins; $('f-con').hidden = ins; $('t-ins').setAttribute('aria-selected', ins); $('t-con').setAttribute('aria-selected', !ins); }
  $('t-ins').onclick = function () { onglet(true); }; $('t-con').onclick = function () { onglet(false); };
  if (/connexion=1/.test(location.search)) onglet(false);
  function post(url, corps, err, btn) {
    err.textContent = ''; btn.disabled = true;
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'same-origin', body: JSON.stringify(corps) })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.erreur || 'Erreur'); return j; }); })
      .then(function () { location.href = '/app/'; })
      .catch(function (e) { err.textContent = e.message; btn.disabled = false; });
  }
  $('f-ins').onsubmit = function (e) {
    e.preventDefault(); var err = $('e-ins'), btn = e.target.querySelector('button[type=submit]');
    var c = { prenom: $('i-prenom').value, nom: $('i-nom').value, email: $('i-email').value, mdp: $('i-mdp').value, consentement: $('i-cons').checked, nouvelles: $('i-news').checked, telephone: $('i-tel').value };
    if (!c.prenom.trim() || !c.nom.trim() || !c.email.trim() || !c.mdp) { err.textContent = 'Prénom, nom, e-mail et mot de passe sont obligatoires.'; return; }
    post('/api/inscription', c, err, btn);
  };
  $('f-con').onsubmit = function (e) { e.preventDefault(); post('/api/connexion', { email: $('c-email').value, mdp: $('c-mdp').value }, $('e-con'), e.target.querySelector('button[type=submit]')); };
  fetch('/api/moi', { credentials: 'same-origin' }).then(function (r) { if (r.ok) { var a = document.createElement('p'); a.innerHTML = 'Vous êtes déjà connecté·e : <a href="/app/">ouvrir mes outils</a>'; $('auth').prepend(a); } }).catch(function () {});
})();

(function () {
  var ul = document.getElementById('tarifs'); if (!ul) return;
  function eu(x) { return String(x).replace('.', ',') + ' €'; }
  fetch('/api/tarifs').then(function (r) { return r.json(); }).then(function (t) {
    var l = [
      t.joursGratuits + ' premiers jours d\'utilisation gratuits.',
      'Ensuite, ' + eu(t.prixJour) + ' par période de 24 h d\'utilisation, jusqu\'à ' + t.joursPayantsParCycle + ' jours d\'usage.',
      'Les jours d\'usage suivants sont gratuits jusqu\'au jour ' + t.dureeCycle + ', puis le cycle recommence (un message vous prévient 3 jours avant).',
      'Option avantageuse : abonnement annuel ' + eu(t.prixAnnuel) + ', payable en une seule fois, usage illimité pendant 1 an.'
    ];
    ul.innerHTML = ''; l.forEach(function (x) { var li = document.createElement('li'); li.textContent = x; ul.appendChild(li); });
    if (t.lienAnnuel) { var li2 = document.createElement('li'), a = document.createElement('a'); a.href = t.lienAnnuel; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = '⭐ Payer l\'abonnement annuel ↗'; a.title = 'S\'ouvre dans un nouvel onglet'; li2.appendChild(a); ul.appendChild(li2); }
  }).catch(function () { ul.innerHTML = ''; });
})();
