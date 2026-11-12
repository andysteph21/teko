#!/usr/bin/env bash
# Durcissement du VPS alpha (constats du 10 novembre 2026 : pare-feu inactif,
# ~5 300 tentatives SSH par jour sans bannissement, aucune sauvegarde planifiée,
# pas de swap, compte de déploiement inutilisable en SSH).
# À lancer en root sur le VPS, hors course active. Rejouable.
# Garder une session SSH ouverte pendant l'exécution et tester une nouvelle
# connexion avant de la fermer.
set -euo pipefail
umask 077
[[ $EUID -eq 0 ]] || { echo "À lancer en root" >&2; exit 1; }
root=/opt/teko-alpha
backup_dir=/var/backups/teko-alpha

# 1. Pare-feu : SSH limité, HTTP/HTTPS (Caddy, HTTP/3 compris). Les ports
#    Docker du banc restent liés à 127.0.0.1 par compose.
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get install -y -qq ufw fail2ban
ufw default deny incoming
ufw default allow outgoing
ufw limit 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 443/udp
ufw --force enable

# 2. Bannissement des tentatives SSH répétées.
cat >/etc/fail2ban/jail.d/teko-sshd.local <<'EOF'
[sshd]
enabled = true
backend = systemd
maxretry = 5
findtime = 10m
bantime = 1h
EOF
systemctl enable --now fail2ban
systemctl restart fail2ban

# 3. Le compte de déploiement `teko` accepte la clé déjà autorisée pour root.
#    La fermeture de la connexion root se fait à la main, après vérification
#    (PermitRootLogin no dans /etc/ssh/sshd_config.d/, puis reload ssh).
install -d -m 700 -o teko -g teko /home/teko/.ssh
if [[ -s /root/.ssh/authorized_keys && ! -s /home/teko/.ssh/authorized_keys ]]; then
  install -m 600 -o teko -g teko /root/.ssh/authorized_keys /home/teko/.ssh/authorized_keys
fi

# 4. Swap de 2 Go : 8 Go de RAM partagés entre Postgres, Valhalla et la console.
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null
  swapon /swapfile
  grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >>/etc/fstab
fi

# 5. Sauvegarde quotidienne de la base (04 h 30 à Libreville), 14 jours gardés.
install -d -m 700 "$backup_dir"
install -m 700 "$root/tools/alpha-remote/backup-db.sh" /usr/local/sbin/teko-alpha-backup
cat >/etc/systemd/system/teko-alpha-backup.service <<'EOF'
[Unit]
Description=Sauvegarde de la base du banc alpha Teko
[Service]
Type=oneshot
ExecStart=/usr/local/sbin/teko-alpha-backup
EOF
cat >/etc/systemd/system/teko-alpha-backup.timer <<'EOF'
[Unit]
Description=Sauvegarde quotidienne du banc alpha Teko
[Timer]
OnCalendar=*-*-* 03:30:00 UTC
Persistent=true
[Install]
WantedBy=timers.target
EOF
systemctl daemon-reload
systemctl enable --now teko-alpha-backup.timer

ufw status verbose
fail2ban-client status sshd | sed -n 1,6p
systemctl list-timers teko-alpha-backup.timer --no-pager | sed -n 1,3p
echo "Durcissement appliqué. Mises à jour en attente : redémarrer le VPS hors essai."
