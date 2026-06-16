#!/usr/bin/env py -3
import os
import sys
import paramiko

HOST = "85.193.89.154"
USER = "root"
PASSWORD = os.environ.get("DEPLOY_SSH_PASSWORD", "")
REPO = "/root/school-backend"
WEB = "/var/www/prepodmgy"

LOCAL_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
UPLOADS = [
    ("school-frontend/index.html", f"{REPO}/school-frontend/index.html"),
    ("school-frontend/src/main.tsx", f"{REPO}/school-frontend/src/main.tsx"),
    ("src/main.ts", f"{REPO}/src/main.ts"),
]

DEPLOY_CMD = f"""
set -e
echo '=== hostname ==='
hostname
echo '=== repo ==='
cd {REPO}
git fetch origin main 2>/dev/null || true
echo '=== upload verified ==='
grep -q unhandledrejection school-frontend/index.html && echo 'WARN: broken index still has unhandledrejection' || echo 'OK: index.html fixed'
echo '=== frontend build ==='
cd {REPO}/school-frontend
rm -rf node_modules dist
npm install
npm run build
grep legacy dist/index.html && echo 'FAIL legacy' && exit 1 || echo 'OK no legacy'
wc -c dist/index.html
ls -lh dist/assets/index-*.js | head -1
echo '=== deploy static ==='
mkdir -p {WEB}
rsync -a --delete dist/ {WEB}/
chown -R www-data:www-data {WEB} 2>/dev/null || chown -R www-data:www-data {WEB}
echo '=== backend ==='
cd {REPO}
npm install
npm run build
pm2 restart school-backend || pm2 start dist/main.js --name school-backend
echo '=== live check ==='
curl -s https://prepodmgy.ru/ | grep -E 'unhandledrejection|index-' | head -3
curl -sI https://prepodmgy.ru/ | head -5
echo '=== DONE ==='
"""


def main():
    if not PASSWORD:
        print("Set DEPLOY_SSH_PASSWORD", file=sys.stderr)
        sys.exit(1)

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print(f"Connecting to {HOST}...")
    client.connect(HOST, username=USER, password=PASSWORD, timeout=30)

    sftp = client.open_sftp()
    for local_rel, remote_path in UPLOADS:
        local_path = os.path.join(LOCAL_ROOT, local_rel.replace("/", os.sep))
        print(f"Upload {local_rel} -> {remote_path}")
        sftp.put(local_path, remote_path)
    sftp.close()

    print("Running deploy commands...")
    stdin, stdout, stderr = client.exec_command(DEPLOY_CMD, get_pty=True, timeout=600)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    code = stdout.channel.recv_exit_status()
    sys.stdout.buffer.write(out.encode("utf-8", errors="replace"))
    sys.stdout.buffer.write(b"\n")
    if err.strip():
        sys.stdout.buffer.write(b"STDERR: ")
        sys.stdout.buffer.write(err.encode("utf-8", errors="replace"))
        sys.stdout.buffer.write(b"\n")
    client.close()
    if code != 0:
        print(f"Deploy failed with exit code {code}", file=sys.stderr)
        sys.exit(code)
    print("Deploy succeeded.")


if __name__ == "__main__":
    main()
