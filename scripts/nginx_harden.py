#!/usr/bin/env py -3
import os
import sys
import paramiko

HOST = "85.193.89.154"
USER = "root"
PASSWORD = os.environ.get("DEPLOY_SSH_PASSWORD", "")
REPO = "/root/school-backend"

CMD = f"""
set -e
cd {REPO}
git fetch origin main
git reset --hard origin/main
cp nginx-prepodmgy.conf /etc/nginx/sites-available/prepodmgy
cp sysctl-prepodmgy.conf /etc/sysctl.d/99-prepodmgy.conf
sysctl -p /etc/sysctl.d/99-prepodmgy.conf
nginx -t
nginx -s reload
echo '=== OK ==='
curl -skI --max-time 5 https://prepodmgy.ru/ | head -4
curl -skI --max-time 5 -X GET 'https://prepodmgy.ru/wp-admin/install.php' -o /dev/null -w '%{{http_code}}\\n' || true
"""


def main():
    if not PASSWORD:
        sys.exit("Set DEPLOY_SSH_PASSWORD")
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    _, out, err = c.exec_command(CMD, timeout=120)
    print(out.read().decode())
    if err.read().decode().strip():
        print("STDERR:", err.read().decode())
    sys.exit(out.channel.recv_exit_status())


if __name__ == "__main__":
    main()
