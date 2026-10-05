require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const DB_FILE = path.join(__dirname, 'data', 'db.json');

app.use(express.json({ limit: '50kb' }));
app.use(express.static(path.join(__dirname, 'public')));

/* ---------- Stockage JSON ---------- */
const DEFAULTS = {
  seq: 100,
  settings: {
    clubName: 'Club Culture Pétanque',
    email: 'info@clubculture.mq',
    phone: '+596 696 12 34 56',
    address: 'La Crique, Trinité, Martinique',
    facebook: 'https://facebook.com/clubculturepetanque',
    whatsapp: 'https://wa.me/596696123456'
  },
  events: [
    { id: 1, title: 'Tournoi du mois', date: '2026-11-15', time: '14:00', location: 'La Crique', description: 'Tournoi convivial ouvert à tous les niveaux.', status: 'Ouvert' },
    { id: 2, title: 'Championnat régional', date: '2026-11-22', time: '09:00', location: 'Fort-de-France', description: 'Compétition officielle.', status: 'Ouvert' }
  ],
  products: [
    { id: 1, name: 'Tenue officielle', description: 'Polo rouge Club Culture', price: 35 },
    { id: 2, name: 'Boules de pétanque', description: 'Set de 3 boules', price: 120 },
    { id: 3, name: 'Casquette du club', description: 'Casquette brodée', price: 15 }
  ],
  members: [], registrations: [], orders: [],
  comments: [
    { id: 2, author: 'Pierre Leclerc', text: 'Excellente organisation, merci !', eventId: 1, status: 'approved', date: '2026-10-01' }
  ]
};

let db;
function load() {
  try { db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
  catch { db = JSON.parse(JSON.stringify(DEFAULTS)); save(); }
}
function save() {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DB_FILE);
}
const nextId = () => ++db.seq;
const today = () => new Date().toISOString().slice(0, 10);
const str = (v, max = 300) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
load();

/* ---------- Authentification admin ---------- */
const sessions = new Map(); // token -> expiration
const attempts = new Map(); // ip -> { n, until }
const SESSION_MS = 8 * 3600 * 1000;

function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(a).digest();
  const hb = crypto.createHash('sha256').update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}
app.post('/api/admin/login', (req, res) => {
  if (!ADMIN_PASSWORD) return res.status(503).json({ error: 'ADMIN_PASSWORD non configuré sur le serveur.' });
  const a = attempts.get(req.ip) || { n: 0, until: 0 };
  if (a.until > Date.now()) return res.status(429).json({ error: 'Trop de tentatives, réessayez plus tard.' });
  if (!safeEqual(str(req.body.password, 200), ADMIN_PASSWORD)) {
    a.n++; if (a.n >= 5) { a.n = 0; a.until = Date.now() + 5 * 60 * 1000; }
    attempts.set(req.ip, a);
    return res.status(401).json({ error: 'Mot de passe incorrect.' });
  }
  attempts.delete(req.ip);
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, Date.now() + SESSION_MS);
  res.json({ token });
});
function admin(req, res, next) {
  const token = (req.get('authorization') || '').replace(/^Bearer /, '');
  const exp = sessions.get(token);
  if (!exp || exp < Date.now()) { sessions.delete(token); return res.status(401).json({ error: 'Non autorisé.' }); }
  next();
}

/* ---------- API publique ---------- */
app.get('/health', (_req, res) => res.json({ status: 'ok' }));
app.get('/api/settings', (_req, res) => res.json(db.settings));
app.get('/api/events', (_req, res) =>
  res.json([...db.events].sort((a, b) => a.date.localeCompare(b.date))));
app.get('/api/products', (_req, res) => res.json(db.products));
app.get('/api/comments', (req, res) => {
  const list = db.comments.filter(c => c.status === 'approved' &&
    (!req.query.eventId || String(c.eventId) === String(req.query.eventId)));
  res.json(list.map(({ id, author, text, eventId, date }) => ({ id, author, text, eventId, date })));
});
app.get('/api/members/count', (_req, res) => res.json({ count: db.members.length }));

app.post('/api/members', (req, res) => {
  const name = str(req.body.name, 100), email = str(req.body.email, 150).toLowerCase();
  const phone = str(req.body.phone, 30);
  const level = ['Débutant', 'Intermédiaire', 'Avancé', 'Compétiteur'].includes(req.body.level) ? req.body.level : 'Débutant';
  if (!name || !isEmail(email)) return res.status(400).json({ error: 'Nom et email valides requis.' });
  if (db.members.some(m => m.email === email)) return res.status(409).json({ error: 'Cet email est déjà inscrit.' });
  db.members.push({ id: nextId(), name, email, phone, level, joinDate: today() });
  save();
  res.status(201).json({ message: 'Inscription enregistrée. Bienvenue au club !' });
});

app.post('/api/events/:id/register', (req, res) => {
  const ev = db.events.find(e => e.id === +req.params.id);
  if (!ev) return res.status(404).json({ error: 'Événement introuvable.' });
  if (ev.status !== 'Ouvert') return res.status(400).json({ error: 'Les inscriptions sont closes.' });
  const name = str(req.body.name, 100), email = str(req.body.email, 150).toLowerCase();
  if (!name || !isEmail(email)) return res.status(400).json({ error: 'Nom et email valides requis.' });
  if (db.registrations.some(r => r.eventId === ev.id && r.email === email))
    return res.status(409).json({ error: 'Vous êtes déjà inscrit à cet événement.' });
  db.registrations.push({ id: nextId(), eventId: ev.id, name, email, date: today() });
  save();
  res.status(201).json({ message: 'Inscription confirmée à « ' + ev.title + ' ».' });
});

app.post('/api/comments', (req, res) => {
  const author = str(req.body.author, 80), text = str(req.body.text, 1000);
  if (!author || !text) return res.status(400).json({ error: 'Nom et message requis.' });
  const ev = db.events.find(e => e.id === +req.body.eventId);
  db.comments.push({ id: nextId(), author, text, eventId: ev ? ev.id : null, status: 'pending', date: today() });
  save();
  res.status(201).json({ message: 'Merci ! Votre commentaire sera publié après modération.' });
});

// Commande : enregistrée pour règlement/retrait au club (pas de paiement en ligne).
app.post('/api/checkout', (req, res) => {
  const name = str(req.body.name, 100), email = str(req.body.email, 150).toLowerCase();
  if (!name || !isEmail(email)) return res.status(400).json({ error: 'Nom et email valides requis.' });
  const items = [];
  for (const it of Array.isArray(req.body.items) ? req.body.items.slice(0, 50) : []) {
    const p = db.products.find(x => x.id === +it.productId);
    const qty = Math.min(Math.max(parseInt(it.quantity, 10) || 0, 0), 99);
    if (p && qty) items.push({ productId: p.id, name: p.name, price: p.price, quantity: qty });
  }
  if (!items.length) return res.status(400).json({ error: 'Panier vide.' });
  const total = Math.round(items.reduce((s, i) => s + i.price * i.quantity, 0) * 100) / 100;
  const order = { id: nextId(), name, email, items, total, status: 'À régler', date: today() };
  db.orders.push(order); save();
  res.status(201).json({ orderId: order.id, total, message: 'Commande n°' + order.id + ' enregistrée. Règlement et retrait au club.' });
});

/* ---------- API admin ---------- */
app.get('/api/admin/overview', admin, (_req, res) => res.json({
  members: db.members, registrations: db.registrations, orders: db.orders,
  comments: db.comments
}));

const del = (key) => (req, res) => {
  const i = db[key].findIndex(x => x.id === +req.params.id);
  if (i < 0) return res.status(404).json({ error: 'Introuvable.' });
  db[key].splice(i, 1); save(); res.json({ ok: true });
};
app.post('/api/events', admin, (req, res) => {
  const title = str(req.body.title, 150), date = str(req.body.date, 10);
  if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return res.status(400).json({ error: 'Titre et date requis.' });
  const ev = { id: nextId(), title, date, time: str(req.body.time, 5), location: str(req.body.location, 150),
    description: str(req.body.description, 1000), status: 'Ouvert' };
  db.events.push(ev); save(); res.status(201).json(ev);
});
app.patch('/api/admin/events/:id', admin, (req, res) => {
  const ev = db.events.find(e => e.id === +req.params.id);
  if (!ev) return res.status(404).json({ error: 'Introuvable.' });
  if (['Ouvert', 'Complet', 'Terminé'].includes(req.body.status)) ev.status = req.body.status;
  save(); res.json(ev);
});
app.delete('/api/events/:id', admin, del('events'));
app.post('/api/products', admin, (req, res) => {
  const name = str(req.body.name, 100), price = Number(req.body.price);
  if (!name || !(price >= 0) || price > 100000) return res.status(400).json({ error: 'Nom et prix valides requis.' });
  const p = { id: nextId(), name, description: str(req.body.description, 500), price: Math.round(price * 100) / 100 };
  db.products.push(p); save(); res.status(201).json(p);
});
app.delete('/api/products/:id', admin, del('products'));
app.delete('/api/members/:id', admin, del('members'));
app.patch('/api/admin/comments/:id', admin, (req, res) => {
  const c = db.comments.find(x => x.id === +req.params.id);
  if (!c) return res.status(404).json({ error: 'Introuvable.' });
  if (req.body.status === 'rejected') { db.comments.splice(db.comments.indexOf(c), 1); }
  else if (req.body.status === 'approved') c.status = 'approved';
  else return res.status(400).json({ error: 'Statut invalide.' });
  save(); res.json({ ok: true });
});
app.patch('/api/admin/orders/:id', admin, (req, res) => {
  const o = db.orders.find(x => x.id === +req.params.id);
  if (!o) return res.status(404).json({ error: 'Introuvable.' });
  if (['À régler', 'Payée', 'Retirée'].includes(req.body.status)) o.status = req.body.status;
  save(); res.json(o);
});
app.patch('/api/admin/settings', admin, (req, res) => {
  for (const k of Object.keys(DEFAULTS.settings)) if (k in req.body) db.settings[k] = str(req.body[k], 200);
  save(); res.json(db.settings);
});

app.use('/api', (_req, res) => res.status(404).json({ error: 'Route inconnue.' }));
app.listen(PORT, () => console.log(`Serveur démarré sur le port ${PORT}`));
