# Versions du site

Chaque version est conservée sous un nom, pour pouvoir revenir exactement à cet état. La version **MVP** est enregistrée dans la **branche `MVP`**, figée sur le commit de cette version : n'y ajoutez rien. Le développement continue sur `main`.

| Version | Date | Contenu |
|---|---|---|
| **MVP** | 5 octobre 2026 | Première version complète. Voir ci-dessous. |
| **v1** | 5 octobre 2026 | MVP + correctif : le message de confirmation ne dépasse plus en bas de page. |

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
git fetch
git checkout MVP          # ou v1, v2…
```

## Créer la version suivante

Depuis `main`, à jour :

```bash
git push origin main:v1
```

(une branche `v1` figée sur l'état actuel). Sur GitHub, vous pouvez aussi créer une *Release* avec l'étiquette `v1` : menu **Releases → Draft a new release**.
