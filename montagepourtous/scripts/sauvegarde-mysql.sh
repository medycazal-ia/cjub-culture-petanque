#!/bin/sh
# Sauvegarde de la base MontagePourTous (MySQL/MariaDB) dans ~/sauvegardes-montagepourtous, garde les 14 dernières.
# Usage (cron cPanel, une fois par jour) :  sh /home/VOTRE_COMPTE/montagepourtous/scripts/sauvegarde-mysql.sh
# Lit MPT_DB_* dans le fichier .env du projet s'il existe, sinon dans l'environnement.
DIR="$(cd "$(dirname "$0")/.." && pwd)"
[ -f "$DIR/.env" ] && . "$DIR/.env"
DEST="${MPT_SAUVEGARDES:-$HOME/sauvegardes-montagepourtous}"
mkdir -p "$DEST"
F="$DEST/montagepourtous-$(date +%Y%m%d-%H%M%S).sql.gz"
MYSQL_PWD="$MPT_DB_PASSWORD" mysqldump -h "${MPT_DB_HOST:-localhost}" -u "$MPT_DB_USER" --single-transaction "$MPT_DB_NAME" | gzip > "$F" \
  && echo "Sauvegarde créée : $F" || { echo "Échec de la sauvegarde" >&2; rm -f "$F"; exit 1; }
ls -1t "$DEST"/montagepourtous-*.sql.gz | tail -n +15 | while read -r v; do rm -f "$v"; done
