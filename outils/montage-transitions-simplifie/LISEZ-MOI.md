# Montage avec transitions et bandes son

Outil gratuit, sans installation ni serveur, entièrement dans le navigateur (Google Chrome recommandé, Chromebook compris). Aucun fichier n'est envoyé sur Internet.

Il fabrique **une vidéo** à partir de **photos, vidéos et textes** enchaînés avec des **transitions**, avec **une ou plusieurs bandes son jouées en parallèle**.

## Utiliser seul
Ouvrir `montage-transitions-simplifie.html` avec Chrome (double-clic).
1. **Ajouter** photos, vidéos et sons (bouton ou glisser-déposer) ; « ✏️ Ajouter un texte » crée une carte de texte.
2. **Images / vidéos / textes** : l'ordre se règle avec ▲ ▼ ; la case à gauche les active ou les coupe. Pour chacun : durée (photos, textes), **transition vers la suivante** (fondu enchaîné, fondu par le noir, flash blanc, glissement, glissement vers le haut, volet, ouverture en cercle, zoom, coupure franche), et ⚙ pour l'**effet** (noir et blanc, sépia, couleurs vives, délavé, teinte chaude/froide, lumineux, sombre, flou doux, négatif, vignette, vieux film), le **mouvement** (fixe, zoom avant/arrière, panoramique gauche/droite), la légende, le texte et ses couleurs, le son de la vidéo et son volume. « Même transition / même effet pour tous » applique d'un coup.
3. **Bandes son** : autant que vous voulez, **en même temps** que les images : début (en secondes), volume, fondu d'entrée / de sortie, « répéter jusqu'à la fin ».
4. **Réglages** : durée des transitions, mouvement doux sur les photos, remplir l'écran, fondu au début et à la fin.
5. **Aperçu** : Lire / Pause / Arrêter (aussi sous la vidéo, à côté des barres), curseur de position. Sous la vidéo, **une ligne par fichier** avec son nom (images, son de chaque vidéo, chaque bande son) et un bouton **Actif / Coupé** qui l'inclut ou l'exclut du montage, même en cours de lecture. Cliquer dans les barres déplace la lecture.
6. **Enregistrer en un seul fichier** : produit `montage.mp4` (ou `.webm` selon Chrome). L'enregistrement se fait **en direct** : garder l'onglet ouvert et visible.

Les transitions se chevauchent : la durée totale = somme des durées moins les chevauchements. Une bande son plus longue que les images est coupée en fondu à la fin.

## L'intégrer dans un site ou un code
**Balise :** copier `montage-transitions-simplifie.js` sur le site, puis
```html
<script src="montage-transitions-simplifie.js"></script>
<montage-transitions-simplifie titre="Mon montage" resolution="1280x720" duree-image="5" duree-transition="1" couleur="#c41e3a"></montage-transitions-simplifie>
```
**iframe :**
```html
<iframe src="montage-transitions-simplifie.html" style="width:100%;height:1100px;border:0" allow="autoplay; fullscreen"></iframe>
```
Événement `montage-pret` (`event.detail` = `{blob, nom, type}`). Méthodes : `element.ajouter(fileList)`, `element.ajouterTexte("texte")`.

## Formats
Photos : jpg, png, gif (première image), webp, avif, bmp, svg. Vidéos : mp4, m4v, mov, webm, ogv, mkv, 3gp. Sons : mp3, wav, m4a, aac, ogg, flac, opus. Ce qui est réellement lu dépend du navigateur.

## Limites
- Enregistrement en direct : pas plus rapide que la durée du montage.
- Le son des vidéos est décodé en mémoire : éviter les vidéos très lourdes (plusieurs centaines de Mo).
- Une vidéo sans piste son, ou un son illisible, est ignoré sans bloquer le montage.
- Les photos et vidéos sont enchaînées sur une seule piste image (pas de superposition d'images).
