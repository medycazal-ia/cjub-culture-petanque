(function () {
  var $ = function (id) { return document.getElementById(id); }, mdp = '';
  function h() { return { Authorization: 'Bearer ' + mdp }; }
  function date(s) { return s ? new Date(s).toLocaleString('fr-FR') : '—'; }
  function charger() {
    return fetch('/api/admin/utilisateurs', { headers: h() }).then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.erreur || 'Erreur'); return j; }); }).then(function (j) {
      $('total').textContent = j.total; var tb = $('corps'); tb.innerHTML = '';
      j.utilisateurs.forEach(function (u) {
        var tr = document.createElement('tr');
        [u.prenom, u.nom, u.email, u.nouvelles ? 'oui' : 'non', date(u.creeLe), date(u.derniereConnexion), u.nbConnexions].forEach(function (v) { var td = document.createElement('td'); td.textContent = v; tr.appendChild(td); });
        var td = document.createElement('td'), b = document.createElement('button'); b.textContent = 'Supprimer';
        b.onclick = function () { if (confirm('Supprimer ' + u.email + ' ?')) fetch('/api/admin/utilisateurs/' + u.id, { method: 'DELETE', headers: h() }).then(charger); };
        td.appendChild(b); tr.appendChild(td); tb.appendChild(tr);
      });
      $('f').hidden = true; $('zone').hidden = false;
    });
  }
  $('f').onsubmit = function (e) { e.preventDefault(); mdp = $('mdp').value; $('err').textContent = ''; charger().catch(function (x) { $('err').textContent = x.message; }); };
  $('csv').onclick = function () {
    fetch('/api/admin/export.csv', { headers: h() }).then(function (r) { return r.blob(); }).then(function (b) { var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'montagepourtous-inscrits.csv'; document.body.appendChild(a); a.click(); a.remove(); });
  };
})();
