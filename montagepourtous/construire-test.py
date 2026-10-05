#!/usr/bin/env python3
"""Reconstruit TEST-NAVIGATEUR.html (version autonome, sans serveur ni compte) à partir des sources. Usage : python3 construire-test.py"""
import re
def r(p): return open(p, encoding='utf-8').read().replace('</script', '<\\/script')
css = open('public/css/mpt.css', encoding='utf-8').read()
html = '''<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>MontagePourTous — version de test (sans compte)</title>
<script>''' + r('public/js/theme.js') + '''</script>
<style>''' + css + '''
.test{background:#ffd23d;color:#222;padding:.4rem 1rem;font-weight:700;text-align:center;margin:0 -40px}
</style></head><body>
<div class="test">VERSION DE TEST : à ouvrir directement dans Chrome, sans serveur ni compte. La version en ligne demande un compte.</div>
<header class="haut"><span class="logo"><span class="clap" aria-hidden="true"></span>Montage<b>Pour</b>Tous</span><nav><button data-theme-toggle></button></nav></header>
<main class="pleine page-outil">
<div class="onglets" role="tablist"><button id="o1" role="tab" aria-selected="true">🎞️ Montage avec transitions</button><button id="o2" role="tab" aria-selected="false">🎬 Montage simple</button></div>
<div id="p1"><montage-transitions-simplifie titre="Montage avec transitions"></montage-transitions-simplifie></div>
<div id="p2" hidden><montage-media-simplifie titre="Montage simple"></montage-media-simplifie></div>
</main>
<script>''' + r('app/js/mpt-ui.js') + '''</script>
<script>''' + r('app/js/montage-transitions.js') + '''</script>
<script>''' + r('app/js/montage-simple.js') + '''</script>
<script>
(function(){var a=document.getElementById('o1'),b=document.getElementById('o2'),p1=document.getElementById('p1'),p2=document.getElementById('p2');
function go(x){p1.hidden=!x;p2.hidden=x;a.setAttribute('aria-selected',x);b.setAttribute('aria-selected',!x)}a.onclick=function(){go(true)};b.onclick=function(){go(false)}})();
</script></body></html>
'''
open('TEST-NAVIGATEUR.html', 'w', encoding='utf-8').write(html)
print('TEST-NAVIGATEUR.html reconstruit')

# ---- ADMIN-DEMO.html : l'interface d'administration avec des données fictives, sans serveur ----
usage = open('usage.js', encoding='utf-8').read().replace('</script', '<\\/script')
mock = open('demo-admin-mock.js', encoding='utf-8').read()
adm = open('public/admin.html', encoding='utf-8').read()
corps = adm[adm.index('<body>') + 6: adm.index('<script src="js/admin.js">')]
demo = ('<!doctype html>\n<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">\n<title>Administration (démonstration) — MontagePourTous</title>\n'
        '<script>' + r('public/js/theme.js') + '</script>\n<style>' + css + '.test{background:#ffd23d;color:#222;padding:.4rem 1rem;font-weight:700;text-align:center;margin:0 -40px}</style></head><body>\n'
        '<div class="test">DÉMONSTRATION : données fictives, rien n\'est enregistré. Mot de passe : Admin-MPT-ChangezMoi-2026</div>\n' + corps +
        '<script>var module={exports:{}};' + usage + ';window.__USAGE=module.exports;</script>\n<script>' + mock + '</script>\n<script>' + r('public/js/admin.js') + '</script></body></html>\n')
open('ADMIN-DEMO.html', 'w', encoding='utf-8').write(demo)
print('ADMIN-DEMO.html reconstruit')
