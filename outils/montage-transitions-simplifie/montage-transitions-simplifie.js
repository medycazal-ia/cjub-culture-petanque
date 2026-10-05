/*! montage-transitions-simplifie — photos, vidéos et textes enchaînés avec fondus/transitions + une ou plusieurs bandes son en parallèle.
 *  100 % dans le navigateur (Chrome recommandé), sans installation ni serveur.
 *  Intégration :  <script src="montage-transitions-simplifie.js"></script>  <montage-transitions-simplifie></montage-transitions-simplifie>
 *  Attributs : resolution ("1280x720"), duree-image (5), duree-transition (1), titre, couleur (#c41e3a)
 *  Événement : "montage-pret" (detail: {blob, nom, type}). Méthodes : ajouter(fileList), ajouterTexte(texte). */
(function () {
  'use strict';
  if (window.customElements && customElements.get('montage-transitions-simplifie')) return;

  var EXT = { video: /\.(mp4|m4v|mov|webm|ogv|mkv|3gp)$/i, audio: /\.(mp3|wav|m4a|aac|flac|opus|oga|ogg|weba)$/i, image: /\.(jpe?g|png|gif|webp|avif|bmp|svg)$/i };
  function genre(f) {
    var t = f.type || '', n = f.name || '';
    if (/^image\//.test(t) || EXT.image.test(n)) return 'image';
    if (/\.ogg$/i.test(n) || /^audio\//.test(t) || EXT.audio.test(n)) return 'audio';
    if (/^video\//.test(t) || EXT.video.test(n)) return 'video';
    return null;
  }
  function nom(f) { return f.replace(/\.[^.]+$/, ''); }
  function mmss(s) { s = Math.max(0, s); return Math.floor(s / 60) + ':' + ('0' + Math.floor(s % 60)).slice(-2); }
  function num(x, d, a, b) { x = parseFloat(x); if (!isFinite(x)) x = d; return Math.min(b, Math.max(a, x)); }
  var TRANS = [['fondu', 'Fondu enchaîné'], ['noir', 'Fondu par le noir'], ['glisse', 'Glissement'], ['zoom', 'Zoom'], ['aucune', 'Coupure franche']];

  var CSS = '\
:host{display:block;--mms-a:#c41e3a;font:16px/1.5 system-ui,Segoe UI,Roboto,Arial,sans-serif;color:#1a1a1a}*{box-sizing:border-box}\
.cadre{display:grid;grid-template-columns:minmax(300px,480px) 1fr;gap:1.2rem;background:#faf6f6;padding:1rem;border:1px solid rgba(0,0,0,.12)}\
@media(max-width:900px){.cadre{grid-template-columns:1fr}}\
h1{font-size:1.3rem;margin:0;color:var(--mms-a);grid-column:1/-1}h2{font-size:1.05rem;margin:.9rem 0 .4rem;color:var(--mms-a)}\
ol{list-style:none;margin:0;padding:0}\
li{display:flex;flex-wrap:wrap;align-items:center;gap:.35rem;background:#fff;border:1px solid rgba(0,0,0,.14);border-left:4px solid var(--mms-a);padding:.35rem .5rem;margin-bottom:.35rem}\
li.piste{border-left-color:#2b6cb0}li .t{flex:1;min-width:6rem;overflow-wrap:anywhere}\
.ico{font-size:1.1rem}.pan{flex-basis:100%;display:flex;flex-wrap:wrap;gap:.5rem;align-items:center;padding:.3rem 0 .1rem;border-top:1px dashed rgba(0,0,0,.2);font-size:.9rem}\
.pan textarea{width:100%;font:inherit}.pan input[type=text]{flex:1;min-width:8rem;font:inherit}\
input[type=number]{width:3.6rem;font:inherit;padding:.05rem .2rem}select{font:inherit;max-width:11rem}\
button{font:inherit;cursor:pointer;border:2px solid var(--mms-a);background:#fff;color:var(--mms-a);padding:.35rem .8rem;border-radius:3px}\
button:hover,button:focus-visible{background:var(--mms-a);color:#fff;outline:none}button.plein{background:var(--mms-a);color:#fff}button:disabled{opacity:.5;cursor:default}\
button.petit{padding:.05rem .4rem;font-size:.85rem}.barre{display:flex;flex-wrap:wrap;gap:.5rem;margin:.5rem 0;align-items:center}\
.note{color:#555;font-size:.88rem;margin:.3rem 0}.depot{border:2px dashed var(--mms-a);padding:.8rem;text-align:center;background:#fff}.depot.sur{background:#fdeef0}\
.reg{display:grid;grid-template-columns:1fr 1fr;gap:.3rem .8rem;font-size:.92rem;background:#fff;border:1px solid rgba(0,0,0,.14);padding:.5rem}\
canvas{width:100%;aspect-ratio:16/9;background:#000;display:block;border:1px solid rgba(0,0,0,.25)}\
.trans{display:flex;gap:.5rem;align-items:center;margin-top:.4rem}.trans input[type=range]{flex:1}\
#lanes{position:relative;margin-top:.5rem;background:#fff;border:1px solid rgba(0,0,0,.14);padding:.3rem 0}.lane{position:relative;height:1.5rem;margin:.15rem 0;cursor:pointer}\
.bl{position:absolute;top:0;bottom:0;background:var(--mms-a);opacity:.85;color:#fff;font-size:.7rem;overflow:hidden;white-space:nowrap;padding:0 .2rem;border-right:1px solid #fff}\
.bl.s{background:#2b6cb0}.bl.t{background:#6b5b95}#tete{position:absolute;top:0;bottom:0;width:2px;background:#000;pointer-events:none}\
#etat,#expetat{min-height:1.4em;font-weight:700}';

  var HTML = '\
<div class="cadre"><h1 id="titre"></h1>\
<section>\
<h2>1. Ajoutez vos fichiers</h2>\
<div class="depot" id="depot"><button class="plein" id="choisir">📂 Choisir des fichiers</button> <button id="addtexte">✏️ Ajouter un texte</button>\
<p class="note">ou glissez-les ici : <b>photos</b>, <b>vidéos</b> et <b>sons</b> (mp3, wav, m4a, ogg…). Les photos, vidéos et textes forment l\'image ; les sons forment les bandes son, <b>jouées en même temps</b>.</p>\
<input type="file" id="fichiers" accept="video/*,audio/*,image/*,.mp4,.m4v,.mov,.webm,.mp3,.wav,.m4a,.ogg,.flac,.opus,.jpg,.jpeg,.png,.gif,.webp,.avif,.bmp,.svg" multiple hidden></div>\
<h2>2. Images, vidéos et textes (dans l\'ordre)</h2><ol id="liste"></ol>\
<div class="barre"><label>Même transition pour tous : <select id="gtrans"></select></label></div>\
<h2>3. Bandes son (en parallèle)</h2><ol id="pistes"></ol>\
<h2>4. Réglages</h2>\
<div class="reg"><label>Durée des transitions <input type="number" id="gdur" min="0.2" max="5" step="0.1"> s</label>\
<label><input type="checkbox" id="ken" checked> Mouvement doux sur les photos</label>\
<label><input type="checkbox" id="cover"> Remplir l\'écran (recadrer)</label>\
<label><input type="checkbox" id="fadin" checked> Fondu au début</label>\
<label><input type="checkbox" id="fadout" checked> Fondu à la fin</label></div>\
</section>\
<section><h2>5. Aperçu</h2>\
<canvas id="cv"></canvas>\
<div class="trans"><span id="tps">0:00 / 0:00</span><input type="range" id="curseur" min="0" max="1000" value="0" aria-label="Position"></div>\
<div class="barre"><button id="lire" class="plein">▶ Lire</button><button id="arreter" disabled>⏹ Arrêter</button><button id="plein">⛶ Plein écran</button></div>\
<div id="lanes"></div><div id="etat" role="status"></div>\
<div class="barre"><button id="exporter" class="plein">💾 Enregistrer en un seul fichier</button></div>\
<p class="note" id="expetat" role="status"></p>\
<p class="note">L\'enregistrement se fait <b>en direct</b> (durée du montage) : gardez cet onglet ouvert et visible. Le fichier se télécharge ensuite tout seul. Si une bande son est plus longue que les images, elle est coupée en fondu à la fin.</p>\
</section></div>';

  class MontageTransitions extends HTMLElement {
    connectedCallback() {
      if (this._ok) return; this._ok = true;
      var self = this, r = this.attachShadow({ mode: 'open' }); r.innerHTML = '<style>' + CSS + '</style>' + HTML;
      var $ = this.$ = function (id) { return r.getElementById(id); };
      this.clips = []; this.pistes = []; this.t = 0; this.total = 0; this.etat = 'arret'; this.uid = 0; this.srcs = []; this.exportEnCours = false;
      var m = /^(\d+)x(\d+)$/.exec(this.getAttribute('resolution') || '1280x720'); this.W = m ? +m[1] : 1280; this.H = m ? +m[2] : 720;
      this.dureeImage = num(this.getAttribute('duree-image'), 5, 1, 600); this.transDefaut = 'fondu';
      this.style.setProperty('--mms-a', this.getAttribute('couleur') || '#c41e3a');
      $('titre').textContent = this.getAttribute('titre') || 'Montage avec transitions et bandes son';
      this.cv = $('cv'); this.cv.width = this.W; this.cv.height = this.H; this.g = this.cv.getContext('2d');
      $('gdur').value = num(this.getAttribute('duree-transition'), 1, 0.2, 5);
      var opts = TRANS.map(function (x) { return '<option value="' + x[0] + '">' + x[1] + '</option>'; }).join('');
      $('gtrans').innerHTML = opts;
      $('gtrans').onchange = function () { self.transDefaut = $('gtrans').value; self.clips.forEach(function (c) { c.trans = self.transDefaut; }); self.dessiner(); };
      ['gdur', 'ken', 'cover', 'fadin', 'fadout'].forEach(function (id) { $(id).onchange = function () { self.dessiner(); }; });
      $('choisir').onclick = function () { $('fichiers').click(); };
      $('fichiers').onchange = function (e) { self.ajouter(e.target.files); e.target.value = ''; };
      $('addtexte').onclick = function () { self.ajouterTexte('Mon titre'); };
      var dp = $('depot');
      ['dragenter', 'dragover'].forEach(function (n) { dp.addEventListener(n, function (e) { e.preventDefault(); dp.className = 'depot sur'; }); });
      ['dragleave', 'drop'].forEach(function (n) { dp.addEventListener(n, function (e) { e.preventDefault(); dp.className = 'depot'; }); });
      dp.addEventListener('drop', function (e) { self.ajouter(e.dataTransfer.files); });
      $('lire').onclick = function () { if (self.etat === 'lecture') self.pause(); else self.lire(); };
      $('arreter').onclick = function () { self.arreter(); };
      $('plein').onclick = function () { (self.cv.requestFullscreen || self.cv.webkitRequestFullscreen || function () {}).call(self.cv); };
      $('curseur').oninput = function () { self.aller(($('curseur').value / 1000) * self.total); };
      $('lanes').onclick = function (e) { var b = $('lanes').getBoundingClientRect(); self.aller(Math.min(1, Math.max(0, (e.clientX - b.left) / b.width)) * self.total); };
      $('exporter').onclick = function () { self.exporter(); };
      this.dessiner();
    }
    /* ---------- ajout ---------- */
    ajouter(fichiers) {
      var self = this, ign = [];
      var l = Array.prototype.slice.call(fichiers).filter(function (f) { if (genre(f)) return true; ign.push(f.name); return false; });
      l.sort(function (a, b) { return a.name.localeCompare(b.name, 'fr', { numeric: true }); });
      l.forEach(function (f) {
        var g = genre(f), url = URL.createObjectURL(f), it = { id: ++self.uid, genre: g, titre: nom(f.name), url: url, file: f };
        if (g === 'audio') {
          Object.assign(it, { start: 0, vol: 1, fi: 1, fo: 1, loop: false, sec: 0, buf: null });
          self.decoder(f).then(function (b) { it.buf = b; it.sec = b ? b.duration : 0; self.dessiner(); });
          self.pistes.push(it);
        } else {
          Object.assign(it, { trans: self.transDefaut, legende: '', son: true, vol: 1, dur: self.dureeImage, ouvert: false });
          if (g === 'image') { it.el = new Image(); it.el.onload = function () { self.rendre(); }; it.el.src = url; }
          else {
            var v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto'; it.el = v; it.dur = 5;
            v.onloadedmetadata = function () { it.dur = isFinite(v.duration) ? v.duration : 5; self.dessiner(); };
            v.onseeked = v.onloadeddata = function () { if (self.etat !== 'lecture') self.rendre(); };
            v.src = url;
          }
          self.clips.push(it);
        }
      });
      this.$('etat').textContent = ign.length ? 'Ignoré (format non reconnu) : ' + ign.join(', ') : '';
      this.dessiner();
    }
    ajouterTexte(texte) {
      this.clips.push({ id: ++this.uid, genre: 'texte', titre: 'Texte', texte: texte || '', bg: '#000000', fg: '#ffffff', trans: this.transDefaut, legende: '', dur: 4, ouvert: true });
      this.dessiner();
    }
    decoder(f) {
      return f.arrayBuffer().then(function (ab) {
        var C = window.OfflineAudioContext || window.webkitOfflineAudioContext; return new C(2, 1, 44100).decodeAudioData(ab);
      }).catch(function () { return null; });
    }
    /* ---------- calcul de la chronologie ---------- */
    recalculer() {
      var gd = num(this.$('gdur').value, 1, 0.2, 5), c = this.clips, s = 0;
      c.forEach(function (x, i) {
        var nx = c[i + 1]; x.tout = nx && x.trans !== 'aucune' ? Math.min(gd, x.dur * 0.5, nx.dur * 0.5) : 0;
      });
      c.forEach(function (x, i) { x.tin = i ? c[i - 1].tout : 0; x.start = s; x.fin = s + x.dur; s = x.fin - x.tout; });
      this.total = c.length ? Math.max.apply(null, c.map(function (x) { return x.fin; })) : Math.max.apply(null, [0].concat(this.pistes.map(function (p) { return p.start + p.sec; })));
    }
    evenementsSon() {
      var ev = [], total = this.total;
      this.clips.forEach(function (c) { if (c.genre === 'video' && c.son && c.buf) ev.push({ buf: c.buf, start: c.start, len: Math.min(c.buf.duration, c.dur), vol: c.vol, fi: c.tin, fo: c.tout, loop: false }); });
      this.pistes.forEach(function (p) {
        if (!p.buf || p.start >= total) return;
        var len = p.loop ? total - p.start : Math.min(p.buf.duration, total - p.start);
        ev.push({ buf: p.buf, start: p.start, len: len, vol: p.vol, fi: p.fi, fo: p.fo, loop: p.loop });
      });
      return ev;
    }
    /* ---------- interface ---------- */
    dessiner() {
      var self = this; this.recalculer();
      var ol = this.$('liste'); ol.innerHTML = '';
      if (!this.clips.length) ol.innerHTML = '<li><span class="note">Aucune photo, vidéo ou texte pour le moment.</span></li>';
      this.clips.forEach(function (c, i) { ol.appendChild(self.ligneClip(c, i)); });
      var op = this.$('pistes'); op.innerHTML = '';
      if (!this.pistes.length) op.innerHTML = '<li class="piste"><span class="note">Aucune bande son pour le moment (ajoutez des fichiers audio).</span></li>';
      this.pistes.forEach(function (p, i) { op.appendChild(self.lignePiste(p, i)); });
      this.majLanes(); this.majTemps(); this.rendre();
    }
    boutons(li, tab, i, retirer) {
      var self = this;
      li.insertAdjacentHTML('beforeend', '<button class="petit" title="Monter" aria-label="Monter">▲</button><button class="petit" title="Descendre" aria-label="Descendre">▼</button><button class="petit" title="Retirer" aria-label="Retirer">✕</button>');
      var b = Array.prototype.slice.call(li.querySelectorAll(':scope > button.petit'), -3);
      b[0].onclick = function () { if (i > 0) { tab.splice(i - 1, 0, tab.splice(i, 1)[0]); self.dessiner(); } };
      b[1].onclick = function () { if (i < tab.length - 1) { tab.splice(i + 1, 0, tab.splice(i, 1)[0]); self.dessiner(); } };
      b[2].onclick = function () { var x = tab.splice(i, 1)[0]; if (x.url) URL.revokeObjectURL(x.url); self.arreter(); self.dessiner(); };
    }
    ligneClip(c, i) {
      var self = this, li = document.createElement('li'), last = i === this.clips.length - 1;
      li.innerHTML = '<span class="ico">' + { image: '🖼️', video: '🎬', texte: '✏️' }[c.genre] + '</span><span class="t"></span>' +
        (c.genre === 'video' ? '<span>' + Math.round(c.dur) + ' s</span>' : '<span><input type="number" class="d" min="1" max="600" step="1" aria-label="Secondes"> s</span>') +
        '<select class="tr" aria-label="Transition vers la suite"></select><button class="petit ed" title="Réglages">⚙</button>';
      li.querySelector('.t').textContent = c.genre === 'texte' ? (c.texte || '').slice(0, 30) || 'Texte' : c.titre;
      var d = li.querySelector('.d'); if (d) { d.value = Math.round(c.dur); d.onchange = function () { c.dur = num(d.value, 5, 1, 600); self.dessiner(); }; }
      var tr = li.querySelector('.tr'); tr.innerHTML = TRANS.map(function (x) { return '<option value="' + x[0] + '">' + x[1] + '</option>'; }).join(''); tr.value = c.trans;
      if (last) { tr.style.display = 'none'; } tr.onchange = function () { c.trans = tr.value; self.dessiner(); };
      li.querySelector('.ed').onclick = function () { c.ouvert = !c.ouvert; self.dessiner(); };
      this.boutons(li, this.clips, i);
      if (c.ouvert) li.appendChild(this.panneau(c));
      return li;
    }
    panneau(c) {
      var self = this, p = document.createElement('div'); p.className = 'pan';
      var h = '';
      if (c.genre === 'texte') h += '<textarea rows="3" class="tx" placeholder="Votre texte"></textarea><label>Fond <input type="color" class="bg"></label><label>Texte <input type="color" class="fg"></label>';
      h += '<input type="text" class="lg" placeholder="Légende en bas de l\'image (facultatif)">';
      if (c.genre === 'video') h += '<label><input type="checkbox" class="so"> Garder le son de la vidéo</label><label>Volume <input type="range" class="vo" min="0" max="100"></label>';
      p.innerHTML = h;
      var q = function (s) { return p.querySelector(s); };
      if (q('.tx')) { q('.tx').value = c.texte; q('.tx').onchange = function () { c.texte = q('.tx').value; self.dessiner(); }; q('.bg').value = c.bg; q('.bg').onchange = function () { c.bg = q('.bg').value; self.rendre(); }; q('.fg').value = c.fg; q('.fg').onchange = function () { c.fg = q('.fg').value; self.rendre(); }; }
      q('.lg').value = c.legende; q('.lg').onchange = function () { c.legende = q('.lg').value; self.rendre(); };
      if (q('.so')) { q('.so').checked = c.son; q('.so').onchange = function () { c.son = q('.so').checked; }; q('.vo').value = Math.round(c.vol * 100); q('.vo').onchange = function () { c.vol = q('.vo').value / 100; }; }
      return p;
    }
    lignePiste(p, i) {
      var self = this, li = document.createElement('li'); li.className = 'piste';
      li.innerHTML = '<span class="ico">🎵</span><span class="t"></span><span class="du"></span>' +
        '<div class="pan" style="border:0"><label>Début <input type="number" class="st" min="0" step="1"> s</label><label>Volume <input type="range" class="vo" min="0" max="100"></label>' +
        '<label>Fondu entrée <input type="number" class="fi" min="0" max="30" step="0.5"> s</label><label>Fondu sortie <input type="number" class="fo" min="0" max="30" step="0.5"> s</label>' +
        '<label><input type="checkbox" class="lp"> Répéter jusqu\'à la fin</label></div>';
      li.querySelector('.t').textContent = p.titre; li.querySelector('.du').textContent = p.buf ? Math.round(p.sec) + ' s' : (p.sec === 0 ? '(lecture impossible ?)' : '');
      var q = function (s) { return li.querySelector(s); };
      q('.st').value = p.start; q('.st').onchange = function () { p.start = num(q('.st').value, 0, 0, 36000); self.dessiner(); };
      q('.vo').value = Math.round(p.vol * 100); q('.vo').onchange = function () { p.vol = q('.vo').value / 100; };
      q('.fi').value = p.fi; q('.fi').onchange = function () { p.fi = num(q('.fi').value, 1, 0, 30); };
      q('.fo').value = p.fo; q('.fo').onchange = function () { p.fo = num(q('.fo').value, 1, 0, 30); };
      q('.lp').checked = p.loop; q('.lp').onchange = function () { p.loop = q('.lp').checked; self.dessiner(); };
      this.boutons(li, this.pistes, i); return li;
    }
    majLanes() {
      var L = this.$('lanes'), T = Math.max(this.total, 0.001), h = '<div class="lane">';
      this.clips.forEach(function (c) { h += '<div class="bl' + (c.genre === 'texte' ? ' t' : '') + '" style="left:' + c.start / T * 100 + '%;width:' + c.dur / T * 100 + '%">' + { image: '🖼️', video: '🎬', texte: '✏️' }[c.genre] + '</div>'; });
      h += '</div>';
      var tot = this.total;
      this.pistes.forEach(function (p) { var len = p.loop ? tot - p.start : Math.min(p.sec, tot - p.start); h += '<div class="lane"><div class="bl s" style="left:' + p.start / T * 100 + '%;width:' + Math.max(0, len) / T * 100 + '%">🎵</div></div>'; });
      L.innerHTML = h + '<div id="tete"></div>';
    }
    majTemps() {
      var T = Math.max(this.total, 0.001);
      this.$('tps').textContent = mmss(this.t) + ' / ' + mmss(this.total);
      this.$('curseur').value = Math.round(this.t / T * 1000);
      var th = this.$('tete'); if (th) th.style.left = Math.min(100, this.t / T * 100) + '%';
    }
    majBoutons() {
      this.$('lire').textContent = this.etat === 'lecture' ? '⏸ Pause' : this.etat === 'pause' ? '▶ Reprendre' : '▶ Lire';
      this.$('arreter').disabled = this.etat === 'arret' && this.t === 0;
    }
    /* ---------- dessin d'une image à l'instant t ---------- */
    rendre(t) {
      if (t === undefined) t = this.t;
      var g = this.g, W = this.W, H = this.H, self = this, cover = this.$('cover').checked, ken = this.$('ken').checked;
      g.globalAlpha = 1; g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
      this.clips.forEach(function (c) {
        if (t < c.start || t > c.fin) return;
        var a = 1, dx = 0, s = 1, tin = c.tin, tout = c.tout;
        if (tin > 0 && t < c.start + tin) {
          var u = (t - c.start) / tin, ty = self.clips[self.clips.indexOf(c) - 1].trans;
          if (ty === 'fondu') a = u; else if (ty === 'noir') a = Math.max(0, 2 * u - 1); else if (ty === 'glisse') dx = (1 - u) * W; else if (ty === 'zoom') { a = u; s = 0.85 + 0.15 * u; }
        }
        if (tout > 0 && t > c.fin - tout) {
          var v = (t - (c.fin - tout)) / tout;
          if (c.trans === 'noir') a = Math.min(a, 1 - Math.min(1, 2 * v)); else if (c.trans === 'glisse') dx = -v * W; else if (c.trans === 'zoom') s = 1 + 0.15 * v;
        }
        g.save(); g.globalAlpha = Math.max(0, Math.min(1, a)); g.translate(W / 2 + dx, H / 2);
        var p = c.dur ? (t - c.start) / c.dur : 0;
        if (c.genre === 'texte') {
          g.fillStyle = c.bg; g.fillRect(-W / 2, -H / 2, W, H); g.scale(s, s); self.texte(c);
        } else {
          var el = c.el, w = c.genre === 'video' ? el.videoWidth : el.naturalWidth, h = c.genre === 'video' ? el.videoHeight : el.naturalHeight;
          if (c.genre === 'image' && ken) s *= 1 + 0.08 * p;
          if (w && h && (c.genre === 'image' || el.readyState >= 2)) { var k = (cover ? Math.max : Math.min)(W / w, H / h); g.scale(s, s); try { g.drawImage(el, -w * k / 2, -h * k / 2, w * k, h * k); } catch (e) {} }
        }
        g.restore();
        if (c.legende) { g.save(); g.globalAlpha = Math.max(0, Math.min(1, a)); g.translate(dx, 0); self.legende(c.legende); g.restore(); }
      });
      var fd = Math.min(1, this.total / 4), nuit = 0;
      if (this.$('fadin').checked && t < fd) nuit = 1 - t / fd;
      if (this.$('fadout').checked && t > this.total - fd) nuit = Math.max(nuit, (t - (this.total - fd)) / fd);
      if (nuit > 0 && this.total > 0) { g.globalAlpha = Math.min(1, nuit); g.fillStyle = '#000'; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
    }
    lignes(texte, maxW) {
      var g = this.g, out = [];
      String(texte).split('\n').forEach(function (par) {
        var cur = ''; par.split(/\s+/).forEach(function (w) { var test = cur ? cur + ' ' + w : w; if (cur && g.measureText(test).width > maxW) { out.push(cur); cur = w; } else cur = test; }); out.push(cur);
      });
      return out;
    }
    texte(c) {
      var g = this.g, fs = Math.round(this.H / 10); g.font = 'bold ' + fs + 'px system-ui,Arial,sans-serif'; g.fillStyle = c.fg; g.textAlign = 'center'; g.textBaseline = 'middle';
      var L = this.lignes(c.texte, this.W * 0.8), lh = fs * 1.25, y0 = -(L.length - 1) * lh / 2;
      L.forEach(function (l, i) { g.fillText(l, 0, y0 + i * lh); });
    }
    legende(txt) {
      var g = this.g, fs = Math.round(this.H / 24); g.font = fs + 'px system-ui,Arial,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      var L = this.lignes(txt, this.W * 0.86), lh = fs * 1.3, hh = L.length * lh + fs, y = this.H - hh;
      g.fillStyle = 'rgba(0,0,0,.55)'; g.fillRect(0, y, this.W, hh); g.fillStyle = '#fff';
      L.forEach(function (l, i) { g.fillText(l, this.W / 2, y + fs / 2 + lh * (i + .5)); }, this);
    }
    /* ---------- lecture ---------- */
    assurerAC() {
      if (this.ac) return; var AC = window.AudioContext || window.webkitAudioContext; this.ac = new AC();
      this.master = this.ac.createGain(); this.dest = this.ac.createMediaStreamDestination(); this.master.connect(this.dest); this.master.connect(this.ac.destination);
    }
    async preparerSons() {
      var self = this, a = this.clips.filter(function (c) { return c.genre === 'video' && c.son && !c.buf && !c.essaye; });
      if (!a.length) return; this.$('etat').textContent = 'Préparation des sons…';
      await Promise.all(a.map(function (c) { c.essaye = true; return self.decoder(c.file).then(function (b) { c.buf = b; }); }));
      this.$('etat').textContent = '';
    }
    arreterSons() { this.srcs.forEach(function (s) { try { s.stop(); } catch (e) {} try { s.disconnect(); } catch (e) {} }); this.srcs = []; }
    programmerSons(t) {
      var ac = this.ac, c0 = this.ctx0, self = this;
      this.evenementsSon().forEach(function (e) {
        var fin = e.start + e.len; if (fin <= t + 0.01 || e.len <= 0) return;
        var fi = Math.min(e.fi, e.len / 2), fo = Math.min(e.fo, e.len / 2);
        var src = ac.createBufferSource(); src.buffer = e.buf; src.loop = e.loop; var gn = ac.createGain();
        var off = Math.max(0, t - e.start), when = c0 + Math.max(0, e.start - t);
        src.start(when, e.loop ? off % e.buf.duration : off); src.stop(c0 + fin - t);
        var f = function (x) { var v = e.vol; if (fi > 0) v = Math.min(v, e.vol * (x - e.start) / fi); if (fo > 0) v = Math.min(v, e.vol * (fin - x) / fo); return Math.max(0, v); };
        var x0 = Math.max(t, e.start); gn.gain.setValueAtTime(f(x0), c0 + x0 - t);
        [e.start + fi, fin - fo, fin].forEach(function (x) { if (x > x0) gn.gain.linearRampToValueAtTime(f(x), c0 + x - t); });
        src.connect(gn); gn.connect(self.master); self.srcs.push(src);
      });
    }
    syncVideos(t, joue) {
      this.clips.forEach(function (c) {
        if (c.genre !== 'video') return; var v = c.el, actif = t >= c.start - 0.6 && t <= c.fin, want = Math.max(0, t - c.start);
        if (!actif) { if (!v.paused) v.pause(); return; }
        if (joue && t >= c.start) { if (v.paused) { v.currentTime = want; v.play().catch(function () {}); } else if (Math.abs(v.currentTime - want) > 0.3) v.currentTime = want; }
        else { if (!v.paused) v.pause(); var w = Math.max(0, t - c.start); if (Math.abs(v.currentTime - w) > 0.04) v.currentTime = w; }
      });
    }
    async lire(depuis) {
      if (!this.total) { this.$('etat').textContent = 'Ajoutez au moins une photo, une vidéo ou un texte.'; return; }
      var t = depuis !== undefined ? depuis : (this.etat === 'pause' ? this.t : (this.t >= this.total - 0.05 ? 0 : this.t));
      this.assurerAC(); await this.ac.resume(); await this.preparerSons();
      this.arreterSons(); this.tDebut = t; this.ctx0 = this.ac.currentTime + 0.12; this.programmerSons(t);
      this.etat = 'lecture'; this.majBoutons(); this.$('etat').textContent = ''; this.tic();
    }
    tic() {
      if (this.etat !== 'lecture') return;
      var t = this.tDebut + Math.max(0, this.ac.currentTime - this.ctx0), self = this;
      if (t >= this.total) { this.t = this.total; this.rendre(this.total); this.fin(); return; }
      this.t = t; this.syncVideos(t, true); this.rendre(t); this.majTemps();
      requestAnimationFrame(function () { self.tic(); });
    }
    fin() {
      this.arreterSons(); this.syncVideos(0, false); this.etat = 'arret'; this.majBoutons(); this.majTemps();
      if (this.surFin) { var f = this.surFin; this.surFin = null; f(); }
    }
    pause() { if (this.etat !== 'lecture') return; this.arreterSons(); this.clips.forEach(function (c) { if (c.genre === 'video') c.el.pause(); }); this.etat = 'pause'; this.majBoutons(); }
    arreter() {
      if (this.exportEnCours) return;
      this.arreterSons(); this.clips.forEach(function (c) { if (c.genre === 'video') c.el.pause(); });
      this.etat = 'arret'; this.t = 0; this.syncVideos(0, false); this.rendre(0); this.majTemps(); this.majBoutons();
    }
    aller(t) {
      t = Math.max(0, Math.min(this.total, t));
      if (this.etat === 'lecture') { this.lire(t); return; }
      this.t = t; this.syncVideos(t, false); this.rendre(t); this.majTemps(); if (this.etat === 'arret') this.majBoutons();
    }
    /* ---------- enregistrement en un seul fichier ---------- */
    formatEnreg() {
      var l = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
      for (var i = 0; i < l.length; i++) if (window.MediaRecorder && MediaRecorder.isTypeSupported(l[i])) return l[i]; return '';
    }
    async exporter() {
      var et = this.$('expetat'), self = this;
      if (this.exportEnCours) return;
      if (!this.total) { et.textContent = 'Ajoutez au moins une photo, une vidéo ou un texte.'; return; }
      var mime = this.formatEnreg();
      if (!mime || !this.cv.captureStream || !(window.AudioContext || window.webkitAudioContext)) { et.textContent = 'Votre navigateur ne permet pas cet enregistrement : utilisez Google Chrome.'; return; }
      this.arreter(); this.exportEnCours = true; var bt = this.$('exporter'); bt.disabled = true; this.$('lire').disabled = true; this.$('arreter').disabled = true;
      var morceaux = [], rec = null;
      try {
        this.assurerAC(); await this.ac.resume(); await this.preparerSons();
        var flux = new MediaStream([this.cv.captureStream(30).getVideoTracks()[0], this.dest.stream.getAudioTracks()[0]]);
        rec = new MediaRecorder(flux, { mimeType: mime, videoBitsPerSecond: 6000000, audioBitsPerSecond: 192000 });
        rec.ondataavailable = function (e) { if (e.data && e.data.size) morceaux.push(e.data); };
        var arret = new Promise(function (ok) { rec.onstop = ok; }), fini = new Promise(function (ok) { self.surFin = ok; });
        rec.start(500); et.textContent = 'Enregistrement en cours (' + mmss(this.total) + '). Gardez cet onglet ouvert et visible.';
        var iv = setInterval(function () { et.textContent = 'Enregistrement en cours : ' + mmss(self.t) + ' / ' + mmss(self.total) + '. Gardez cet onglet ouvert et visible.'; }, 500);
        await this.lire(0); await fini; clearInterval(iv);
        await new Promise(function (ok) { setTimeout(ok, 400); }); rec.stop(); await arret;
        var blob = new Blob(morceaux, { type: mime.split(';')[0] }), ext = mime.indexOf('mp4') >= 0 ? 'mp4' : 'webm', a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = 'montage.' + ext; this.shadowRoot.appendChild(a); a.click(); a.remove();
        et.textContent = 'Terminé : « ' + a.download + ' » téléchargé (dossier Téléchargements).';
        this.dispatchEvent(new CustomEvent('montage-pret', { bubbles: true, composed: true, detail: { blob: blob, nom: a.download, type: blob.type } }));
      } catch (e) {
        try { if (rec && rec.state !== 'inactive') rec.stop(); } catch (x) {} this.surFin = null; this.etat = 'arret'; this.arreterSons();
        et.textContent = 'L\'enregistrement a échoué (' + e.message + ').';
      } finally { this.exportEnCours = false; bt.disabled = false; this.$('lire').disabled = false; this.majBoutons(); }
    }
  }
  customElements.define('montage-transitions-simplifie', MontageTransitions);
})();
