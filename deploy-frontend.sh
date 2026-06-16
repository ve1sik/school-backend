#!/bin/bash
set -e

REPO_DIR="$HOME/school-backend"
FRONTEND_DIR="$REPO_DIR/school-frontend"
WEB_ROOT="/var/www/prepodmgy"

echo "→ Pull latest code..."
cd "$REPO_DIR"
git pull origin main

echo "→ Install frontend deps..."
cd "$FRONTEND_DIR"
npm install

echo "→ Building frontend..."
npm run build

echo "→ Verify build (must NOT contain legacy plugin)..."
if grep -q 'vite-legacy' dist/index.html; then
  echo "❌ ERROR: dist/index.html still has vite-legacy — old broken build!"
  echo "   Run: rm -rf node_modules && npm install && npm run build"
  exit 1
fi

if grep -q 'quill' dist/index.html; then
  echo "⚠️  WARNING: quill referenced in index.html (should be lazy-loaded only)"
fi

echo "→ Deploying to $WEB_ROOT ..."
sudo mkdir -p "$WEB_ROOT"
sudo rsync -a --delete "$FRONTEND_DIR/dist/" "$WEB_ROOT/"
sudo chown -R www-data:www-data "$WEB_ROOT"
sudo chmod -R 755 "$WEB_ROOT"

echo "→ Reloading nginx..."
sudo nginx -t && sudo systemctl reload nginx

echo "→ Live check..."
curl -s "https://prepodmgy.ru/" | grep -o 'index-[^"]*\.js' | head -1

echo "✅ Frontend deployed to $WEB_ROOT"
