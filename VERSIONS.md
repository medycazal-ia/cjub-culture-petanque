# Versions du site

Chaque version est une **étiquette (tag) git** posée sur la branche `main`. Elle permet de revenir exactement à cet état.

| Version | Date | Contenu |
|---|---|---|
| **MVP** | 5 octobre 2026 | Première version complète. Voir ci-dessous. |

Les versions suivantes s'appelleront **v1**, **v2**, **v3**, etc.

## MVP

- **Site** : accueil, événements avec inscription (membres et invités), boutique avec panier, inscription des membres, commentaires modérés, espace administration.
- **Galerie** : événements passés, photos et vidéos envoyées par les membres, validées par un administrateur.
- **Carte de la Martinique** en fond, avec le logo du club à La Trinité.
- **Responsive** (téléphone, tablette, ordinateur) et **application installable** (PWA, fonctionne hors connexion).
- **Animation d'ouverture** : le tireur, la boule qui devient le logo, la page qui s'ouvre sur La Trinité.
- **Scène de fermeture** : repas entre membres, musique zouk, message de Ludo et Stella, le logo qui dézoome.
- **Mise en ligne** : guide `DEPLOIEMENT_LWS.md` et script de sauvegarde `scripts/backup.sh`.

## Revenir à une version

```bash
git fetch --tags
git checkout MVP          # ou v1, v2…
```

## Créer la version suivante

```bash
git tag v1
git push origin v1
```
