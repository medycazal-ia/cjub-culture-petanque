'use strict';
/* Animation de fermeture : repas entre membres en plein air, au soleil couchant, murmure de conversation au loin.
   Se joue quand le visiteur quitte le site (bouton « Quitter ») ou que l'admin se déconnecte, puis « referme » le site.
   Dessinée en temps réel (canvas), sons synthétisés (WebAudio) : aucun fichier image, vidéo ou audio. */
(() => {
  const root = document.documentElement;
  const box = document.getElementById('outro');
  if (!box) return;
  const cv = document.getElementById('outro-canvas'), g = cv.getContext('2d');
  const $skip = document.getElementById('outro-skip'), $snd = document.getElementById('outro-sound'), $msg = document.getElementById('outro-msg');
  const $back = document.getElementById('outro-back'), $close = document.getElementById('outro-close'), $hint = document.getElementById('outro-hint');

  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (u) => u * u * (3 - 2 * u);
  const rng = (seed) => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
  const rnd = (a, b) => a + Math.random() * (b - a);

  /* ---------- Chronologie (secondes) ---------- */
  const FADE_IN = 1.0, TOAST = [4.6, 5.2], LOWER = [6.6, 7.2], IRIS = [7.4, 8.8], END = 8.8, AUDIO_LEN = 10.8;
  const LAUGH = [[3.2, 1], [5.5, 1.3], [6.0, 1.1]], CLINKS = [5.0, 5.13, 5.24];

  /* ---------- Mise en page ---------- */
  let W, H, dpr, s, k, hy, ty, sx, SR, bgSky, bgLand, bgVig, motes, people, lastT = 0;
  const mk = () => { const c = document.createElement('canvas'); c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); const x = c.getContext('2d'); x.scale(dpr, dpr); return [c, x]; };
  const PEOPLE = [
    { f: 0.12, hair: 'afro', shirt: '#7a1226', sc: 1.0, ph: 0.3, talk: 1, dl: 0.2 }, { f: 0.255, hair: 'cap', shirt: '#26121a', sc: 1.05, ph: 1.1, talk: 0, dl: 0.0 },
    { f: 0.385, hair: 'scarf', shirt: '#a0702e', sc: 0.98, ph: 2.0, talk: 1, dl: 0.5 }, { f: 0.515, hair: 'short', shirt: '#5a1a28', sc: 1.08, ph: 0.7, talk: 1, dl: 0.1 },
    { f: 0.645, hair: 'bun', shirt: '#8a4a52', sc: 0.97, ph: 2.6, talk: 0, dl: 0.4 }, { f: 0.775, hair: 'hat', shirt: '#2f161d', sc: 1.04, ph: 1.7, talk: 1, dl: 0.3 },
    { f: 0.885, hair: 'short', shirt: '#b04450', sc: 0.92, ph: 0.2, talk: 0, dl: 0.6 }
  ];
  function layout() {
    W = box.clientWidth || innerWidth; H = box.clientHeight || innerHeight; dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const portrait = W < H;
    s = Math.min(W / (portrait ? 560 : 760), H / 560); k = 100 * s;
    hy = H * (portrait ? 0.4 : 0.42); ty = H * (portrait ? 0.7 : 0.69);
    sx = W * 0.7; SR = clamp(W * (portrait ? 0.1 : 0.06), 34, 110);
    people = PEOPLE.map(p => ({ ...p, x: W * p.f }));
    buildBg(); buildFx();
  }

  /* ---------- Décor (mis en cache) ---------- */
  function ridge(c, base, amp, freq, ph, col) {
    c.fillStyle = col; c.beginPath(); c.moveTo(0, hy + 2);
    for (let x = 0; x <= W; x += 6) { const v = 0.12 + 0.88 * smooth(clamp(Math.abs(x - sx) / (W * 0.2), 0, 1)); c.lineTo(x, base - amp * v * (0.5 + 0.5 * Math.sin(x * freq + ph) + 0.3 * Math.sin(x * freq * 2.3 + ph * 1.7))); }
    c.lineTo(W, hy + 2); c.closePath(); c.fill();
  }
  function palm(c, x, y, h, lean, col) {
    c.fillStyle = col; c.strokeStyle = col; c.lineCap = 'round'; c.lineWidth = Math.max(2, h * 0.04);
    const tx = x + lean * h, tY = y - h;
    c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + lean * h * 0.15, y - h * 0.55, tx, tY); c.stroke();
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI * 1.02 + (i / 8) * Math.PI * 1.04, len = h * (0.40 + 0.07 * ((i * 5) % 3));
      const ex = tx + Math.cos(a) * len, ey = tY + Math.sin(a) * len * 0.55 + len * 0.42 * Math.abs(Math.cos(a));
      c.beginPath(); c.moveTo(tx, tY);
      c.quadraticCurveTo(tx + Math.cos(a) * len * 0.5, tY + Math.sin(a) * len * 0.8 - len * 0.14, ex, ey);
      c.quadraticCurveTo(tx + Math.cos(a) * len * 0.55, tY + Math.sin(a) * len * 0.8 + len * 0.08, tx, tY); c.fill();
    }
  }
  function buildBg() {
    let c, gr;
    [bgSky, c] = mk();
    gr = c.createLinearGradient(0, 0, 0, hy);
    gr.addColorStop(0, '#12050b'); gr.addColorStop(0.35, '#3f0d1c'); gr.addColorStop(0.65, '#9a1830'); gr.addColorStop(0.88, '#dd5a68'); gr.addColorStop(1, '#ffa9af');
    c.fillStyle = gr; c.fillRect(0, 0, W, hy + 2);
    [bgLand, c] = mk();
    ridge(c, hy, 0.11 * H, 0.01, 1.3, '#82203a'); ridge(c, hy, 0.065 * H, 0.011, 4.1, '#36091a');
    palm(c, W * 0.5, hy + 2, H * 0.09, 0.1, '#260711'); palm(c, W * 0.58, hy + 2, H * 0.07, -0.08, '#260711');
    gr = c.createLinearGradient(0, hy, 0, H); gr.addColorStop(0, '#c9705f'); gr.addColorStop(0.3, '#a04840'); gr.addColorStop(0.62, '#612620'); gr.addColorStop(1, '#25100c');
    c.fillStyle = gr; c.fillRect(0, hy, W, H - hy);
    const R = rng(5), n = Math.round(W * H / 900);
    for (let i = 0; i < n; i++) { const y = hy + 3 + Math.pow(R(), 1.6) * (H - hy), d = (y - hy) / (H - hy), x = R() * W, sz = 0.6 + d * 3 * (0.5 + R());
      c.fillStyle = `rgba(${20 + R() * 40 | 0},${6 + R() * 14 | 0},${6 + R() * 10 | 0},${0.35 + R() * 0.4})`; c.beginPath(); c.ellipse(x, y, sz, sz * 0.55, 0, 0, TAU); c.fill(); }
    palm(c, W * 0.03, ty + 0.1 * k, H * 0.78, 0.18, '#1a050b'); palm(c, W * 0.97, ty + 0.1 * k, H * 0.74, -0.2, '#1a050b');
    [bgVig, c] = mk();
    gr = c.createRadialGradient(W / 2, H * 0.55, Math.min(W, H) * 0.35, W / 2, H * 0.55, Math.max(W, H) * 0.75);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(6,1,3,.62)'); c.fillStyle = gr; c.fillRect(0, 0, W, H);
  }
  function buildFx() {
    const R = rng(23);
    motes = Array.from({ length: 46 }, () => ({ x: R() * W, y: H * 0.15 + R() * H * 0.7, v: 3 + R() * 8, ph: R() * TAU, z: 0.4 + R() }));
  }

  /* ---------- Personnages ---------- */
  const RIM = 'rgba(255,165,128,';
  function shape(fn, color, L, rimOn = true) {
    const o = Math.max(1.5, 0.016 * k);
    if (rimOn) { g.save(); g.translate(o, -o * 0.45); g.fillStyle = RIM + 0.75 * L + ')'; g.beginPath(); fn(); g.fill(); g.restore(); }
    g.fillStyle = color; g.beginPath(); fn(); g.fill();
  }
  function limb(a, b, w, col, L) {
    const o = Math.max(1.5, 0.016 * k); g.lineCap = 'round';
    g.strokeStyle = RIM + 0.75 * L + ')'; g.lineWidth = w; g.beginPath(); g.moveTo(a.x + o, a.y - o * 0.45); g.lineTo(b.x + o, b.y - o * 0.45); g.stroke();
    g.strokeStyle = col; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
  }
  function glass(x, y, u) {
    const w = 0.075 * u, h = 0.12 * u;
    g.fillStyle = 'rgba(255,225,205,.3)'; g.beginPath(); g.moveTo(x - w / 2, y - h); g.lineTo(x + w / 2, y - h); g.lineTo(x + w * 0.38, y); g.lineTo(x - w * 0.38, y); g.closePath(); g.fill();
    g.fillStyle = '#c97a2a'; g.beginPath(); g.moveTo(x - w * 0.46, y - h * 0.62); g.lineTo(x + w * 0.46, y - h * 0.62); g.lineTo(x + w * 0.38, y); g.lineTo(x - w * 0.38, y); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(255,240,225,.85)'; g.lineWidth = Math.max(1, 0.006 * u); g.beginPath(); g.moveTo(x - w * 0.46, y - h * 0.98); g.lineTo(x - w * 0.34, y - h * 0.1); g.stroke();
  }
  function head(p, hx, hyy, hr, L, t) {
    const dark = '#24100e', hair = '#0f0508';
    switch (p.hair) {
      case 'afro': shape(() => g.arc(hx, hyy - hr * 0.2, hr * 1.5, 0, TAU), hair, L); break;
      case 'bun': shape(() => { g.arc(hx + hr * 0.5, hyy - hr * 1.15, hr * 0.5, 0, TAU); }, hair, L); break;
    }
    shape(() => g.ellipse(hx, hyy, hr * 0.88, hr, 0, 0, TAU), dark, L);
    switch (p.hair) {
      case 'short': case 'bun': shape(() => g.arc(hx, hyy - hr * 0.08, hr * 0.95, Math.PI * 1.02, TAU * 0.999), hair, L, false); break;
      case 'cap': shape(() => g.arc(hx, hyy - hr * 0.1, hr * 0.98, Math.PI * 0.98, TAU), '#7a1226', L);
        shape(() => { g.moveTo(hx + hr * 0.2, hyy - hr * 0.12); g.quadraticCurveTo(hx + hr * 1.7, hyy - hr * 0.1, hx + hr * 1.5, hyy + hr * 0.2); g.lineTo(hx + hr * 0.3, hyy + hr * 0.05); }, '#7a1226', L); break;
      case 'scarf': shape(() => g.arc(hx, hyy - hr * 0.1, hr * 0.98, Math.PI * 0.96, TAU * 1.0), '#b3202f', L);
        g.fillStyle = '#d9a82a'; for (let i = 0; i < 4; i++) { g.fillRect(hx - hr * 0.9 + i * hr * 0.47, hyy - hr * 1.0, hr * 0.12, hr * 0.8); }
        shape(() => { g.moveTo(hx - hr * 0.3, hyy - hr * 0.95); g.lineTo(hx - hr * 0.1, hyy - hr * 1.65); g.lineTo(hx + hr * 0.45, hyy - hr * 1.0); }, '#c9302c', L); break;
      case 'hat': shape(() => g.ellipse(hx, hyy - hr * 0.62, hr * 1.95, hr * 0.34, -0.05, 0, TAU), '#a07c44', L);
        shape(() => g.ellipse(hx, hyy - hr * 0.78, hr * 0.85, hr * 0.62, 0, Math.PI, TAU), '#b8924f', L); break;
    }
  }
  function person(p, t, L, laugh, raise) {
    const sc = p.sc * k, x = p.x, bob = Math.sin(t * (1.1 + p.talk * 0.8) + p.ph) * 0.006 * sc + laugh * Math.sin(t * 23 + p.ph) * 0.012 * sc;
    const shY = ty - 0.62 * sc + bob, hx = x + Math.sin(t * 0.9 + p.ph) * 0.014 * sc, hyy = shY - 0.22 * sc + bob * 0.4, hr = 0.115 * sc;
    const R = clamp(raise * 1.0, 0, 1);
    const rS = { x: x + 0.24 * sc, y: shY + 0.05 * sc }, rE = { x: lerp(x + 0.31 * sc, x + 0.37 * sc, R), y: lerp(ty - 0.05 * sc, shY + 0.22 * sc, R) };
    const rH = { x: lerp(x + 0.15 * sc, x + 0.31 * sc, R), y: lerp(ty - 0.04 * sc, shY - 0.27 * sc + Math.sin(t * 7 + p.ph) * 0.01 * sc * R, R) };
    const gest = p.talk ? Math.max(0, Math.sin(t * 1.3 + p.ph * 2)) * 0.07 * sc : 0;
    const lS = { x: x - 0.24 * sc, y: shY + 0.05 * sc }, lE = { x: x - 0.31 * sc, y: ty - 0.05 * sc - gest * 0.6 }, lH = { x: x - 0.13 * sc, y: ty - 0.04 * sc - gest };
    const shirt = p.shirt, skin = '#24100e';
    limb(lS, lE, 0.1 * sc, shirt, L); limb(lE, lH, 0.085 * sc, skin, L);
    shape(() => {                                                           // buste
      g.moveTo(x - 0.27 * sc, ty + 2); g.lineTo(x - 0.29 * sc, shY + 0.08 * sc + bob); g.quadraticCurveTo(x - 0.29 * sc, shY, x - 0.17 * sc, shY - 0.01 * sc);
      g.lineTo(x - 0.05 * sc, shY - 0.04 * sc); g.lineTo(x + 0.05 * sc, shY - 0.04 * sc); g.lineTo(x + 0.17 * sc, shY - 0.01 * sc); g.quadraticCurveTo(x + 0.29 * sc, shY, x + 0.29 * sc, shY + 0.08 * sc + bob); g.lineTo(x + 0.27 * sc, ty + 2); }, shirt, L);
    shape(() => g.rect(hx - 0.04 * sc, hyy + hr * 0.6, 0.08 * sc, shY - hyy), skin, L);
    head(p, hx, hyy, hr, L, t);
    limb(rS, rE, 0.1 * sc, shirt, L); limb(rE, rH, 0.085 * sc, skin, L);
    if (R > 0.05) glass(rH.x, rH.y - 0.02 * sc, sc);
  }
  function backView(x, y, u, L) {                                              // silhouette de dos, au premier plan
    shape(() => g.ellipse(x, y + 0.34 * u, 0.46 * u, 0.3 * u, 0, 0, TAU), '#0b0307', L);
    shape(() => g.arc(x, y, 0.17 * u, 0, TAU), '#0b0307', L);
  }

  /* ---------- Table ---------- */
  function table(t, L, Lb) {
    const tw = W * 0.94, x0 = (W - tw) / 2, y0 = ty, y1 = ty + 0.17 * k, y2 = y1 + 0.34 * k;
    // dessus (perspective) : madras rouge, jaune et sombre
    g.fillStyle = '#c9952f'; g.beginPath(); g.moveTo(x0 + tw * 0.03, y0); g.lineTo(x0 + tw * 0.97, y0); g.lineTo(x0 + tw, y1); g.lineTo(x0, y1); g.closePath(); g.fill();
    g.save(); g.clip();
    for (let i = 0; i < 38; i++) { const x = x0 + (i / 38) * tw; g.fillStyle = i % 4 === 0 ? 'rgba(179,32,47,.8)' : i % 4 === 2 ? 'rgba(30,12,22,.55)' : 'rgba(255,230,160,.18)'; g.fillRect(x, y0, tw / 38 * 0.55, y1 - y0); }
    g.restore();
    g.fillStyle = '#b8862b'; g.fillRect(x0, y1, tw, y2 - y1);                     // retombée
    g.save(); g.beginPath(); g.rect(x0, y1, tw, y2 - y1); g.clip();
    for (let i = 0; i < 56; i++) { const x = x0 + (i / 56) * tw; g.fillStyle = i % 4 === 0 ? 'rgba(160,26,40,.85)' : i % 4 === 2 ? 'rgba(25,10,18,.6)' : 'rgba(255,225,150,.2)'; g.fillRect(x, y1, tw / 56 * 0.55, y2 - y1); }
    for (let j = 0; j < 4; j++) { g.fillStyle = j % 2 ? 'rgba(25,10,18,.35)' : 'rgba(179,32,47,.35)'; g.fillRect(x0, y1 + j * (y2 - y1) / 4, tw, (y2 - y1) / 9); }
    const sh = g.createLinearGradient(0, y1, 0, y2); sh.addColorStop(0, 'rgba(0,0,0,.05)'); sh.addColorStop(1, 'rgba(0,0,0,.55)'); g.fillStyle = sh; g.fillRect(x0, y1, tw, y2 - y1); g.restore();
    // plats, assiettes, verres, bouteilles
    const py = y0 + (y1 - y0) * 0.55;
    people.forEach((p, i) => { const px = p.x + 0.02 * k;
      g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(px, py + 0.012 * k, 0.17 * k, 0.04 * k, 0, 0, TAU); g.fill();
      g.fillStyle = '#f2dccb'; g.beginPath(); g.ellipse(px, py, 0.16 * k, 0.036 * k, 0, 0, TAU); g.fill();
      g.fillStyle = '#d8b9a4'; g.beginPath(); g.ellipse(px, py, 0.1 * k, 0.022 * k, 0, 0, TAU); g.fill();
      if (i % 2 === 0) { g.fillStyle = '#7a3a1c'; g.beginPath(); g.ellipse(px - 0.02 * k, py - 0.004 * k, 0.05 * k, 0.012 * k, 0, 0, TAU); g.fill(); }
      if (raiseOf(t, p) < 0.05) glass(p.x + 0.2 * k, py - 0.01 * k, p.sc * k);
    });
    [W * 0.32, W * 0.7].forEach((bx, i) => { const bh = 0.3 * k; g.fillStyle = i ? '#1f3a1d' : '#2a1208'; g.beginPath(); g.moveTo(bx - 0.04 * k, py); g.lineTo(bx - 0.04 * k, py - bh * 0.6); g.lineTo(bx - 0.018 * k, py - bh * 0.75); g.lineTo(bx - 0.018 * k, py - bh); g.lineTo(bx + 0.018 * k, py - bh); g.lineTo(bx + 0.018 * k, py - bh * 0.75); g.lineTo(bx + 0.04 * k, py - bh * 0.6); g.lineTo(bx + 0.04 * k, py); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,200,180,.55)'; g.fillRect(bx + 0.02 * k, py - bh * 0.62, 0.008 * k, bh * 0.5); });
    const dx = W * 0.5, dy = py + 0.012 * k;                                   // grand plat
    g.fillStyle = 'rgba(0,0,0,.3)'; g.beginPath(); g.ellipse(dx, dy + 0.02 * k, 0.28 * k, 0.05 * k, 0, 0, TAU); g.fill();
    g.fillStyle = '#3a1a14'; g.beginPath(); g.ellipse(dx, dy, 0.26 * k, 0.05 * k, 0, 0, TAU); g.fill();
    g.fillStyle = '#d98a3a'; g.beginPath(); g.ellipse(dx, dy - 0.012 * k, 0.22 * k, 0.04 * k, 0, 0, TAU); g.fill();
    for (let i = 0; i < 5; i++) { const sx2 = dx + (i - 2) * 0.07 * k + Math.sin(t * 0.8 + i) * 0.01 * k, f = ((t * 0.35 + i * 0.21) % 1);   // vapeur
      const gr = g.createRadialGradient(sx2, dy - 0.15 * k - f * 0.5 * k, 0, sx2, dy - 0.15 * k - f * 0.5 * k, 0.12 * k); gr.addColorStop(0, `rgba(255,225,205,${0.2 * (1 - f) * L})`); gr.addColorStop(1, 'rgba(255,225,205,0)'); g.fillStyle = gr; g.fillRect(sx2 - 0.15 * k, dy - 0.7 * k, 0.3 * k, 0.6 * k); }
  }
  const raiseOf = (t, p) => { const d = p.dl * 0.35; return smooth(clamp((t - TOAST[0] - d) / (TOAST[1] - TOAST[0]), 0, 1)) * (1 - smooth(clamp((t - LOWER[0] - d * 0.5) / (LOWER[1] - LOWER[0]), 0, 1))); };
  const laughAt = (t) => { let v = 0; LAUGH.forEach(([lt, a]) => { if (t > lt && t < lt + 1.1) v = Math.max(v, a * Math.sin((t - lt) / 1.1 * Math.PI)); }); return v; };

  /* ---------- Image ---------- */
  function strings(t, Lb) {
    const rows = [[0.02, 0.2, 0.98, 0.23, 0.1], [0.02, 0.1, 0.98, 0.12, 0.13]], bulbs = [];
    rows.forEach(([ax, ay, bx, by, sag]) => {
      const p0 = { x: W * ax, y: H * ay }, p2 = { x: W * bx, y: H * by }, p1 = { x: W * 0.5, y: Math.max(H * ay, H * by) + H * sag };
      g.strokeStyle = 'rgba(12,3,6,.9)'; g.lineWidth = Math.max(1, 0.012 * k); g.beginPath(); g.moveTo(p0.x, p0.y); g.quadraticCurveTo(p1.x, p1.y, p2.x, p2.y); g.stroke();
      const n = 15; for (let i = 1; i < n; i++) { const u = i / n, x = (1 - u) * (1 - u) * p0.x + 2 * u * (1 - u) * p1.x + u * u * p2.x, y = (1 - u) * (1 - u) * p0.y + 2 * u * (1 - u) * p1.y + u * u * p2.y; bulbs.push({ x, y, i }); }
    });
    g.save(); g.globalCompositeOperation = 'lighter';
    bulbs.forEach(b => { const fl = 0.85 + 0.15 * Math.sin(t * 5 + b.i * 1.7 + b.x * 0.01), on = clamp(Lb * fl, 0, 1), r1 = 0.26 * k;
      const gr = g.createRadialGradient(b.x, b.y, 0, b.x, b.y, r1); gr.addColorStop(0, `rgba(255,214,120,${0.55 * on})`); gr.addColorStop(0.3, `rgba(255,170,80,${0.2 * on})`); gr.addColorStop(1, 'rgba(255,150,70,0)');
      g.fillStyle = gr; g.fillRect(b.x - r1, b.y - r1, 2 * r1, 2 * r1); }); g.restore();
    bulbs.forEach(b => { const fl = 0.85 + 0.15 * Math.sin(t * 5 + b.i * 1.7 + b.x * 0.01); g.fillStyle = `rgba(255,238,190,${clamp(Lb * fl, 0.15, 1)})`; g.beginPath(); g.arc(b.x, b.y, Math.max(2, 0.018 * k), 0, TAU); g.fill(); });
  }
  function draw(t) {
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    const dusk = smooth(clamp(t / 8.5, 0, 1)), Lb = smooth(clamp((t - 0.5) / 1.8, 0, 1)), L = 1 - 0.55 * dusk;
    const zoom = 1 + 0.05 * (1 - smooth(clamp(t / 8.6, 0, 1)));              // lent recul
    g.translate(W / 2, ty - 0.5 * k); g.scale(zoom, zoom); g.translate(-W / 2, -(ty - 0.5 * k));
    g.drawImage(bgSky, 0, 0, W, H);
    const sunY = hy - SR * 0.12 + SR * 1.3 * smooth(clamp(t / 8.4, 0, 1)), sl = 1 - 0.7 * dusk;                // le soleil se couche
    g.save(); g.beginPath(); g.rect(0, 0, W, hy); g.clip();
    let gr = g.createRadialGradient(sx, sunY, SR * 0.4, sx, sunY, SR * 4.2); gr.addColorStop(0, `rgba(255,110,125,${0.75 * sl})`); gr.addColorStop(1, 'rgba(255,110,125,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, hy);
    gr = g.createRadialGradient(sx, sunY, 0, sx, sunY, SR); gr.addColorStop(0, 'rgba(255,215,218,1)'); gr.addColorStop(0.7, 'rgba(255,140,152,1)'); gr.addColorStop(1, 'rgba(255,104,118,1)');
    g.globalAlpha = clamp(sl * 1.3, 0, 1); g.fillStyle = gr; g.beginPath(); g.arc(sx, sunY, SR, 0, TAU); g.fill(); g.restore();
    g.drawImage(bgLand, 0, 0, W, H);
    // lumière chaude des guirlandes sur la tablée
    g.save(); g.globalCompositeOperation = 'lighter'; gr = g.createRadialGradient(W / 2, ty - 0.2 * k, 0, W / 2, ty - 0.2 * k, W * 0.55); gr.addColorStop(0, `rgba(255,170,90,${0.22 * Lb})`); gr.addColorStop(1, 'rgba(255,170,90,0)');
    g.fillStyle = gr; g.fillRect(0, 0, W, H); g.restore();
    // poussières / lucioles
    g.save(); g.globalCompositeOperation = 'lighter';
    motes.forEach(m => { const x = (m.x + t * m.v * m.z * 0.6) % W, y = m.y + Math.sin(t * 0.8 + m.ph) * 8, a = (0.1 + 0.3 * (0.5 + 0.5 * Math.sin(t * 2.2 + m.ph))) * Lb;
      g.fillStyle = `rgba(255,220,130,${a})`; g.beginPath(); g.arc(x, y, (0.8 + m.z) * s, 0, TAU); g.fill(); }); g.restore();
    const laugh = laughAt(t);
    people.forEach(p => person(p, t, L, laugh, raiseOf(t, p)));
    table(t, L, Lb);
    backView(W * 0.075, H * 0.9, 1.25 * k, L); backView(W * 0.93, H * 0.93, 1.35 * k, L);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = `rgba(14,3,10,${0.5 * dusk})`; g.fillRect(0, 0, W, H);       // la nuit tombe
    g.translate(W / 2, ty - 0.5 * k); g.scale(zoom, zoom); g.translate(-W / 2, -(ty - 0.5 * k)); strings(t, Lb); g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.drawImage(bgVig, 0, 0, W, H);
    const fade = 1 - smooth(clamp(t / FADE_IN, 0, 1)); if (fade > 0) { g.fillStyle = `rgba(8,2,5,${fade})`; g.fillRect(0, 0, W, H); }
    if (t > IRIS[0]) {                                                          // le site se referme : iris
      const u = smooth(clamp((t - IRIS[0]) / (IRIS[1] - IRIS[0]), 0, 1)), rad = Math.hypot(W, H) * 0.62 * (1 - u);
      g.fillStyle = '#080204'; g.beginPath(); g.rect(0, 0, W, H); if (rad > 0.5) g.arc(W / 2, ty - 0.45 * k, rad, 0, TAU, true); g.fill('evenodd');
    }
  }

  /* ---------- Sons : murmure de conversation lointaine (synthétisé) ---------- */
  let ac = null, master = null, noise = null, muted = false, mix = null, samples = {}, gotSamples = false;
  try { muted = localStorage.getItem('ccp-intro-mute') === '1'; } catch (e) {}
  /* ---------- Musique : composition originale de style biguine (libre de droits), instruments synthétisés ---------- */
  const BPM = 112, SIX = 60 / BPM / 4;                                             // durée d'une double-croche (mesure à 2/4 = 8 doubles-croches)
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const CH = [ { b: 41, f: 48, g: [57, 60, 62, 65] },      // 0  Fa6
               { b: 38, f: 45, g: [57, 60, 62, 66] },      // 1  Ré7
               { b: 43, f: 50, g: [55, 58, 62, 65] },      // 2  Sol m7
               { b: 48, f: 43, g: [55, 58, 60, 64] },      // 3  Do7
               { b: 38, f: 45, g: [57, 60, 62, 65] } ];    // 4  Ré m7
  const PROG = [0, 1, 2, 3, 0, 4, 2, 3];
  const MEL = [   // [double-croche, note MIDI, durée, ornement]  g = broderie, s = glissé
    [[0, 69, 2, 's'], [2, 72, 1], [3, 69, 1, 'g'], [4, 67, 2], [6, 65, 2, 'g']],
    [[0, 69, 2, 'g'], [2, 74, 1], [3, 72, 1], [4, 69, 2, 's'], [6, 66, 2]],
    [[0, 70, 2, 's'], [2, 74, 1], [3, 70, 1, 'g'], [4, 67, 2], [6, 65, 1], [7, 67, 1]],
    [[0, 64, 2, 'g'], [2, 67, 1], [3, 70, 1], [4, 72, 4, 's']],
    [[0, 72, 2, 's'], [2, 77, 1], [3, 76, 1, 'g'], [4, 74, 2], [6, 72, 2, 'g']],
    [[0, 74, 2, 'g'], [2, 72, 1], [3, 69, 1], [4, 65, 2, 's'], [6, 69, 2]],
    [[0, 70, 2, 's'], [2, 67, 2, 'g'], [4, 70, 1], [5, 72, 1, 'g'], [6, 74, 2]],
    [[0, 72, 3, 's'], [3, 70, 1], [4, 69, 2, 'g'], [6, 65, 2]] ];
  const kcache = new WeakMap();
  function pluckBuf(c, midi, kind) {                                              // corde pincée (Karplus-Strong), mise en cache par note
    let m = kcache.get(c); if (!m) kcache.set(c, m = new Map());
    const key = kind + midi; if (m.has(key)) return m.get(key);
    const sr = c.sampleRate, N = Math.max(2, Math.round(sr / mtof(midi))), len = Math.round(sr * (kind === 'bass' ? 0.9 : 0.75)), buf = c.createBuffer(1, len, sr), d = buf.getChannelData(0);
    let prev = 0; const soft = kind === 'bass' ? 0.8 : 0.5; for (let i = 0; i < N; i++) { prev = prev * soft + (Math.random() * 2 - 1) * (1 - soft); d[i] = prev; }
    const damp = kind === 'bass' ? 0.993 : 0.9965;
    for (let i = N; i < len; i++) d[i] = damp * 0.5 * (d[i - N] + (i - N - 1 >= 0 ? d[i - N - 1] : d[i - N]));
    let pk = 0; for (let i = 0; i < len; i++) pk = Math.max(pk, Math.abs(d[i])); for (let i = 0; i < len; i++) d[i] /= pk || 1;
    m.set(key, buf); return buf;
  }
  function music(c, dest, t0) {
    const out = c.createGain(); out.gain.value = 0.3; out.connect(dest);                                         // niveau de fond sonore
    // Espace : petite réverbération de terrasse (réponse impulsionnelle synthétique, adoucie)
    const ir = c.createBuffer(1, Math.round(c.sampleRate * 1.1), c.sampleRate), id = ir.getChannelData(0); let pv = 0;
    for (let i = 0; i < id.length; i++) { const x = i / c.sampleRate; pv = pv * 0.55 + (Math.random() * 2 - 1) * 0.45; id[i] = pv * Math.exp(-x / 0.3) * (1 - Math.exp(-x / 0.012)); }
    const rev = c.createConvolver(); rev.buffer = ir; const rwet = c.createGain(); rwet.gain.value = 0.32; out.connect(rev); rev.connect(rwet); rwet.connect(dest);
    // Chaque instrument a sa place gauche/droite
    const bus = (v, f, pan) => { const gn = c.createGain(); gn.gain.value = v; let tail = gn;
      if (f) { const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = f; tail.connect(lp); tail = lp; }
      if (pan && c.createStereoPanner) { const pn = c.createStereoPanner(); pn.pan.value = pan; tail.connect(pn); tail = pn; }
      tail.connect(out); return gn; };
    const gtr = bus(0.2, 4200, -0.35), bas = bus(0.34, 900, 0), led = bus(0.2, 3000, 0.18), prc = bus(0.16, 0, 0.45);
    const hit = (b, t, buf, v) => { const src = c.createBufferSource(); src.buffer = buf; const gn = c.createGain(); gn.gain.value = v; src.connect(gn); gn.connect(b); src.start(t); };
    const nz = (() => { const b = c.createBuffer(1, c.sampleRate, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; })();
    const click = (t, f, q, v, dec, bus2) => { const src = c.createBufferSource(); src.buffer = nz; const fl = c.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = f; fl.Q.value = q; const gn = c.createGain();
      gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(Math.max(v, 0.0002), t + 0.002); gn.gain.exponentialRampToValueAtTime(0.0001, t + dec); src.connect(fl); fl.connect(gn); gn.connect(bus2 || prc); src.start(t, Math.random() * 0.5); src.stop(t + dec + 0.02); };
    const thud = (t, f0, f1, v, dec) => { const o = c.createOscillator(); o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dec * 0.7); const gn = c.createGain();
      gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(v, t + 0.004); gn.gain.exponentialRampToValueAtTime(0.0001, t + dec); o.connect(gn); gn.connect(prc); o.start(t); o.stop(t + dec + 0.03); };
    const wave = (() => { const re = new Float32Array(10), im = new Float32Array(10); [[1, 1], [3, 0.45], [5, 0.25], [7, 0.12], [9, 0.06]].forEach(([n, a]) => { im[n] = a; }); return c.createPeriodicWave(re, im); })();   // timbre de clarinette : harmoniques impairs
    const lead = (t, midi, dur, v, orn) => {
      const o = c.createOscillator(); o.setPeriodicWave(wave); const f = mtof(midi); o.detune.value = (Math.random() - 0.5) * 12;                         // légère instabilité de hauteur, comme un vrai souffle
      if (orn === 's') { o.frequency.setValueAtTime(f * 0.944, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.07); } else o.frequency.value = f;       // glissé d'attaque
      const lf = c.createOscillator(); lf.frequency.value = 5.2 + Math.random() * 0.5; const lg = c.createGain(); lg.gain.setValueAtTime(0.0001, t); lg.gain.linearRampToValueAtTime(f * 0.006, t + Math.min(0.35, dur * 0.7)); lf.connect(lg); lg.connect(o.frequency);   // vibrato qui s'installe
      const gn = c.createGain(); gn.gain.setValueAtTime(0.0001, t); gn.gain.linearRampToValueAtTime(v, t + 0.03); gn.gain.setValueAtTime(v * 0.88, t + Math.max(0.05, dur - 0.09)); gn.gain.linearRampToValueAtTime(0.0001, t + dur);
      o.connect(gn); gn.connect(led); o.start(t); lf.start(t); o.stop(t + dur + 0.02); lf.stop(t + dur + 0.02);
      const br = c.createBufferSource(); br.buffer = nz; const bf = c.createBiquadFilter(); bf.type = 'bandpass'; bf.frequency.value = 2600; bf.Q.value = 0.9; const bg = c.createGain();   // souffle dans l'anche
      bg.gain.setValueAtTime(0.0001, t); bg.gain.linearRampToValueAtTime(v * 0.07, t + 0.02); bg.gain.exponentialRampToValueAtTime(v * 0.025, t + 0.12); bg.gain.linearRampToValueAtTime(0.0001, t + dur);
      br.connect(bf); bf.connect(bg); bg.connect(led); br.start(t, Math.random() * 0.5); br.stop(t + dur + 0.02);
      if (orn === 'g') { const o2 = c.createOscillator(); o2.setPeriodicWave(wave); o2.frequency.value = mtof(midi - 2); const g2 = c.createGain();   // note d'ornement juste avant
        g2.gain.setValueAtTime(0.0001, t - 0.06); g2.gain.linearRampToValueAtTime(v * 0.6, t - 0.045); g2.gain.linearRampToValueAtTime(0.0001, t); o2.connect(g2); g2.connect(led); o2.start(t - 0.06); o2.stop(t + 0.01); } };
    const strum = (ch, t, down, v) => { const notes = down ? ch.g : ch.g.slice().reverse(); notes.forEach((n, i) => hit(gtr, t + i * 0.009, pluckBuf(c, n, 'gtr'), v * (0.75 + 0.25 * (down ? i : 3 - i) / 3))); };
    // Phrasé : nuances qui montent vers le milieu, puis retombent ; la dernière mesure ralentit (ritardando)
    const nBars = 8, bar = SIX * 8, VEL = [0.85, 0.9, 0.95, 1.0, 1.0, 1.06, 1.0, 0.9], STRETCH = [1, 1, 1, 1, 1, 1, 1.05, 1.14];
    const starts = []; let acc = t0; for (let i = 0; i < nBars; i++) { starts.push(acc); acc += bar * STRETCH[i]; }
    for (let i = 0; i < nBars; i++) {
      const ch = CH[PROG[i]], b0 = starts[i], f = STRETCH[i], vel = VEL[i];
      const at = (slot) => b0 + (slot + (slot % 2 ? 0.14 : 0)) * SIX * f + (Math.random() - 0.5) * 0.008;               // léger swing : les doubles-croches faibles sont un peu retardées
      [[0, 1, 1], [2, 0, 0.55], [3, 1, 0.9], [5, 0, 0.55], [6, 1, 0.8]].forEach(([sl, dn, v]) => strum(ch, at(sl), !!dn, v * vel));         // guitare d'accompagnement syncopée
      [[0, ch.b, 1], [3, ch.f, 0.7], [4, ch.b, 0.8], [6, ch.f, 0.6]].forEach(([sl, n, v]) => hit(bas, at(sl), pluckBuf(c, n, 'bass'), v * vel));   // basse
      [[0, 0.5], [3, 0.4], [4, 0.45], [6, 0.35]].forEach(([sl, v]) => { click(at(sl), 2600, 5, v, 0.03); thud(at(sl), 1500, 1300, v * 0.35, 0.025); });  // tibwa (bambou)
      for (let sl = 0; sl < 8; sl++) click(at(sl), 8000, 1.2, [0.5, 0.2, 0.34, 0.2][sl % 4] * 0.9, 0.035);                                      // chacha (maracas)
      thud(at(0), 170, 105, 0.45, 0.13); thud(at(4), 280, 190, 0.32, 0.1);                                                                     // tanbou
      const nx = CH[PROG[(i + 1) % nBars]]; hit(bas, at(7), pluckBuf(c, nx.b - 1, 'bass'), 0.42 * vel);                                         // approche chromatique de la basse
      MEL[i].forEach(([sl, n, len, orn]) => lead(at(sl) + 0.004, n, len * SIX * f * 0.95, (0.5 + (sl % 4 === 3 ? 0.12 : 0)) * vel, orn));
    }
    const tf = acc;                                                                                                                             // dernier accord
    strum(CH[0], tf, true, 1); hit(bas, tf, pluckBuf(c, 41, 'bass'), 1); lead(tf, 69, 1.5, 0.45, 's'); thud(tf, 170, 105, 0.4, 0.13);
    [0, 0.07].forEach((d, k2) => click(tf + d, 2600, 5, 0.4 - k2 * 0.1, 0.04));
  }
  function clink(c, dest, t, vol) {
    [[2900, 0.3, 0.55], [4400, 0.2, 0.38], [6300, 0.12, 0.26]].forEach(([f, a, d]) => { const o = c.createOscillator(); o.frequency.value = f * rnd(0.985, 1.015); const gn = c.createGain();
      gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(a * vol, t + 0.002); gn.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(gn); gn.connect(dest); o.start(t); o.stop(t + d + 0.05); });
  }
  function crickets(c, dest, t0, dur) {
    const o = c.createOscillator(); o.frequency.value = 4300; const am = c.createGain(); am.gain.value = 0; const lfo = c.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 26; const lg = c.createGain(); lg.gain.value = 0.5; lfo.connect(lg); lg.connect(am.gain);
    const gate = c.createGain(); gate.gain.value = 0.0001; for (let t = t0; t < t0 + dur; t += 1.1) { gate.gain.setTargetAtTime(0.004, t, 0.05); gate.gain.setTargetAtTime(0.0001, t + 0.45, 0.05); }
    o.connect(am); am.connect(gate); gate.connect(dest); o.start(t0); lfo.start(t0); o.stop(t0 + dur); lfo.stop(t0 + dur);
  }
  function ambience(c, dest, t0, dur, withVoices) {                              // tout le fond sonore
    const LEVEL = 1, bus = c.createGain(), hp = c.createBiquadFilter(), lp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 140; lp.type = 'lowpass'; lp.frequency.value = 2800; lp.Q.value = 0.5;
    bus.gain.value = LEVEL; bus.connect(hp); hp.connect(lp); lp.connect(dest);
    const dl = c.createDelay(0.5); dl.delayTime.value = 0.11; const fb = c.createGain(); fb.gain.value = 0.22; const wet = c.createGain(); wet.gain.value = 0.35;   // air libre : léger écho lointain
    const dlp = c.createBiquadFilter(); dlp.type = 'lowpass'; dlp.frequency.value = 1800; lp.connect(dl); dl.connect(dlp); dlp.connect(fb); fb.connect(dl); dlp.connect(wet); wet.connect(dest);
    if (withVoices) music(c, dest, t0 + 0.35);
    CLINKS.forEach((ct, i) => { if (t0 + ct >= c.currentTime) clink(c, bus, t0 + ct, 0.05 * (1 - i * 0.2)); });
    crickets(c, bus, t0, dur);
  }
  function noiseOf(c) { if (c === ac && noise) return noise; const b = c.createBuffer(1, c.sampleRate * 2, c.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; }

  function initAudio() {
    if (ac) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try {
      ac = new AC(); const comp = ac.createDynamicsCompressor(); master = ac.createGain(); master.gain.value = muted ? 0 : 0.9; master.connect(comp); comp.connect(ac.destination); noise = noiseOf(ac); ac.onstatechange = sndLabel;
    } catch (e) { ac = null; }
  }
  // Vrais enregistrements (public/sounds/sons.json) : téléchargés à l'avance, décodés au moment de jouer.
  const raw = {}; let prefetched = null;
  const b64 = (u) => { const bin = atob(u.split(',')[1]), a = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) a[i] = bin.charCodeAt(i); return a.buffer; };
  function prefetch() {
    if (prefetched) return prefetched;
    if (window.__DEMO_SOUNDS) { Object.keys(window.__DEMO_SOUNDS).forEach(n => { raw[n] = b64(window.__DEMO_SOUNDS[n]); }); return (prefetched = Promise.resolve()); }
    prefetched = fetch('sounds/sons.json').then(res => res.ok ? res.json() : {}).then(map => Promise.all(['musique', 'ambiance', 'trinquer'].filter(n => map[n]).map(n =>
      fetch('sounds/' + map[n]).then(res => res.arrayBuffer()).then(buf => { raw[n] = buf; }).catch(() => {})))).catch(() => {});
    return prefetched;
  }
  async function decodeAll() {
    await Promise.race([prefetch(), new Promise(ok => setTimeout(ok, 1500))]);
    for (const n of Object.keys(raw)) if (!samples[n]) { try { samples[n] = await ac.decodeAudioData(raw[n].slice(0)); } catch (e) {} }
  }
  // late : secondes déjà écoulées dans la scène quand le son démarre (le morceau saute ce début pour rester calé sur l'image)
  function startAudio(late) {
    if (!ac) return; late = clamp(late || 0, 0, 1.6); const now = ac.currentTime + 0.05, t0s = now - late, end = now + AUDIO_LEN - late;
    mix = ac.createGain(); mix.gain.setValueAtTime(0.0001, now); mix.gain.linearRampToValueAtTime(1, now + 1.6); mix.gain.setValueAtTime(1, end - 1.8); mix.gain.linearRampToValueAtTime(0.0001, end); mix.connect(master);
    const mus = samples.musique || samples.ambiance;
    if (mus) {                                                                   // vrai morceau (zouk) : un temps fort tombe à 5 s de scène, au moment du toast
      const src = ac.createBufferSource(); src.buffer = mus; src.loop = true; const gn = ac.createGain(); gn.gain.value = 0.8; src.connect(gn); gn.connect(mix); src.start(now, late % mus.duration); src.stop(end + 0.2);
      ambience(ac, mix, t0s, AUDIO_LEN, false);
    } else ambience(ac, mix, t0s, AUDIO_LEN, true);                              // sinon : mélodie synthétisée
    if (samples.trinquer && t0s + CLINKS[0] >= ac.currentTime) { const src = ac.createBufferSource(); src.buffer = samples.trinquer; const gn = ac.createGain(); gn.gain.value = 0.5; src.connect(gn); gn.connect(mix); src.start(t0s + CLINKS[0]); }
  }
  function sndLabel() {
    if (!ac) { $snd.hidden = true; return; } $snd.hidden = false;
    $snd.textContent = muted ? '🔇 Son coupé' : ac.state === 'running' ? '🔊 Son activé' : '🔇 Activer le son';
  }
  $snd.addEventListener('click', () => {
    if (!ac) return;
    if (muted) { muted = false; try { localStorage.setItem('ccp-intro-mute', '0'); } catch (e) {} ac.resume(); master.gain.setTargetAtTime(0.9, ac.currentTime, 0.05); }
    else if (ac.state !== 'running') ac.resume();
    else { muted = true; try { localStorage.setItem('ccp-intro-mute', '1'); } catch (e) {} master.gain.setTargetAtTime(0, ac.currentTime, 0.05); }
    sndLabel();
  });

  /* ---------- Boucle ---------- */
  let raf = 0, t0 = null, running = false, mode = 'quit', playId = 0;
  function showCard() {
    running = false; cancelAnimationFrame(raf); box.classList.add('closed');
    $msg.textContent = mode === 'logout' ? 'Vous êtes déconnecté. Merci de votre visite !' : 'Merci de votre visite !';
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.fillStyle = '#080204'; g.fillRect(0, 0, W, H); $back.focus({ preventScroll: true });
  }
  function frame(now) {
    if (!running) return; if (t0 === null) t0 = now;
    const t = (now - t0) / 1000; if (t >= END) return showCard();
    draw(t); lastT = t; raf = requestAnimationFrame(frame);
  }
  function stopAudio() { if (mix && ac) { try { mix.gain.cancelScheduledValues(ac.currentTime); mix.gain.setTargetAtTime(0, ac.currentTime, 0.12); } catch (e) {} } }
  function play(m) {
    mode = m || 'quit'; box.hidden = false; box.classList.remove('closed'); $hint.hidden = true; root.classList.add('outro-on');
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { layout(); showCard(); return; }       // sans animation : on affiche directement le message
    layout(); initAudio(); sndLabel(); if (ac && ac.state !== 'running') ac.resume().catch(() => {});
    const id = ++playId, began = performance.now(); t0 = null; running = true; $skip.focus({ preventScroll: true }); raf = requestAnimationFrame(frame);
    if (ac) decodeAll().then(() => { if (running && id === playId) startAudio((performance.now() - began) / 1000); });
  }
  function skip() { if (!running) return; playId++; stopAudio(); showCard(); }
  function back() { playId++; stopAudio(); running = false; cancelAnimationFrame(raf); box.hidden = true; box.classList.remove('closed'); root.classList.remove('outro-on'); window.scrollTo(0, 0); }
  $skip.addEventListener('click', skip); $back.addEventListener('click', back);
  $close.addEventListener('click', () => { window.close(); setTimeout(() => { $hint.hidden = false; }, 200); });   // ne fonctionne que si le navigateur l'autorise
  addEventListener('keydown', (e) => { if (!box.hidden && running && (e.key === 'Escape' || e.key === 'Enter')) skip(); else if (!box.hidden && !running && e.key === 'Escape') back(); });
  addEventListener('resize', () => { if (!box.hidden && running) layout(); });
  addEventListener('load', () => setTimeout(prefetch, 1500));
  document.addEventListener('click', (e) => { const q = e.target.closest && e.target.closest('#quit-site'); if (q) { e.preventDefault(); play('quit'); } });

  async function renderTest(secs) {                                              // mesure objective de la musique (hors ligne), pour les tests
    const sr = 22050, oc = new OfflineAudioContext(1, Math.round(sr * secs), sr), dest = oc.createGain(); dest.connect(oc.destination); ambience(oc, dest, 0, secs, true);
    const d = (await oc.startRendering()).getChannelData(0); let sum = 0, pk = 0, nan = 0; for (let i = 0; i < d.length; i++) { if (d[i] !== d[i]) nan++; sum += d[i] * d[i]; pk = Math.max(pk, Math.abs(d[i])); }
    const bar = SIX * 8 * sr, par = []; for (let m = 0; m < 9; m++) { let q = 0, n = 0; for (let i = Math.round(0.35 * sr + m * bar); i < 0.35 * sr + (m + 1) * bar && i < d.length; i++) { q += d[i] * d[i]; n++; } par.push(n ? +(10 * Math.log10(q / n + 1e-12)).toFixed(1) : null); }
    return { bpm: BPM, rmsDb: +(20 * Math.log10(Math.sqrt(sum / d.length))).toFixed(1), crete: +pk.toFixed(2), nan, dbParMesure: par };
  }
  window.CCPOutro = { play, skip, back, renderTest, seek: (t) => { running = false; cancelAnimationFrame(raf); box.hidden = false; layout(); draw(t); } };
})();
