'use strict';
// Service worker : le site reste utilisable hors connexion avec les dernières données consultées.
// Changer VERSION à chaque mise à jour des fichiers du site pour renouveler le cache.
const VERSION = 'ccp-v2';
const STATIC = 'static-' + VERSION, API = 'api-' + VERSION;
const SHELL = ['/', '/styles.css', '/app.js', '/intro.js', '/martinique.svg', '/logo.png', '/manifest.webmanifest', '/icons/icon-192.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(STATIC).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => !k.endsWith(VERSION)).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

const put = (name, req, res) => { if (res && res.ok) { const copy = res.clone(); caches.open(name).then(c => c.put(req, copy)); } return res; };

self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  // Jamais de cache pour l'admin, les requêtes authentifiées ni les fichiers en attente de modération.
  if (req.headers.has('authorization') || url.pathname.startsWith('/api/admin') || url.pathname.startsWith('/media/') || url.pathname === '/health') return;
  // Données : réseau d'abord, dernière version connue si hors connexion.
  if (url.pathname.startsWith('/api/')) {
    e.respondWith(fetch(req).then(res => put(API, req, res)).catch(() => caches.match(req).then(r => r || new Response('{"error":"Hors connexion"}', { status: 503, headers: { 'Content-Type': 'application/json' } }))));
    return;
  }
  // Pages : réseau d'abord, sinon l'accueil en cache.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(() => caches.match('/')));
    return;
  }
  // Fichiers du site : servis du cache, mis à jour en arrière-plan.
  e.respondWith(caches.match(req).then(cached => {
    const net = fetch(req).then(res => put(STATIC, req, res)).catch(() => cached);
    return cached || net;
  }));
});
