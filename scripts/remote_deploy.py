#!/usr/bin/env py -3
import os
import sys
import paramiko

HOST = "85.193.89.154"
USER = "root"
PASSWORD = os.environ.get("DEPLOY_SSH_PASSWORD", "")
REPO = "/root/school-backend"

DEPLOY_CMD = f"""
set -e
echo '=== hostname ==='
hostname
cd {REPO}
echo '=== git sync ==='
git fetch origin main
git reset --hard origin/main
git log -1 --oneline
echo '=== nginx ==='
cp nginx-prepodmgy.conf /etc/nginx/sites-available/prepodmgy
nginx -t
systemctl reload nginx
echo '=== frontend deploy ==='
bash deploy-frontend.sh
echo '=== backend ==='
npm install
npx prisma migrate deploy
npm run build
pm2 restart school-backend
echo '=== checks ==='
grep -A3 "unhandledrejection" school-frontend/index.html | grep -q "data-app-ready" && echo 'OK index.html boot handlers' || (echo 'FAIL index.html missing guarded unhandledrejection' && exit 1)
curl -s https://prepodmgy.ru/ | grep -E 'index-|legacy' | head -5
curl -sI https://prepodmgy.ru/assets/$(curl -s https://prepodmgy.ru/ | grep -o 'index-[^"]*\\.js' | head -1) | head -8
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

    print("Running full deploy...")
    stdin, stdout, stderr = client.exec_command(DEPLOY_CMD, get_pty=True, timeout=900)
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
    print("Full deploy succeeded.")


if __name__ == "__main__":
    main()
