# Vrais sons de pétanque (facultatif)

L'animation d'ouverture fabrique ses sons toute seule. Pour utiliser de **vrais enregistrements**, déposez des fichiers audio (mp3, ogg ou wav, courts) dans ce dossier, puis indiquez-les dans `sons.json` :

```json
{
  "lancer": "lancer.mp3",
  "clac": "clac.mp3",
  "cochonnet": "cochonnet.mp3",
  "rebond": "rebond.mp3",
  "roulement": "roulement.mp3"
}
```

- `lancer` : geste du lanceur (≈ 0,4 s) · `clac` : choc boule contre boule (≈ 0,3 s) · `cochonnet` : choc contre le cochonnet · `rebond` : petit rebond au sol · `roulement` : boule qui roule sur le gravier (≈ 1,3 s).
- Tous les noms sont facultatifs : un son absent est remplacé par la version synthétisée.
- Utilisez des enregistrements dont vous avez les droits (vos propres enregistrements, ou des sons sous licence CC0 / CC-BY avec mention de l'auteur).
- Après un ajout, changez `VERSION` dans `public/sw.js` pour que les visiteurs récupèrent les nouveaux fichiers.

## Scène de fermeture (repas entre membres)

Deux sons supplémentaires, également facultatifs, dans `sons.json` :

```json
{
  "ambiance": "ambiance-repas.mp3",
  "trinquer": "trinquer.mp3"
}
```

- `ambiance` : enregistrement d'une conversation conviviale au loin, **lu en boucle à faible volume** (30 à 60 s idéalement). Sans ce fichier, le site fabrique un murmure de conversation, mais **il ne peut pas reproduire du vrai créole martiniquais** : seul un vrai enregistrement le peut.
- `trinquer` : bruit de verres qui trinquent.
- **Enregistrer des personnes** (voix) suppose leur accord, surtout si le site est public. Prévenez les membres et gardez une trace de leur consentement.

## Musique de la scène de fermeture

Par défaut, la scène de fermeture joue une **mélodie originale de style biguine** (clarinette, guitare, basse, tibwa, chacha), composée pour ce site et donc libre de droits. Pour la remplacer par un vrai enregistrement, ajoutez dans `sons.json` :

```json
{ "musique": "ma-biguine.mp3" }
```

- Le fichier est lu en boucle, à volume réduit (≈ 10 s suffisent, la scène dure environ 9 s).
- Vérifiez la **licence** : musique que vous possédez, domaine public, CC0, ou CC-BY avec mention de l'auteur. Évitez les morceaux d'artistes connus (droits d'auteur et droits voisins).

## Morceau actuellement utilisé

`musique.mp3` est un extrait de 11 secondes du zouk instrumental **« No ritmo da maré »** (ronaldoreyz), pris à la reprise du thème, calé sur la mesure et ramené à un volume de fond sonore. Conservez la page de téléchargement d'origine et sa licence avec vos documents du club. Pour changer de morceau, remplacez ce fichier (même nom, ≈ 11 s).
