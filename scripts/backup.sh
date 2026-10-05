#!/bin/sh
# Sauvegarde des données du site (base JSON + photos/vidéos envoyées).
# Usage : sh scripts/backup.sh   (idéal en tâche cron quotidienne)
set -e
APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${BACKUP_DIR:-$HOME/sauvegardes-clubculture}"
[ -d "$APP_DIR/data" ] || { echo "Rien à sauvegarder : le dossier data/ n existe pas encore."; exit 0; }
mkdir -p "$DEST"
tar -czf "$DEST/clubculture-$(date +%Y-%m-%d).tgz" -C "$APP_DIR" data
# Garde les 14 dernières sauvegardes
ls -1t "$DEST"/clubculture-*.tgz | tail -n +15 | xargs -r rm -f
echo "Sauvegarde terminée : $DEST"
