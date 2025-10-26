#!/bin/bash
# POS Grocery System - Installation Script for Ubuntu/Debian
# This script installs all dependencies and sets up the application

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="pos-grocery"
APP_USER="pos-grocery"
APP_DIR="/var/www/$APP_NAME"
LOG_DIR="/var/log/$APP_NAME"
DATA_DIR="/var/www/$APP_NAME/data"
BACKUP_DIR="/var/www/$APP_NAME/backups"

echo -e "${BLUE}🚀 Starting POS Grocery System Installation${NC}"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Please run as root (use sudo)${NC}"
    exit 1
fi

# Update system packages
echo -e "${YELLOW}📦 Updating system packages...${NC}"
apt update && apt upgrade -y

# Install Node.js 18.x
echo -e "${YELLOW}📦 Installing Node.js 18.x...${NC}"
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# Install PM2 globally
echo -e "${YELLOW}📦 Installing PM2...${NC}"
npm install -g pm2

# Install Nginx
echo -e "${YELLOW}📦 Installing Nginx...${NC}"
apt install -y nginx

# Install Redis (optional)
echo -e "${YELLOW}📦 Installing Redis...${NC}"
apt install -y redis-server

# Install additional dependencies
echo -e "${YELLOW}📦 Installing additional dependencies...${NC}"
apt install -y curl wget git unzip build-essential sqlite3

# Create application user
echo -e "${YELLOW}👤 Creating application user...${NC}"
if ! id "$APP_USER" &>/dev/null; then
    useradd -r -s /bin/false -d "$APP_DIR" "$APP_USER"
fi

# Create directories
echo -e "${YELLOW}📁 Creating directories...${NC}"
mkdir -p "$APP_DIR"
mkdir -p "$LOG_DIR"
mkdir -p "$DATA_DIR"
mkdir -p "$BACKUP_DIR"
mkdir -p "/etc/nginx/sites-available"
mkdir -p "/etc/nginx/sites-enabled"

# Set permissions
chown -R "$APP_USER:$APP_USER" "$APP_DIR"
chown -R "$APP_USER:$APP_USER" "$LOG_DIR"
chmod 755 "$APP_DIR"
chmod 755 "$LOG_DIR"

# Copy application files (assuming they're in the current directory)
echo -e "${YELLOW}📋 Copying application files...${NC}"
cp -r . "$APP_DIR/"
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

# Install application dependencies
echo -e "${YELLOW}📦 Installing application dependencies...${NC}"
cd "$APP_DIR"
sudo -u "$APP_USER" npm install
cd "$APP_DIR/server"
sudo -u "$APP_USER" npm install

# Build the application
echo -e "${YELLOW}🔨 Building application...${NC}"
cd "$APP_DIR"
sudo -u "$APP_USER" npm run build:all

# Configure Nginx
echo -e "${YELLOW}🌐 Configuring Nginx...${NC}"
cp "$APP_DIR/deploy/nginx.conf" "/etc/nginx/sites-available/$APP_NAME"
ln -sf "/etc/nginx/sites-available/$APP_NAME" "/etc/nginx/sites-enabled/$APP_NAME"

# Remove default Nginx site
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
nginx -t

# Configure PM2
echo -e "${YELLOW}⚙️ Configuring PM2...${NC}"
cp "$APP_DIR/deploy/ecosystem.config.js" "$APP_DIR/server/"

# Create systemd service for PM2
echo -e "${YELLOW}🔧 Creating systemd service...${NC}"
pm2 startup systemd -u "$APP_USER" --hp "$APP_DIR"
sudo -u "$APP_USER" pm2 save

# Create log rotation configuration
echo -e "${YELLOW}📝 Configuring log rotation...${NC}"
cat > "/etc/logrotate.d/$APP_NAME" << EOF
$LOG_DIR/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 $APP_USER $APP_USER
    postrotate
        sudo -u $APP_USER pm2 reloadLogs
    endscript
}
EOF

# Create backup script
echo -e "${YELLOW}💾 Creating backup script...${NC}"
cat > "$APP_DIR/backup.sh" << 'EOF'
#!/bin/bash
# Backup script for POS Grocery System

APP_DIR="/var/www/pos-grocery"
BACKUP_DIR="/var/www/pos-grocery/backups"
DB_PATH="/var/www/pos-grocery/data/pos-grocery.db"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Create database backup
if [ -f "$DB_PATH" ]; then
    sqlite3 "$DB_PATH" ".backup '$BACKUP_DIR/pos-grocery_$DATE.db'"
    echo "Database backup created: pos-grocery_$DATE.db"
fi

# Create application backup
tar -czf "$BACKUP_DIR/pos-grocery-app_$DATE.tar.gz" -C "$APP_DIR" --exclude=node_modules --exclude=data --exclude=backups .
echo "Application backup created: pos-grocery-app_$DATE.tar.gz"

# Clean old backups (keep last 30 days)
find "$BACKUP_DIR" -name "*.db" -mtime +30 -delete
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed successfully"
EOF

chmod +x "$APP_DIR/backup.sh"
chown "$APP_USER:$APP_USER" "$APP_DIR/backup.sh"

# Set up cron job for backups
echo -e "${YELLOW}⏰ Setting up backup cron job...${NC}"
(crontab -u "$APP_USER" -l 2>/dev/null; echo "0 2 * * * $APP_DIR/backup.sh") | crontab -u "$APP_USER" -

# Start services
echo -e "${YELLOW}🚀 Starting services...${NC}"
systemctl enable nginx
systemctl start nginx
systemctl enable redis-server
systemctl start redis-server

# Start PM2 application
cd "$APP_DIR/server"
sudo -u "$APP_USER" pm2 start ecosystem.config.js --env production

# Configure firewall
echo -e "${YELLOW}🔥 Configuring firewall...${NC}"
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Display installation summary
echo -e "${GREEN}✅ Installation completed successfully!${NC}"
echo -e "${BLUE}📋 Installation Summary:${NC}"
echo -e "   • Application directory: $APP_DIR"
echo -e "   • Log directory: $LOG_DIR"
echo -e "   • Data directory: $DATA_DIR"
echo -e "   • Backup directory: $BACKUP_DIR"
echo -e "   • Nginx configuration: /etc/nginx/sites-available/$APP_NAME"
echo -e "   • PM2 configuration: $APP_DIR/server/ecosystem.config.js"
echo -e "   • Application user: $APP_USER"
echo ""
echo -e "${YELLOW}🌐 Access your application at:${NC}"
echo -e "   • HTTP: http://$(hostname -I | awk '{print $1}')/"
echo -e "   • API: http://$(hostname -I | awk '{print $1}')/api/"
echo ""
echo -e "${YELLOW}🔧 Useful commands:${NC}"
echo -e "   • Check PM2 status: sudo -u $APP_USER pm2 status"
echo -e "   • View logs: sudo -u $APP_USER pm2 logs"
echo -e "   • Restart app: sudo -u $APP_USER pm2 restart pos-grocery-backend"
echo -e "   • Check Nginx: systemctl status nginx"
echo -e "   • View Nginx logs: tail -f /var/log/nginx/error.log"
echo ""
echo -e "${RED}⚠️  Important:${NC}"
echo -e "   • Update JWT_SECRET in production"
echo -e "   • Configure SSL certificate for HTTPS"
echo -e "   • Update CORS_ORIGINS for your domain"
echo -e "   • Test the application thoroughly"
echo ""
echo -e "${GREEN}🎉 POS Grocery System is now running!${NC}"











