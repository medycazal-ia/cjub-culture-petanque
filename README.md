# Club Culture Pétanque — Site web

Site du club (La Crique, Trinité, Martinique) : accueil, événements & inscriptions, boutique (panier + commande), inscription des membres, commentaires modérés et espace d'administration.

## Lancer

```bash
npm install
cp .env.example .env     # puis définir ADMIN_PASSWORD
npm start                # http://localhost:3000
```

Les données sont stockées dans `data/db.json` (créé au premier lancement, ignoré par git — pensez à le sauvegarder). Aucune base de données à installer.

## Fonctionnalités

- **Public** : événements, inscription à un événement, boutique avec panier, inscription au club, commentaires (publiés après modération).
- **Admin** (`#admin`, mot de passe `ADMIN_PASSWORD`) : événements, produits, inscriptions, membres, commandes, modération des commentaires, paramètres du club (contact, Facebook, WhatsApp).
- L'annuaire des membres n'est visible que par l'admin (données personnelles).
- **Commandes** : pas de paiement en ligne ; elles sont enregistrées (statut À régler / Payée / Retirée) pour règlement et retrait au club.

## Déploiement (LWS / VPS)

Voir `INSTALL_LWS.md` du dossier d'origine : Node 18+, `npm install`, `.env`, puis `pm2 start server.js --name clubculture` derrière un proxy HTTPS. Santé : `GET /health`.
