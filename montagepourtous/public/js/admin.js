(function () {
  var $ = function (id) { return document.getElementById(id); }, mdp = '';
  function h() { return { Authorization: 'Bearer ' + mdp, 'Content-Type': 'application/json' }; }
  function api(m, u, b) { return fetch(u, { method: m, headers: h(), body: b ? JSON.stringify(b) : undefined }).then(function (r) { return r.json().then(function (j) { if (!r.ok) throw new Error(j.erreur || 'Erreur'); return j; }); }); }
  function date(s) { return s ? new Date(s).toLocaleString('fr-FR') : '—'; }
  function eur(x) { return String(Math.round(x * 100) / 100).replace('.', ',') + ' €'; }
  function td(tr, v, cls) { var c = document.createElement('td'); if (cls) c.className = cls; if (v instanceof Node) c.appendChild(v); else c.textContent = v; tr.appendChild(c); return c; }
  function btn(txt, fn, plein) { var b = document.createElement('button'); b.textContent = txt; b.className = plein ? 'plein' : ''; b.style.margin = '1px'; b.onclick = fn; return b; }
  function onglet(n) { ['ins', 'usage', 'reg'].forEach(function (k) { $('p-' + k).hidden = k !== n; $('o-' + k).setAttribute('aria-selected', k === n); }); }
  $('o-ins').onclick = function () { onglet('ins'); }; $('o-usage').onclick = function () { onglet('usage'); chargerUsage(); }; $('o-reg').onclick = function () { onglet('reg'); chargerUsage(); };

  function chargerInscrits() {
    return api('GET', '/api/admin/utilisateurs').then(function (j) {
      $('total').textContent = j.total; $('defaut').hidden = !j.motDePasseParDefaut; var tb = $('corps'); tb.innerHTML = '';
      j.utilisateurs.forEach(function (u) {
        var tr = document.createElement('tr');
        [u.prenom, u.nom, u.email, u.telephone || '—', u.nouvelles ? 'oui' : 'non', date(u.creeLe), date(u.derniereConnexion), u.nbConnexions].forEach(function (v) { td(tr, v); });
        td(tr, btn('Supprimer', function () { if (confirm('Supprimer ' + u.email + ' ?')) api('DELETE', '/api/admin/utilisateurs/' + u.id).then(chargerInscrits); })); tb.appendChild(tr);
      });
      $('f').hidden = true; $('zone').hidden = false;
    });
  }
  function chargerUsage() {
    return api('GET', '/api/admin/usage').then(function (j) {
      var t = j.totaux; $('totaux').textContent = t.personnes + ' personne(s) suivie(s) · dû : ' + eur(t.du) + ' · encaissé : ' + eur(t.paye) + ' · reste à encaisser : ' + eur(t.solde);
      var tb = $('pers'); tb.innerHTML = '';
      j.personnes.forEach(function (p) {
        var tr = document.createElement('tr'), c = document.createElement('div');
        var nom = p.utilisateurs.map(function (u) { return u.prenom + ' ' + u.nom; }).join(', ') || p.noms.join(', ') || '(compte supprimé)';
        [nom, p.emails.join(', '), p.tels.length ? '☎ ' + p.tels.join(', ') : '', p.ips.length ? 'IP ' + p.ips.slice(0, 3).join(', ') : ''].forEach(function (x, i) { var d = document.createElement('div'); d.textContent = x; if (i === 0) d.style.fontWeight = '700'; else d.className = 'note'; if (x) c.appendChild(d); });
        td(tr, c); td(tr, p.jours);
        td(tr, p.jours ? 'cycle ' + p.cycle + ' · jour ' + p.position + ' (' + { essai: 'essai gratuit', paye: 'payant', offert: 'offert' }[p.typeJour] + ')' : '—');
        td(tr, date(p.dernierUsage)); td(tr, eur(p.du)); td(tr, eur(p.paye) + (p.abonnements ? ' (+' + eur(p.abonnements) + ' abo)' : '')); td(tr, eur(p.solde), p.solde > 0.004 ? 'neg' : 'pos');
        td(tr, p.abonnementJusqu ? 'jusqu\'au ' + new Date(p.abonnementJusqu).toLocaleDateString('fr-FR') : '—');
        var ac = document.createElement('div');
        ac.appendChild(btn('💶 Paiement', function () { var m = prompt('Montant reçu en € (négatif pour corriger) :', p.solde > 0 ? String(p.solde) : '1'); if (m === null) return; var note = prompt('Note (facultatif) :', '') || ''; api('POST', '/api/admin/personnes/' + p.id + '/paiement', { montant: String(m).replace(',', '.'), note: note }).then(chargerUsage).catch(function (e) { alert(e.message); }); }, true));
        ac.appendChild(btn(p.abonnementJusqu ? '⭐ Prolonger 1 an' : '⭐ Abonnement annuel payé', function () { if (confirm('Enregistrer l\'abonnement annuel (+1 an) et le paiement correspondant ?')) api('POST', '/api/admin/personnes/' + p.id + '/abonnement', {}).then(chargerUsage); }));
        if (p.abonnementJusqu) ac.appendChild(btn('Annuler abo', function () { api('POST', '/api/admin/personnes/' + p.id + '/abonnement', { annuler: true }).then(chargerUsage); }));
        ac.appendChild(btn('📜 Détail', function () { var l = p.historique.map(function (x) { return 'Jour ' + x.n + ' — ' + new Date(x.debut).toLocaleString('fr-FR') + ' — ' + x.type + ' — ' + eur(x.montant); }).join('\n'), q = p.paiements.map(function (x) { return new Date(x.le).toLocaleDateString('fr-FR') + ' : ' + eur(x.montant) + (x.note ? ' (' + x.note + ')' : ''); }).join('\n'); alert('USAGE (60 derniers jours)\n' + (l || '—') + '\n\nPAIEMENTS\n' + (q || '—')); }));
        ac.appendChild(btn('↺ Remise à zéro', function () { if (confirm('Remettre le compteur de jours à zéro (les paiements sont conservés) ?')) api('POST', '/api/admin/personnes/' + p.id + '/remise', {}).then(chargerUsage); }));
        ac.appendChild(btn('✕', function () { if (confirm('Supprimer ce suivi ?')) api('DELETE', '/api/admin/personnes/' + p.id).then(chargerUsage); }));
        td(tr, ac); tb.appendChild(tr);
      });
      if (!j.personnes.length) { var tr0 = document.createElement('tr'), c0 = td(tr0, 'Aucun usage enregistré pour le moment.'); c0.colSpan = 9; tb.appendChild(tr0); }
      var r = j.reglages, nums = ['prixJour', 'joursGratuits', 'joursPayantsParCycle', 'dureeCycle', 'joursAvertissement', 'prixAnnuel', 'maxParIp', 'lienJour', 'lienAnnuel'];
      nums.forEach(function (k) { $('r-' + k).value = String(r[k]).replace('.', ','); if (k.indexOf('lien') === 0) $('r-' + k).value = r[k]; });
      $('r-mode').value = r.mode; ['identEmail', 'identNom', 'identTel', 'identIp'].forEach(function (k) { $('r-' + k).checked = !!r[k]; });
      if (!r.lienAnnuel) $('e-reg').textContent = '⚠ Aucun lien de paiement configuré : les messages mentionnent l\'abonnement annuel mais sans lien.'; else $('e-reg').textContent = '';
    });
  }
  $('f').onsubmit = function (e) { e.preventDefault(); mdp = $('mdp').value; $('err').textContent = ''; chargerInscrits().catch(function (x) { $('err').textContent = x.message; }); };
  $('f-reg').onsubmit = function (e) {
    e.preventDefault(); $('ok-reg').textContent = ''; $('e-reg').textContent = '';
    var n = function (k) { return String($('r-' + k).value).replace(',', '.').trim(); }, b = {};
    ['prixJour', 'joursGratuits', 'joursPayantsParCycle', 'dureeCycle', 'joursAvertissement', 'prixAnnuel', 'maxParIp'].forEach(function (k) { b[k] = n(k); });
    b.lienJour = $('r-lienJour').value.trim(); b.lienAnnuel = $('r-lienAnnuel').value.trim(); b.mode = $('r-mode').value;
    ['identEmail', 'identNom', 'identTel', 'identIp'].forEach(function (k) { b[k] = $('r-' + k).checked; });
    api('PUT', '/api/admin/reglages', b).then(function () { $('ok-reg').textContent = '✔ Enregistré'; chargerUsage(); }).catch(function (x) { $('e-reg').textContent = x.message; });
  };
  $('csv').onclick = function () {
    fetch('/api/admin/export.csv', { headers: h() }).then(function (r) { return r.blob(); }).then(function (b) { var a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'montagepourtous-inscrits.csv'; document.body.appendChild(a); a.click(); a.remove(); });
  };
})();
