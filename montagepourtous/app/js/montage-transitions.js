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
  var TRANS = [['fondu', 'Fondu enchaîné'], ['noir', 'Fondu par le noir'], ['glisse', 'Glissement'], ['zoom', 'Zoom'], ['blanc', 'Flash blanc'], ['haut', 'Glissement vers le haut'], ['volet', 'Volet (balayage)'], ['cercle', 'Ouverture en cercle'], ['iris', 'Iris (fermeture de film)'], ['rideau', 'Rideau de cinéma'], ['pellicule', 'Défilement de pellicule'], ['aucune', 'Coupure franche']];
  var MODELES = [['simple', 'Texte simple'], ['titre', 'Titre de film'], ['generique', 'Générique de fin (défilant)'], ['fin', '« FIN » (fin de film)'], ['clap', 'Clap de réalisateur'], ['compte', 'Compte à rebours 3-2-1'], ['muet', 'Carton de film muet']];
  var MODELE_DEFAUT = { simple: ['Mon titre', 4], titre: ['MON FILM\nUn film de vous', 5], generique: ['RÉALISÉ PAR | Votre nom\nIMAGES | Vos photos\nMUSIQUE | Votre choix\nMONTAGE | MontagePourTous\n\nMERCI D\'AVOIR REGARDÉ', 12], fin: ['FIN', 4], clap: ['SCÈNE 1\nPRISE 1\nVotre nom', 3], compte: ['3', 3], muet: ['Et c\'est ainsi que commença l\'aventure…', 4] };
  var EFFETS = [['aucun', 'Aucun effet'], ['nb', 'Noir et blanc'], ['sepia', 'Sépia'], ['vif', 'Couleurs vives'], ['delave', 'Délavé'], ['chaud', 'Teinte chaude'], ['froid', 'Teinte froide'], ['clair', 'Plus lumineux'], ['sombre', 'Plus sombre'], ['flou', 'Flou doux'], ['negatif', 'Négatif'], ['vignette', 'Vignette (bords sombres)'], ['film', 'Vieux film'], ['vhs', 'VHS années 90'], ['super8', 'Super 8 (grain)'], ['cadrefilm', 'Cadre pellicule + rayures'], ['cinema', 'Bandes noires cinéma 2,39:1']];
  var MOUV = [['defaut', 'Selon le réglage général'], ['aucun', 'Fixe'], ['zoom+', 'Zoom avant lent'], ['zoom-', 'Zoom arrière lent'], ['gauche', 'Panoramique vers la gauche'], ['droite', 'Panoramique vers la droite']];
  function options(l) { return l.map(function (x) { return '<option value="' + x[0] + '">' + x[1] + '</option>'; }).join(''); }

  var CSS = '\
.cadre{display:grid;grid-template-columns:minmax(300px,480px) 1fr;gap:1.2rem}.cadre.cine{grid-template-columns:1fr}.cadre.cine .gauche{order:2}\
@media(max-width:900px){.cadre{grid-template-columns:1fr}}.entete{grid-column:1/-1}\
.cvwrap{margin:0 auto;width:100%}canvas{width:100%;aspect-ratio:16/9;background:#000;display:block;border:1px solid #000;border-radius:3px;box-shadow:0 0 0 3px #2a2a2d,0 6px 14px rgba(0,0,0,.6)}\
#lanes{display:flex;margin-top:.4rem;background:var(--card);border:1px solid var(--line);padding:.2rem 0;border-radius:3px}.labs{flex:none;width:13rem}.zone{position:relative;flex:1;cursor:pointer}\
.lab,.rang2{height:1.7rem;margin:.15rem 0;position:relative}.lab{display:flex;align-items:center;gap:.25rem;padding:0 .3rem;font-size:.78rem;white-space:nowrap}.lab span{flex:1;overflow:hidden;text-overflow:ellipsis}.lab button{font-size:.7rem;padding:0 .3rem;white-space:nowrap}\
.bl{position:absolute;top:0;bottom:0;background:var(--a);opacity:.9;color:#fff;font-size:.7rem;overflow:hidden;white-space:nowrap;padding:0 .2rem;border-right:1px solid rgba(255,255,255,.6);border-radius:2px;box-shadow:0 0 6px var(--a2)}\
.bl.s{background:#1f8fb8;box-shadow:0 0 6px #2fd6ff}.bl.t{background:#6b5b95}.bl.off{opacity:.3;box-shadow:none;background-image:repeating-linear-gradient(45deg,transparent 0 4px,rgba(255,255,255,.55) 4px 8px)}\
#tete{position:absolute;top:0;bottom:0;width:2px;background:#39ff88;box-shadow:0 0 8px #39ff88;pointer-events:none}\
#etat,#expetat{min-height:1.4em;font-weight:700}';

  var HTML = '\
<div class="cadre" id="cadre"><div class="entete"><h1 id="titre"></h1><span><button id="defile"></button> <button id="theme"></button></span></div>\
<section class="gauche">\
<h2>1. Ajoutez vos fichiers</h2>\
<div class="depot" id="depot"><button class="plein" id="choisir">📂 Choisir des fichiers</button> <button id="addtexte">✏️ Ajouter un texte</button> <select id="cartes" aria-label="Ajouter une carte de cinéma"><option value="">🎬 Carte de cinéma…</option></select> <button id="projo" title="Ajoute un ronronnement de projecteur en bande son">🔊 Ambiance projecteur</button>\
<p class="note">ou glissez-les ici : <b>photos</b>, <b>vidéos</b> et <b>sons</b> (mp3, wav, m4a, ogg…). Les photos, vidéos et textes forment l\'image ; les sons forment les bandes son, <b>jouées en même temps</b>.</p>\
<input type="file" id="fichiers" accept="video/*,audio/*,image/*,.mp4,.m4v,.mov,.webm,.mp3,.wav,.m4a,.ogg,.flac,.opus,.jpg,.jpeg,.png,.gif,.webp,.avif,.bmp,.svg" multiple hidden></div>\
<h2>2. Images, vidéos et textes (dans l\'ordre)</h2><ol id="liste"></ol>\
<div class="barre"><label>Même transition pour tous : <select id="gtrans"></select></label> <label>Même effet pour tous : <select id="geffet"></select></label></div>\
<h2>3. Bandes son (en parallèle)</h2><ol id="pistes"></ol>\
<h2>4. Réglages</h2>\
<div class="reg"><label>Durée des transitions <input type="number" id="gdur" min="0.2" max="5" step="0.1"> s</label>\
<label><input type="checkbox" id="ken" checked> Mouvement doux sur les photos</label>\
<label><input type="checkbox" id="cover"> Remplir l\'écran (recadrer)</label>\
<label><input type="checkbox" id="fadin" checked> Fondu au début</label>\
<label><input type="checkbox" id="fadout" checked> Fondu à la fin</label></div>\
</section>\
<section class="droite"><h2>5. Aperçu</h2>\
<div class="cvwrap" id="cvwrap"><canvas id="cv"></canvas></div>\
<div class="ampli"><div class="rang"><div class="temps" id="tps">0:00 / 0:00</div><div id="ledpos" style="flex:1;min-width:160px;display:flex"></div></div>\
<div class="rang" style="margin-top:.6rem"><div class="barre" style="margin:0"><button id="lire" class="plein">▶ Lire</button><button id="arreter" disabled>⏹ Arrêter</button><button id="plein">⛶ Plein écran</button></div><div id="knobmaster"></div><div id="vumetre" style="flex:1;display:flex;min-width:170px"></div></div>\
<div class="rang" style="margin-top:.5rem;justify-content:flex-start"><small>Taille de l\'aperçu</small><button id="moins" class="petit" title="Plus petit" aria-label="Aperçu plus petit">−</button><input type="range" class="fader" id="taille" min="30" max="100" step="5" aria-label="Taille de l\'aperçu"><button id="plus" class="petit" title="Plus grand" aria-label="Aperçu plus grand">+</button><button id="cine">🎬 Mode cinéma</button></div></div>\
<div class="barre"><button id="lire2" class="plein">▶ Lire</button><button id="arreter2" disabled>⏹ Arrêter</button><span class="note">Une ligne par fichier. « Actif / Coupé » l\'inclut ou l\'exclut du montage (aperçu et fichier final). Cliquez dans les barres pour aller à un endroit.</span></div>\
<div id="lanes"></div><div id="etat" role="status"></div>\
<div class="barre"><button id="exporter" class="plein">💾 Enregistrer en un seul fichier</button></div>\
<p class="note" id="expetat" role="status"></p>\
<p class="note">L\'enregistrement se fait <b>en direct</b> (durée du montage) : gardez cet onglet ouvert et visible. Le fichier se télécharge ensuite tout seul. Si une bande son est plus longue que les images, elle est coupée en fondu à la fin.</p>\
</section></div>';

  class MontageTransitions extends HTMLElement {
    connectedCallback() {
      if (this._ok) return; this._ok = true;
      var self = this, r = this.attachShadow({ mode: 'open' }); r.innerHTML = '<style>' + MPT.CSS + CSS + '</style>' + HTML;
      var $ = this.$ = function (id) { return r.getElementById(id); };
      this.clips = []; this.pistes = []; this.t = 0; this.total = 0; this.etat = 'arret'; this.uid = 0; this.srcs = []; this.exportEnCours = false;
      var m = /^(\d+)x(\d+)$/.exec(this.getAttribute('resolution') || '1280x720'); this.W = m ? +m[1] : 1280; this.H = m ? +m[2] : 720;
      this.dureeImage = num(this.getAttribute('duree-image'), 5, 1, 600); this.transDefaut = 'fondu';
      if (this.getAttribute('couleur')) this.style.setProperty('--a', this.getAttribute('couleur'));
      $('titre').textContent = this.getAttribute('titre') || 'Montage avec transitions et bandes son';
      var bt = $('theme'); MPT.suivreTheme(this, function (t) { bt.textContent = t === 'sang' ? '☀️ Thème classique' : '🌙 Thème sang'; });
      bt.onclick = function () { MPT.setTheme(MPT.getTheme() === 'sang' ? 'classique' : 'sang'); };
      this.volumeMaster = 1;
      this.kMaster = MPT.knob({ label: 'Volume général', min: 0, max: 150, value: 100, format: function (v) { return Math.round(v) + '%'; }, onchange: function (v) { self.volumeMaster = v / 100; if (self.master) self.master.gain.value = self.volumeMaster; } });
      $('knobmaster').appendChild(this.kMaster.el);
      this.vu = MPT.vu(); $('vumetre').appendChild(this.vu.el);
      this.ledpos = MPT.led(64, { label: 'Position dans le montage', onseek: function (f) { self.aller(f * self.total); } }); $('ledpos').appendChild(this.ledpos.el);
      var ap = 100; try { ap = +localStorage.getItem('mpt-apercu') || 100; } catch (e) {}
      var reglerTaille = function (p) { p = Math.min(100, Math.max(30, p)); $('cvwrap').style.width = p + '%'; $('taille').value = p; try { localStorage.setItem('mpt-apercu', p); } catch (e) {} };
      reglerTaille(ap); $('taille').oninput = function () { reglerTaille(+$('taille').value); };
      $('moins').onclick = function () { reglerTaille(+$('taille').value - 10); }; $('plus').onclick = function () { reglerTaille(+$('taille').value + 10); };
      $('cine').onclick = function () { var c = $('cadre').classList.toggle('cine'); $('cine').textContent = c ? '🗔 Mode normal' : '🎬 Mode cinéma'; };
      this.cv = $('cv'); this.cv.width = this.W; this.cv.height = this.H; this.g = this.cv.getContext('2d');
      $('gdur').value = num(this.getAttribute('duree-transition'), 1, 0.2, 5);
      var opts = options(TRANS);
      $('gtrans').innerHTML = opts; $('geffet').innerHTML = options(EFFETS);
      $('geffet').onchange = function () { self.clips.forEach(function (c) { c.effet = $('geffet').value; }); self.dessiner(); };
      $('gtrans').onchange = function () { self.transDefaut = $('gtrans').value; self.clips.forEach(function (c) { c.trans = self.transDefaut; }); self.dessiner(); };
      ['gdur', 'ken', 'cover', 'fadin', 'fadout'].forEach(function (id) { $(id).onchange = function () { self.dessiner(); }; });
      $('choisir').onclick = function () { $('fichiers').click(); };
      $('fichiers').onchange = function (e) { self.ajouter(e.target.files); e.target.value = ''; };
      $('addtexte').onclick = function () { self.ajouterCarte('simple'); };
      $('cartes').insertAdjacentHTML('beforeend', MODELES.slice(1).map(function (x) { return '<option value="' + x[0] + '">' + x[1] + '</option>'; }).join(''));
      $('cartes').onchange = function () { if ($('cartes').value) self.ajouterCarte($('cartes').value); $('cartes').value = ''; };
      $('projo').onclick = function () { self.ajouterAmbiance(); };
      var bd = $('defile'), majD = function (on) { bd.textContent = on ? '⏸ Pause pellicule' : '▶ Animer la pellicule'; bd.title = 'Les bandes de film du cadre défilent pendant la lecture'; };
      bd.onclick = function () { document.dispatchEvent(new CustomEvent('mpt-defile-bascule')); };
      document.addEventListener('mpt-defile-etat', function (e) { majD(e.detail.actif); }); majD(!(document.documentElement.classList.contains('defile-off')));
      var dp = $('depot');
      ['dragenter', 'dragover'].forEach(function (n) { dp.addEventListener(n, function (e) { e.preventDefault(); dp.className = 'depot sur'; }); });
      ['dragleave', 'drop'].forEach(function (n) { dp.addEventListener(n, function (e) { e.preventDefault(); dp.className = 'depot'; }); });
      dp.addEventListener('drop', function (e) { self.ajouter(e.dataTransfer.files); });
      $('lire').onclick = function () { if (self.etat === 'lecture') self.pause(); else self.lire(); };
      $('arreter').onclick = function () { self.arreter(); };
      $('lire2').onclick = function () { $('lire').click(); }; $('arreter2').onclick = function () { self.arreter(); };
      $('plein').onclick = function () { (self.cv.requestFullscreen || self.cv.webkitRequestFullscreen || function () {}).call(self.cv); };
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
          Object.assign(it, { start: 0, vol: 1, fi: 1, fo: 1, loop: false, sec: 0, buf: null, actif: true });
          self.decoder(f).then(function (b) { it.buf = b; it.sec = b ? b.duration : 0; self.dessiner(); });
          self.pistes.push(it);
        } else {
          Object.assign(it, { trans: self.transDefaut, legende: '', son: true, vol: 1, dur: self.dureeImage, ouvert: false, actif: true, effet: self.$('geffet').value, mouv: 'defaut' });
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
    ajouterTexte(texte) { this.ajouterCarte('simple', texte); }
    ajouterCarte(modele, texte) {
      var d = MODELE_DEFAUT[modele] || MODELE_DEFAUT.simple;
      this.clips.push({ id: ++this.uid, genre: 'texte', modele: modele, titre: 'Texte', texte: texte || d[0], bg: modele === 'compte' ? '#c9c9c9' : '#000000', fg: '#ffffff', trans: modele === 'generique' || modele === 'fin' ? 'noir' : this.transDefaut, legende: '', dur: d[1], ouvert: true, actif: true, effet: this.$('geffet').value, mouv: 'defaut' });
      this.dessiner();
    }
    bufferSynth(nom) { // petits sons de cinéma générés (pas de fichier à fournir)
      var sr = 44100, C = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      if (nom === 'clap') {
        var n = Math.floor(sr * 0.35), b = new C(2, n, sr).createBuffer(2, n, sr);
        for (var ch = 0; ch < 2; ch++) { var d = b.getChannelData(ch); for (var i = 0; i < n; i++) d[i] = Math.max(-1, Math.min(1, ((Math.random() * 2 - 1) * Math.exp(-i / (sr * 0.012)) + Math.sin(6.2832 * 150 * i / sr) * Math.exp(-i / (sr * 0.07)) * 0.8))); }
        return b;
      }
      var n2 = sr * 4, b2 = new C(2, n2, sr).createBuffer(2, n2, sr); // ronronnement de projecteur : 24 images/s, boucle parfaite (4 s)
      for (var c2 = 0; c2 < 2; c2++) { var d2 = b2.getChannelData(c2), lp = 0; for (var j = 0; j < n2; j++) { var ph = (j / sr * 24) % 1; lp += 0.08 * ((Math.random() * 2 - 1) - lp); d2[j] = lp * 1.4 * (0.35 + 0.65 * Math.exp(-ph * 14)) + Math.sin(6.2832 * 48 * j / sr) * 0.04; } }
      return b2;
    }
    ajouterAmbiance() {
      this.pistes.push({ id: ++this.uid, genre: 'audio', titre: 'Ambiance projecteur', url: null, file: null, start: 0, vol: 0.5, fi: 1, fo: 1, loop: true, sec: 4, buf: this.bufferSynth('projecteur'), actif: true });
      this.dessiner();
    }
    decoder(f) {
      return f.arrayBuffer().then(function (ab) {
        var C = window.OfflineAudioContext || window.webkitOfflineAudioContext; return new C(2, 1, 44100).decodeAudioData(ab);
      }).catch(function () { return null; });
    }
    /* ---------- calcul de la chronologie ---------- */
    recalculer() {
      var gd = num(this.$('gdur').value, 1, 0.2, 5), c = this.clips.filter(function (x) { return x.actif; }), s = 0;
      this.clips.forEach(function (x) { if (!x.actif) { x.start = x.fin = -1; x.tin = x.tout = 0; x.prec = null; } });
      c.forEach(function (x, i) { var nx = c[i + 1]; x.tout = nx && x.trans !== 'aucune' ? Math.min(gd, x.dur * 0.5, nx.dur * 0.5) : 0; x.prec = c[i - 1] || null; });
      c.forEach(function (x, i) { x.tin = i ? c[i - 1].tout : 0; x.start = s; x.fin = s + x.dur; s = x.fin - x.tout; });
      var pistes = this.pistes.filter(function (p) { return p.actif; });
      this.total = c.length ? Math.max.apply(null, c.map(function (x) { return x.fin; })) : Math.max.apply(null, [0].concat(pistes.map(function (p) { return p.start + p.sec; })));
    }
    evenementsSon() {
      var ev = [], total = this.total;
      this.clips.forEach(function (c) { if (c.actif && c.genre === 'video' && c.son && c.buf) ev.push({ buf: c.buf, start: c.start, len: Math.min(c.buf.duration, c.dur), vol: c.vol, fi: c.tin, fo: c.tout, loop: false }); });
      var self = this;
      this.clips.forEach(function (c) { if (c.actif && c.genre === 'texte' && c.modele === 'clap') { if (!self.bufClap) self.bufClap = self.bufferSynth('clap'); ev.push({ buf: self.bufClap, start: c.start + c.dur * 0.42, len: self.bufClap.duration, vol: 0.9, fi: 0, fo: 0, loop: false }); } });
      this.pistes.forEach(function (p) {
        if (!p.actif || !p.buf || p.start >= total) return;
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
      if (!c.actif) li.className = 'coupe';
      li.innerHTML = '<input type="checkbox" class="ac" title="Actif / Coupé" aria-label="Actif"><span class="ico">' + { image: '🖼️', video: '🎬', texte: '✏️' }[c.genre] + '</span><span class="t"></span>' +
        (c.genre === 'video' ? '<span>' + Math.round(c.dur) + ' s</span>' : '<span><input type="number" class="d" min="1" max="600" step="1" aria-label="Secondes"> s</span>') +
        '<select class="tr" aria-label="Transition vers la suite"></select><button class="petit ed" title="Réglages">⚙</button>';
      li.querySelector('.t').textContent = c.genre === 'texte' ? (c.modele && c.modele !== 'simple' ? '🎬 ' + MODELES.filter(function (x) { return x[0] === c.modele; })[0][1] : (c.texte || '').slice(0, 30) || 'Texte') : c.titre;
      var ac = li.querySelector('.ac'); ac.checked = c.actif; ac.onchange = function () { c.actif = ac.checked; self.modifie(); };
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
      if (c.genre === 'texte') h += '<label>Style <select class="md"></select></label><textarea rows="4" class="tx" placeholder="Votre texte (générique : « RÔLE | Nom » sur chaque ligne)"></textarea><label>Fond <input type="color" class="bg"></label><label>Texte <input type="color" class="fg"></label>';
      h += '<label>Effet <select class="ef"></select></label><label>Mouvement <select class="mv"></select></label>';
      h += '<input type="text" class="lg" placeholder="Légende en bas de l\'image (facultatif)">';
      if (c.genre === 'video') h += '<label><input type="checkbox" class="so"> Garder le son de la vidéo</label><span class="kvol"></span>';
      p.innerHTML = h;
      var q = function (s) { return p.querySelector(s); };
      if (q('.tx')) { q('.tx').value = c.texte; q('.tx').onchange = function () { c.texte = q('.tx').value; self.dessiner(); }; q('.bg').value = c.bg; q('.bg').onchange = function () { c.bg = q('.bg').value; self.rendre(); }; q('.fg').value = c.fg; q('.fg').onchange = function () { c.fg = q('.fg').value; self.rendre(); }; }
      q('.ef').innerHTML = options(EFFETS); q('.ef').value = c.effet; q('.ef').onchange = function () { c.effet = q('.ef').value; self.rendre(); };
      q('.mv').innerHTML = options(MOUV); q('.mv').value = c.mouv; q('.mv').onchange = function () { c.mouv = q('.mv').value; self.rendre(); };
      if (q('.md')) { q('.md').innerHTML = options(MODELES); q('.md').value = c.modele || 'simple'; q('.md').onchange = function () { c.modele = q('.md').value; var d = MODELE_DEFAUT[c.modele]; c.bg = c.modele === 'compte' ? '#c9c9c9' : '#000000'; if (d) { c.texte = d[0]; c.dur = d[1]; } self.dessiner(); }; }
      q('.lg').value = c.legende; q('.lg').onchange = function () { c.legende = q('.lg').value; self.rendre(); };
      if (q('.so')) { q('.so').checked = c.son; q('.so').onchange = function () { c.son = q('.so').checked; }; q('.kvol').appendChild(MPT.knob({ label: 'Volume', min: 0, max: 100, value: Math.round(c.vol * 100), format: function (v) { return v + '%'; }, onchange: function (v) { c.vol = v / 100; } }).el); }
      return p;
    }
    lignePiste(p, i) {
      var self = this, li = document.createElement('li'); li.className = 'piste' + (p.actif ? '' : ' coupe');
      li.innerHTML = '<input type="checkbox" class="ac" title="Actif / Coupé" aria-label="Actif"><span class="ico">🎵</span><span class="t"></span><span class="du"></span>' +
        '<div class="pan" style="border:0"><label>Début <input type="number" class="st" min="0" step="1"> s</label><span class="kvol"></span>' +
        '<label>Fondu entrée <input type="number" class="fi" min="0" max="30" step="0.5"> s</label><label>Fondu sortie <input type="number" class="fo" min="0" max="30" step="0.5"> s</label>' +
        '<label><input type="checkbox" class="lp"> Répéter jusqu\'à la fin</label></div>';
      li.querySelector('.t').textContent = p.titre; li.querySelector('.du').textContent = p.buf ? Math.round(p.sec) + ' s' : (p.sec === 0 ? '(lecture impossible ?)' : '');
      var q = function (s) { return li.querySelector(s); };
      q('.ac').checked = p.actif; q('.ac').onchange = function () { p.actif = q('.ac').checked; self.modifie(); };
      q('.st').value = p.start; q('.st').onchange = function () { p.start = num(q('.st').value, 0, 0, 36000); self.dessiner(); };
      q('.kvol').appendChild(MPT.knob({ label: 'Volume', min: 0, max: 100, value: Math.round(p.vol * 100), format: function (v) { return v + '%'; }, onchange: function (v) { p.vol = v / 100; } }).el);
      q('.fi').value = p.fi; q('.fi').onchange = function () { p.fi = num(q('.fi').value, 1, 0, 30); };
      q('.fo').value = p.fo; q('.fo').onchange = function () { p.fo = num(q('.fo').value, 1, 0, 30); };
      q('.lp').checked = p.loop; q('.lp').onchange = function () { p.loop = q('.lp').checked; self.dessiner(); };
      this.boutons(li, this.pistes, i); return li;
    }
    modifie() { this.dessiner(); if (this.etat === 'lecture') this.lire(Math.min(this.t, this.total)); }
    majLanes() {
      var self = this, L = this.$('lanes'), T = Math.max(this.total, 0.001), tot = this.total; L.innerHTML = '';
      var labs = document.createElement('div'), zone = document.createElement('div'); labs.className = 'labs'; zone.className = 'zone';
      var ligne = function (texte, actif, bascule) {
        var lb = document.createElement('div'); lb.className = 'lab'; var sp = document.createElement('span'); sp.textContent = texte; sp.title = texte; lb.appendChild(sp);
        if (bascule) { var b = document.createElement('button'); b.textContent = actif ? '✔ Actif' : '✖ Coupé'; b.setAttribute('aria-pressed', actif); b.title = 'Activer / désactiver'; b.onclick = function (e) { e.stopPropagation(); bascule(); }; lb.appendChild(b); }
        labs.appendChild(lb); var rg = document.createElement('div'); rg.className = 'rang2'; zone.appendChild(rg); return rg;
      };
      var bloc = function (rg, cls, d, f, txt, off) { var b = document.createElement('div'); b.className = 'bl' + cls + (off ? ' off' : ''); b.style.left = d / T * 100 + '%'; b.style.width = Math.max(0, f - d) / T * 100 + '%'; b.textContent = txt; b.title = txt; rg.appendChild(b); };
      var nomc = function (c) { return c.genre === 'texte' ? '✏️ ' + ((c.texte || 'Texte').split('\n')[0].slice(0, 24)) : (c.genre === 'video' ? '🎬 ' : '🖼️ ') + c.titre; };
      var rv = ligne('🎞️ Images, vidéos, textes', true, null);
      this.clips.forEach(function (c) { if (c.actif) bloc(rv, c.genre === 'texte' ? ' t' : '', c.start, c.fin, nomc(c), false); });
      this.clips.forEach(function (c) { if (c.actif && c.genre === 'video') { var r = ligne('🔊 Son : ' + c.titre, c.son, function () { c.son = !c.son; self.modifie(); }); bloc(r, ' s', c.start, c.fin, '🔊 ' + c.titre, !c.son); } });
      this.pistes.forEach(function (p) {
        var r = ligne('🎵 ' + p.titre, p.actif, function () { p.actif = !p.actif; self.modifie(); });
        var len = p.loop ? tot - p.start : Math.min(p.sec, tot - p.start); bloc(r, ' s', p.start, p.start + Math.max(0, len), '🎵 ' + p.titre, !p.actif);
      });
      var th = document.createElement('div'); th.id = 'tete'; zone.appendChild(th); L.appendChild(labs); L.appendChild(zone);
      zone.onclick = function (e) { var b = zone.getBoundingClientRect(); self.aller(Math.min(1, Math.max(0, (e.clientX - b.left) / b.width)) * self.total); };
    }
    majTemps() {
      var T = Math.max(this.total, 0.001);
      this.$('tps').textContent = mmss(this.t) + ' / ' + mmss(this.total);
      this.ledpos.set(this.t / T);
      var th = this.$('tete'); if (th) th.style.left = Math.min(100, this.t / T * 100) + '%';
    }
    majBoutons() {
      window.dispatchEvent(new CustomEvent('mpt-lecture', { detail: { en: this.etat === 'lecture' } }));
      var tx = this.etat === 'lecture' ? '⏸ Pause' : this.etat === 'pause' ? '▶ Reprendre' : '▶ Lire', off = this.etat === 'arret' && this.t === 0;
      this.$('lire').textContent = tx; this.$('lire2').textContent = tx; this.$('arreter').disabled = off; this.$('arreter2').disabled = off;
    }
    /* ---------- dessin d'une image à l'instant t ---------- */
    filtre(c, t) {
      switch (c.effet) {
        case 'nb': return 'grayscale(1)'; case 'sepia': return 'sepia(1)'; case 'vif': return 'saturate(1.7) contrast(1.1)';
        case 'delave': return 'saturate(.45) brightness(1.1)'; case 'chaud': return 'sepia(.35) saturate(1.3) hue-rotate(-10deg)';
        case 'froid': return 'hue-rotate(15deg) saturate(1.1) brightness(1.05)'; case 'clair': return 'brightness(1.3)'; case 'sombre': return 'brightness(.7) contrast(1.1)';
        case 'flou': return 'blur(' + Math.round(this.H / 120) + 'px)'; case 'negatif': return 'invert(1)';
        case 'vhs': return 'saturate(1.4) contrast(1.15) brightness(1.05)'; case 'super8': return 'sepia(.5) contrast(1.1) saturate(1.2)';
        case 'cadrefilm': return 'contrast(1.1) sepia(.25)';
        case 'film': return 'sepia(.8) contrast(1.15) brightness(' + (1 + 0.07 * Math.sin(t * 37) * Math.sin(t * 11)).toFixed(3) + ')';
      }
      return 'none';
    }
    mouvement(c, p, ken) {
      p = Math.max(0, Math.min(1, p)); var m = c.mouv === 'defaut' ? (c.genre === 'image' && ken ? 'zoom+' : 'aucun') : c.mouv, W = this.W;
      if (m === 'zoom+') return { s: 1 + 0.08 * p, dx: 0 };
      if (m === 'zoom-') return { s: 1.08 - 0.08 * p, dx: 0 };
      if (m === 'gauche') return { s: 1.1, dx: (0.5 - p) * 0.08 * W };
      if (m === 'droite') return { s: 1.1, dx: (p - 0.5) * 0.08 * W };
      return { s: 1, dx: 0 };
    }
    rendre(t) {
      if (t === undefined) t = this.t;
      var g = this.g, W = this.W, H = this.H, self = this, cover = this.$('cover').checked, ken = this.$('ken').checked, R = Math.hypot(W, H) / 2, pelli = null;
      var act = this.clips.filter(function (c) { return c.actif && t >= c.start && t <= c.fin; });
      var blanc = act.some(function (c) { return (c.tin > 0 && t < c.start + c.tin && c.prec && c.prec.trans === 'blanc') || (c.tout > 0 && t > c.fin - c.tout && c.trans === 'blanc'); });
      g.globalAlpha = 1; g.filter = 'none'; g.fillStyle = blanc ? '#fff' : '#000'; g.fillRect(0, 0, W, H);
      var cercle = function (r) { return function () { g.beginPath(); g.arc(W / 2, H / 2, Math.max(0, r), 0, 6.2832); g.clip(); }; };
      var rect = function (x, y, w, h) { return function () { g.beginPath(); g.rect(x, y, w, h); g.clip(); }; };
      act.forEach(function (c) {
        var a = 1, dx = 0, dy = 0, s = 1, rog = null, masque = false, passes = null;
        if (c.tin > 0 && t < c.start + c.tin && c.prec) {
          var u = (t - c.start) / c.tin, ty = c.prec.trans;
          if (ty === 'fondu') a = u; else if (ty === 'noir' || ty === 'blanc') a = Math.max(0, 2 * u - 1); else if (ty === 'glisse') dx = (1 - u) * W; else if (ty === 'haut') dy = (1 - u) * H;
          else if (ty === 'zoom') { a = u; s = 0.85 + 0.15 * u; }
          else if (ty === 'volet') rog = rect(0, 0, u * W, H);
          else if (ty === 'cercle') rog = cercle(u * R);
          else if (ty === 'iris') { if (u < 0.5) masque = true; else rog = cercle((2 * u - 1) * R); }
          else if (ty === 'pellicule') { dx = (1 - u) * W; pelli = u; }
        }
        if (c.tout > 0 && t > c.fin - c.tout) {
          var v = (t - (c.fin - c.tout)) / c.tout;
          if (c.trans === 'noir' || c.trans === 'blanc') a = Math.min(a, 1 - Math.min(1, 2 * v)); else if (c.trans === 'glisse') dx = -v * W; else if (c.trans === 'haut') dy = -v * H; else if (c.trans === 'zoom') s = 1 + 0.15 * v;
          else if (c.trans === 'iris') { if (v < 0.5) rog = cercle((1 - 2 * v) * R); else masque = true; }
          else if (c.trans === 'rideau') passes = [{ dx: -v * W / 2, rog: rect(0, 0, W / 2, H) }, { dx: v * W / 2, rog: rect(W / 2, 0, W / 2, H) }];
          else if (c.trans === 'pellicule') { dx = -v * W; }
        }
        if (masque) return;
        a = Math.max(0, Math.min(1, a));
        var mv = self.mouvement(c, c.dur ? (t - c.start) / c.dur : 0, ken);
        (passes || [{ dx: 0, rog: rog }]).forEach(function (ps) { self.peindre(c, t, a, dx + ps.dx, dy, s, ps.rog || rog, mv, cover); });
      });
      if (pelli !== null) { // bande de pellicule à la jonction pendant le défilement
        var x = (1 - pelli) * W, bw = Math.round(W * 0.05); g.save(); g.fillStyle = '#0a0a0a'; g.fillRect(x - bw / 2, 0, bw, H); g.fillStyle = '#d9d1b6';
        for (var y = ((t * 200) % (bw * 1.6)) - bw; y < H; y += bw * 1.6) { g.beginPath(); g.roundRect ? g.roundRect(x - bw * 0.2, y, bw * 0.4, bw * 0.6, 3) : g.rect(x - bw * 0.2, y, bw * 0.4, bw * 0.6); g.fill(); }
        g.restore();
      }
      var fd = Math.min(1, this.total / 4), nuit = 0;
      if (this.$('fadin').checked && t > 0.001 && t < fd) nuit = 1 - t / fd;
      if (this.$('fadout').checked && t > this.total - fd) nuit = Math.max(nuit, (t - (this.total - fd)) / fd);
      if (nuit > 0 && this.total > 0) { g.globalAlpha = Math.min(1, nuit); g.fillStyle = '#000'; g.fillRect(0, 0, W, H); g.globalAlpha = 1; }
    }
    peindre(c, t, a, dx, dy, s, rog, mv, cover) {
      var g = this.g, W = this.W, H = this.H, p = c.dur ? Math.max(0, Math.min(1, (t - c.start) / c.dur)) : 0;
      g.save(); g.translate(dx, dy); if (rog) rog(); g.globalAlpha = a; g.translate(W / 2, H / 2);
      g.filter = this.filtre(c, t);
      if (c.genre === 'texte') this.carte(c, t, p, s * mv.s, a);
      else {
        var el = c.el, w = c.genre === 'video' ? el.videoWidth : el.naturalWidth, h = c.genre === 'video' ? el.videoHeight : el.naturalHeight;
        if (w && h && (c.genre === 'image' || el.readyState >= 2)) { var k = (cover ? Math.max : Math.min)(W / w, H / h); g.translate(mv.dx, 0); g.scale(s * mv.s, s * mv.s); try { g.drawImage(el, -w * k / 2, -h * k / 2, w * k, h * k); } catch (e) {} }
      }
      g.filter = 'none'; g.setTransform(1, 0, 0, 1, dx, dy); g.globalAlpha = a;
      this.surcouche(c, t);
      if (c.legende) this.legende(c.legende);
      g.restore();
    }
    surcouche(c, t) { // effets dessinés par-dessus l'image (coordonnées de l'écran)
      var g = this.g, W = this.W, H = this.H, e = c.effet;
      if (e === 'vignette' || e === 'film' || e === 'super8' || e === 'cadrefilm') { var gr = g.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, Math.hypot(W, H) * 0.55); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.7)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); }
      if (e === 'vhs') {
        if (!this.motifVHS) { var pc = document.createElement('canvas'); pc.width = 1; pc.height = 4; var px = pc.getContext('2d'); px.fillStyle = 'rgba(0,0,0,.32)'; px.fillRect(0, 0, 1, 2); this.motifVHS = g.createPattern(pc, 'repeat'); }
        g.fillStyle = this.motifVHS; g.fillRect(0, 0, W, H);
        g.fillStyle = 'rgba(255,255,255,.07)'; g.fillRect(0, (t * 90) % (H + 40) - 20, W, 10 + 6 * Math.abs(Math.sin(t * 5)));
        g.fillStyle = 'rgba(255,0,60,.05)'; g.fillRect(0, 0, W, H);
      }
      if (e === 'super8' || e === 'film' || e === 'cadrefilm') {
        for (var gi = 0; gi < 220; gi++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(255,255,255,.22)' : 'rgba(0,0,0,.28)'; g.fillRect(Math.random() * W, Math.random() * H, 2, 2); }
        if (Math.random() < 0.15) { g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(Math.random() * W, 0, 1.5, H); }
      }
      if (e === 'cadrefilm') { // bandes de pellicule en haut et en bas, perforations qui défilent
        var bh = Math.round(H * 0.09), pas = bh * 1.25, off = (t * 90) % pas; g.fillStyle = '#0a0a0a'; g.fillRect(0, 0, W, bh); g.fillRect(0, H - bh, W, bh); g.fillStyle = '#d9d1b6';
        for (var x = -pas + off; x < W; x += pas) { g.beginPath(); g.roundRect ? g.roundRect(x, bh * 0.25, bh * 0.55, bh * 0.5, 3) : g.rect(x, bh * 0.25, bh * 0.55, bh * 0.5); g.fill(); g.beginPath(); g.roundRect ? g.roundRect(x, H - bh * 0.75, bh * 0.55, bh * 0.5, 3) : g.rect(x, H - bh * 0.75, bh * 0.55, bh * 0.5); g.fill(); }
      }
      if (e === 'cinema') { var b = (H - W / 2.39) / 2; if (b > 0) { g.fillStyle = '#000'; g.fillRect(0, 0, W, b); g.fillRect(0, H - b, W, b); } }
    }
    /* ---- cartes de cinéma (origine au centre de l'écran) ---- */
    carte(c, t, p, s, a) {
      var g = this.g, W = this.W, H = this.H, m = c.modele || 'simple', L = String(c.texte || '').split('\n'), cl = function (x) { return Math.max(0, Math.min(1, x)); };
      g.fillStyle = c.bg; g.fillRect(-W / 2, -H / 2, W, H);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      var apparait = Math.min(cl(p * 5), cl((1 - p) * 5)), vacille = 0.93 + 0.07 * Math.sin(t * 53) * Math.sin(t * 17);
      if (m === 'simple') { g.scale(s, s); this.texte(c); return; }
      if (m === 'titre') {
        g.scale(s * (1 + 0.06 * p), s * (1 + 0.06 * p)); g.globalAlpha = a * apparait; var fs = Math.round(H / 8);
        g.shadowColor = 'rgba(242,210,122,.7)'; g.shadowBlur = 18; g.fillStyle = '#f2d27a'; g.font = '700 ' + fs + 'px Georgia,serif'; if ('letterSpacing' in g) g.letterSpacing = Math.round(fs / 8) + 'px';
        var T = this.lignes(L[0] || '', W * 0.85), y0 = -fs * 0.3 * (L.length > 1 ? 1 : 0); T.forEach(function (l, i) { g.fillText(l.toUpperCase(), 0, y0 + i * fs * 1.15 - (T.length - 1) * fs * 0.55); });
        g.shadowBlur = 0; g.fillRect(-W * 0.22, -fs * 0.95 - (T.length - 1) * fs * 0.6, W * 0.44, 2); g.fillRect(-W * 0.22, fs * 0.75 + (T.length - 1) * fs * 0.6, W * 0.44, 2);
        if ('letterSpacing' in g) g.letterSpacing = '0px'; g.fillStyle = '#e9e2cf'; g.font = 'italic ' + Math.round(H / 20) + 'px Georgia,serif';
        L.slice(1).forEach(function (l, i) { g.fillText(l, 0, fs * 1.25 + (T.length - 1) * fs * 0.6 + i * H / 14); }); return;
      }
      if (m === 'generique') {
        var lh = H / 12, n = L.length, tot = n * lh, y = H / 2 - (H + tot) * p; g.font = '600 ' + Math.round(H / 24) + 'px system-ui,Arial,sans-serif';
        L.forEach(function (l, i) {
          var yy = y + i * lh; if (yy < -H / 2 - lh || yy > H / 2 + lh) return; var d = l.indexOf('|');
          if (d >= 0) { g.textAlign = 'right'; g.fillStyle = '#b9b9b9'; g.fillText(l.slice(0, d).trim().toUpperCase(), -W * 0.02, yy); g.textAlign = 'left'; g.fillStyle = c.fg; g.fillText(l.slice(d + 1).trim(), W * 0.02, yy); }
          else { g.textAlign = 'center'; g.fillStyle = c.fg; g.fillText(l.toUpperCase(), 0, yy); }
        }); return;
      }
      if (m === 'fin') {
        g.scale(s * (1 + 0.04 * p), s * (1 + 0.04 * p)); g.globalAlpha = a * apparait * vacille; var r = H * 0.36;
        g.strokeStyle = '#e8e0c8'; g.lineWidth = 5; g.beginPath(); g.arc(0, 0, r, 0, 6.2832); g.stroke(); g.lineWidth = 2; g.beginPath(); g.arc(0, 0, r * 1.08, 0, 6.2832); g.stroke();
        g.fillStyle = '#e8e0c8'; g.font = 'italic 700 ' + Math.round(H * (L[0].length > 6 ? 0.17 : 0.3)) + 'px Georgia,serif'; g.fillText(L[0] || 'FIN', 0, 0, r * 1.7); return;
      }
      if (m === 'muet') {
        g.globalAlpha = a * apparait * vacille; var mg = H * 0.07; g.strokeStyle = '#e8e0c8'; g.lineWidth = 3; g.strokeRect(-W / 2 + mg, -H / 2 + mg, W - 2 * mg, H - 2 * mg); g.lineWidth = 1; g.strokeRect(-W / 2 + mg * 1.4, -H / 2 + mg * 1.4, W - 2.8 * mg, H - 2.8 * mg);
        g.fillStyle = '#e8e0c8'; [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (q) { g.fillRect(q[0] * (W / 2 - mg * 1.4) - 6, q[1] * (H / 2 - mg * 1.4) - 6, 12, 12); });
        g.font = 'italic ' + Math.round(H / 11) + 'px Georgia,serif'; var T2 = this.lignes(L.join(' '), W * 0.7), lh2 = H / 9; T2.forEach(function (l, i) { g.fillText(l, 0, (i - (T2.length - 1) / 2) * lh2); }); return;
      }
      if (m === 'compte') {
        var N = Math.max(1, Math.round(c.dur)), idx = Math.min(N - 1, Math.floor(p * N)), f = p * N - idx, rr = H * 0.33;
        g.fillStyle = '#c9c9c9'; g.fillRect(-W / 2, -H / 2, W, H); g.fillStyle = 'rgba(0,0,0,.22)'; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, rr, -1.5708, -1.5708 + 6.2832 * f); g.closePath(); g.fill();
        g.strokeStyle = '#111'; g.lineWidth = 4; g.beginPath(); g.arc(0, 0, rr, 0, 6.2832); g.stroke(); g.beginPath(); g.arc(0, 0, rr * 0.82, 0, 6.2832); g.stroke();
        g.lineWidth = 2; g.beginPath(); g.moveTo(-W / 2, 0); g.lineTo(W / 2, 0); g.moveTo(0, -H / 2); g.lineTo(0, H / 2); g.stroke();
        g.fillStyle = '#111'; g.font = '800 ' + Math.round(H * 0.5) + 'px system-ui,Arial,sans-serif'; g.fillText(String(N - idx), 0, H * 0.02);
        if (Math.random() < 0.3) { g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect((Math.random() - 0.5) * W, -H / 2, 2, H); } return;
      }
      if (m === 'clap') { this.clap(c, p, L); return; }
    }
    clap(c, p, L) {
      var g = this.g, W = this.W, H = this.H, bw = Math.min(W * 0.62, H * 1.05), bh = bw * 0.62, x0 = -bw / 2, y0 = -bh * 0.35, cl = H * 0.02;
      var ang = p < 0.3 ? -0.5 : p < 0.42 ? -0.5 * (1 - (p - 0.3) / 0.12) : 0, rebond = p > 0.42 && p < 0.5 ? -0.05 * Math.sin((p - 0.42) / 0.08 * Math.PI) : 0; ang += rebond;
      g.fillStyle = '#111'; g.fillRect(x0, y0, bw, bh); g.strokeStyle = '#f4f4f4'; g.lineWidth = 3; g.strokeRect(x0, y0, bw, bh);
      var lab = ['SCÈNE', 'PRISE', 'RÉALISATEUR'], hh = bh / 3; g.lineWidth = 2;
      for (var i = 0; i < 3; i++) { g.beginPath(); g.moveTo(x0, y0 + hh * i); g.lineTo(x0 + bw, y0 + hh * i); g.stroke(); g.textAlign = 'left'; g.fillStyle = '#9a9a9a'; g.font = '600 ' + Math.round(hh * 0.22) + 'px system-ui,sans-serif'; g.fillText(lab[i], x0 + bw * 0.03, y0 + hh * i + hh * 0.22);
        var val = (L[i] || '').replace(new RegExp('^' + lab[i] + '\\s*:?\\s*', 'i'), ''); g.fillStyle = '#fff'; g.font = '700 ' + Math.round(hh * 0.45) + 'px system-ui,sans-serif'; g.fillText(val, x0 + bw * 0.03, y0 + hh * i + hh * 0.66, bw * 0.94); }
      // bâton articulé (rayures), il se referme avec un « clap »
      var bar = bh * 0.2; g.save(); g.translate(x0, y0 - cl); g.rotate(ang);
      g.beginPath(); g.rect(0, -bar, bw, bar); g.save(); g.clip(); g.fillStyle = '#f4f4f4'; g.fillRect(0, -bar, bw, bar); g.fillStyle = '#111';
      for (var k = -2; k < 14; k++) { g.beginPath(); g.moveTo(k * bw / 10, 0); g.lineTo(k * bw / 10 + bar, -bar); g.lineTo(k * bw / 10 + bar + bw / 20, -bar); g.lineTo(k * bw / 10 + bw / 20, 0); g.closePath(); g.fill(); } g.restore();
      g.strokeStyle = '#f4f4f4'; g.lineWidth = 3; g.strokeRect(0, -bar, bw, bar); g.restore();
      // bâton fixe
      g.save(); g.translate(x0, y0 - cl); g.beginPath(); g.rect(0, 0, bw, cl); g.clip(); g.fillStyle = '#f4f4f4'; g.fillRect(0, 0, bw, cl); g.restore();
      if (p > 0.42 && p < 0.47) { g.fillStyle = 'rgba(255,255,255,' + (0.35 * (1 - (p - 0.42) / 0.05)).toFixed(2) + ')'; g.fillRect(-W / 2, -H / 2, W, H); }
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
      this.master = this.ac.createGain(); this.master.gain.value = this.volumeMaster; this.vu.brancher(this.ac, this.master); this.dest = this.ac.createMediaStreamDestination(); this.master.connect(this.dest); this.master.connect(this.ac.destination);
    }
    async preparerSons() {
      var self = this, a = this.clips.filter(function (c) { return c.actif && c.genre === 'video' && c.son && !c.buf && !c.essaye; });
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
        if (c.genre !== 'video') return; var v = c.el; if (!c.actif) { if (!v.paused) v.pause(); return; }
        var actif = t >= c.start - 0.6 && t <= c.fin, want = Math.max(0, t - c.start);
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
      this.etat = 'lecture'; this.vu.demarrer(); this.majBoutons(); this.$('etat').textContent = ''; this.tic(this.idBoucle = (this.idBoucle || 0) + 1);
    }
    tic(id) {
      if (this.etat !== 'lecture' || id !== this.idBoucle) return;
      var t = this.tDebut + Math.max(0, this.ac.currentTime - this.ctx0), self = this;
      if (t >= this.total) { this.t = this.total; this.rendre(this.total); this.fin(); return; }
      this.t = t; this.syncVideos(t, true); this.rendre(t); this.majTemps();
      requestAnimationFrame(function () { self.tic(id); });
    }
    fin() {
      this.vu.arreter(); this.arreterSons(); this.syncVideos(0, false); this.etat = 'arret'; this.majBoutons(); this.majTemps();
      if (this.surFin) { var f = this.surFin; this.surFin = null; f(); }
    }
    pause() { if (this.etat !== 'lecture') return; this.vu.arreter(); this.arreterSons(); this.clips.forEach(function (c) { if (c.genre === 'video') c.el.pause(); }); this.etat = 'pause'; this.majBoutons(); }
    arreter() {
      if (this.exportEnCours) return;
      this.vu.arreter(); this.arreterSons(); this.clips.forEach(function (c) { if (c.genre === 'video') c.el.pause(); });
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
      this.arreter(); this.exportEnCours = true; var bt = this.$('exporter'); bt.disabled = true; this.$('lire').disabled = this.$('lire2').disabled = true; this.$('arreter').disabled = this.$('arreter2').disabled = true;
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
      } finally { this.exportEnCours = false; bt.disabled = false; this.$('lire').disabled = this.$('lire2').disabled = false; this.majBoutons(); }
    }
  }
  customElements.define('montage-transitions-simplifie', MontageTransitions);
})();
