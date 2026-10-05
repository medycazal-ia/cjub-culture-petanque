# Mise en ligne sur LWS — Club Culture Pétanque

À faire **après la réservation du domaine**. Rien n'est à installer côté base de données : le site enregistre tout dans le dossier `data/`.

## 0. Avant de commencer

- **Offre LWS avec Node.js** : il faut un hébergement qui fait tourner Node.js (version 18 ou plus). Sur les offres cPanel de LWS, cherchez **« Setup Node.js App »** (« Configurer l'application Node.js ») dans cPanel. S'il n'existe pas dans votre offre, un hébergement mutualisé classique (PHP uniquement) ne convient pas : prenez un VPS (voir la fin de ce guide) ou demandez au support LWS d'activer Node.js.
- **Mot de passe admin** : choisissez-en un solide (12 caractères ou plus). Il protège l'espace Admin.
- **Domaine** : réservé et pointé vers l'hébergement LWS.

## 1. Envoyer le code

Au choix :

**A. Fichier zip (le plus simple)**
1. Sur un ordinateur ayant git : `git archive --format=zip -o clubculture.zip main`
2. cPanel → **Gestionnaire de fichiers** → créez un dossier `clubculture` (à la racine du compte, pas dans `public_html`).
3. Envoyez `clubculture.zip` dedans, puis faites **Extraire**.

**B. Git dans cPanel**
cPanel → **Git™ Version Control** → *Create* → cloner `https://github.com/medycazal-ia/cjub-culture-petanque` (si le dépôt est privé, il faut une clé de déploiement GitHub), dossier `clubculture`, branche `main`.

## 2. Créer l'application Node.js

cPanel → **Setup Node.js App** → **Create Application** :

| Champ | Valeur |
|---|---|
| Node.js version | 18 ou plus |
| Application mode | Production |
| Application root | `clubculture` |
| Application URL | votre domaine (ex. `clubculture.mq`) |
| Application startup file | `server.js` |

Dans **Environment variables**, ajoutez :

| Nom | Valeur |
|---|---|
| `ADMIN_PASSWORD` | votre mot de passe admin |

Cliquez **Run NPM Install**, puis **Restart**. Ouvrez `https://votre-domaine/health` : la réponse doit être `{"status":"ok"}`.

## 3. HTTPS

cPanel → **SSL/TLS Status** → *Run AutoSSL* pour le domaine. Activez ensuite la redirection HTTP → HTTPS (cPanel → **Domains** → *Force HTTPS Redirect*).

## 4. Premier réglage du site

1. Allez sur `https://votre-domaine/#admin`, connectez-vous.
2. Onglet **Paramètres** : vérifiez le nom, l'email, le téléphone, l'adresse et les liens Facebook / WhatsApp.
3. Onglets **Événements** et **Produits** : supprimez les exemples (Tournoi du mois, Championnat régional, produits d'exemple) et ajoutez les vôtres.
4. Testez : une inscription à un événement, un envoi de photo (membre), sa validation dans l'onglet **Galerie**.

## 5. Sauvegardes (important)

Les inscriptions, commandes, membres et photos sont dans `data/` (`db.json` et `uploads/`). Ce dossier n'est **pas** dans git : il faut le sauvegarder vous-même.

- Script fourni : `sh scripts/backup.sh` crée une archive datée dans `~/sauvegardes-clubculture` et garde les 14 dernières.
- Automatisez-le : cPanel → **Cron Jobs** → une fois par jour, commande :
  `sh /home/VOTRE_COMPTE/clubculture/scripts/backup.sh`
- Téléchargez de temps en temps une archive sur votre ordinateur : une sauvegarde sur le même serveur ne protège pas d'une panne du serveur.

## 6. Mettre à jour le site

1. Récupérez la nouvelle version (nouveau zip, ou *Pull* dans Git Version Control). **Ne supprimez ni n'écrasez le dossier `data/`.**
2. Setup Node.js App → **Run NPM Install** si `package.json` a changé → **Restart**.

La session admin est en mémoire : après un redémarrage, il faut se reconnecter.

## 7. Si quelque chose ne va pas

| Problème | Piste |
|---|---|
| Page blanche ou erreur 503 | Setup Node.js App → vérifiez que le fichier de démarrage est `server.js` et regardez le journal d'erreurs ; *Restart*. |
| « ADMIN_PASSWORD non configuré » à la connexion | La variable n'est pas enregistrée : ajoutez-la, puis *Restart*. |
| Envoi de vidéo refusé (erreur 413) | L'hébergeur limite la taille des envois. Demandez au support LWS d'autoriser 100 Mo, ou n'envoyez que des photos. |
| Les photos/inscriptions disparaissent après une mise à jour | Le dossier `data/` a été écrasé : restaurez-le depuis la dernière sauvegarde. |
| `npm install` échoue | Vérifiez la version de Node.js (18 ou plus). |

## Variante : VPS LWS (Ubuntu)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs nginx
git clone https://github.com/medycazal-ia/cjub-culture-petanque /var/www/clubculture
cd /var/www/clubculture && npm install --omit=dev
printf 'PORT=3000\nADMIN_PASSWORD=VotreMotDePasse\n' > .env
sudo npm i -g pm2 && pm2 start server.js --name clubculture && pm2 save && pm2 startup
```

Nginx (`/etc/nginx/sites-available/clubculture`) :

```
server {
  server_name votre-domaine;
  client_max_body_size 100M;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Puis `sudo certbot --nginx -d votre-domaine` pour le HTTPS.

## Ce que le site n'envoie pas

Il n'envoie aucun email (confirmations, rappels) et ne prend pas de paiement en ligne : les commandes sont réglées et retirées au club. Les inscrits sont consultables dans l'espace Admin (Inscriptions, Membres, Invités).
