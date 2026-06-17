#!/usr/bin/env py -3
import os, paramiko

HOST = "85.193.89.154"
USER = "root"
PASSWORD = os.environ.get("DEPLOY_SSH_PASSWORD", "")

CMD = r"""
echo '=== NGINX.CONF BEFORE ==='
grep -E 'worker_processes|worker_connections|multi_accept' /etc/nginx/nginx.conf
echo '=== PATCH workers ==='
cp /etc/nginx/nginx.conf /etc/nginx/nginx.conf.bak.$(date +%Y%m%d)
sed -i 's/worker_connections 768/worker_connections 4096/' /etc/nginx/nginx.conf
grep -q 'multi_accept on' /etc/nginx/nginx.conf || sed -i '/worker_connections/a\        multi_accept on;' /etc/nginx/nginx.conf
echo '=== NGINX.CONF AFTER ==='
grep -E 'worker_processes|worker_connections|multi_accept' /etc/nginx/nginx.conf
nginx -t && nginx -s reload && echo RELOAD_OK
echo '=== SSL keepalive in site ==='
grep -n ssl /etc/nginx/sites-available/prepodmgy | head -10
"""


def main():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    _, out, err = c.exec_command(CMD, timeout=60)
    data = out.read()
    print(data.decode() if isinstance(data, bytes) else data)
    e = err.read().decode()
    if e.strip():
        print("STDERR:", e)


if __name__ == "__main__":
    main()
