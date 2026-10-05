# MontagePourTous

Outils gratuits de **montage photos / vidéos / sons**, avec **compte utilisateur gratuit** (e-mail, prénom, nom obligatoires). **Projet indépendant du site Club Culture Pétanque** : dossier, serveur, données et dépendances séparés.

- **Montage avec transitions** : photos, vidéos et textes enchaînés (fondu, flash blanc, volet, cercle, glissements, zoom), effets d'image (noir et blanc, sépia, vieux film, VHS, Super 8…), mouvements, plusieurs bandes son en parallèle, une ligne par fichier avec « Actif / Coupé ».
- **Montage simple** : bout à bout de vidéos, sons et photos.
- Les fichiers des utilisateurs **restent dans leur navigateur** (rien n'est envoyé au serveur). Enregistrement en un seul fichier (mp4 ou webm) en direct.
- **Design** : thème « sang » (bordeaux foncé, textes clairs, par défaut) ou « classique » (clair), au choix à tout moment. Façade d'ampli années 90-2000 : boutons rotatifs (glisser, molette, flèches, double-clic = valeur d'origine), barres à LED fluo, vumètre G/D, fader de taille d'aperçu, **mode cinéma** et boutons − / + pour agrandir ou réduire la vidéo.

## Lancer
```bash
cd montagepourtous
npm install
cp .env.example .env     # puis renseigner MPT_ADMIN_PASSWORD (10 caractères minimum)
npm start                # http://localhost:3100
```

## Comptes et données collectées
- Inscription : prénom, nom, e-mail, mot de passe (haché avec scrypt, jamais stocké en clair), **case de consentement obligatoire** + case « nouvelles » facultative. Date de création/consentement, dernière connexion, nombre de connexions.
- Les outils (`/app/…`) ne sont accessibles qu'aux comptes connectés (cookie de session `HttpOnly`, 30 jours).
- **Espace admin** : `/admin.html` (mot de passe `MPT_ADMIN_PASSWORD`) : liste des inscrits, export **CSV** (ouvrable dans Excel), suppression d'un inscrit.
- L'utilisateur peut **supprimer son compte** et retirer son accord aux nouvelles depuis « Mes outils ».
- Données dans `data/db.json` (hors dépôt Git). **À sauvegarder régulièrement** (copier ce fichier).
- `public/confidentialite.html` est un modèle : **compléter le nom et les coordonnées de l'éditeur** avant l'ouverture au public. La collecte de données personnelles impose en France/UE d'informer les inscrits (RGPD) : à faire valider si besoin.

## Mise en ligne
Application Node.js autonome : héberger comme le site du club (voir `../DEPLOIEMENT_LWS.md`), avec les variables `PORT`, `MPT_ADMIN_PASSWORD`, `MPT_DATA_DIR`, et `MPT_TRUST_PROXY=1` derrière HTTPS. Utiliser un domaine/sous-domaine dédié.

## Arborescence
```
montagepourtous/
  server.js            serveur (comptes, admin, protection des outils)
  public/              pages publiques : accueil + inscription, confidentialité, admin, thème, styles
  app/                 pages et scripts réservés aux comptes
    js/mpt-ui.js       kit d'interface (thèmes, boutons rotatifs, LED, vumètre)
    js/montage-transitions.js   composant <montage-transitions-simplifie>
    js/montage-simple.js        composant <montage-media-simplifie>
```
Les composants sont des « web components » : `mpt-ui.js` puis le composant, puis la balise (voir `app/transitions.html`).

## Limites
Chrome recommandé (Chromebook compris) ; enregistrement en direct (durée du montage) ; effets d'image via une fonction absente de Safari ; les formats lus dépendent du navigateur.
