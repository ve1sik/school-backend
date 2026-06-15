#!/bin/bash
set -e

FRONTEND_DIR="$HOME/school-backend/school-frontend"
WEB_ROOT="/var/www/prepodmgy"

echo "→ Building frontend..."
cd "$FRONTEND_DIR"
npm run build

echo "→ Deploying to $WEB_ROOT ..."
sudo mkdir -p "$WEB_ROOT"
sudo rsync -a --delete "$FRONTEND_DIR/dist/" "$WEB_ROOT/"
sudo chown -R www-data:www-data "$WEB_ROOT"
sudo chmod -R 755 "$WEB_ROOT"

echo "→ Reloading nginx..."
sudo nginx -t && sudo systemctl reload nginx

echo "✅ Frontend deployed to $WEB_ROOT"
