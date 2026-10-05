# Installer MontagePourTous sur `montagepourtous.reine-cloud.fr` (LWS, cPanel)

Application **Node.js autonome**, avec **sa propre base MySQL** (tables `mpt_users`, `mpt_sessions`, `mpt_personnes`, `mpt_reglages`, `mpt_meta`, créées automatiquement). Elle n'a rien en commun avec le site principal `reine-cloud.fr`.

Durée : environ 20 minutes. Les noms entre « guillemets » sont ceux de l'interface cPanel de LWS (ils peuvent légèrement varier).

## 0. Pré-requis
- Votre offre doit proposer **« Setup Node.js App »** (« Configurer l'application Node.js ») dans cPanel. Sinon : demandez son activation au support LWS, ou prenez un VPS.
- Le sous-domaine `montagepourtous.reine-cloud.fr` existe déjà (cPanel → « Domaines »). Notez son **dossier racine**, sans y toucher.

## 1. Créer la base de données
cPanel → **« Bases de données MySQL »** :
1. **Créer une base** : nom `montagepourtous` → le nom réel devient `VOTRECOMPTE_montagepourtous`.
2. **Ajouter un utilisateur** : nom `mpt`, mot de passe **long et unique** (utilisez « Générer un mot de passe ») → `VOTRECOMPTE_mpt`.
3. **Ajouter l'utilisateur à la base** → cocher **« Tous les privilèges »**.
4. Notez : nom de base, nom d'utilisateur, mot de passe. Hôte = `localhost`.

## 2. Envoyer le code
1. cPanel → **« Gestionnaire de fichiers »** → à la racine du compte (hors `public_html`), créez le dossier `montagepourtous`.
2. Envoyez-y `montagepourtous-lws.zip`, puis **« Extraire »**. Vous obtenez `montagepourtous/server.js`, `usage.js`, `stockage.js`, `package.json`, `public/`, `app/`…

## 3. Créer l'application Node.js
cPanel → **« Setup Node.js App »** → **Create Application** :

| Champ | Valeur |
|---|---|
| Node.js version | 18 ou plus (20 ou 22 si proposé) |
| Application mode | Production |
| Application root | `montagepourtous` |
| Application URL | `montagepourtous.reine-cloud.fr` (choisir le sous-domaine dans la liste) |
| Application startup file | `server.js` |

Dans **« Environment variables »**, ajoutez (bouton *Add variable*) :

| Nom | Valeur |
|---|---|
| `MPT_ADMIN_PASSWORD` | **votre mot de passe administrateur** (12 caractères ou plus) |
| `MPT_TRUST_PROXY` | `1` |
| `MPT_DB_HOST` | `localhost` |
| `MPT_DB_NAME` | `VOTRECOMPTE_montagepourtous` |
| `MPT_DB_USER` | `VOTRECOMPTE_mpt` |
| `MPT_DB_PASSWORD` | le mot de passe de l'utilisateur de la base |

Cliquez **Save**, puis **« Run NPM Install »** (installe `express` et `mysql2`), puis **Restart**.

## 4. HTTPS
cPanel → **« SSL/TLS Status »** → cochez `montagepourtous.reine-cloud.fr` → **Run AutoSSL**. Puis forcez HTTPS (« Domaines » → *Force HTTPS Redirect*).

## 5. Vérifier
1. `https://montagepourtous.reine-cloud.fr/health` doit afficher `{"ok":true,"stockage":"mysql"}`.
   - `"stockage":"json"` → les variables `MPT_DB_*` ne sont pas prises en compte (vérifier l'orthographe, puis Restart).
   - Page d'erreur → cPanel → Setup Node.js App → ouvrir l'application → regarder le journal (*stderr.log*) ; envoyez-moi le message.
2. Ouvrez `https://montagepourtous.reine-cloud.fr`, créez un compte test, ouvrez un outil.
3. cPanel → **phpMyAdmin** → base `…_montagepourtous` : les tables `mpt_*` existent et `mpt_users` contient votre compte.
4. `https://montagepourtous.reine-cloud.fr/admin.html` : entrez `MPT_ADMIN_PASSWORD`. Dans « Tarifs et réglages », collez vos liens de paiement.

## 6. Sauvegardes (important)
- cPanel → **« Tâches Cron »** → une fois par jour : `sh /home/VOTRECOMPTE/montagepourtous/scripts/sauvegarde-mysql.sh` (crée un `.sql.gz` daté dans `~/sauvegardes-montagepourtous`, garde les 14 dernières ; lit les identifiants dans l'environnement ou un fichier `.env` du projet).
- Ou à la main : phpMyAdmin → base → **Exporter**.

## 7. Mettre à jour plus tard
Remplacez les fichiers (sans toucher à la base), **Run NPM Install** si `package.json` a changé, **Restart**. La base n'est jamais modifiée sauf ajout éventuel de tables.

## Notes
- Si vous aviez déjà des données dans `data/db.json`, elles sont **importées automatiquement** dans la base au premier démarrage (une seule fois).
- L'application tourne en **un seul processus** (cas normal de l'hébergement mutualisé).
- Le mot de passe provisoire `Admin-MPT-ChangezMoi-2026` est public dans le code : ne l'utilisez pas en ligne.
- Un cookie de session (`HttpOnly`, `Secure` en HTTPS) est le seul cookie utilisé.
