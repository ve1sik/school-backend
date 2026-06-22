#!/bin/bash
set -e

REPO_DIR="$HOME/school-backend"
FRONTEND_DIR="$REPO_DIR/school-frontend"
WEB_ROOT="/var/www/prepodmgy"

echo "→ Pull latest code..."
cd "$REPO_DIR"
git fetch origin main
git reset --hard origin/main

echo "→ Install frontend deps..."
cd "$FRONTEND_DIR"
npm install

echo "→ Building frontend..."
npm run build

echo "→ Verify build..."
INDEX_HTML_BYTES=$(wc -c < dist/index.html | tr -d ' ')
INDEX_JS_KB=$(ls -l dist/assets/index-*.js | awk '{print int($5/1024)}' | sort -n | tail -1)
if [ "$INDEX_HTML_BYTES" -lt 2000 ]; then
  echo "❌ ERROR: dist/index.html is only ${INDEX_HTML_BYTES} bytes — source code is outdated!"
  exit 1
fi
if ls dist/assets/lib-*.js >/dev/null 2>&1; then
  echo "❌ ERROR: lib-*.js chunk found — manualChunks split breaks React load order!"
  exit 1
fi
if ls dist/assets/*legacy* >/dev/null 2>&1; then
  echo "❌ ERROR: legacy chunks found — remove @vitejs/plugin-legacy from vite.config.ts"
  exit 1
fi
VENDOR_REACT_KB=0
if ls dist/assets/vendor-react-*.js >/dev/null 2>&1; then
  VENDOR_REACT_KB=$(ls -l dist/assets/vendor-react-*.js | awk '{print int($5/1024)}' | tail -1)
fi
if [ "$INDEX_JS_KB" -lt 100 ] && [ "$VENDOR_REACT_KB" -lt 100 ]; then
  echo "❌ ERROR: entry chunks too small (index≈${INDEX_JS_KB}KB, vendor-react≈${VENDOR_REACT_KB}KB) — React may be missing!"
  exit 1
fi
if [ "$INDEX_JS_KB" -ge 100 ]; then
  echo "✓ Build sanity: index.html=${INDEX_HTML_BYTES}B, index.js≈${INDEX_JS_KB}KB"
elif [ "$VENDOR_REACT_KB" -ge 100 ]; then
  echo "✓ Build sanity: index.html=${INDEX_HTML_BYTES}B, split entry index.js≈${INDEX_JS_KB}KB, vendor-react≈${VENDOR_REACT_KB}KB"
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
