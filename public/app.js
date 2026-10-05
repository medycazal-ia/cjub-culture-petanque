'use strict';
const $ = (s, r = document) => r.querySelector(s);
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const eur = (n) => Number(n).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
const fdate = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(d + 'T12:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : d;

let state = { events: [], products: [], comments: [], settings: {} };
let token = sessionStorage.getItem('adminToken') || '';
let cart = (() => { try { return JSON.parse(localStorage.getItem('cart')) || {}; } catch { return {}; } })();
let adminTab = 'events', adminData = null;

function toast(msg, err) {
  const t = $('#toast'); t.textContent = msg; t.className = 'show' + (err ? ' err' : '');
  clearTimeout(toast.t); toast.t = setTimeout(() => t.className = '', 4000);
}
async function api(path, method = 'GET', body) {
  const res = await fetch('/api' + path, {
    method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && token && path.startsWith('/admin') ) logout();
  if (!res.ok) throw new Error(data.error || 'Erreur serveur');
  return data;
}
const act = async (fn, ok) => { try { const r = await fn(); if (ok) toast(typeof ok === 'function' ? ok(r) : ok); return r; } catch (e) { toast(e.message, true); } };

/* ---------- Navigation ---------- */
function route() {
  const id = (location.hash || '#home').slice(1);
  const page = document.getElementById(id) && $('#' + id).classList.contains('page') ? id : 'home';
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.id === page));
  document.querySelectorAll('nav a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === '#' + page));
  $('#menu').classList.remove('open'); $('#burger').setAttribute('aria-expanded', 'false');
  window.scrollTo(0, 0);
  if (page === 'admin') showAdmin();
}
addEventListener('hashchange', route);
$('#burger').onclick = () => { const o = $('#menu').classList.toggle('open'); $('#burger').setAttribute('aria-expanded', o); };

/* ---------- Données publiques ---------- */
async function loadAll() {
  const [events, products, comments, settings, count] = await Promise.all([
    api('/events'), api('/products'), api('/comments'), api('/settings'), api('/members/count')]);
  Object.assign(state, { events, products, comments, settings });
  renderEvents(); renderProducts(); renderCart(); renderSettings();
  $('#member-count').textContent = count.count ? count.count + ' membre(s) déjà inscrit(s).' : '';
}
function eventCard(e, withActions) {
  return `<article class="event"><div class="date">${esc(fdate(e.date))}${e.time ? ' · ' + esc(e.time) : ''}</div>
    <h3>${esc(e.title)}</h3>${e.location ? `<p><strong>Lieu :</strong> ${esc(e.location)}</p>` : ''}
    <p>${esc(e.description)}</p>
    <div class="row"><span class="badge ${e.status === 'Ouvert' ? '' : 'warn'}">${esc(e.status)}</span>
    ${withActions && e.status === 'Ouvert' ? `<button class="btn primary small" data-reg="${e.id}">S'inscrire</button>` : ''}</div></article>`;
}
function renderEvents() {
  const upcoming = state.events.filter(e => e.status !== 'Terminé');
  $('#home-events').innerHTML = upcoming.slice(0, 3).map(e => eventCard(e, false)).join('') || '<p class="note">Aucun événement pour le moment.</p>';
  $('#events-list').innerHTML = state.events.map(e => eventCard(e, true)).join('') || '<p class="note">Aucun événement pour le moment.</p>';
  $('#comments-list').innerHTML = state.comments.map(c => {
    const ev = state.events.find(e => e.id === c.eventId);
    return `<div class="comment"><b>${esc(c.author)}</b>${ev ? ` — <em>${esc(ev.title)}</em>` : ''}<p>${esc(c.text)}</p><span class="note">${esc(c.date)}</span></div>`;
  }).join('') || '<p class="note">Pas encore de commentaire.</p>';
  $('#comment-form [name=eventId]').innerHTML = '<option value="">— Général —</option>' +
    state.events.map(e => `<option value="${e.id}">${esc(e.title)}</option>`).join('');
}
$('#events-list').onclick = (ev) => {
  const id = ev.target.dataset.reg; if (!id) return;
  const name = prompt('Votre nom complet :'); if (!name) return;
  const email = prompt('Votre email :'); if (!email) return;
  act(() => api(`/events/${id}/register`, 'POST', { name, email }), r => r.message);
};
$('#comment-form').onsubmit = async (e) => {
  e.preventDefault(); const f = e.target;
  const r = await act(() => api('/comments', 'POST', Object.fromEntries(new FormData(f))), r => r.message);
  if (r) f.reset();
};
$('#member-form').onsubmit = async (e) => {
  e.preventDefault(); const f = e.target;
  const r = await act(() => api('/members', 'POST', Object.fromEntries(new FormData(f))), r => r.message);
  if (r) { f.reset(); loadAll(); }
};

/* ---------- Boutique / panier ---------- */
function renderProducts() {
  $('#products').innerHTML = state.products.map(p => `<div class="card product"><h3>${esc(p.name)}</h3>
    <p>${esc(p.description)}</p><p class="price">${eur(p.price)}</p>
    <button class="btn primary" data-add="${p.id}">Ajouter au panier</button></div>`).join('') || '<p class="note">Aucun produit.</p>';
}
$('#products').onclick = (e) => {
  const id = e.target.dataset.add; if (!id) return;
  cart[id] = (cart[id] || 0) + 1; saveCart(); toast('Ajouté au panier');
};
function saveCart() { try { localStorage.setItem('cart', JSON.stringify(cart)); } catch {} renderCart(); }
function renderCart() {
  const lines = Object.entries(cart).map(([id, q]) => ({ p: state.products.find(p => p.id === +id), q })).filter(l => l.p);
  if (!lines.length) { $('#cart-body').innerHTML = '<p class="note">Votre panier est vide.</p>'; return; }
  const total = lines.reduce((s, l) => s + l.p.price * l.q, 0);
  $('#cart-body').innerHTML = `<div class="tbl"><table><thead><tr><th>Produit</th><th>Qté</th><th>Total</th><th></th></tr></thead><tbody>${
    lines.map(l => `<tr><td>${esc(l.p.name)}</td><td><button class="btn small" data-q="${l.p.id}:-1" aria-label="Moins">−</button> ${l.q} <button class="btn small" data-q="${l.p.id}:1" aria-label="Plus">+</button></td>
    <td>${eur(l.p.price * l.q)}</td><td><button class="btn small danger" data-q="${l.p.id}:0">Retirer</button></td></tr>`).join('')}</tbody></table></div>
    <p><strong>Total : ${eur(total)}</strong></p>
    <form id="checkout-form"><label>Nom<input name="name" required maxlength="100"></label>
    <label>Email<input name="email" type="email" required maxlength="150"></label>
    <button class="btn primary">Valider la commande</button>
    <p class="note">Pas de paiement en ligne : la commande est enregistrée, règlement et retrait au club.</p></form>`;
}
$('#cart').onclick = (e) => {
  const q = e.target.dataset.q; if (!q) return;
  const [id, d] = q.split(':'); const n = +d;
  if (n === 0) delete cart[id]; else { cart[id] = (cart[id] || 0) + n; if (cart[id] <= 0) delete cart[id]; }
  saveCart();
};
$('#cart').addEventListener('submit', async (e) => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  const items = Object.entries(cart).map(([productId, quantity]) => ({ productId: +productId, quantity }));
  const r = await act(() => api('/checkout', 'POST', { ...f, items }), r => r.message);
  if (r) { cart = {}; saveCart(); }
});

/* ---------- Réglages / pied de page ---------- */
function renderSettings() {
  const s = state.settings;
  document.querySelectorAll('[data-s]').forEach(el => el.textContent = s[el.dataset.s] || '');
  document.querySelectorAll('[data-href]').forEach(el => {
    const [pre, key] = el.dataset.href.includes(':') ? el.dataset.href.split(':') : ['', el.dataset.href];
    let v = s[key] || ''; if (pre === 'tel') v = v.replace(/\s/g, '');
    const url = pre ? pre + ':' + v : v;
    if (/^(https?:|mailto:|tel:)/.test(url)) el.href = url; else el.removeAttribute('href');
  });
  $('#year').textContent = new Date().getFullYear();
}

/* ---------- Administration ---------- */
const TABS = { events: 'Événements', products: 'Produits', registrations: 'Inscriptions', members: 'Membres', orders: 'Commandes', comments: 'Commentaires', settings: 'Paramètres' };
function logout() { token = ''; sessionStorage.removeItem('adminToken'); adminData = null; showAdmin(); }
$('#logout').onclick = logout;
$('#login-form').onsubmit = async (e) => {
  e.preventDefault();
  const r = await act(() => api('/admin/login', 'POST', Object.fromEntries(new FormData(e.target))));
  if (r) { token = r.token; sessionStorage.setItem('adminToken', token); e.target.reset(); showAdmin(); }
};
async function showAdmin() {
  $('#login-form').hidden = !!token; $('#admin-panel').hidden = !token;
  if (!token) return;
  adminData = await act(() => api('/admin/overview'));
  if (adminData) renderAdmin();
}
const tbl = (head, rows) => `<div class="tbl"><table><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.join('') || `<tr><td colspan="${head.length}" class="note">Aucune donnée.</td></tr>`}</tbody></table></div>`;
const del = (kind, id) => `<button class="btn small danger" data-del="${kind}:${id}">Supprimer</button>`;
function renderAdmin() {
  $('#tabs').innerHTML = Object.entries(TABS).map(([k, v]) => `<button class="${k === adminTab ? 'on' : ''}" data-tab="${k}">${v}</button>`).join('');
  const d = adminData; let h = '';
  if (adminTab === 'events') h = `<form class="panel narrow-form" id="f-event"><h3>Nouvel événement</h3>
    <label>Titre<input name="title" required></label><label>Date<input name="date" type="date" required></label>
    <label>Heure<input name="time" type="time"></label><label>Lieu<input name="location"></label>
    <label>Description<textarea name="description" rows="3"></textarea></label><button class="btn primary">Créer</button></form>` +
    tbl(['Titre', 'Date', 'Statut', ''], state.events.map(e => `<tr><td>${esc(e.title)}</td><td>${esc(e.date)}</td>
      <td><select data-status="${e.id}">${['Ouvert', 'Complet', 'Terminé'].map(s => `<option ${s === e.status ? 'selected' : ''}>${s}</option>`).join('')}</select></td><td>${del('events', e.id)}</td></tr>`));
  if (adminTab === 'products') h = `<form class="panel narrow-form" id="f-product"><h3>Nouveau produit</h3>
    <label>Nom<input name="name" required></label><label>Description<textarea name="description" rows="2"></textarea></label>
    <label>Prix (€)<input name="price" type="number" min="0" step="0.01" required></label><button class="btn primary">Ajouter</button></form>` +
    tbl(['Nom', 'Prix', ''], state.products.map(p => `<tr><td>${esc(p.name)}</td><td>${eur(p.price)}</td><td>${del('products', p.id)}</td></tr>`));
  if (adminTab === 'registrations') h = tbl(['Événement', 'Nom', 'Email', 'Date'], d.registrations.map(r => {
    const e = state.events.find(x => x.id === r.eventId); return `<tr><td>${esc(e ? e.title : '—')}</td><td>${esc(r.name)}</td><td>${esc(r.email)}</td><td>${esc(r.date)}</td></tr>`; }));
  if (adminTab === 'members') h = tbl(['Nom', 'Email', 'Téléphone', 'Niveau', 'Inscrit le', ''], d.members.map(m =>
    `<tr><td>${esc(m.name)}</td><td>${esc(m.email)}</td><td>${esc(m.phone)}</td><td>${esc(m.level)}</td><td>${esc(m.joinDate)}</td><td>${del('members', m.id)}</td></tr>`));
  if (adminTab === 'orders') h = tbl(['N°', 'Client', 'Articles', 'Total', 'Statut'], d.orders.map(o =>
    `<tr><td>${o.id}</td><td>${esc(o.name)}<br><span class="note">${esc(o.email)}</span></td><td>${o.items.map(i => `${esc(i.name)} ×${i.quantity}`).join('<br>')}</td><td>${eur(o.total)}</td>
    <td><select data-order="${o.id}">${['À régler', 'Payée', 'Retirée'].map(s => `<option ${s === o.status ? 'selected' : ''}>${s}</option>`).join('')}</select></td></tr>`));
  if (adminTab === 'comments') {
    const card = (c, pending) => `<div class="comment"><b>${esc(c.author)}</b><p>${esc(c.text)}</p>${pending ? `<button class="btn small primary" data-cm="${c.id}:approved">Approuver</button> <button class="btn small danger" data-cm="${c.id}:rejected">Rejeter</button>` : `<button class="btn small danger" data-cm="${c.id}:rejected">Supprimer</button>`}</div>`;
    const p = d.comments.filter(c => c.status === 'pending'), a = d.comments.filter(c => c.status === 'approved');
    h = '<h3>En attente</h3>' + (p.map(c => card(c, true)).join('') || '<p class="note">Rien à modérer.</p>') + '<h3>Approuvés</h3>' + (a.map(c => card(c)).join('') || '<p class="note">Aucun.</p>');
  }
  if (adminTab === 'settings') { const s = state.settings; h = `<form class="panel narrow-form" id="f-settings">${
    [['clubName', 'Nom du club'], ['email', 'Email'], ['phone', 'Téléphone'], ['address', 'Adresse'], ['facebook', 'Lien Facebook'], ['whatsapp', 'Lien WhatsApp']]
      .map(([k, l]) => `<label>${l}<input name="${k}" value="${esc(s[k])}"></label>`).join('')}<button class="btn primary">Enregistrer</button></form>`; }
  $('#tab-body').innerHTML = h;
}
$('#tabs').onclick = (e) => { if (e.target.dataset.tab) { adminTab = e.target.dataset.tab; renderAdmin(); } };
async function refresh() { await loadAll(); await showAdmin(); }
$('#tab-body').onclick = async (e) => {
  const t = e.target;
  if (t.dataset.del) { const [k, id] = t.dataset.del.split(':'); if (confirm('Supprimer définitivement ?')) { await act(() => api(`/${k}/${id}`, 'DELETE'), 'Supprimé'); refresh(); } }
  if (t.dataset.cm) { const [id, status] = t.dataset.cm.split(':'); await act(() => api(`/admin/comments/${id}`, 'PATCH', { status }), 'Mis à jour'); refresh(); }
};
$('#tab-body').onchange = async (e) => {
  const t = e.target;
  if (t.dataset.status) { await act(() => api(`/admin/events/${t.dataset.status}`, 'PATCH', { status: t.value }), 'Statut mis à jour'); refresh(); }
  if (t.dataset.order) { await act(() => api(`/admin/orders/${t.dataset.order}`, 'PATCH', { status: t.value }), 'Statut mis à jour'); refresh(); }
};
$('#tab-body').onsubmit = async (e) => {
  e.preventDefault(); const f = e.target, body = Object.fromEntries(new FormData(f));
  const map = { 'f-event': ['/events', 'POST', 'Événement créé'], 'f-product': ['/products', 'POST', 'Produit ajouté'], 'f-settings': ['/admin/settings', 'PATCH', 'Paramètres enregistrés'] };
  const m = map[f.id]; if (!m) return;
  if (await act(() => api(m[0], m[1], body), m[2])) refresh();
};

/* ---------- Démarrage ---------- */
route();
loadAll().catch(() => toast('Impossible de charger les données.', true));
