// MontagePourTous — compteur d'usage et tarification.
//  • Une « journée d'usage » = une période de 24 h (glissante) pendant laquelle la personne s'est connectée.
//  • Identification d'une personne : e-mail, nom + prénom, téléphone ou adresse IP (chacun activable dans l'admin).
//  • Cycle de `dureeCycle` jours d'usage (90) : les `joursGratuits` (3) premiers jours du tout premier cycle sont gratuits ; les jours
//    suivants jusqu'au jour `joursPayantsParCycle` (30) coûtent `prixJour` (1 €) ; les jours 31 à 90 sont comptés mais gratuits ;
//    avertissement `joursAvertissement` (3) jours avant la reprise du paiement ; au jour 91 un nouveau cycle commence (30 jours payants…).
//  • Abonnement annuel (59 €, paiement unique) : tout est gratuit pendant 1 an.
const REG_DEFAUT = {
  prixJour: 1, joursGratuits: 3, joursPayantsParCycle: 30, dureeCycle: 90, joursAvertissement: 3, prixAnnuel: 59,
  lienJour: '', lienAnnuel: '', mode: 'suivi', // 'suivi' : on compte et on prévient ; 'bloquant' : accès refusé tant qu'un solde est dû
  identEmail: true, identNom: true, identTel: true, identIp: true, maxParIp: 3,
};
const JOUR = 864e5;
const arrondi = (x) => Math.round(x * 100) / 100;
const somme = (l, k) => arrondi((l || []).reduce((a, x) => a + (+x[k] || 0), 0));
const eur = (x) => String(arrondi(x)).replace('.', ',') + ' €';
const dateFr = (t) => new Date(t).toLocaleDateString('fr-FR');

function reglages(db) { return Object.assign({}, REG_DEFAUT, db.reglages || {}); }
function lienValide(s) { return typeof s === 'string' && s.length <= 500 && /^https:\/\/[^\s]+$/.test(s); }
function reglagesValides(b) { // retourne les réglages nettoyés ou lance une erreur lisible
  const n = (v, mn, mx, nom) => { const x = +v; if (!isFinite(x) || x < mn || x > mx) throw new Error(nom + ' invalide'); return x; };
  const r = {
    prixJour: arrondi(n(b.prixJour, 0, 1000, 'Prix par jour')), joursGratuits: Math.round(n(b.joursGratuits, 0, 365, 'Jours gratuits')),
    joursPayantsParCycle: Math.round(n(b.joursPayantsParCycle, 1, 3650, 'Jours payants')), dureeCycle: Math.round(n(b.dureeCycle, 1, 3650, 'Durée du cycle')),
    joursAvertissement: Math.round(n(b.joursAvertissement, 0, 365, "Jours d'avertissement")), prixAnnuel: arrondi(n(b.prixAnnuel, 0, 100000, 'Prix annuel')),
    lienJour: b.lienJour ? String(b.lienJour).trim() : '', lienAnnuel: b.lienAnnuel ? String(b.lienAnnuel).trim() : '',
    mode: b.mode === 'bloquant' ? 'bloquant' : 'suivi', identEmail: b.identEmail === true, identNom: b.identNom === true, identTel: b.identTel === true, identIp: b.identIp === true,
    maxParIp: Math.round(n(b.maxParIp, 2, 1000, 'Max. personnes par IP')),
  };
  if (r.joursPayantsParCycle > r.dureeCycle) throw new Error('Les jours payants ne peuvent pas dépasser la durée du cycle');
  if (r.lienJour && !lienValide(r.lienJour)) throw new Error('Le lien de paiement (jour) doit commencer par https://');
  if (r.lienAnnuel && !lienValide(r.lienAnnuel)) throw new Error('Le lien de paiement (annuel) doit commencer par https://');
  return r;
}

/* ---------- identification ---------- */
const normNom = (prenom, nom) => String(prenom + ' ' + nom).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(Boolean).sort().join(' ');
const normTel = (t) => { const d = String(t || '').replace(/[^\d+]/g, '').replace(/^\+/, '00'); const c = d.replace(/^00(262|596|590|594|33)/, '0'); return c.replace(/\D/g, '').length >= 6 ? c.replace(/\D/g, '') : ''; };

function trouverOuCreer(db, reg, ids, now) {
  db.personnes = db.personnes || [];
  const ipPartagee = (ip) => { // IP utilisée par trop de comptes différents (école, réseau mobile…) : ignorée pour l'identification
    const comptes = new Set(ids.compte ? [ids.compte] : []);
    db.personnes.forEach((p) => (p.ips || []).forEach((x) => { if (x.ip === ip) (x.u || []).forEach((c) => comptes.add(c)); }));
    return comptes.size >= reg.maxParIp;
  };
  const cand = db.personnes.filter((p) =>
    (reg.identEmail && ids.email && (p.emails || []).includes(ids.email)) || (reg.identNom && ids.nom && (p.noms || []).includes(ids.nom)) ||
    (reg.identTel && ids.tel && (p.tels || []).includes(ids.tel)) || (reg.identIp && ids.ip && !ipPartagee(ids.ip) && (p.ips || []).some((x) => x.ip === ids.ip)));
  let p;
  if (!cand.length) {
    db.seqP = (db.seqP || 0) + 1; p = { id: db.seqP, emails: [], noms: [], tels: [], ips: [], jours: 0, fenetreFin: 0, premiereLe: new Date(now).toISOString(), historique: [], paiements: [], abonnementJusqu: null };
    db.personnes.push(p);
  } else { // plusieurs correspondances : on fusionne dans la personne qui a le plus d'historique
    cand.sort((a, b) => b.jours - a.jours || a.id - b.id); p = cand[0];
    for (const o of cand.slice(1)) {
      for (const k of ['emails', 'noms', 'tels']) for (const v of o[k]) if (!p[k].includes(v)) p[k].push(v);
      for (const x of o.ips) { const y = p.ips.find((z) => z.ip === x.ip); if (!y) p.ips.push(x); else (x.u || []).forEach((c) => { y.u = y.u || []; if (!y.u.includes(c)) y.u.push(c); }); }
      p.historique.push(...o.historique.map((h) => Object.assign({}, h, { fusion: true }))); p.paiements.push(...o.paiements);
      p.abonnementJusqu = Math.max(p.abonnementJusqu || 0, o.abonnementJusqu || 0) || null; p.fenetreFin = Math.max(p.fenetreFin, o.fenetreFin);
      db.users.forEach((u) => { if (u.personneId === o.id) u.personneId = p.id; });
      db.personnes = db.personnes.filter((x) => x.id !== o.id);
    }
  }
  const ajout = (k, v) => { if (v && !p[k].includes(v)) p[k].push(v); };
  ajout('emails', ids.email); ajout('noms', ids.nom); ajout('tels', ids.tel);
  if (ids.ip) { const x = p.ips.find((y) => y.ip === ids.ip); if (x) { x.dernier = now; x.u = x.u || []; if (ids.compte && !x.u.includes(ids.compte)) x.u.push(ids.compte); } else p.ips.push({ ip: ids.ip, dernier: now, u: ids.compte ? [ids.compte] : [] }); p.ips.sort((a, b) => b.dernier - a.dernier); p.ips = p.ips.slice(0, 20); }
  return p;
}

/* ---------- tarif d'un jour d'usage ---------- */
function tarif(n, reg) {
  const C = reg.dureeCycle, cycle = Math.floor((n - 1) / C) + 1, pos = ((n - 1) % C) + 1;
  if (cycle === 1 && n <= reg.joursGratuits) return { type: 'essai', montant: 0, pos, cycle };
  if (pos <= reg.joursPayantsParCycle) return { type: 'paye', montant: reg.prixJour, pos, cycle };
  return { type: 'offert', montant: 0, pos, cycle };
}

/* Enregistre une éventuelle nouvelle journée d'usage (période de 24 h écoulée). */
function compter(db, user, ip, now) {
  const reg = reglages(db);
  const p = trouverOuCreer(db, reg, { email: user.email, nom: normNom(user.prenom, user.nom), tel: user.tel || '', ip: ip || '', compte: user.id }, now);
  user.personneId = p.id;
  let nouveau = false;
  if (now >= p.fenetreFin) {
    p.jours += 1; const t = tarif(p.jours, reg), abo = p.abonnementJusqu && p.abonnementJusqu > now;
    p.historique.push({ n: p.jours, debut: now, montant: abo ? 0 : t.montant, type: abo ? 'abonnement' : t.type, pos: t.pos, cycle: t.cycle });
    p.fenetreFin = now + JOUR; nouveau = true;
  }
  return { personne: p, nouveau };
}

function bilan(p) { // les abonnements annuels sont comptés à part : ils ne viennent pas en déduction des jours payants
  const du = somme(p.historique, 'montant'), paye = somme((p.paiements || []).filter((x) => !x.abo), 'montant'), abonnements = somme((p.paiements || []).filter((x) => x.abo), 'montant');
  return { du, paye, abonnements, solde: arrondi(du - paye) };
}

/* Messages destinés à l'utilisateur. Chaque message rappelle l'abonnement annuel et son lien de paiement. */
function statut(db, p, now) {
  const reg = reglages(db), b = bilan(p), abo = !!(p.abonnementJusqu && p.abonnementJusqu > now), last = p.historique[p.historique.length - 1];
  const t = tarif(Math.max(1, p.jours), reg), msgs = [];
  const rappel = `Option avantageuse : abonnement annuel à ${eur(reg.prixAnnuel)}, payable en une seule fois, usage illimité pendant 1 an (à régler avec votre compte).`;
  if (abo) {
    msgs.push({ niveau: 'info', texte: `Abonnement annuel actif jusqu'au ${dateFr(p.abonnementJusqu)}. Merci !` });
    if (p.abonnementJusqu - now < 30 * JOUR) msgs.push({ niveau: 'alerte', texte: `Votre abonnement se termine bientôt. ${rappel}` });
  } else {
    const F = reg.joursGratuits, P = reg.joursPayantsParCycle, C = reg.dureeCycle;
    if (t.type === 'essai') {
      msgs.push({ niveau: t.pos === F ? 'alerte' : 'info', texte: `Jour ${t.pos} sur ${F} d'essai gratuit. Ensuite, chaque période de 24 h d'utilisation coûte ${eur(reg.prixJour)}.` });
      if (t.pos === F) msgs.push({ niveau: 'alerte', texte: `Dernier jour gratuit : dès votre prochaine utilisation après cette période de 24 h, ${eur(reg.prixJour)} seront dus pour chaque nouvelle période de 24 h.` });
    } else if (t.type === 'paye') {
      const ordre = t.cycle === 1 ? t.pos - F : t.pos, total = t.cycle === 1 ? P - F : P;
      msgs.push({ niveau: 'paiement', texte: `Jour d'usage payant ${ordre} sur ${total} : ${eur(reg.prixJour)} pour cette période de 24 h (jusqu'au ${dateFr(p.fenetreFin)}).${t.pos === 1 && t.cycle > 1 ? ` Un nouveau cycle de ${C} jours commence : ${P} jours payants, puis jours offerts.` : ''}` });
      if (b.solde > 0.004) msgs.push({ niveau: 'paiement', texte: `Solde à régler : ${eur(b.solde)}.` });
      msgs.push({ niveau: 'info', texte: `Après ${P} jours d'usage, les jours suivants sont gratuits jusqu'au jour ${C} du cycle.` });
    } else {
      const reste = C - t.pos;
      msgs.push({ niveau: 'info', texte: `Jour d'usage offert (jour ${t.pos} sur ${C} du cycle) : vous avez dépassé ${P} jours d'usage, les jours restent gratuits jusqu'au jour ${C}.` });
      if (reste <= reg.joursAvertissement) msgs.push({ niveau: 'alerte', texte: reste === 0 ? `Dernier jour gratuit : dès l'utilisation suivante, le paiement de ${eur(reg.prixJour)} par jour reprend (jour ${C + 1}).` : `Attention : plus que ${reste} jour${reste > 1 ? 's' : ''} d'usage gratuit${reste > 1 ? 's' : ''}. Le paiement de ${eur(reg.prixJour)} par jour reprend au jour ${C + 1}.` });
    }
    if (b.solde > 0.004 && t.type !== 'paye') msgs.push({ niveau: 'paiement', texte: `Solde à régler : ${eur(b.solde)}.` });
    msgs.push({ niveau: 'info', texte: rappel });
  }
  return {
    abonnement: abo, abonnementJusqu: abo ? p.abonnementJusqu : null, joursUsage: p.jours, solde: b.solde, du: b.du, paye: b.paye, prochainJourLe: p.fenetreFin,
    bloque: reg.mode === 'bloquant' && !abo && b.solde > 0.004, messages: msgs,
    liens: { jour: reg.lienJour || '', annuel: reg.lienAnnuel || '' }, tarifs: { prixJour: reg.prixJour, prixAnnuel: reg.prixAnnuel },
  };
}

function resume(db, p, now) {
  const reg = reglages(db), b = bilan(p), t = tarif(Math.max(1, p.jours), reg);
  return {
    id: p.id, emails: p.emails, noms: p.noms, tels: p.tels, ips: p.ips.map((x) => x.ip), jours: p.jours, cycle: t.cycle, position: p.jours ? t.pos : 0, typeJour: p.jours ? t.type : '',
    dernierUsage: p.historique.length ? p.historique[p.historique.length - 1].debut : null, du: b.du, paye: b.paye, abonnements: b.abonnements, solde: b.solde,
    abonnementJusqu: p.abonnementJusqu && p.abonnementJusqu > now ? p.abonnementJusqu : null, historique: p.historique.slice(-60), paiements: p.paiements.slice(-30),
    utilisateurs: (db.users || []).filter((u) => u.personneId === p.id).map((u) => ({ id: u.id, email: u.email, prenom: u.prenom, nom: u.nom, tel: u.tel || '' })),
  };
}

module.exports = { REG_DEFAUT, reglages, reglagesValides, lienValide, normNom, normTel, tarif, compter, statut, resume, bilan, JOUR };
