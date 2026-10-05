require('dotenv').config();
const express = require('express');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const DB_FILE = path.join(__dirname, 'data', 'db.json');
const UPLOAD_DIR = path.join(__dirname, 'data', 'uploads');

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
    { id: 5, title: 'Tournoi de rentrée', date: '2026-09-20', time: '09:00', location: 'La Crique', description: 'Tournoi d\'ouverture de la saison.', status: 'Terminé' },
    { id: 1, title: 'Tournoi du mois', date: '2026-11-15', time: '14:00', location: 'La Crique', description: 'Tournoi convivial ouvert à tous les niveaux.', status: 'Ouvert' },
    { id: 2, title: 'Championnat régional', date: '2026-11-22', time: '09:00', location: 'Fort-de-France', description: 'Compétition officielle.', status: 'Ouvert' }
  ],
  products: [
    { id: 1, name: 'Tenue officielle', description: 'Polo rouge Club Culture', price: 35 },
    { id: 2, name: 'Boules de pétanque', description: 'Set de 3 boules', price: 120 },
    { id: 3, name: 'Casquette du club', description: 'Casquette brodée', price: 15 }
  ],
  members: [], guests: [], registrations: [], orders: [], gallery: [],
  comments: [
    { id: 2, author: 'Pierre Leclerc', text: 'Excellente organisation, merci !', eventId: 1, status: 'approved', date: '2026-10-01' }
  ]
};

let db;
function load() {
  try { db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); db.gallery = db.gallery || []; db.guests = db.guests || []; }
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
function isAdmin(token) {
  const exp = sessions.get(token);
  if (!exp || exp < Date.now()) { sessions.delete(token); return false; }
  return true;
}
const bearer = (req) => (req.get('authorization') || '').replace(/^Bearer /, '');
function admin(req, res, next) {
  if (!isAdmin(bearer(req))) return res.status(401).json({ error: 'Non autorisé.' });
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

const GUEST_CATEGORIES = ['Compétiteur', 'Joueur loisir', 'Accompagnant / spectateur'];
// Ouvert aux membres et aux non-membres. Les non-membres sont enregistrés dans le dossier « Invités ».
app.post('/api/events/:id/register', (req, res) => {
  const ev = db.events.find(e => e.id === +req.params.id);
  if (!ev) return res.status(404).json({ error: 'Événement introuvable.' });
  if (ev.status !== 'Ouvert' || ev.date < today()) return res.status(400).json({ error: 'Les inscriptions sont closes.' });
  const name = str(req.body.name, 100), email = str(req.body.email, 150).toLowerCase();
  if (!name || !isEmail(email)) return res.status(400).json({ error: 'Nom et email valides requis.' });
  const member = db.members.find(m => m.email === email);
  if (req.body.status === 'member' && !member)
    return res.status(409).json({ error: 'Cet email ne correspond à aucun membre. Choisissez « Invité » pour vous inscrire sans être membre, ou inscrivez-vous au club.' });
  if (db.registrations.some(r => r.eventId === ev.id && r.email === email))
    return res.status(409).json({ error: 'Vous êtes déjà inscrit à cet événement.' });
  const kind = member ? 'member' : 'guest';
  const reg = { id: nextId(), eventId: ev.id, name, email, phone: str(req.body.phone, 30), team: str(req.body.team, 100), kind, date: today() };
  if (kind === 'guest') {
    const category = GUEST_CATEGORIES.includes(req.body.category) ? req.body.category : 'Joueur loisir';
    const club = str(req.body.club, 100);
    let g = db.guests.find(x => x.email === email);
    if (!g) db.guests.push(g = { id: nextId(), email, events: [], firstDate: today() });
    Object.assign(g, { name, phone: reg.phone, category, club });
    if (!g.events.includes(ev.id)) g.events.push(ev.id);
    reg.category = category;
  }
  db.registrations.push(reg); save();
  res.status(201).json({ message: kind === 'member' ? 'Inscription confirmée à « ' + ev.title + ' ».'
    : 'Inscription confirmée à « ' + ev.title + ' » en tant qu\'invité. Vous serez prévenu des prochains événements.' });
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


/* ---------- Galerie (photos & vidéos, modérées) ---------- */
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const MIME = { 'image/jpeg': ['.jpg', 'image'], 'image/png': ['.png', 'image'], 'image/webp': ['.webp', 'image'],
  'image/gif': ['.gif', 'image'], 'video/mp4': ['.mp4', 'video'], 'video/webm': ['.webm', 'video'], 'video/quicktime': ['.mov', 'video'] };
const MAX_IMAGE = 10 * 1024 * 1024, MAX_VIDEO = 100 * 1024 * 1024;
const upload = multer({
  storage: multer.diskStorage({
    destination: UPLOAD_DIR,
    filename: (_req, file, cb) => cb(null, crypto.randomBytes(12).toString('hex') + (MIME[file.mimetype] || ['.bin'])[0])
  }),
  limits: { fileSize: MAX_VIDEO, files: 1 },
  fileFilter: (_req, file, cb) => cb(MIME[file.mimetype] ? null : new Error('Format non accepté (JPG, PNG, WebP, GIF, MP4, WebM, MOV).'), !!MIME[file.mimetype])
});
// Vérifie que le contenu correspond bien à un format image/vidéo (pas seulement l'en-tête déclaré).
function sniff(file) {
  const b = Buffer.alloc(12); const fd = fs.openSync(file, 'r'); fs.readSync(fd, b, 0, 12, 0); fs.closeSync(fd);
  const hex = b.toString('hex'), ascii = b.toString('latin1');
  return hex.startsWith('ffd8ff') || hex.startsWith('89504e47') || ascii.startsWith('GIF8') ||
    (ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP') || ascii.slice(4, 8) === 'ftyp' || hex.startsWith('1a45dfa3');
}
const publicItem = ({ id, type, file, title, eventId, author, date }) => ({ id, type, url: '/media/' + file, title, eventId, author, date });

app.get('/api/gallery', (_req, res) => res.json(db.gallery.filter(g => g.status === 'approved').map(publicItem)));

// Fichiers : publics une fois approuvés ; en attente = visibles seulement par un admin (?t=jeton).
app.get('/media/:file', (req, res) => {
  const item = db.gallery.find(g => g.file === req.params.file);
  if (!item || (item.status !== 'approved' && !isAdmin(String(req.query.t || '')))) return res.status(404).end();
  res.set('X-Content-Type-Options', 'nosniff');
  if (req.query.dl) res.attachment(item.title ? item.title.replace(/[^\w\-. ]+/g, '_') + path.extname(item.file) : item.file);
  res.sendFile(path.join(UPLOAD_DIR, item.file), { headers: { 'Cache-Control': item.status === 'approved' ? 'public, max-age=86400' : 'private, no-store' } });
});

app.post('/api/gallery', (req, res) => {
  upload.single('file')(req, res, (e) => {
    const file = req.file;
    const drop = () => { if (file) fs.unlink(file.path, () => {}); };
    if (e) return res.status(e.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: e.code === 'LIMIT_FILE_SIZE' ? 'Fichier trop volumineux (max 100 Mo).' : e.message });
    if (!file) return res.status(400).json({ error: 'Aucun fichier reçu.' });
    const type = MIME[file.mimetype][1];
    if (!sniff(file.path)) { drop(); return res.status(400).json({ error: 'Le fichier n\'est pas une image ou une vidéo valide.' }); }
    if (type === 'image' && file.size > MAX_IMAGE) { drop(); return res.status(413).json({ error: 'Photo trop volumineuse (max 10 Mo).' }); }
    const asAdmin = isAdmin(bearer(req));
    const email = str(req.body.email, 150).toLowerCase();
    const member = db.members.find(m => m.email === email);
    if (!asAdmin && !member) { drop(); return res.status(403).json({ error: 'Seuls les membres inscrits peuvent proposer des photos ou vidéos. Inscrivez-vous d\'abord.' }); }
    if (!asAdmin && db.gallery.filter(g => g.email === email && g.status === 'pending').length >= 10) {
      drop(); return res.status(429).json({ error: 'Vous avez déjà 10 envois en attente de modération.' });
    }
    const ev = db.events.find(x => x.id === +req.body.eventId);
    const item = { id: nextId(), type, file: file.filename, title: str(req.body.title, 120), eventId: ev ? ev.id : null,
      author: asAdmin ? 'Administration' : member.name, email: asAdmin ? '' : email, status: asAdmin ? 'approved' : 'pending', date: today() };
    db.gallery.push(item); save();
    res.status(201).json({ message: asAdmin ? 'Publié dans la galerie.' : 'Merci ! Votre envoi sera publié après validation par un administrateur.' });
  });
});
app.patch('/api/admin/gallery/:id', admin, (req, res) => {
  const g = db.gallery.find(x => x.id === +req.params.id);
  if (!g) return res.status(404).json({ error: 'Introuvable.' });
  if (req.body.status !== 'approved') return res.status(400).json({ error: 'Statut invalide.' });
  g.status = 'approved'; save(); res.json({ ok: true });
});
app.delete('/api/gallery/:id', admin, (req, res) => {
  const i = db.gallery.findIndex(x => x.id === +req.params.id);
  if (i < 0) return res.status(404).json({ error: 'Introuvable.' });
  const [g] = db.gallery.splice(i, 1); fs.unlink(path.join(UPLOAD_DIR, g.file), () => {}); save(); res.json({ ok: true });
});

/* ---------- API admin ---------- */
app.get('/api/admin/overview', admin, (_req, res) => res.json({
  members: db.members, registrations: db.registrations, orders: db.orders,
  comments: db.comments, gallery: db.gallery, guests: db.guests
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
app.delete('/api/guests/:id', admin, del('guests'));
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
