// En-tête commun des pages d'outils : nom de l'utilisateur, déconnexion, compte.
(function () {
  var $ = function (id) { return document.getElementById(id); };
  function api(m, u, b) { return fetch(u, { method: m, credentials: 'same-origin', headers: b ? { 'Content-Type': 'application/json' } : {}, body: b ? JSON.stringify(b) : undefined }).then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { if (r.status === 401) { location.href = '/?connexion=1'; throw new Error('401'); } return j; }); }); }
  api('GET', '/api/moi').then(function (j) {
    if ($('qui') && j.utilisateur) $('qui').textContent = j.utilisateur.prenom + ' ' + j.utilisateur.nom;
    if ($('bonjour') && j.utilisateur) $('bonjour').textContent = 'Bonjour ' + j.utilisateur.prenom + ' 👋';
    if ($('news')) $('news').checked = !!j.nouvelles;
  }).catch(function () {});
  if ($('deco')) $('deco').addEventListener('click', function () { api('POST', '/api/deconnexion', {}).then(function () { location.href = '/'; }); });
  if ($('news')) $('news').addEventListener('change', function () { api('PUT', '/api/moi', { nouvelles: $('news').checked }); });
  if ($('suppr')) $('suppr').addEventListener('click', function () {
    var saisie = window.prompt('Cette action supprime définitivement votre compte et vos données.\nTapez SUPPRIMER pour confirmer :');
    if (saisie === 'SUPPRIMER') api('DELETE', '/api/moi', {}).then(function () { location.href = '/'; });
  });
  // Bandeau « usage » : messages du compteur, avec rappel de l'abonnement annuel et lien(s) de paiement.
  function el(t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x) e.textContent = x; return e; }
  function lien(url, texte) { var a = el('a', 'btn plein', texte); a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer'; return a; }
  api('GET', '/api/usage').then(function (j) {
    if (!j || !j.messages) return;
    var b = el('section', 'bandeau'); b.setAttribute('role', 'status');
    j.messages.forEach(function (m) { b.appendChild(el('p', 'msg ' + m.niveau, m.texte)); });
    var act = el('p', 'actions');
    var duJour = j.messages.some(function (m) { return m.niveau === 'paiement'; });
    if (duJour && j.liens.jour) act.appendChild(lien(j.liens.jour, '💳 Payer ' + String(j.tarifs.prixJour).replace('.', ',') + ' € (aujourd\'hui)'));
    if (!j.abonnement || j.messages.some(function (m) { return /se termine bientôt/.test(m.texte); })) {
      if (j.liens.annuel) act.appendChild(lien(j.liens.annuel, '⭐ Abonnement annuel ' + String(j.tarifs.prixAnnuel).replace('.', ',') + ' € : payer en une seule fois'));
      else act.appendChild(el('span', 'note', 'Lien de paiement de l\'abonnement annuel : bientôt disponible.'));
    }
    if (act.children.length) b.appendChild(act);
    var m0 = document.querySelector('main'); if (m0) m0.insertBefore(b, m0.firstChild);
    if ($('usage')) { $('usage').textContent = 'Jours d\'usage : ' + j.joursUsage + (j.solde > 0 ? ' · solde à régler : ' + String(j.solde).replace('.', ',') + ' €' : '') + (j.abonnement ? ' · abonnement annuel actif' : ''); }
  }).catch(function () {});
})();
