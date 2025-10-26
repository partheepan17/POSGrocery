# 🚀 DEPLOYMENT GUIDE
## POS Grocery System V2 - Production Deployment

**Version:** 1.0.0  
**Deployment Date:** October 26, 2025  
**Environment:** Production  

---

## 📋 PRE-DEPLOYMENT CHECKLIST

### Environment Requirements
- [ ] **Node.js**: Version 18.x or higher
- [ ] **Database**: SQLite3 (production) or PostgreSQL (enterprise)
- [ ] **Redis**: Version 6.x or higher (for caching)
- [ ] **Operating System**: Windows 10/11, Linux (Ubuntu 20.04+), macOS 12+
- [ ] **Memory**: Minimum 4GB RAM, Recommended 8GB+
- [ ] **Storage**: Minimum 10GB free space

### Security Prerequisites
- [ ] **SSL Certificate**: Valid SSL certificate for HTTPS
- [ ] **Firewall Configuration**: Ports 3000 (API) and 5173 (Frontend) open
- [ ] **Environment Variables**: All secrets configured securely
- [ ] **Database Backup**: Recent backup available
- [ ] **Access Control**: Proper user permissions configured

---

## 🔧 INSTALLATION STEPS

### 1. System Preparation

#### Windows (NSSM Service)
```bash
# Install Node.js 18.x
# Download from https://nodejs.org/

# Install NSSM (Non-Sucking Service Manager)
# Download from https://nssm.cc/download

# Verify installation
node --version
npm --version
```

#### Linux (PM2 + Nginx)
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx
sudo apt install nginx -y

# Verify installation
node --version
npm --version
pm2 --version
nginx -v
```

### 2. Application Deployment

#### Clone and Setup
```bash
# Clone the repository
git clone https://github.com/your-org/pos-grocery-v2.git
cd pos-grocery-v2

# Install dependencies
npm install

# Build the application
npm run build

# Run database migrations
npm run migrate
```

#### Environment Configuration
```bash
# Create production environment file
cp .env.example .env.production

# Edit environment variables
nano .env.production
```

**Required Environment Variables:**
```env
# Database Configuration
DATABASE_URL=sqlite:./data/production.db
# or for PostgreSQL:
# DATABASE_URL=postgresql://user:password@localhost:5432/pos_grocery

# JWT Configuration
JWT_SECRET=your-super-secure-jwt-secret-key
JWT_EXPIRES_IN=24h

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Application Configuration
NODE_ENV=production
PORT=3000
FRONTEND_PORT=5173

# Security
CORS_ORIGIN=https://yourdomain.com
SESSION_SECRET=your-session-secret

# File Storage
UPLOAD_PATH=./uploads
BACKUP_PATH=./backups

# Email Configuration (if needed)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Printer Configuration
PRINTER_ENABLED=true
PRINTER_PORT=COM1
# or for network printer:
# PRINTER_IP=192.168.1.100
# PRINTER_PORT=9100
```

### 3. Database Setup

#### SQLite (Default)
```bash
# Create data directory
mkdir -p data

# Run migrations
npm run migrate

# Seed initial data (optional)
npm run seed
```

#### PostgreSQL (Enterprise)
```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# Create database and user
sudo -u postgres psql
CREATE DATABASE pos_grocery;
CREATE USER pos_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE pos_grocery TO pos_user;
\q

# Update DATABASE_URL in .env.production
# Run migrations
npm run migrate
```

### 4. Service Configuration

#### Windows (NSSM)
```bash
# Install as Windows Service
nssm install POS-Grocery-API "C:\Program Files\nodejs\node.exe" "C:\path\to\pos-grocery-v2\server\index.js"
nssm install POS-Grocery-Frontend "C:\Program Files\nodejs\node.exe" "C:\path\to\pos-grocery-v2\dist\index.js"

# Configure service settings
nssm set POS-Grocery-API AppDirectory "C:\path\to\pos-grocery-v2"
nssm set POS-Grocery-API AppParameters "server/index.js"
nssm set POS-Grocery-API AppStdout "C:\path\to\pos-grocery-v2\logs\api.log"
nssm set POS-Grocery-API AppStderr "C:\path\to\pos-grocery-v2\logs\api-error.log"

# Start services
nssm start POS-Grocery-API
nssm start POS-Grocery-Frontend
```

#### Linux (PM2)
```bash
# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [
    {
      name: 'pos-grocery-api',
      script: 'server/index.js',
      cwd: '/opt/pos-grocery-v2',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      log_file: '/var/log/pos-grocery/api.log',
      error_file: '/var/log/pos-grocery/api-error.log',
      out_file: '/var/log/pos-grocery/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },
    {
      name: 'pos-grocery-frontend',
      script: 'dist/index.js',
      cwd: '/opt/pos-grocery-v2',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 5173
      },
      log_file: '/var/log/pos-grocery/frontend.log',
      error_file: '/var/log/pos-grocery/frontend-error.log',
      out_file: '/var/log/pos-grocery/frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
EOF

# Start applications
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
```

### 5. Web Server Configuration

#### Nginx Configuration
```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/pos-grocery
```

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL Configuration
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security Headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Frontend
    location / {
        proxy_pass http://localhost:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # API
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Static Files
    location /static/ {
        alias /opt/pos-grocery-v2/dist/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # File Uploads
    location /uploads/ {
        alias /opt/pos-grocery-v2/uploads/;
        expires 1d;
        add_header Cache-Control "public";
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/pos-grocery /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🔒 SECURITY CONFIGURATION

### Firewall Setup

#### UFW (Ubuntu)
```bash
# Enable UFW
sudo ufw enable

# Allow SSH
sudo ufw allow ssh

# Allow HTTP/HTTPS
sudo ufw allow 80
sudo ufw allow 443

# Allow internal API (restrict to local network)
sudo ufw allow from 192.168.1.0/24 to any port 3000
sudo ufw allow from 192.168.1.0/24 to any port 5173

# Check status
sudo ufw status
```

#### Windows Firewall
```powershell
# Allow HTTP/HTTPS
New-NetFirewallRule -DisplayName "HTTP" -Direction Inbound -Protocol TCP -LocalPort 80 -Action Allow
New-NetFirewallRule -DisplayName "HTTPS" -Direction Inbound -Protocol TCP -LocalPort 443 -Action Allow

# Allow internal API
New-NetFirewallRule -DisplayName "POS API" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow -RemoteAddress 192.168.1.0/24
New-NetFirewallRule -DisplayName "POS Frontend" -Direction Inbound -Protocol TCP -LocalPort 5173 -Action Allow -RemoteAddress 192.168.1.0/24
```

### SSL Certificate Setup

#### Let's Encrypt (Free)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

#### Commercial Certificate
```bash
# Copy certificate files
sudo cp your-certificate.crt /etc/ssl/certs/
sudo cp your-private.key /etc/ssl/private/
sudo chmod 600 /etc/ssl/private/your-private.key

# Update Nginx configuration
sudo nano /etc/nginx/sites-available/pos-grocery
```

---

## 📊 MONITORING SETUP

### Application Monitoring

#### PM2 Monitoring
```bash
# Install PM2 monitoring
pm2 install pm2-logrotate
pm2 install pm2-server-monit

# View logs
pm2 logs

# Monitor resources
pm2 monit
```

#### System Monitoring
```bash
# Install monitoring tools
sudo apt install htop iotop nethogs -y

# Create monitoring script
cat > /opt/pos-grocery-v2/monitor.sh << EOF
#!/bin/bash
echo "=== POS Grocery System Status ==="
echo "Date: $(date)"
echo "Uptime: $(uptime)"
echo ""
echo "=== PM2 Status ==="
pm2 status
echo ""
echo "=== Disk Usage ==="
df -h
echo ""
echo "=== Memory Usage ==="
free -h
echo ""
echo "=== Network Connections ==="
netstat -tulpn | grep -E ':(3000|5173)'
EOF

chmod +x /opt/pos-grocery-v2/monitor.sh

# Setup cron job for monitoring
crontab -e
# Add: */5 * * * * /opt/pos-grocery-v2/monitor.sh >> /var/log/pos-grocery/system.log
```

### Log Management

#### Log Rotation
```bash
# Create logrotate configuration
sudo nano /etc/logrotate.d/pos-grocery
```

**Logrotate Configuration:**
```
/var/log/pos-grocery/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 www-data www-data
    postrotate
        pm2 reloadLogs
    endscript
}
```

---

## 🔄 BACKUP STRATEGY

### Database Backup

#### Automated Backup Script
```bash
# Create backup script
cat > /opt/pos-grocery-v2/backup.sh << EOF
#!/bin/bash
BACKUP_DIR="/opt/pos-grocery-v2/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Database backup
if [ -f "data/production.db" ]; then
    sqlite3 data/production.db ".backup '$BACKUP_DIR/db_backup_$DATE.db'"
fi

# File uploads backup
if [ -d "uploads" ]; then
    tar -czf "$BACKUP_DIR/uploads_backup_$DATE.tar.gz" uploads/
fi

# Configuration backup
cp .env.production "$BACKUP_DIR/env_backup_$DATE"

# Cleanup old backups (keep 30 days)
find $BACKUP_DIR -name "*.db" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
find $BACKUP_DIR -name "env_backup_*" -mtime +30 -delete

echo "Backup completed: $DATE"
EOF

chmod +x /opt/pos-grocery-v2/backup.sh

# Setup daily backup
crontab -e
# Add: 0 2 * * * /opt/pos-grocery-v2/backup.sh >> /var/log/pos-grocery/backup.log
```

### Cloud Backup (Optional)
```bash
# Install AWS CLI (for S3 backup)
sudo apt install awscli -y

# Configure AWS credentials
aws configure

# Create cloud backup script
cat > /opt/pos-grocery-v2/cloud-backup.sh << EOF
#!/bin/bash
BACKUP_DIR="/opt/pos-grocery-v2/backups"
S3_BUCKET="your-pos-grocery-backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Upload latest backup to S3
aws s3 cp "$BACKUP_DIR/db_backup_$DATE.db" "s3://$S3_BUCKET/database/"
aws s3 cp "$BACKUP_DIR/uploads_backup_$DATE.tar.gz" "s3://$S3_BUCKET/uploads/"

echo "Cloud backup completed: $DATE"
EOF

chmod +x /opt/pos-grocery-v2/cloud-backup.sh
```

---

## 🚀 DEPLOYMENT VERIFICATION

### Health Checks

#### API Health Check
```bash
# Test API endpoint
curl -f http://localhost:3000/api/health || echo "API health check failed"

# Test database connection
curl -f http://localhost:3000/api/products || echo "Database connection failed"
```

#### Frontend Health Check
```bash
# Test frontend
curl -f http://localhost:5173 || echo "Frontend health check failed"

# Test static assets
curl -f http://localhost:5173/static/css/main.css || echo "Static assets failed"
```

### Performance Testing

#### Load Testing
```bash
# Install Apache Bench
sudo apt install apache2-utils -y

# Test API performance
ab -n 1000 -c 10 http://localhost:3000/api/products

# Test frontend performance
ab -n 1000 -c 10 http://localhost:5173/
```

---

## 🔧 MAINTENANCE PROCEDURES

### Application Updates

#### Update Process
```bash
# Stop services
pm2 stop all

# Backup current version
cp -r /opt/pos-grocery-v2 /opt/pos-grocery-v2.backup.$(date +%Y%m%d)

# Pull latest changes
cd /opt/pos-grocery-v2
git pull origin main

# Install dependencies
npm install

# Run migrations
npm run migrate

# Build application
npm run build

# Restart services
pm2 restart all

# Verify deployment
pm2 status
```

### Database Maintenance

#### Database Optimization
```bash
# SQLite optimization
sqlite3 data/production.db "VACUUM;"
sqlite3 data/production.db "ANALYZE;"

# Check database integrity
sqlite3 data/production.db "PRAGMA integrity_check;"
```

---

## 🆘 TROUBLESHOOTING

### Common Issues

#### Service Won't Start
```bash
# Check logs
pm2 logs pos-grocery-api
pm2 logs pos-grocery-frontend

# Check port availability
netstat -tulpn | grep -E ':(3000|5173)'

# Check permissions
ls -la /opt/pos-grocery-v2/
```

#### Database Issues
```bash
# Check database file
ls -la data/production.db

# Check database permissions
sqlite3 data/production.db "SELECT name FROM sqlite_master WHERE type='table';"

# Repair database (if needed)
sqlite3 data/production.db ".recover" | sqlite3 data/production.db.recovered
```

#### Performance Issues
```bash
# Check system resources
htop
iotop
df -h

# Check application logs
tail -f /var/log/pos-grocery/api.log
tail -f /var/log/pos-grocery/frontend.log

# Restart services
pm2 restart all
```

### Emergency Procedures

#### Rollback Process
```bash
# Stop services
pm2 stop all

# Restore backup
rm -rf /opt/pos-grocery-v2
mv /opt/pos-grocery-v2.backup.$(date +%Y%m%d) /opt/pos-grocery-v2

# Restart services
pm2 start ecosystem.config.js
```

#### Database Recovery
```bash
# Stop services
pm2 stop all

# Restore database backup
cp /opt/pos-grocery-v2/backups/db_backup_YYYYMMDD_HHMMSS.db data/production.db

# Restart services
pm2 start ecosystem.config.js
```

---

## 📞 SUPPORT CONTACTS

### Technical Support
- **Development Team**: dev-team@yourcompany.com
- **DevOps Team**: devops@yourcompany.com
- **Emergency Hotline**: +1-XXX-XXX-XXXX

### Documentation
- **API Documentation**: https://yourdomain.com/api/docs
- **User Manual**: https://yourdomain.com/docs
- **Troubleshooting Guide**: https://yourdomain.com/support

---

## ✅ DEPLOYMENT CHECKLIST

### Pre-Deployment
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] SSL certificate installed
- [ ] Firewall configured
- [ ] Backup procedures tested

### Post-Deployment
- [ ] Health checks passed
- [ ] Performance tests completed
- [ ] Monitoring configured
- [ ] Log rotation setup
- [ ] Backup automation enabled

### Verification
- [ ] API endpoints responding
- [ ] Frontend loading correctly
- [ ] Database queries working
- [ ] File uploads functioning
- [ ] User authentication working

---

**Deployment Status:** ✅ **READY FOR PRODUCTION**

---

*Deployment guide prepared by Senior Production Auditor*  
*Last updated: October 26, 2025*