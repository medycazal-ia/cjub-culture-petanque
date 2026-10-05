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
})();
