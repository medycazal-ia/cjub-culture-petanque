// MontagePourTous — serveur : comptes gratuits (e-mail, prénom, nom obligatoires), outils de montage protégés, espace admin.
const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const scrypt = promisify(crypto.scrypt);

try { // .env facultatif, sans dépendance
  for (const l of fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(l); if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch (e) { /* pas de .env */ }

const PORT = +process.env.PORT || 3100;
const ADMIN = process.env.MPT_ADMIN_PASSWORD || '';
const DATA = process.env.MPT_DATA_DIR || path.join(__dirname, 'data');
const DB_FILE = path.join(DATA, 'db.json');
const SESSION_JOURS = 30;
fs.mkdirSync(DATA, { recursive: true });

/* ---------- base de données (fichier JSON, écriture atomique) ---------- */
let db = { users: [], sessions: [], seq: 0 };
try { db = Object.assign(db, JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))); } catch (e) { /* première exécution */ }
function sauver() { const tmp = DB_FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(db)); fs.renameSync(tmp, DB_FILE); }
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
function purger() { const n = Date.now(); const avant = db.sessions.length; db.sessions = db.sessions.filter((s) => s.exp > n); if (db.sessions.length !== avant) sauver(); }

/* ---------- outils ---------- */
const app = express();
if (process.env.MPT_TRUST_PROXY) app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.set({
    'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'same-origin', 'X-Frame-Options': 'SAMEORIGIN',
    'Content-Security-Policy': "default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'",
  });
  next();
});
app.use('/api', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
app.use(express.json({ limit: '20kb' }));
app.use('/api', (req, res, next) => { // les écritures doivent être du JSON : bloque les formulaires venus d'autres sites
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method) && !req.is('json')) return res.status(415).json({ erreur: 'JSON requis' });
  next();
});

const essais = new Map(); // limitation simple par IP
function limite(cle, max, fenetreMs) {
  return (req, res, next) => {
    const k = cle + ':' + req.ip, n = Date.now(), l = (essais.get(k) || []).filter((t) => n - t < fenetreMs);
    if (l.length >= max) return res.status(429).json({ erreur: 'Trop de tentatives. Réessayez dans quelques minutes.' });
    l.push(n); essais.set(k, l); next();
  };
}
setInterval(() => { const n = Date.now(); for (const [k, l] of essais) { if (!l.some((t) => n - t < 3600e3)) essais.delete(k); } purger(); }, 600e3).unref();

function cookies(req) { const o = {}; (req.headers.cookie || '').split(';').forEach((c) => { const i = c.indexOf('='); if (i > 0) o[c.slice(0, i).trim()] = decodeURIComponent(c.slice(i + 1).trim()); }); return o; }
function utilisateur(req) {
  const t = cookies(req).mpt_session; if (!t) return null;
  const h = sha(t), s = db.sessions.find((x) => x.h === h && x.exp > Date.now()); if (!s) return null;
  return db.users.find((u) => u.id === s.uid) || null;
}
function ouvrirSession(req, res, u) {
  const t = crypto.randomBytes(32).toString('hex'); db.sessions.push({ h: sha(t), uid: u.id, exp: Date.now() + SESSION_JOURS * 864e5 });
  u.derniereConnexion = new Date().toISOString(); u.nbConnexions = (u.nbConnexions || 0) + 1; sauver();
  res.append('Set-Cookie', `mpt_session=${t}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${SESSION_JOURS * 86400}${req.secure ? '; Secure' : ''}`);
}
const propre = (x, max) => (typeof x === 'string' ? x.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, max) : '');
const vue = (u) => ({ id: u.id, email: u.email, prenom: u.prenom, nom: u.nom });

async function hacher(mdp, sel) { return (await scrypt(mdp, sel, 64)).toString('hex'); }

/* ---------- comptes ---------- */
app.post('/api/inscription', limite('ins', 10, 3600e3), async (req, res) => {
  const b = req.body || {}, email = propre(b.email, 254).toLowerCase(), prenom = propre(b.prenom, 80), nom = propre(b.nom, 80), mdp = typeof b.mdp === 'string' ? b.mdp : '';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return res.status(400).json({ erreur: 'Adresse e-mail invalide.' });
  if (!prenom) return res.status(400).json({ erreur: 'Le prénom est obligatoire.' });
  if (!nom) return res.status(400).json({ erreur: 'Le nom est obligatoire.' });
  if (mdp.length < 8 || mdp.length > 200) return res.status(400).json({ erreur: 'Le mot de passe doit faire au moins 8 caractères.' });
  if (b.consentement !== true) return res.status(400).json({ erreur: 'Vous devez accepter l\'enregistrement de vos données pour créer le compte.' });
  if (db.users.some((u) => u.email === email)) return res.status(409).json({ erreur: 'Un compte existe déjà avec cet e-mail. Connectez-vous.' });
  const sel = crypto.randomBytes(16).toString('hex'), u = {
    id: ++db.seq, email, prenom, nom, sel, hash: await hacher(mdp, sel), creeLe: new Date().toISOString(), consentementLe: new Date().toISOString(),
    nouvelles: b.nouvelles === true, derniereConnexion: null, nbConnexions: 0,
  };
  if (db.users.some((x) => x.email === email)) return res.status(409).json({ erreur: 'Un compte existe déjà avec cet e-mail. Connectez-vous.' });
  db.users.push(u); ouvrirSession(req, res, u); res.status(201).json({ utilisateur: vue(u) });
});

app.post('/api/connexion', limite('con', 15, 900e3), async (req, res) => {
  const b = req.body || {}, email = propre(b.email, 254).toLowerCase(), mdp = typeof b.mdp === 'string' ? b.mdp : '';
  const u = db.users.find((x) => x.email === email);
  const sel = u ? u.sel : 'x'.repeat(32), h = await hacher(mdp.slice(0, 200), sel); // même coût si le compte n'existe pas
  if (!u || !crypto.timingSafeEqual(Buffer.from(h), Buffer.from(u.hash))) return res.status(401).json({ erreur: 'E-mail ou mot de passe incorrect.' });
  ouvrirSession(req, res, u); res.json({ utilisateur: vue(u) });
});

app.post('/api/deconnexion', (req, res) => {
  const t = cookies(req).mpt_session; if (t) { const h = sha(t); db.sessions = db.sessions.filter((s) => s.h !== h); sauver(); }
  res.append('Set-Cookie', 'mpt_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'); res.json({ ok: true });
});
app.get('/api/moi', (req, res) => { const u = utilisateur(req); if (!u) return res.status(401).json({ erreur: 'Non connecté' }); res.json({ utilisateur: vue(u), nouvelles: !!u.nouvelles }); });
app.put('/api/moi', (req, res) => { const u = utilisateur(req); if (!u) return res.status(401).json({ erreur: 'Non connecté' }); u.nouvelles = req.body && req.body.nouvelles === true; sauver(); res.json({ ok: true, nouvelles: u.nouvelles }); });
app.delete('/api/moi', (req, res) => { // droit à l'effacement
  const u = utilisateur(req); if (!u) return res.status(401).json({ erreur: 'Non connecté' });
  db.users = db.users.filter((x) => x.id !== u.id); db.sessions = db.sessions.filter((s) => s.uid !== u.id); sauver();
  res.append('Set-Cookie', 'mpt_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0'); res.json({ ok: true });
});

/* ---------- administration ---------- */
function admin(req, res, next) {
  if (ADMIN.length < 10) return res.status(503).json({ erreur: 'Espace administrateur désactivé (MPT_ADMIN_PASSWORD non défini).' });
  const m = /^Bearer (.+)$/.exec(req.headers.authorization || ''), a = crypto.createHash('sha256').update(m ? m[1] : '').digest(), b = crypto.createHash('sha256').update(ADMIN).digest();
  if (!m || !crypto.timingSafeEqual(a, b)) return res.status(401).json({ erreur: 'Mot de passe administrateur incorrect.' });
  next();
}
const adminLimite = limite('adm', 20, 900e3);
const ligne = (u) => ({ id: u.id, email: u.email, prenom: u.prenom, nom: u.nom, nouvelles: !!u.nouvelles, creeLe: u.creeLe, consentementLe: u.consentementLe, derniereConnexion: u.derniereConnexion, nbConnexions: u.nbConnexions || 0 });
app.get('/api/admin/utilisateurs', adminLimite, admin, (req, res) => res.json({ total: db.users.length, utilisateurs: db.users.map(ligne) }));
app.delete('/api/admin/utilisateurs/:id', adminLimite, admin, (req, res) => {
  const id = +req.params.id, n = db.users.length; db.users = db.users.filter((u) => u.id !== id); db.sessions = db.sessions.filter((s) => s.uid !== id); sauver();
  res.json({ supprime: n - db.users.length });
});
const csvCase = (v) => { v = v == null ? '' : String(v); if (/^[=+\-@\t\r]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; }; // neutralise l'injection de formules
app.get('/api/admin/export.csv', adminLimite, admin, (req, res) => {
  const cols = ['id', 'email', 'prenom', 'nom', 'nouvelles', 'creeLe', 'consentementLe', 'derniereConnexion', 'nbConnexions'];
  const csv = '﻿' + cols.join(';') + '\r\n' + db.users.map(ligne).map((u) => cols.map((c) => csvCase(c === 'nouvelles' ? (u[c] ? 'oui' : 'non') : u[c])).join(';')).join('\r\n') + '\r\n';
  res.set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="montagepourtous-inscrits.csv"' }).send(csv);
});

app.get('/health', (req, res) => res.json({ ok: true }));

/* ---------- pages : public, et outils réservés aux comptes ---------- */
app.use('/app', (req, res, next) => {
  if (utilisateur(req)) return next();
  if (req.accepts('html') && req.method === 'GET') return res.redirect('/?connexion=1');
  res.status(401).end();
}, (req, res, next) => { res.set('Cache-Control', 'private, no-cache'); next(); }, express.static(path.join(__dirname, 'app')));
app.use(express.static(path.join(__dirname, 'public')));
app.use((req, res) => res.status(404).send('Page introuvable'));

if (require.main === module) {
  if (ADMIN && ADMIN.length < 10) console.warn('⚠ MPT_ADMIN_PASSWORD fait moins de 10 caractères : espace administrateur désactivé.');
  app.listen(PORT, () => console.log(`MontagePourTous : http://localhost:${PORT}`));
}
module.exports = app;
