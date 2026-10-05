
window.MPT_DEMO = true;
(function () {
  var U = window.__USAGE, JOUR = 864e5, now = Date.now();
  var db = { users: [], sessions: [], seq: 0, personnes: [], seqP: 0, reglages: {} };
  function user(prenom, nom, email, tel, ip, jours, debutJours) {
    var u = { id: ++db.seq, email: email, prenom: prenom, nom: nom, tel: tel, creeLe: new Date(now - jours * JOUR).toISOString(), nouvelles: db.seq % 2 === 1, derniereConnexion: new Date(now - 3600e3).toISOString(), nbConnexions: jours };
    db.users.push(u); var t0 = now - jours * 25 * 36e5;
    for (var i = 0; i < jours; i++) U.compter(db, u, ip, t0 + i * 25 * 36e5); return u;
  }
  user('Marie', 'Martin', 'marie@exemple.fr', '0696112233', '10.0.0.1', 2);
  user('Paul', 'Dupont', 'paul@exemple.fr', '', '10.0.0.2', 12);
  user('Awa', 'Diop', 'awa@exemple.fr', '0690554433', '10.0.0.3', 45);
  user('Luc', 'Bernard', 'luc@exemple.fr', '', '10.0.0.4', 88);
  var p = db.personnes[1]; p.paiements.push({ le: new Date(now - 5 * JOUR).toISOString(), montant: 5, note: 'virement' });
  var pa = db.personnes[2]; pa.abonnementJusqu = now + 200 * JOUR; pa.paiements.push({ le: new Date(now - 165 * JOUR).toISOString(), montant: 59, note: 'Abonnement annuel', abo: true });
  function rep(obj, ok) { return Promise.resolve({ ok: ok !== false, status: ok === false ? 400 : 200, json: function () { return Promise.resolve(obj); } }); }
  window.fetch = function (url, o) {
    o = o || {}; var m = (o.method || 'GET').toUpperCase(), auth = (o.headers || {}).Authorization || '', body = o.body ? JSON.parse(o.body) : {};
    if (auth !== 'Bearer Admin-MPT-ChangezMoi-2026') return rep({ erreur: 'Mot de passe administrateur incorrect. (Démo : Admin-MPT-ChangezMoi-2026)' }, false);
    var x;
    if (url === '/api/admin/utilisateurs' && m === 'GET') return rep({ total: db.users.length, motDePasseParDefaut: true, utilisateurs: db.users.map(function (u) { return { id: u.id, email: u.email, prenom: u.prenom, nom: u.nom, telephone: u.tel, nouvelles: u.nouvelles, creeLe: u.creeLe, derniereConnexion: u.derniereConnexion, nbConnexions: u.nbConnexions }; }) });
    if (url.indexOf('/api/admin/utilisateurs/') === 0 && m === 'DELETE') { var id = +url.split('/').pop(); db.users = db.users.filter(function (u) { return u.id !== id; }); return rep({ supprime: 1 }); }
    if (url === '/api/admin/usage') { var pers = db.personnes.map(function (q) { return U.resume(db, q, Date.now()); }), tot = pers.reduce(function (a, q) { return { du: a.du + q.du, paye: a.paye + q.paye, abo: a.abo + q.abonnements }; }, { du: 0, paye: 0, abo: 0 });
      return rep({ reglages: U.reglages(db), personnes: pers, totaux: { du: tot.du, paye: tot.paye, abonnements: tot.abo, solde: Math.round((tot.du - tot.paye) * 100) / 100, personnes: pers.length } }); }
    if (url === '/api/admin/reglages') { try { db.reglages = U.reglagesValides(body); return rep({ reglages: U.reglages(db) }); } catch (e) { return rep({ erreur: e.message }, false); } }
    var mm = /\/api\/admin\/personnes\/(\d+)(?:\/(\w+))?$/.exec(url);
    if (mm) { x = db.personnes.filter(function (q) { return q.id === +mm[1]; })[0]; if (!x) return rep({ erreur: 'Introuvable' }, false);
      if (m === 'DELETE') { db.personnes = db.personnes.filter(function (q) { return q !== x; }); return rep({ ok: true }); }
      if (mm[2] === 'paiement') { x.paiements.push({ le: new Date().toISOString(), montant: +body.montant, note: body.note || '' }); }
      if (mm[2] === 'abonnement') { if (body.annuler) x.abonnementJusqu = null; else { x.abonnementJusqu = Math.max(Date.now(), x.abonnementJusqu || 0) + 365 * JOUR; x.paiements.push({ le: new Date().toISOString(), montant: U.reglages(db).prixAnnuel, note: 'Abonnement annuel', abo: true }); } }
      if (mm[2] === 'remise') { x.jours = 0; x.fenetreFin = 0; x.historique = []; }
      return rep(U.resume(db, x, Date.now())); }
    if (url === '/api/admin/export.csv') return Promise.resolve({ ok: true, blob: function () { return Promise.resolve(new Blob(['id;email\r\n'], { type: 'text/csv' })); } });
    return rep({ erreur: 'Non géré en démonstration' }, false);
  };
})();
