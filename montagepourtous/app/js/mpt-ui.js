/*! MontagePourTous — kit d'interface « ampli années 90-2000 » : thèmes (sang / classique), boutons rotatifs, barres à LED fluo, vumètre. */
(function () {
  'use strict';
  if (window.MPT) return;
  var KEY = 'mpt-theme', uid = 0, NS = 'http://www.w3.org/2000/svg';
  function themeInitial() { try { var t = localStorage.getItem(KEY); if (t === 'sang' || t === 'classique') return t; } catch (e) {} return 'sang'; }
  var racine = document.documentElement;
  if (!racine.getAttribute('data-theme')) racine.setAttribute('data-theme', themeInitial());
  function getTheme() { return racine.getAttribute('data-theme') === 'classique' ? 'classique' : 'sang'; }
  function setTheme(t) { racine.setAttribute('data-theme', t); try { localStorage.setItem(KEY, t); } catch (e) {} }
  function suivreTheme(hote, cb) { var f = function () { hote.setAttribute('data-theme', getTheme()); if (cb) cb(getTheme()); }; f(); new MutationObserver(f).observe(racine, { attributes: true, attributeFilter: ['data-theme'] }); }

  /* Feuille de style commune à tous les composants (dans leur shadow DOM). */
  var CSS = '\
:host{display:block;--bg:#22060a;--card:#36090f;--card2:#4a0d16;--inp:#190307;--fg:#f8ece7;--mut:#d6b0ab;--line:rgba(255,150,150,.26);--a:#c8102e;--a2:#ff3d6e;--afg:#fff;--ledbg:#0b0204;color-scheme:dark;\
font:16px/1.5 system-ui,Segoe UI,Roboto,Arial,sans-serif;color:var(--fg)}\
:host([data-theme=classique]){--bg:#faf6f6;--card:#fff;--card2:#fdeef0;--inp:#fff;--fg:#1a1a1a;--mut:#555;--line:rgba(0,0,0,.16);--a:#c41e3a;--a2:#c41e3a;--ledbg:#150407;color-scheme:light}\
*{box-sizing:border-box}\
.cadre{background:var(--bg);padding:1rem;border:1px solid var(--line);border-radius:6px}\
h1{font-size:1.3rem;margin:0;color:var(--fg);letter-spacing:.04em;text-transform:uppercase}h2{font-size:1.02rem;margin:.9rem 0 .4rem;color:var(--a2);letter-spacing:.05em;text-transform:uppercase}\
.note{color:var(--mut);font-size:.88rem;margin:.3rem 0}\
button{font:inherit;cursor:pointer;border:1px solid var(--a2);background:linear-gradient(#5a1119,#2a060b);color:var(--fg);padding:.35rem .8rem;border-radius:4px;box-shadow:inset 0 1px 0 rgba(255,255,255,.18),0 1px 3px rgba(0,0,0,.5)}\
:host([data-theme=classique]) button{background:#fff;color:var(--a);border:2px solid var(--a);box-shadow:none}\
button:hover,button:focus-visible{background:var(--a);color:var(--afg);outline:none;box-shadow:0 0 10px var(--a2)}\
button.plein{background:linear-gradient(var(--a2),var(--a));color:#fff;border-color:var(--a2)}button:disabled{opacity:.45;cursor:default;box-shadow:none}\
button.petit{padding:.05rem .4rem;font-size:.85rem}\
input[type=text],input[type=number],select,textarea{font:inherit;background:var(--inp);color:var(--fg);border:1px solid var(--line);border-radius:3px;padding:.1rem .3rem}\
input[type=number]{width:3.6rem}select{max-width:11rem}input[type=checkbox]{accent-color:var(--a2)}\
.barre{display:flex;flex-wrap:wrap;gap:.5rem;margin:.5rem 0;align-items:center}\
ol{list-style:none;margin:0;padding:0}\
li{display:flex;flex-wrap:wrap;align-items:center;gap:.35rem;background:var(--card);border:1px solid var(--line);border-left:4px solid var(--a2);padding:.35rem .5rem;margin-bottom:.35rem;border-radius:3px}\
li.piste{border-left-color:#2fd6ff}li.actif{background:var(--card2)}li.coupe{opacity:.55}li .t{flex:1;min-width:6rem;overflow-wrap:anywhere}.ico{font-size:1.1rem}\
li label{display:flex;gap:.45rem;align-items:center;cursor:pointer;min-width:0}\
.depot{border:2px dashed var(--a2);padding:.8rem;text-align:center;background:var(--card);border-radius:4px}.depot.sur{background:var(--card2)}\
.pan{flex-basis:100%;display:flex;flex-wrap:wrap;gap:.6rem;align-items:center;padding:.3rem 0 .1rem;border-top:1px dashed var(--line);font-size:.9rem}\
.pan textarea{width:100%}.pan input[type=text]{flex:1;min-width:8rem}\
.reg{display:grid;grid-template-columns:1fr 1fr;gap:.3rem .8rem;font-size:.92rem;background:var(--card);border:1px solid var(--line);padding:.5rem;border-radius:3px}\
.entete{display:flex;flex-wrap:wrap;gap:.6rem;align-items:center;justify-content:space-between;margin-bottom:.6rem}\
.dur{color:var(--mut);font-size:.82rem;white-space:nowrap}\
\
/* ----- panneau « ampli » ----- */\
.ampli{background:linear-gradient(#3a3a3e,#1c1c1f 12%,#141416);border:1px solid #000;border-radius:6px;padding:.6rem .8rem;box-shadow:inset 0 1px 0 rgba(255,255,255,.25),0 4px 10px rgba(0,0,0,.55);color:#e8e8e8;margin-top:.5rem}\
.ampli .rang{display:flex;flex-wrap:wrap;gap:.9rem;align-items:center;justify-content:space-between}\
.ampli small{display:block;text-align:center;font:600 .62rem/1.2 system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;color:#bdbdbd}\
.ampli button{background:linear-gradient(#6b6b70,#2b2b2e);color:#f2f2f2;border:1px solid #000;box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 2px 3px rgba(0,0,0,.6)}\
.ampli button.plein{background:linear-gradient(#ff5a7a,#b0102c);box-shadow:inset 0 1px 0 rgba(255,255,255,.5),0 0 10px rgba(255,61,110,.55)}\
.ampli button:hover,.ampli button:focus-visible{background:linear-gradient(#ff5a7a,#b0102c);color:#fff;box-shadow:0 0 12px var(--a2)}\
:host([data-theme=classique]) button.plein{background:linear-gradient(var(--a2),var(--a));color:#fff}\
:host([data-theme=classique]) .ampli button{background:linear-gradient(#6b6b70,#2b2b2e);color:#f2f2f2;border:1px solid #000;box-shadow:inset 0 1px 0 rgba(255,255,255,.4),0 2px 3px rgba(0,0,0,.6)}\
:host([data-theme=classique]) .ampli button.plein{background:linear-gradient(#ff5a7a,#b0102c)}\
.knobbox{display:flex;flex-direction:column;align-items:center;gap:.1rem;min-width:84px;padding:6px}\
.knob{width:72px;height:72px;position:relative;touch-action:none;cursor:grab;outline:none;border-radius:50%}.knob::after{content:\'\';position:absolute;inset:-10px;border-radius:50%}.knob.prise{cursor:grabbing}.knob.prise .notch{filter:drop-shadow(0 0 6px #ff3d6e)}\
.knob:focus-visible{box-shadow:0 0 0 2px var(--a2)}.knob svg{width:100%;height:100%;display:block;overflow:visible}\
.knob .arc{filter:drop-shadow(0 0 3px currentColor);color:#39ff88}.knob .notch{filter:drop-shadow(0 0 2px #ff3d6e)}\
.kv{font:700 .72rem/1 ui-monospace,monospace;color:#39ff88;text-shadow:0 0 6px #39ff88;background:#050a06;border:1px solid #000;padding:.12rem .35rem;border-radius:2px;min-width:3.2rem;text-align:center}\
.led{display:flex;gap:2px;height:20px;padding:3px;background:var(--ledbg);border:1px solid #000;border-radius:3px;box-shadow:inset 0 2px 5px rgba(0,0,0,.9),0 1px 0 rgba(255,255,255,.18);cursor:pointer;touch-action:none;outline:none;flex:1;min-width:160px}\
.led:focus-visible{box-shadow:0 0 0 2px var(--a2)}.led i{flex:1;border-radius:1px;background:currentColor;opacity:.14}\
.led i.on{opacity:1;box-shadow:0 0 5px currentColor,0 0 11px currentColor}\
.vu{display:grid;grid-template-columns:1rem 1fr;gap:3px 6px;align-items:center;min-width:170px;flex:1}.vu b{font:700 .65rem/1 sans-serif;color:#bdbdbd}.vu .led{cursor:default;height:11px;padding:2px;min-width:0}\
.fader{-webkit-appearance:none;appearance:none;height:30px;background:transparent;cursor:pointer;flex:1;min-width:110px}\
.fader::-webkit-slider-runnable-track{height:8px;border-radius:4px;background:linear-gradient(90deg,#39ff88,#ffd23d 65%,#ff3b4a);box-shadow:inset 0 2px 4px rgba(0,0,0,.8),0 0 8px rgba(57,255,136,.45)}\
.fader::-moz-range-track{height:8px;border-radius:4px;background:linear-gradient(90deg,#39ff88,#ffd23d 65%,#ff3b4a)}\
.fader::-webkit-slider-thumb{-webkit-appearance:none;width:16px;height:28px;margin-top:-10px;border-radius:3px;border:1px solid #000;background:repeating-linear-gradient(#d8d8d8 0 2px,#8d8d8d 2px 4px);box-shadow:0 2px 4px rgba(0,0,0,.7)}\
.fader::-moz-range-thumb{width:14px;height:26px;border-radius:3px;border:1px solid #000;background:repeating-linear-gradient(#d8d8d8 0 2px,#8d8d8d 2px 4px)}\
.temps{font:700 1rem/1 ui-monospace,monospace;color:#39ff88;text-shadow:0 0 8px #39ff88;background:#050a06;border:1px solid #000;padding:.3rem .5rem;border-radius:3px;white-space:nowrap}\
';

  function polaire(r, deg) { var a = (deg - 90) * Math.PI / 180; return [40 + r * Math.cos(a), 40 + r * Math.sin(a)]; }
  function arc(r, d1, d2) { var p1 = polaire(r, d1), p2 = polaire(r, d2); return 'M' + p1[0].toFixed(2) + ' ' + p1[1].toFixed(2) + ' A' + r + ' ' + r + ' 0 ' + (d2 - d1 > 180 ? 1 : 0) + ' 1 ' + p2[0].toFixed(2) + ' ' + p2[1].toFixed(2); }

  /* Bouton rotatif : glisser verticalement, molette, flèches, double-clic = valeur d'origine. */
  function knob(o) {
    var id = 'k' + (++uid), min = o.min, max = o.max, step = o.step || 1, def = o.value, val = o.value, fmt = o.format || function (v) { return String(Math.round(v)); };
    var box = document.createElement('div'); box.className = 'knobbox';
    var k = document.createElement('div'); k.className = 'knob'; k.tabIndex = 0; k.setAttribute('role', 'slider'); k.setAttribute('aria-label', o.label || 'Réglage');
    k.setAttribute('aria-valuemin', min); k.setAttribute('aria-valuemax', max);
    var ticks = ''; for (var i = 0; i <= 10; i++) { var a = polaire(35, -135 + 27 * i), b = polaire(39, -135 + 27 * i); ticks += '<line x1="' + a[0] + '" y1="' + a[1] + '" x2="' + b[0] + '" y2="' + b[1] + '" stroke="rgba(255,255,255,.45)" stroke-width="1.2"/>'; }
    k.innerHTML = '<svg viewBox="0 0 80 80" aria-hidden="true"><defs><radialGradient id="' + id + 'g" cx="35%" cy="28%" r="80%"><stop offset="0" stop-color="#9c9ca2"/><stop offset=".45" stop-color="#3b3b40"/><stop offset="1" stop-color="#0c0c0e"/></radialGradient></defs>' + ticks +
      '<path d="' + arc(31, -135, 135) + '" fill="none" stroke="rgba(0,0,0,.55)" stroke-width="3.5" stroke-linecap="round"/><path class="arc" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>' +
      '<circle cx="40" cy="40" r="26" fill="#000" opacity=".55" transform="translate(0 2)"/><circle cx="40" cy="40" r="25" fill="url(#' + id + 'g)" stroke="#000"/><circle cx="40" cy="40" r="25" fill="none" stroke="rgba(255,255,255,.28)" stroke-width="2.4" stroke-dasharray="1 1.6"/>' +
      '<circle cx="40" cy="40" r="17" fill="none" stroke="rgba(0,0,0,.5)"/><g class="notch"><line x1="40" y1="16" x2="40" y2="31" stroke="#ff3d6e" stroke-width="4" stroke-linecap="round"/></g></svg>';
    var kv = document.createElement('div'); kv.className = 'kv'; var lb = document.createElement('small'); lb.textContent = o.label || '';
    box.appendChild(k); box.appendChild(kv); box.appendChild(lb);
    var arcEl = k.querySelector('.arc'), notch = k.querySelector('.notch');
    function maj() {
      var f = (val - min) / (max - min), ang = -135 + 270 * f;
      arcEl.setAttribute('d', f <= 0.002 ? '' : arc(31, -135, -135 + 270 * f)); notch.setAttribute('transform', 'rotate(' + (ang) + ' 40 40)');
      kv.textContent = fmt(val); k.setAttribute('aria-valuenow', Math.round(val * 100) / 100); k.setAttribute('aria-valuetext', fmt(val));
    }
    function fixer(v, emettre) { v = Math.min(max, Math.max(min, Math.round(v / step) * step)); if (v === val) return; val = v; maj(); if (emettre !== false && o.onchange) o.onchange(val); }
    var actif = false;
    function depuis(e) { // angle du curseur autour du centre → valeur : le repère se place sous le curseur
      var r = k.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      if (Math.hypot(dx, dy) < 5) return;
      var ang = Math.atan2(dx, -dy) * 180 / Math.PI;
      if (ang > 135 || ang < -135) ang = val > (min + max) / 2 ? 135 : -135; // zone morte en bas : on reste à la butée la plus proche
      fixer(min + (ang + 135) / 270 * (max - min));
    }
    k.addEventListener('pointerdown', function (e) { actif = true; k.setPointerCapture(e.pointerId); k.classList.add('prise'); depuis(e); e.preventDefault(); k.focus(); });
    k.addEventListener('pointermove', function (e) { if (actif) depuis(e); });
    var fin = function () { actif = false; k.classList.remove('prise'); }; k.addEventListener('pointerup', fin); k.addEventListener('pointercancel', fin);
    k.addEventListener('wheel', function (e) { e.preventDefault(); fixer(val + (e.deltaY < 0 ? 1 : -1) * Math.max(step, (max - min) / 50)); }, { passive: false });
    k.addEventListener('keydown', function (e) {
      var d = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1 }[e.key], g = (max - min) / 10;
      if (d) { fixer(val + d * step); e.preventDefault(); } else if (e.key === 'PageUp') { fixer(val + g); e.preventDefault(); } else if (e.key === 'PageDown') { fixer(val - g); e.preventDefault(); }
      else if (e.key === 'Home') { fixer(min); e.preventDefault(); } else if (e.key === 'End') { fixer(max); e.preventDefault(); }
    });
    k.addEventListener('dblclick', function () { fixer(def); });
    maj();
    return { el: box, get: function () { return val; }, set: function (v) { fixer(v, false); } };
  }

  /* Barre à LED fluo (vert → ambre → rouge). Interactive si onseek est fourni. */
  function led(n, o) {
    o = o || {}; var el = document.createElement('div'); el.className = 'led'; var seg = [], allume = 0;
    for (var i = 0; i < n; i++) { var s = document.createElement('i'), f = i / n; s.style.color = f < 0.6 ? '#37ff7a' : f < 0.85 ? '#ffd23d' : '#ff3b4a'; el.appendChild(s); seg.push(s); }
    if (o.onseek) {
      el.tabIndex = 0; el.setAttribute('role', 'slider'); el.setAttribute('aria-label', o.label || 'Position'); el.setAttribute('aria-valuemin', 0); el.setAttribute('aria-valuemax', 100);
      var frac = function (e) { var b = el.getBoundingClientRect(); return Math.min(1, Math.max(0, (e.clientX - b.left) / b.width)); }, drag = false;
      el.addEventListener('pointerdown', function (e) { drag = true; el.setPointerCapture(e.pointerId); o.onseek(frac(e)); e.preventDefault(); });
      el.addEventListener('pointermove', function (e) { if (drag) o.onseek(frac(e)); });
      el.addEventListener('pointerup', function () { drag = false; }); el.addEventListener('pointercancel', function () { drag = false; });
      el.addEventListener('keydown', function (e) { var d = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key]; if (d) { e.preventDefault(); o.onseek(Math.min(1, Math.max(0, (allume + d * 2) / n))); } });
    }
    return { el: el, set: function (f) { var m = Math.round(Math.min(1, Math.max(0, f)) * n); if (m === allume) return; for (var i = Math.min(m, allume); i < Math.max(m, allume); i++) seg[i].classList.toggle('on', i < m); allume = m; if (o.onseek) el.setAttribute('aria-valuenow', Math.round(f * 100)); } };
  }

  /* Vumètre stéréo, à brancher sur la sortie audio : v.brancher(contexte, noeud). */
  function vu() {
    var el = document.createElement('div'); el.className = 'vu'; var L = led(28), R = led(28);
    el.innerHTML = '<b>G</b><span></span><b>D</b><span></span>'; var sp = el.querySelectorAll('span'); sp[0].replaceWith(L.el); sp[1].replaceWith(R.el);
    var aL = null, aR = null, bl = new Float32Array(512), br = new Float32Array(512), nl = 0, nr = 0, actif = false;
    function niveau(a, buf) { a.getFloatTimeDomainData(buf); var m = 0; for (var i = 0; i < buf.length; i++) m = Math.max(m, Math.abs(buf[i])); return Math.min(1, Math.max(0, (20 * Math.log10(m + 1e-4) + 54) / 54)); }
    function boucle() { if (!actif) return; nl = Math.max(niveau(aL, bl), nl - 0.05); nr = Math.max(niveau(aR, br), nr - 0.05); L.set(nl); R.set(nr); requestAnimationFrame(boucle); }
    return {
      el: el,
      brancher: function (ctx, source) { var sep = ctx.createChannelSplitter(2); aL = ctx.createAnalyser(); aR = ctx.createAnalyser(); aL.fftSize = aR.fftSize = 512; source.connect(sep); sep.connect(aL, 0); sep.connect(aR, 1); },
      demarrer: function () { if (aL && !actif) { actif = true; boucle(); } },
      arreter: function () { actif = false; nl = nr = 0; L.set(0); R.set(0); }
    };
  }

  window.MPT = { CSS: CSS, knob: knob, led: led, vu: vu, getTheme: getTheme, setTheme: setTheme, suivreTheme: suivreTheme };
})();
