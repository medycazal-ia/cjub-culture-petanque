# Montage média simplifié

Outil gratuit, sans installation ni serveur : tout se passe dans le navigateur (Google Chrome recommandé, Chromebook compris). Aucun fichier n'est envoyé sur Internet.

Il assemble, dans l'ordre que vous choisissez, des **vidéos**, des **sons** et des **photos** en **un seul fichier** (`montage.mp4` ou `montage.webm`).

| Type | Formats acceptés (selon votre navigateur) |
|---|---|
| Vidéo | mp4, m4v, mov, webm, ogv, mkv, 3gp |
| Son | mp3, wav, m4a, aac, ogg, oga, flac, opus, weba |
| Photo | jpg, png, gif, webp, avif, bmp, svg |

Le nom des fichiers n'a aucune importance. Une photo s'affiche le nombre de secondes que vous réglez (5 s par défaut). Un son s'affiche sur un fond noir avec son titre.

## Utiliser seul
Ouvrir `montage-media-simplifie.html` avec Chrome (double-clic). Ajouter les fichiers (bouton ou glisser-déposer), cocher, ordonner avec ▲ ▼, puis **Lire** ou **Enregistrer en un seul fichier**. L'enregistrement se fait en direct : garder l'onglet ouvert et visible.

## L'intégrer dans un site ou un code (embed)
**Méthode 1 — balise :** copier `montage-media-simplifie.js` sur votre site, puis :
```html
<script src="montage-media-simplifie.js"></script>
<montage-media-simplifie titre="Mon montage" duree-image="5" resolution="1280x720" couleur="#c41e3a"></montage-media-simplifie>
```
**Méthode 2 — iframe :**
```html
<iframe src="montage-media-simplifie.html" style="width:100%;height:900px;border:0" allow="autoplay; fullscreen" title="Montage"></iframe>
```
Attributs de la balise : `titre`, `duree-image` (secondes), `resolution` (ex. `1920x1080`), `couleur`.
Événement : `montage-pret` (`event.detail` = `{blob, nom, type}`) quand le fichier final est fabriqué, pour en faire autre chose que le télécharger.
Fonction : `element.ajouter(fileList)` pour ajouter des fichiers par programme.

## Limites
- Enregistrement en direct, pas plus rapide que la durée du montage.
- Les formats réellement lus dépendent du navigateur (ex. mov/mkv/avi parfois non lisibles) ; un fichier illisible est signalé.
- Le format de sortie (mp4 ou webm) dépend de Chrome.
