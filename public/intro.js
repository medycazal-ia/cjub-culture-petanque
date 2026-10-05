'use strict';
/* Animation d'ouverture : un tireur de pétanque fait un carreau, soleil rouge clair à l'horizon.
   Dessinée en temps réel (canvas), sons synthétisés (WebAudio) : aucun fichier image, vidéo ou audio. */
(() => {
  const root = document.documentElement;
  const box = document.getElementById('intro');
  if (!box) return;
  const cv = document.getElementById('intro-canvas'), g = cv.getContext('2d');
  const $title = document.getElementById('intro-title'), $skip = document.getElementById('intro-skip'), $snd = document.getElementById('intro-sound');

  const TAU = Math.PI * 2;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (u) => u * u * (3 - 2 * u);
  const rng = (seed) => { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); };
  const dirDown = (a) => ({ x: Math.sin(a), y: Math.cos(a) });   // 0 = vers le bas, + = vers l'avant (droite)

  /* ---------- Chronologie (secondes) ---------- */
  const FADE_IN = 0.9, FLIGHT = 0.85, TITLE_AT = 4.0, OPEN0 = 4.9, SUN_OFF = [5.0, 6.4], OUT_AT = 6.2, END = 6.6;   // OPEN0 : la page s'ouvre autour de la boule-logo
  // t, angle du bras, flexion du coude, inclinaison du buste, flexion des genoux, tête
  const K = [
    [0.0, 0.06, 0.30, 0.30, 0.30, 0.30], [0.9, 0.06, 0.30, 0.30, 0.30, 0.30],
    [1.2, 0.40, 0.25, 0.32, 0.32, 0.32], [1.5, -0.30, 0.25, 0.34, 0.34, 0.32],
    [1.8, 0.35, 0.25, 0.34, 0.34, 0.34], [2.1, -0.95, 0.20, 0.40, 0.46, 0.46],
    [2.55, 1.30, 0.08, 0.55, 0.30, 0.18], [2.9, 1.50, 0.05, 0.58, 0.14, 0.14],
    [3.7, 1.10, 0.10, 0.45, 0.20, 0.20], [4.6, 0.30, 0.20, 0.34, 0.26, 0.26], [99, 0.30, 0.20, 0.34, 0.26, 0.26]
  ];
  function kf(t) {
    if (t <= K[0][0]) return K[0].slice(1);
    for (let i = 0; i < K.length - 1; i++) {
      const a = K[i], b = K[i + 1];
      if (t < b[0]) { const u = smooth((t - a[0]) / (b[0] - a[0])); return [1, 2, 3, 4, 5].map(j => lerp(a[j], b[j], u)); }
    }
    return K[K.length - 1].slice(1);
  }
  let TR = 2.4; for (let t = 2.1; t < 2.6; t += 0.005) { if (kf(t)[0] >= 0.6) { TR = t; break; } }   // instant du lâcher
  const TI = TR + FLIGHT;                                                                        // instant du choc

  /* ---------- Mise en page ---------- */
  let B0, TGT, TRAD, SP0, SP1, W, H, dpr, s, k, hy, gy, r, rs, rj, px, A0, J0, sx, SR, vA, tauC, R0, PI_, bgSky, bgLand, bgVig, motes, sparks, puffs, lastDraw = -1;
  const mk = () => { const c = document.createElement('canvas'); c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); const x = c.getContext('2d'); x.scale(dpr, dpr); return [c, x]; };

  function layout() {
    W = box.clientWidth || innerWidth; H = box.clientHeight || innerHeight; dpr = Math.min(devicePixelRatio || 1, 2);
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    const portrait = W < H;
    s = Math.min(W / (portrait ? 560 : 760), H / 560); k = 100 * s;
    hy = H * (portrait ? 0.47 : 0.5); gy = H * (portrait ? 0.74 : 0.78);
    r = 0.1 * k; rj = 0.5 * r; px = W * 0.2; A0 = W * 0.58; J0 = A0 + 3.6 * r;
    sx = W * 0.72; SR = clamp(W * (portrait ? 0.1 : 0.06), 34, 110);
    vA = 0.55 * W; tauC = ((J0 - A0) - (r + rj)) / vA;
    $title.style.setProperty('--ity', (portrait ? 13 : 11) + '%');
    rs = Math.max(1.5 * r, 13);                                                   // rayon de la boule une fois devenue logo (lisible même sur petit écran)
    const dc = r + rs;                                                             // distance entre centres au contact
    R0 = held(pose(TR)); PI_ = { x: A0 - 0.878 * dc, y: gy - r - 0.479 * dc };
    buildBg(); buildFx();
    // Ouverture : la boule-logo, au repos, ira se poser sur le logo de La Trinité de la page (cible), autour de laquelle la page s'ouvre
    const S0 = posS(OPEN0, pose(OPEN0)), zc = camZoom(OPEN0);
    B0 = { x: W / 2 + (S0.x - W / 2) * zc, y: H * 0.6 + (S0.y - H * 0.6) * zc, rad: S0.r * zc };                      // position écran de la boule au repos
    const mr = logoEl ? logoEl.getBoundingClientRect() : null;
    TGT = mr && mr.width > 0 ? { x: mr.left + mr.width / 2, y: mr.top + mr.height / 2 } : { x: W * 0.62, y: H * 0.28 };
    TRAD = logoEl && parseFloat(getComputedStyle(logoEl).width) > 0 ? parseFloat(getComputedStyle(logoEl).width) / 2 : 0.55 * Math.min(W / 1120, H / 1327) * 100;
    SP0 = S0.spin; SP1 = Math.ceil(SP0 / TAU) * TAU; if (SP1 - SP0 < 3) SP1 += TAU;                                  // il finit à l'endroit, comme le logo de la page
  }
  const camZoom = (t) => 1 + 0.035 * Math.min(t / 5, 1);

  /* ---------- Décor (mis en cache) ---------- */
  function ridge(c, base, amp, freq, ph, col) {
    c.fillStyle = col; c.beginPath(); c.moveTo(0, hy + 2);
    for (let x = 0; x <= W; x += 6) { const v = 0.12 + 0.88 * smooth(clamp(Math.abs(x - sx) / (W * 0.2), 0, 1)); c.lineTo(x, base - amp * v * (0.5 + 0.5 * Math.sin(x * freq + ph) + 0.3 * Math.sin(x * freq * 2.3 + ph * 1.7))); }
    c.lineTo(W, hy + 2); c.closePath(); c.fill();
  }
  function palm(c, x, y, h, lean, col) {
    c.fillStyle = col; c.strokeStyle = col; c.lineCap = 'round'; c.lineWidth = Math.max(2, h * 0.04);
    const tx = x + lean * h, ty = y - h;
    c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + lean * h * 0.15, y - h * 0.55, tx, ty); c.stroke();
    const n = 9;
    for (let i = 0; i < n; i++) {
      const a = -Math.PI * 1.02 + (i / (n - 1)) * Math.PI * 1.04, len = h * (0.40 + 0.07 * ((i * 5) % 3));
      const ex = tx + Math.cos(a) * len, ey = ty + Math.sin(a) * len * 0.55 + len * 0.42 * Math.abs(Math.cos(a));
      c.beginPath(); c.moveTo(tx, ty);
      c.quadraticCurveTo(tx + Math.cos(a) * len * 0.5, ty + Math.sin(a) * len * 0.8 - len * 0.14, ex, ey);
      c.quadraticCurveTo(tx + Math.cos(a) * len * 0.55, ty + Math.sin(a) * len * 0.8 + len * 0.08, tx, ty); c.fill();
    }
  }
  function buildBg() {
    let c;
    [bgSky, c] = mk();                       // ciel : du rouge profond au rouge clair à l'horizon
    let gr = c.createLinearGradient(0, 0, 0, hy);
    gr.addColorStop(0, '#1a060d'); gr.addColorStop(0.35, '#4a0f20'); gr.addColorStop(0.65, '#a01830'); gr.addColorStop(0.88, '#e4606c'); gr.addColorStop(1, '#ffb4b9');
    c.fillStyle = gr; c.fillRect(0, 0, W, hy + 2);
    // voile de chaleur autour du soleil
    gr = c.createRadialGradient(sx, hy, 0, sx, hy, W * 0.6); gr.addColorStop(0, 'rgba(255,150,160,.55)'); gr.addColorStop(1, 'rgba(255,150,160,0)');
    c.fillStyle = gr; c.fillRect(0, 0, W, hy + 2);

    [bgLand, c] = mk();                      // collines, sol, palmiers
    ridge(c, hy, 0.12 * H, 0.01, 1.3, '#8a2038');
    ridge(c, hy, 0.07 * H, 0.011, 4.1, '#3b0b18');
    palm(c, W * 0.52, hy + 2, H * 0.1, 0.1, '#2a0812'); palm(c, W * 0.6, hy + 2, H * 0.075, -0.08, '#2a0812');
    gr = c.createLinearGradient(0, hy, 0, H);
    gr.addColorStop(0, '#d9786c'); gr.addColorStop(0.3, '#b04e46'); gr.addColorStop(0.62, '#702c26'); gr.addColorStop(1, '#2a100d');
    c.fillStyle = gr; c.fillRect(0, hy, W, H - hy);
    const R = rng(7), n = Math.round(W * H / 700);   // gravillons, plus gros vers le premier plan
    for (let i = 0; i < n; i++) {
      const y = hy + 3 + Math.pow(R(), 1.6) * (H - hy), d = (y - hy) / (H - hy), x = R() * W, sz = 0.6 + d * 3.2 * (0.5 + R());
      c.fillStyle = `rgba(${20 + R() * 40 | 0},${6 + R() * 14 | 0},${6 + R() * 10 | 0},${0.35 + R() * 0.4})`; c.beginPath(); c.ellipse(x, y, sz, sz * 0.55, 0, 0, TAU); c.fill();
      c.fillStyle = `rgba(255,${150 + R() * 60 | 0},${140 + R() * 40 | 0},${0.12 + d * 0.3})`; c.beginPath(); c.ellipse(x + sz * 0.45, y - sz * 0.15, sz * 0.4, sz * 0.22, 0, 0, TAU); c.fill();
    }
    palm(c, W * 0.045, gy + 0.05 * H, H * 0.62, 0.2, '#1c060c'); palm(c, W * 0.955, gy + 0.05 * H, H * 0.55, -0.22, '#1c060c');

    [bgVig, c] = mk();
    gr = c.createRadialGradient(W / 2, H * 0.52, Math.min(W, H) * 0.35, W / 2, H * 0.52, Math.max(W, H) * 0.75);
    gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(8,2,5,.6)'); c.fillStyle = gr; c.fillRect(0, 0, W, H);
  }
  function buildFx() {
    const R = rng(11);
    motes = Array.from({ length: 70 }, () => ({ x: R() * W, y: R() * H * 0.8, v: 4 + R() * 10, ph: R() * TAU, z: 0.4 + R() }));
    sparks = Array.from({ length: 22 }, () => { const a = -Math.PI * (0.05 + R() * 0.9), sp = (0.6 + R() * 1.9) * k; return { vx: Math.cos(a) * sp * 1.1, vy: Math.sin(a) * sp, life: 0.28 + R() * 0.4, len: 0.05 + R() * 0.07 }; });
    puffs = Array.from({ length: 11 }, (_, i) => ({ dx: (R() - 0.35) * 2.6 * r, vx: (0.3 + R() * 1.4) * k * 0.7, vy: -(0.1 + R() * 0.5) * k * 0.5, sz: (0.8 + R() * 1.1) * r, life: 0.7 + R() * 0.5, d: R() * 0.06 }));
  }

  /* ---------- Personnage ---------- */
  function ik(hip, foot, l1, l2) {
    const dx = foot.x - hip.x, dy = foot.y - hip.y, d = Math.min(Math.hypot(dx, dy), l1 + l2 - 0.01);
    const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d), h = Math.sqrt(Math.max(l1 * l1 - a * a, 0));
    const bx = hip.x + dx / d * a, by = hip.y + dy / d * a;
    const k1 = { x: bx + dy / d * h, y: by - dx / d * h }, k2 = { x: bx - dy / d * h, y: by + dx / d * h };
    return k1.x > k2.x ? k1 : k2;                                   // le genou plie vers l'avant
  }
  function pose(t) {
    const [th, ph, lean, flex, head] = kf(t), br = Math.sin(t * 2.2) * 0.004 * k;
    const fB = { x: px - 0.2 * k, y: gy }, fF = { x: px + 0.24 * k, y: gy };
    const hip = { x: px + flex * 0.04 * k, y: gy - (0.92 * k - flex * 0.26 * k) + br };
    const sh = { x: hip.x + Math.sin(lean) * 0.58 * k, y: hip.y - Math.cos(lean) * 0.58 * k };
    const ha = lean * 0.6 + head * 0.4, hd = { x: sh.x + Math.sin(ha) * 0.2 * k, y: sh.y - Math.cos(ha) * 0.2 * k };
    const el = { x: sh.x + dirDown(th).x * 0.32 * k, y: sh.y + dirDown(th).y * 0.32 * k };
    const fa = th + ph, hand = { x: el.x + dirDown(fa).x * 0.30 * k, y: el.y + dirDown(fa).y * 0.30 * k };
    const th2 = -0.25 + Math.sin(t * 1.7) * 0.03, el2 = { x: sh.x + dirDown(th2).x * 0.32 * k, y: sh.y + dirDown(th2).y * 0.32 * k };
    const hand2 = { x: el2.x + dirDown(th2 + 0.2).x * 0.30 * k, y: el2.y + dirDown(th2 + 0.2).y * 0.30 * k };
    return { hip, sh, hd, el, hand, fa, el2, hand2, fB, fF, kB: ik(hip, fB, 0.46 * k, 0.46 * k), kF: ik(hip, fF, 0.46 * k, 0.46 * k), lean, ha };
  }
  const held = (P) => ({ x: P.hand.x + dirDown(P.fa).x * 0.85 * r, y: P.hand.y + dirDown(P.fa).y * 0.85 * r });
  const SHX = 1.5, SHY = 0.2;                                      // direction des ombres : à gauche, un peu vers nous
  const proj = (p, L) => ({ x: p.x - SHX * (gy - p.y), y: gy + SHY * (gy - p.y) });

  function capsulePath(c, a, b, w) {
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, nx = -dy / d * w / 2, ny = dx / d * w / 2;
    c.moveTo(a.x + nx, a.y + ny); c.lineTo(b.x + nx, b.y + ny); c.lineTo(b.x - nx, b.y - ny); c.lineTo(a.x - nx, a.y - ny); c.closePath();
    c.moveTo(a.x + w / 2, a.y); c.arc(a.x, a.y, w / 2, 0, TAU); c.moveTo(b.x + w / 2, b.y); c.arc(b.x, b.y, w / 2, 0, TAU);
  }
  function limb(a, b, w, col, L) {
    const o = Math.max(1.5, 0.018 * k);
    g.lineCap = 'round'; g.strokeStyle = `rgba(255,150,160,${0.85 * L})`; g.lineWidth = w;
    g.beginPath(); g.moveTo(a.x + o, a.y - o * 0.45); g.lineTo(b.x + o, b.y - o * 0.45); g.stroke();
    g.strokeStyle = col; g.beginPath(); g.moveTo(a.x, a.y); g.lineTo(b.x, b.y); g.stroke();
  }
  function drawPlayerShadow(P, L) {
    g.save(); if (typeof g.filter === 'string') g.filter = `blur(${Math.max(1.5, 0.02 * k)}px)`;
    g.fillStyle = `rgba(8,1,4,${0.55 * L})`; g.beginPath();
    const w = (v) => v * k, pr = (p) => proj(p), segs = [[P.hip, P.sh, w(0.2)], [P.hip, P.kB, w(0.14)], [P.kB, P.fB, w(0.1)], [P.hip, P.kF, w(0.14)], [P.kF, P.fF, w(0.1)], [P.sh, P.el, w(0.09)], [P.el, P.hand, w(0.08)]];
    segs.forEach(([a, b, ww]) => capsulePath(g, pr(a), pr(b), ww * 0.8));
    const hh = pr(P.hd); g.moveTo(hh.x + w(0.1), hh.y); g.arc(hh.x, hh.y, w(0.1) * 0.85, 0, TAU);
    g.fill(); g.restore();
    g.fillStyle = `rgba(0,0,0,${0.5 * L})`;                          // appui des pieds
    [P.fB, P.fF].forEach(f => { g.beginPath(); g.ellipse(f.x + 0.02 * k, f.y + 2, 0.12 * k, 0.025 * k, 0, 0, TAU); g.fill(); });
  }
  function drawPlayer(P, L) {
    const dark = '#1b0810', pants = '#1d0b12', polo = '#4b0e1c', cap = '#7a1226', skin = '#2a1010';
    limb(P.sh, P.el2, 0.1 * k, '#2a0b14', L); limb(P.el2, P.hand2, 0.08 * k, skin, L);          // bras opposé
    limb(P.hip, P.kB, 0.175 * k, pants, L); limb(P.kB, P.fB, 0.125 * k, pants, L); limb(P.fB, { x: P.fB.x + 0.12 * k, y: P.fB.y - 0.015 * k }, 0.07 * k, dark, L);
    limb(P.hip, P.sh, 0.255 * k, polo, L);                                                              // buste
    limb(P.hip, P.kF, 0.175 * k, pants, L); limb(P.kF, P.fF, 0.125 * k, pants, L); limb(P.fF, { x: P.fF.x + 0.12 * k, y: P.fF.y - 0.015 * k }, 0.07 * k, dark, L);
    limb(P.sh, { x: lerp(P.sh.x, P.hd.x, 0.6), y: lerp(P.sh.y, P.hd.y, 0.6) }, 0.07 * k, skin, L);   // cou
    const hr = 0.105 * k;                                                                              // tête + casquette
    g.fillStyle = `rgba(255,150,160,${0.85 * L})`; g.beginPath(); g.arc(P.hd.x + 2, P.hd.y - 1, hr, 0, TAU); g.fill();
    g.fillStyle = skin; g.beginPath(); g.arc(P.hd.x, P.hd.y, hr, 0, TAU); g.fill();
    g.fillStyle = cap; g.beginPath(); g.arc(P.hd.x, P.hd.y - 0.01 * k, hr * 1.04, Math.PI * 0.98, TAU * 1.0, false); g.closePath(); g.fill();
    g.beginPath(); g.moveTo(P.hd.x + hr * 0.2, P.hd.y - 0.02 * k); g.quadraticCurveTo(P.hd.x + hr * 1.7, P.hd.y - 0.015 * k, P.hd.x + hr * 1.55, P.hd.y + 0.025 * k); g.lineTo(P.hd.x + hr * 0.3, P.hd.y + 0.005 * k); g.fill();
    limb(P.sh, P.el, 0.11 * k, '#3a0b16', L); limb(P.el, P.hand, 0.09 * k, skin, L);                // bras tireur (devant)
  }

  /* ---------- Boules ---------- */
  function drawBoule(x, y, rad, spin, kind, L) {
    g.save(); g.beginPath(); g.arc(x, y, rad, 0, TAU); g.clip();
    if (kind === 'jack') {
      const gr = g.createRadialGradient(x + rad * 0.3, y - rad * 0.2, rad * 0.1, x, y, rad); gr.addColorStop(0, '#ffb07a'); gr.addColorStop(0.5, '#c8512f'); gr.addColorStop(1, '#3a0f08');
      g.fillStyle = gr; g.fillRect(x - rad, y - rad, 2 * rad, 2 * rad);
    } else {
      const steel = kind === 'adv' ? 0.62 : 1;
      let gr = g.createLinearGradient(0, y - rad, 0, y + rad);                      // reflet : ciel en haut, sol en bas
      gr.addColorStop(0, '#4a1424'); gr.addColorStop(0.40, '#e98a93'); gr.addColorStop(0.50, '#ffd6d9'); gr.addColorStop(0.53, '#51251b'); gr.addColorStop(1, '#100707');
      g.fillStyle = gr; g.fillRect(x - rad, y - rad, 2 * rad, 2 * rad);
      if (rad > 5) {                                                               // stries gravées qui tournent
        g.strokeStyle = 'rgba(10,3,6,.38)'; g.lineWidth = Math.max(1, rad * 0.07);
        for (let i = 0; i < 2; i++) { g.beginPath(); g.ellipse(x, y, rad * 1.02, rad * (0.2 + 0.2 * i), spin + i * 1.3, 0, TAU); g.stroke(); }
      }
      gr = g.createRadialGradient(x - rad * 0.25, y - rad * 0.2, rad * 0.15, x, y, rad);
      gr.addColorStop(0, 'rgba(8,3,6,0)'); gr.addColorStop(0.7, `rgba(8,3,6,${0.2 + (1 - steel) * 0.4})`); gr.addColorStop(1, 'rgba(8,3,6,.75)');
      g.fillStyle = gr; g.fillRect(x - rad, y - rad, 2 * rad, 2 * rad);
      gr = g.createLinearGradient(x - rad, 0, x + rad, 0); gr.addColorStop(0, `rgba(8,3,6,${0.5 + (1 - steel) * 0.3})`); gr.addColorStop(0.65, 'rgba(8,3,6,0)'); g.fillStyle = gr; g.fillRect(x - rad, y - rad, 2 * rad, 2 * rad);
    }
    g.restore();
    g.strokeStyle = `rgba(255,190,198,${0.85 * L})`; g.lineWidth = Math.max(1, rad * 0.16); g.lineCap = 'round';
    g.beginPath(); g.arc(x, y, rad * 0.9, -0.95, 0.95); g.stroke();                // liseré de lumière côté soleil
    const sp = g.createRadialGradient(x + rad * 0.62, y - rad * 0.05, 0, x + rad * 0.62, y - rad * 0.05, rad * 0.45);
    sp.addColorStop(0, `rgba(255,236,236,${0.95 * L})`); sp.addColorStop(1, 'rgba(255,200,205,0)'); g.fillStyle = sp; g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.55)'; g.lineWidth = 1; g.beginPath(); g.arc(x, y, rad, 0, TAU); g.stroke();
  }
  const logoEl = document.querySelector('.map-logo');                               // le logo du club (déjà chargé dans la page)
  const logoReady = () => logoEl && logoEl.complete && logoEl.naturalWidth > 0;
  function drawLogoDisc(x, y, rad, spin, L, flat) {
    const fl = 1 - (flat || 0);                                       // médaille ronde du club, qui tourne, éclairée à contre-jour
    g.save(); g.beginPath(); g.arc(x, y, rad, 0, TAU); g.clip(); g.translate(x, y); g.rotate(spin); g.drawImage(logoEl, -rad, -rad, 2 * rad, 2 * rad); g.restore();
    let gr = g.createLinearGradient(x - rad, 0, x + rad, 0); gr.addColorStop(0, `rgba(8,3,6,${0.42 * fl})`); gr.addColorStop(0.65, 'rgba(8,3,6,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill();
    gr = g.createRadialGradient(x - rad * 0.2, y - rad * 0.15, rad * 0.3, x, y, rad); gr.addColorStop(0, 'rgba(8,3,6,0)'); gr.addColorStop(1, `rgba(8,3,6,${0.5 * fl})`); g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill();
    g.strokeStyle = `rgba(232,222,222,${0.92 * fl})`; g.lineWidth = Math.max(1.5, rad * 0.1); g.beginPath(); g.arc(x, y, rad * 0.95, 0, TAU); g.stroke();      // cerclage métallique : c'est toujours une boule
    g.strokeStyle = `rgba(255,190,198,${0.9 * L * fl})`; g.lineWidth = Math.max(1, rad * 0.14); g.lineCap = 'round'; g.beginPath(); g.arc(x, y, rad * 0.9, -0.95, 0.95); g.stroke();
    const sp = g.createRadialGradient(x + rad * 0.62, y - rad * 0.05, 0, x + rad * 0.62, y - rad * 0.05, rad * 0.45); sp.addColorStop(0, `rgba(255,236,236,${0.9 * L * fl})`); sp.addColorStop(1, 'rgba(255,200,205,0)');
    g.fillStyle = sp; g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill(); g.strokeStyle = `rgba(0,0,0,${0.55 * fl})`; g.lineWidth = 1; g.beginPath(); g.arc(x, y, rad, 0, TAU); g.stroke();
  }
  function drawShooter(S, L) {                                                      // boule de chrome -> logo du club, en plein vol
    const m = logoReady() ? S.m : 0;
    if (m < 0.999) { g.save(); g.globalAlpha = 1 - smooth(m); drawBoule(S.x, S.y, S.r, S.spin, 'shoot', L); g.restore(); }
    if (m > 0.001) { g.save(); g.globalAlpha = smooth(m); drawLogoDisc(S.x, S.y, S.r, S.spin, L); g.restore(); }
    if (m > 0.05 && m < 0.97) {                                                    // éclat de la transformation : halo, anneau et rayons
      const q = (m - 0.05) / 0.92, a = Math.sin(Math.PI * q);
      g.save(); g.globalCompositeOperation = 'lighter';
      const gr = g.createRadialGradient(S.x, S.y, 0, S.x, S.y, S.r * 3.2); gr.addColorStop(0, `rgba(255,225,215,${0.7 * a * L})`); gr.addColorStop(0.4, `rgba(255,140,150,${0.3 * a * L})`); gr.addColorStop(1, 'rgba(255,120,130,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(S.x, S.y, S.r * 3.2, 0, TAU); g.fill();
      g.strokeStyle = `rgba(255,205,210,${(1 - q) * 0.9 * L})`; g.lineWidth = Math.max(1.5, S.r * 0.12 * (1 - q)); g.beginPath(); g.arc(S.x, S.y, S.r * (1.2 + 1.8 * q), 0, TAU); g.stroke();
      g.strokeStyle = `rgba(255,240,230,${a * 0.85 * L})`; g.lineWidth = Math.max(1, 1.4 * s); g.lineCap = 'round';
      for (let i = 0; i < 8; i++) { const an = i * TAU / 8 + S.spin * 0.25, r1 = S.r * (1.3 + 0.5 * q), r2 = S.r * (1.7 + 1.6 * q); g.beginPath(); g.moveTo(S.x + Math.cos(an) * r1, S.y + Math.sin(an) * r1); g.lineTo(S.x + Math.cos(an) * r2, S.y + Math.sin(an) * r2); g.stroke(); }
      g.restore();
    }
  }
  function ballShadow(x, y, rad, L, rx = 1) {                                      // y = centre ; ombre projetée sur le sol
    const h = Math.max(0, gy - rad - y), p = { x: x - SHX * (h + rad * 0.2), y: gy + SHY * h };
    g.save(); if (typeof g.filter === 'string') g.filter = `blur(${Math.max(1, rad * 0.18)}px)`;
    g.fillStyle = `rgba(8,1,4,${clamp(0.6 - h / (3 * k), 0.2, 0.6) * L})`;
    g.beginPath(); g.ellipse(p.x - rad * 1.0 * rx, p.y + rad * 0.12, rad * (1.7 + 0.8 * rx), rad * 0.34, -0.06, 0, TAU); g.fill(); g.restore();
    g.fillStyle = `rgba(0,0,0,${clamp(0.6 - h / k, 0, 0.6) * L})`; g.beginPath(); g.ellipse(x, gy + rad * 0.05, rad * 0.85, rad * 0.16, 0, 0, TAU); g.fill();
  }

  /* ---------- Trajectoires (fonctions pures du temps) ---------- */
  const arc = (u, a) => a * 4 * u * (1 - u);
  const MORPH = [0.12, 0.62];                                                       // la boule se transforme en logo entre ces instants du vol (s)
  function posS(t, P) {
    if (t < TR) { const b = held(P); return { ...b, spin: 0, held: true, r, m: 0 }; }
    const m = smooth(clamp((t - TR - MORPH[0]) / (MORPH[1] - MORPH[0]), 0, 1)), rr = r + (rs - r) * m + Math.sin(Math.PI * m) * 0.18 * r;
    if (t < TI) { const u = (t - TR) / FLIGHT; return { x: lerp(R0.x, PI_.x, u), y: lerp(R0.y, PI_.y, u) - arc(u, 1.1 * k), spin: -(t - TR) * 13, r: rr, m }; }
    const tau = t - TI, fall = (gy - rs) - PI_.y; let h;
    if (tau < 0.14) h = fall * (1 - (tau / 0.14) ** 2);
    else if (tau < 0.34) h = arc((tau - 0.14) / 0.2, 0.45 * r); else if (tau < 0.46) h = arc((tau - 0.34) / 0.12, 0.13 * r); else h = 0;
    const trav = 0.05 * W + 0.878 * (r + rs), x = PI_.x + trav * (1 - Math.exp(-3.2 * tau));          // le logo continue de rouler, en roue
    return { x, y: gy - rs - h, spin: -FLIGHT * 13 * Math.exp(-6 * tau) + (x - PI_.x) / rs, r: rs, m: 1 };
  }
  function posA(t) {
    if (t < TI) return { x: A0, y: gy - r, spin: 0 };
    const tau = t - TI, c = 2.6, xc = A0 + vA * tauC; let x;
    if (tau < tauC) x = A0 + vA * tau; else x = xc + 0.4 * vA * (1 - Math.exp(-c * (tau - tauC))) / c;
    return { x, y: gy - r - (tau < 0.18 ? arc(tau / 0.18, 0.25 * r) : 0), spin: (x - A0) / r };
  }
  function posJ(t) {
    const tau = t - TI - tauC; if (tau < 0) return { x: J0, y: gy - rj, spin: 0 };
    const cj = 2.8, x = J0 + 1.35 * vA * (1 - Math.exp(-cj * tau)) / cj;
    const h = tau < 0.22 ? arc(tau / 0.22, 0.8 * r) : tau < 0.36 ? arc((tau - 0.22) / 0.14, 0.25 * r) : 0;
    return { x, y: gy - rj - h, spin: (x - J0) / rj };
  }

  /* ---------- Image ---------- */
  const Lsun = (t) => smooth(clamp(t / FADE_IN, 0, 1)) * (1 - smooth(clamp((t - SUN_OFF[0]) / (SUN_OFF[1] - SUN_OFF[0]), 0, 1)));
  function draw(t) {
    const L = Lsun(t), P = pose(t);
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, W, H);
    // caméra : lent travelling avant + secousse au choc
    const zoom = 1 + 0.035 * Math.min(t / 5, 1), ti = t - TI, sh = ti > 0 && ti < 0.4 ? 7 * s * Math.exp(-ti * 11) * Math.sin(ti * 90) : 0;
    const open = t >= OPEN0, u = open ? smooth(clamp((t - OPEN0) / (OUT_AT - OPEN0), 0, 1)) : 0;
    g.translate(W / 2 + sh * 0.6, H * 0.6 + sh); g.scale(zoom, zoom); g.translate(-W / 2, -H * 0.6);
    if (open) { const zo = 1 + 0.8 * u, ox = (B0.x - W / 2) / zoom + W / 2, oy = (B0.y - H * 0.6) / zoom + H * 0.6; g.translate(ox, oy); g.scale(zo, zo); g.translate(-ox, -oy); }   // le décor plonge vers la boule
    g.drawImage(bgSky, 0, 0, W, H);
    // soleil rouge clair, à moitié sous l'horizon
    g.save(); g.beginPath(); g.rect(0, 0, W, hy); g.clip();
    let gr = g.createRadialGradient(sx, hy, SR * 0.4, sx, hy, SR * 4.2); gr.addColorStop(0, `rgba(255,120,135,${0.75 * L})`); gr.addColorStop(1, 'rgba(255,120,135,0)');
    g.fillStyle = gr; g.fillRect(0, 0, W, hy);
    gr = g.createRadialGradient(sx, hy - SR * 0.12, 0, sx, hy - SR * 0.12, SR); gr.addColorStop(0, `rgba(255,222,224,${L})`); gr.addColorStop(0.7, `rgba(255,150,160,${L})`); gr.addColorStop(1, `rgba(255,112,125,${L})`);
    g.fillStyle = gr; g.beginPath(); g.arc(sx, hy - SR * 0.12, SR, 0, TAU); g.fill(); g.restore();
    g.drawImage(bgLand, 0, 0, W, H);
    // reflet du soleil sur le sol
    g.save(); g.beginPath(); g.rect(0, hy, W, H - hy); g.clip(); g.globalCompositeOperation = 'lighter';
    g.translate(sx, hy); g.scale(1, 0.35); gr = g.createRadialGradient(0, 0, 0, 0, 0, W * 0.5); gr.addColorStop(0, `rgba(255,110,120,${0.5 * L})`); gr.addColorStop(1, 'rgba(255,110,120,0)');
    g.fillStyle = gr; g.fillRect(-W, 0, 2 * W, H * 3); g.restore();
    // poussières dans la lumière
    g.save(); g.globalCompositeOperation = 'lighter';
    motes.forEach(m => { const x = (m.x - t * m.v * m.z + W * 2) % W, y = m.y + Math.sin(t * 0.7 + m.ph) * 6, near = 1 - clamp(Math.abs(x - sx) / (W * 0.6), 0, 1), a = (0.08 + 0.22 * near) * L * (0.6 + 0.4 * Math.sin(t * 2 + m.ph));
      g.fillStyle = `rgba(255,170,175,${a})`; g.beginPath(); g.arc(x, y, (0.8 + m.z) * s, 0, TAU); g.fill(); }); g.restore();
    // cercle de lancer
    g.strokeStyle = `rgba(255,205,198,${0.5 * L})`; g.lineWidth = Math.max(1, 0.012 * k); g.beginPath(); g.ellipse(px + 0.02 * k, gy + 0.012 * k, 0.5 * k, 0.085 * k, 0, 0, TAU); g.stroke();
    // ombres
    const S = posS(t, P), A = posA(t), J = posJ(t);
    drawPlayerShadow(P, L); ballShadow(A.x, A.y, r, L); ballShadow(J.x, J.y, rj, L, 0.7); if (open) ballShadow(S.x, S.y, S.r, L * (1 - smooth(clamp(u * 2.5, 0, 1)))); else if (!S.held) ballShadow(S.x, S.y, S.r, L);
    // acteurs
    drawBoule(A.x, A.y, r, A.spin, 'adv', L); drawBoule(J.x, J.y, rj, J.spin, 'jack', L);
    drawPlayer(P, L); if (!open) drawShooter(S, L);
    // effets du choc
    const fx = { x: A0 - 0.85 * r, y: gy - 1.5 * r };
    if (ti > 0 && ti < 1.4) {
      if (ti < 0.14) { gr = g.createRadialGradient(fx.x, fx.y, 0, fx.x, fx.y, 3.6 * r); const a = (1 - ti / 0.14) * 0.95; gr.addColorStop(0, `rgba(255,248,236,${a})`); gr.addColorStop(0.4, `rgba(255,170,150,${a * 0.5})`); gr.addColorStop(1, 'rgba(255,120,110,0)'); g.fillStyle = gr; g.fillRect(fx.x - 4 * r, fx.y - 4 * r, 8 * r, 8 * r); }
      g.save(); g.globalCompositeOperation = 'lighter'; g.lineCap = 'round';
      sparks.forEach(p => { if (ti > p.life) return; const x = fx.x + p.vx * ti, y = fx.y + p.vy * ti + 0.5 * 5 * k * ti * ti, f = 1 - ti / p.life;
        g.strokeStyle = `rgba(255,${120 + 130 * f | 0},${70 + 100 * f | 0},${f})`; g.lineWidth = Math.max(1, 1.6 * s); g.beginPath(); g.moveTo(x, y); g.lineTo(x - p.vx * p.len * 0.25, y - (p.vy + 5 * k * ti) * p.len * 0.25); g.stroke(); }); g.restore();
      puffs.forEach(p => { const tt = ti - p.d; if (tt < 0 || tt > p.life) return; const f = tt / p.life, x = A0 + p.dx + p.vx * tt, y = gy - 0.4 * r + p.vy * tt, sz = p.sz * (0.6 + 1.8 * f);
        gr = g.createRadialGradient(x, y, 0, x, y, sz); gr.addColorStop(0, `rgba(235,150,140,${0.4 * (1 - f) * L})`); gr.addColorStop(1, 'rgba(235,150,140,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, sz, 0, TAU); g.fill(); });
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.fillStyle = `rgba(10,3,6,${(1 - L) * 0.9})`; g.fillRect(0, 0, W, H);        // tout s'éteint avec le soleil
    g.drawImage(bgVig, 0, 0, W, H);
    if (ti > 0 && ti < 0.18) { g.fillStyle = `rgba(255,225,215,${0.16 * (1 - ti / 0.18)})`; g.fillRect(0, 0, W, H); }
    if (open) {                                                                     // la page s'ouvre autour de la boule, qui rejoint le logo de La Trinité
      const q = 1 - u, bx = q * q * B0.x + 2 * q * u * ((B0.x + TGT.x) / 2) + u * u * TGT.x, by = q * q * B0.y + 2 * q * u * (Math.min(B0.y, TGT.y) - 0.28 * H) + u * u * TGT.y, brad = lerp(B0.rad, TRAD, u);
      const R = brad * 1.3 + Math.hypot(W, H) * 1.2 * smooth(u), edge = Math.max(10, 0.04 * Math.min(W, H));
      g.save(); g.globalCompositeOperation = 'destination-out'; const hole = g.createRadialGradient(bx, by, Math.max(0, R - edge), bx, by, R + edge); hole.addColorStop(0, 'rgba(0,0,0,1)'); hole.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = hole; g.beginPath(); g.arc(bx, by, R + edge, 0, TAU); g.fill(); g.restore();
      if (u < 0.98) { g.save(); g.globalCompositeOperation = 'lighter'; g.strokeStyle = `rgba(255,190,198,${0.55 * (1 - u)})`; g.lineWidth = Math.max(2, 3 * s); g.beginPath(); g.arc(bx, by, R, 0, TAU); g.stroke(); g.restore(); }
      drawLogoDisc(bx, by, brad, lerp(SP0, SP1, u), Math.max(L, 0.5), u);
    }
  }

  /* ---------- Sons (synthétisés) ---------- */
  let ac = null, master = null, noise = null, muted = false;
  try { muted = localStorage.getItem('ccp-intro-mute') === '1'; } catch (e) {}
  function initAudio() {
    if (ac) return;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try {
      ac = new AC(); const comp = ac.createDynamicsCompressor(); master = ac.createGain(); master.gain.value = 0.9; master.connect(comp); comp.connect(ac.destination);
      noise = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate); const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      ac.onstatechange = sndLabel; loadSamples();
    } catch (e) { ac = null; }
  }
  const canPlay = () => ac && ac.state === 'running' && !muted;
  function env(gn, t, peak, decay) { gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t + 0.002); gn.gain.exponentialRampToValueAtTime(0.0001, t + decay); }
  function noiseBurst(t, type, freq, q, peak, decay) {
    const src = ac.createBufferSource(); src.buffer = noise; const f = ac.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const gn = ac.createGain(); env(gn, t, peak, decay); src.connect(f); f.connect(gn); gn.connect(master); src.start(t, Math.random()); src.stop(t + decay + 0.05);
  }
  function tone(t, type, f0, f1, peak, decay) {
    const o = ac.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + decay * 0.6);
    const gn = ac.createGain(); env(gn, t, peak, decay); o.connect(gn); gn.connect(master); o.start(t); o.stop(t + decay + 0.05);
  }
  // Vrais enregistrements facultatifs : public/sounds/sons.json associe un nom à un fichier audio.
  let samples = {};
  function loadSamples() {
    if (!ac || loadSamples.done) return; loadSamples.done = true;
    fetch('sounds/sons.json').then(res => res.ok ? res.json() : {}).then(map => Promise.all(['lancer', 'clac', 'cochonnet', 'rebond', 'roulement'].filter(n => map[n]).map(n =>
      fetch('sounds/' + map[n]).then(res => res.arrayBuffer()).then(buf => new Promise((ok, ko) => ac.decodeAudioData(buf, ok, ko))).then(buf => { samples[n] = buf; }).catch(() => {})))).catch(() => {});
  }
  function sample(name, vol, rate) {
    const buf = samples[name]; if (!buf) return false;
    const src = ac.createBufferSource(); src.buffer = buf; src.playbackRate.value = (rate || 1) * (0.97 + Math.random() * 0.06);
    const gn = ac.createGain(); gn.gain.value = vol == null ? 1 : vol; src.connect(gn); gn.connect(master); src.start(); return true;
  }
  const gravel = () => { // crépitement de gravier : petits chocs aléatoires de moins en moins fréquents
    const n = Math.floor(ac.sampleRate * 1.6), b = ac.createBuffer(1, n, ac.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) { const x = i / n; if (Math.random() < 0.0022 * (1 - x) + 0.0004) { const a = (0.2 + Math.random() * 0.8) * (1 - x * 0.8); for (let j = 0; j < 6 && i + j < n; j++) d[i + j] += a * (Math.random() * 2 - 1) * Math.exp(-j / 2); } }
    return b;
  };
  const sfx = {
    whoosh() { const t = ac.currentTime, src = ac.createBufferSource(); src.buffer = noise; const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.0;
      f.frequency.setValueAtTime(350, t); f.frequency.exponentialRampToValueAtTime(1900, t + 0.3); const gn = ac.createGain();
      gn.gain.setValueAtTime(0.0001, t); gn.gain.exponentialRampToValueAtTime(0.1, t + 0.14); gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
      src.connect(f); f.connect(gn); gn.connect(master); src.start(t, 0.3); src.stop(t + 0.5); },
    // Choc sec de deux boules d'acier plein : un claquement bref et brillant, des résonances qui s'éteignent en quelques dizaines de ms.
    clack(vol = 1, pitch = 1) { const t = ac.currentTime; vol *= 0.5;
      noiseBurst(t, 'highpass', 2600, 0.7, 0.7 * vol, 0.024);
      noiseBurst(t, 'bandpass', 4200, 1.2, 0.5 * vol, 0.05);
      [[2300, 0.36, 0.06], [3100, 0.34, 0.055], [4700, 0.26, 0.045], [6900, 0.12, 0.03]].forEach(([f, a, d]) => tone(t, 'sine', f * pitch * (1 + (Math.random() - 0.5) * 0.02), 0, a * vol, d));
      tone(t, 'sine', 900 * pitch, 600 * pitch, 0.34 * vol, 0.04);
      tone(t, 'sine', 140 * pitch, 85 * pitch, 0.2 * vol, 0.08); },
    tick() { const t = ac.currentTime; noiseBurst(t, 'bandpass', 2000, 3, 0.3, 0.03); tone(t, 'triangle', 1100, 0, 0.14, 0.04); tone(t, 'sine', 2600, 0, 0.06, 0.03); },
    roll(dur) { const t = ac.currentTime, src = ac.createBufferSource(); src.buffer = gravel(); const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2200; f.Q.value = 0.6;
      const gn = ac.createGain(); gn.gain.setValueAtTime(0.0001, t); gn.gain.linearRampToValueAtTime(0.5, t + 0.05); gn.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f); f.connect(gn); gn.connect(master); src.start(t); src.stop(t + dur + 0.1); }
  };
  const cues = [[TR, () => sample('lancer', 0.8) || sfx.whoosh()], [TI, () => sample('clac', 1) || sfx.clack(1, 1)], [TI + tauC, () => sample('cochonnet', 0.8) || sfx.tick()],
    [TI + 0.1, () => sample('roulement', 0.7) || sfx.roll(1.3)], [TI + 0.14, () => sample('rebond', 0.5) || sample('clac', 0.3, 0.9) || sfx.clack(0.3, 0.85)],
    [TI + 0.34, () => sample('rebond', 0.3) || sample('clac', 0.15, 0.85) || sfx.clack(0.16, 0.8)], [TI + 0.46, () => sample('rebond', 0.2) || sample('clac', 0.08, 0.8) || sfx.clack(0.08, 0.75)]];
  let fired = [];
  function sndLabel() {
    if (!ac) { $snd.hidden = true; return; }
    $snd.hidden = false;
    $snd.textContent = muted ? '🔇 Son coupé' : ac.state === 'running' ? '🔊 Son activé' : '🔇 Activer le son';
  }
  $snd.addEventListener('click', () => {
    if (!ac) return;
    if (muted) { muted = false; try { localStorage.setItem('ccp-intro-mute', '0'); } catch (e) {} ac.resume(); }
    else if (ac.state !== 'running') ac.resume();
    else { muted = true; try { localStorage.setItem('ccp-intro-mute', '1'); } catch (e) {} }
    sndLabel();
  });
  const unlock = () => { if (ac && ac.state !== 'running' && !muted) ac.resume().catch(() => {}); };
  box.addEventListener('pointerdown', unlock);

  /* ---------- Boucle ---------- */
  let raf = 0, t0 = null, running = false, skipping = false, endTimer = 0;
  const pageEls = () => [document.querySelector('.nav'), document.querySelector('main'), document.querySelector('footer')].filter(Boolean);
  let rects = null;
  function pageZoom(t) {                                                            // la page se dézoome autour du logo de La Trinité pendant qu'elle s'ouvre
    const els = pageEls(); if (t < OPEN0) { if (rects) resetPage(); return; }
    if (!rects) rects = els.map(e => { e.style.transform = ''; return e.getBoundingClientRect(); });
    const u = smooth(clamp((t - OPEN0) / (OUT_AT - OPEN0), 0, 1)), z = 1.3 - 0.3 * u;
    els.forEach((e, i) => { e.style.transformOrigin = (TGT.x - rects[i].left) + 'px ' + (TGT.y - rects[i].top) + 'px'; e.style.transform = u >= 1 ? '' : `scale(${z})`; });
  }
  function resetPage() { rects = null; pageEls().forEach(e => { e.style.transform = ''; e.style.transformOrigin = ''; }); }
  function stage(t) {                                                              // états visuels de l'overlay selon l'instant
    $title.classList.toggle('show', t >= TITLE_AT && t < OPEN0);
    box.style.background = t >= OPEN0 ? 'transparent' : '';
    box.classList.toggle('opening', t >= OPEN0 + 0.15);
    root.classList.toggle('intro-landing', t >= OUT_AT);
    if (!skipping) box.classList.toggle('out', t >= OUT_AT);
    pageZoom(t);
  }
  function frame(now) {
    if (!running) return;
    if (t0 === null) t0 = now;
    const t = (now - t0) / 1000;
    draw(t);
    if (ac) cues.forEach(([ct, fn], i) => { if (!fired[i] && t >= ct) { fired[i] = true; if (canPlay() && t - ct < 0.25) fn(); } });
    stage(t);
    if (t >= END) return finish();
    raf = requestAnimationFrame(frame);
  }
  function finish() {
    running = false; cancelAnimationFrame(raf); clearTimeout(endTimer);
    root.classList.remove('intro-on', 'intro-landing'); box.classList.remove('out', 'opening'); box.style.background = ''; $title.classList.remove('show'); resetPage();
    if (master && ac) { try { master.gain.setTargetAtTime(0, ac.currentTime, 0.05); } catch (e) {} }
    window.scrollTo(0, 0);
  }
  function skip() {
    if (!running || skipping) return; skipping = true; box.classList.add('out'); box.style.transition = 'opacity .45s ease';
    if (master && ac) { try { master.gain.setTargetAtTime(0, ac.currentTime, 0.08); } catch (e) {} }
    endTimer = setTimeout(() => { box.style.transition = ''; skipping = false; finish(); }, 480);
  }
  function play() {
    clearTimeout(endTimer); skipping = false; box.classList.remove('out'); box.style.transition = '';
    window.scrollTo(0, 0); resetPage(); root.classList.remove('intro-landing'); root.classList.add('intro-on'); layout(); initAudio(); sndLabel(); fired = []; t0 = null; running = true;
    if (ac && master) master.gain.setValueAtTime(0.9, ac.currentTime);
    if (ac && ac.state !== 'running' && !muted) ac.resume().catch(() => {});
    try { sessionStorage.setItem('ccp-intro', '1'); } catch (e) {}
    $skip.focus({ preventScroll: true }); raf = requestAnimationFrame(frame);
  }
  $skip.addEventListener('click', skip);
  addEventListener('keydown', (e) => { if (running && (e.key === 'Escape' || e.key === 'Enter')) skip(); });
  addEventListener('resize', () => { if (running) { layout(); } });
  document.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('#replay-intro')) { e.preventDefault(); play(); } });
  async function renderTest(name) {   // mesure objective d'un son (rendu hors ligne), pour les tests
    const sr = 44100, oc = new OfflineAudioContext(1, sr, sr), saved = [ac, master, noise];
    ac = oc; master = oc.createGain(); master.connect(oc.destination); noise = oc.createBuffer(1, sr * 2, sr); const nd = noise.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    sfx[name](1, 1); [ac, master, noise] = saved; const d = (await oc.startRendering()).getChannelData(0);
    let pk = 0, pi = 0; for (let i = 0; i < d.length; i++) if (Math.abs(d[i]) > pk) { pk = Math.abs(d[i]); pi = i; }
    const win = Math.round(sr * 0.002); let last = 0; for (let i = 0; i + win < d.length; i += win) { let m = 0; for (let j = 0; j < win; j++) m = Math.max(m, Math.abs(d[i + j])); if (m > pk * 0.01) last = i / sr; }
    const N = 2048, seg = d.slice(pi, pi + N); let num = 0, den = 0; for (let f = 1; f < N / 2; f += 2) { let re = 0, im = 0; for (let n = 0; n < N; n++) { const a = -TAU * f * n / N; re += seg[n] * Math.cos(a); im += seg[n] * Math.sin(a); } const mg = Math.hypot(re, im); num += mg * f * sr / N; den += mg; }
    return { pic: +pk.toFixed(2), dureeMs: Math.round(last * 1000), centroideHz: Math.round(num / den) };
  }
  window.CCPIntro = { renderTest, play, skip, seek: (t) => { running = false; cancelAnimationFrame(raf); resetPage(); layout(); draw(t); stage(t); } };   // seek : pour les tests visuels

  if (root.classList.contains('intro-on')) play();
})();
