#!/usr/bin/env py -3
import os, paramiko, time

HOST = "85.193.89.154"
USER = "root"
PASSWORD = os.environ.get("DEPLOY_SSH_PASSWORD", "")

CMD = r"""
echo '=== NOW ==='
date -u; uptime
echo '=== SERVICES ==='
systemctl is-active nginx
pm2 list | tail -3
echo '=== HTTPS ==='
curl -skI --max-time 5 https://prepodmgy.ru/ | head -3 || echo CURL_FAIL
echo '=== CONNECTIONS / ORPHAN ==='
ss -s | head -5
ss -tn state established '( dport = :443 or sport = :443 )' | wc -l
ss -tn state close-wait | wc -l
ss -tn state time-wait | wc -l
echo '=== NGINX ALERTS (today) ==='
grep alert /var/log/nginx/error.log | tail -8
echo '=== ACCESS last 40 lines ==='
tail -40 /var/log/nginx/access.log
echo '=== USER IP 141.105 ==='
grep '141.105.25.14' /var/log/nginx/access.log | tail -8
echo '=== PM2 RESTARTS ==='
pm2 describe school-backend 2>/dev/null | grep -E 'restarts|uptime|status' | head -5
echo '=== TOP MEM ==='
ps aux --sort=-%mem | head -6
echo '=== DMESG recent ==='
dmesg -T 2>/dev/null | tail -8
"""


def main():
    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    _, out, err = c.exec_command(CMD, timeout=90)
    data = out.read()
    if isinstance(data, bytes):
        sys.stdout.buffer.write(data)
    else:
        sys.stdout.buffer.write(data.encode("utf-8", errors="replace"))
    if err.read().decode().strip():
        sys.stdout.buffer.write(b"\nSTDERR: " + err.read().encode())
    c.close()

if __name__ == "__main__":
    import sys
    main()
