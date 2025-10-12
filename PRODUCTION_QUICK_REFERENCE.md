# Production Quick Reference

## 🚀 Quick Start Commands

### Health Checks
```bash
# Basic health (always returns 200 if server is running)
curl http://localhost:8250/health

# Detailed health with service status
curl http://localhost:8250/api/health

# Readiness probe (returns 503 if DB is down)
curl http://localhost:8250/api/health/ready

# Liveness probe (always returns 200 if server is running)
curl http://localhost:8250/api/health/live
```

### Service Management

#### PM2
```bash
# Start
pm2 start ecosystem.config.js --env production

# Stop
pm2 stop pos-server

# Restart
pm2 restart pos-server

# View logs
pm2 logs pos-server

# Monitor
pm2 monit
```

#### Systemd
```bash
# Start
sudo systemctl start pos-grocery

# Stop
sudo systemctl stop pos-grocery

# Restart
sudo systemctl restart pos-grocery

# Status
sudo systemctl status pos-grocery

# View logs
sudo journalctl -u pos-grocery -f
```

### Backup & Restore
```bash
# Create backup
/opt/pos-grocery/scripts/backup.sh

# List available backups
/opt/pos-grocery/scripts/restore.sh

# Restore from backup
/opt/pos-grocery/scripts/restore.sh /path/to/backup.db.gz
```

### Logs
```bash
# Application logs
tail -f /var/log/pos/server-combined.log

# Error logs
tail -f /var/log/pos/server-error.log

# System logs
sudo journalctl -u pos-grocery -f
```

## 🔧 Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| Health check fails | Check if database is accessible |
| High memory usage | Restart application |
| Port already in use | Check for existing processes |
| Permission denied | Check file ownership |

### Emergency Commands
```bash
# Kill all Node processes
pkill -f node

# Check port usage
netstat -tlnp | grep :8250

# Check disk space
df -h

# Check memory usage
free -h
```

## 📊 Monitoring

### Key Metrics
- **Response Time**: < 100ms for health checks
- **Memory Usage**: < 90% of available heap
- **Database Response**: < 10ms
- **Uptime**: Check via `/health` endpoint

### Alerts
- Health check returns 503
- Memory usage > 90%
- Database connection fails
- Disk space < 20%

## 🔒 Security

### Firewall
```bash
# Allow only necessary ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
```

### SSL/TLS
```bash
# Install certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal
sudo crontab -e
0 12 * * * /usr/bin/certbot renew --quiet
```

## 📞 Support

- **Documentation**: See `RUNBOOK.md`
- **Logs**: `/var/log/pos/`
- **Configuration**: `/opt/pos-grocery/server/.env`
- **Backups**: `/opt/pos-grocery/backups/`




