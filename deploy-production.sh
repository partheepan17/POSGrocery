#!/bin/bash

# POS Grocery Production Deployment Script
# This script automates the deployment process for production environments

set -euo pipefail

# Configuration
APP_DIR="${APP_DIR:-/opt/pos-grocery}"
SERVICE_USER="${SERVICE_USER:-pos}"
SERVICE_GROUP="${SERVICE_GROUP:-pos}"
BACKUP_BEFORE_DEPLOY="${BACKUP_BEFORE_DEPLOY:-true}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging function
log() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

# Error handling
error_exit() {
    echo -e "${RED}ERROR: $1${NC}" >&2
    exit 1
}

# Success message
success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Warning message
warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

# Check if running as root
if [[ $EUID -eq 0 ]]; then
    error_exit "This script should not be run as root. Please run as a regular user with sudo privileges."
fi

log "Starting POS Grocery production deployment..."

# Check prerequisites
log "Checking prerequisites..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    error_exit "Node.js is not installed. Please install Node.js 18+ first."
fi

# Check Node.js version
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [[ $NODE_VERSION -lt 18 ]]; then
    error_exit "Node.js version 18+ is required. Current version: $(node --version)"
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    error_exit "npm is not installed. Please install npm first."
fi

success "Prerequisites check passed"

# Create service user if it doesn't exist
log "Setting up service user..."
if ! id "$SERVICE_USER" &>/dev/null; then
    sudo useradd -r -s /bin/false -d "$APP_DIR" "$SERVICE_USER" || {
        warning "Failed to create user $SERVICE_USER, continuing..."
    }
fi

# Create application directory
log "Setting up application directory..."
sudo mkdir -p "$APP_DIR"
sudo chown "$USER:$USER" "$APP_DIR"

# Copy application files
log "Copying application files..."
cp -r . "$APP_DIR/"
cd "$APP_DIR"

# Install dependencies
log "Installing dependencies..."
npm install
npm --prefix server install

# Build application
log "Building application..."
npm run build:all

# Create necessary directories
log "Creating necessary directories..."
sudo mkdir -p /var/log/pos
sudo mkdir -p "$APP_DIR/data"
sudo mkdir -p "$APP_DIR/logs"
sudo mkdir -p "$APP_DIR/backups"

# Set permissions
log "Setting permissions..."
sudo chown -R "$SERVICE_USER:$SERVICE_GROUP" "$APP_DIR"
sudo chown -R "$SERVICE_USER:$SERVICE_GROUP" /var/log/pos
sudo chmod +x "$APP_DIR/scripts"/*.sh

# Create production environment file
log "Setting up environment configuration..."
if [[ ! -f "$APP_DIR/server/.env" ]]; then
    cp "$APP_DIR/server/env.production" "$APP_DIR/server/.env"
    warning "Created production environment file. Please review and update $APP_DIR/server/.env"
fi

# Setup PM2 (if available)
if command -v pm2 &> /dev/null; then
    log "Setting up PM2..."
    cp "$APP_DIR/ecosystem.config.js" "$APP_DIR/server/"
    success "PM2 configuration copied"
else
    warning "PM2 not found. Please install PM2 for process management: npm install -g pm2"
fi

# Setup systemd service
log "Setting up systemd service..."
sudo cp "$APP_DIR/pos-grocery.service" /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable pos-grocery
success "Systemd service configured"

# Setup Nginx (if available)
if command -v nginx &> /dev/null; then
    log "Setting up Nginx configuration..."
    sudo cp "$APP_DIR/nginx-pos-grocery.conf" /etc/nginx/sites-available/pos-grocery
    sudo ln -sf /etc/nginx/sites-available/pos-grocery /etc/nginx/sites-enabled/
    
    # Test Nginx configuration
    if sudo nginx -t; then
        success "Nginx configuration is valid"
    else
        warning "Nginx configuration test failed. Please check the configuration manually."
    fi
else
    warning "Nginx not found. Please install and configure Nginx manually."
fi

# Setup log rotation
log "Setting up log rotation..."
sudo tee /etc/logrotate.d/pos-grocery > /dev/null <<EOF
/var/log/pos/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 $SERVICE_USER $SERVICE_GROUP
    postrotate
        systemctl reload pos-grocery
    endscript
}
EOF
success "Log rotation configured"

# Setup backup cron job
log "Setting up automated backups..."
(crontab -l 2>/dev/null; echo "0 2 * * * $APP_DIR/scripts/backup.sh") | crontab -
success "Backup cron job configured"

# Start services
log "Starting services..."

# Start with PM2 if available
if command -v pm2 &> /dev/null; then
    cd "$APP_DIR/server"
    pm2 start ecosystem.config.js --env production
    pm2 save
    success "Application started with PM2"
else
    # Start with systemd
    sudo systemctl start pos-grocery
    success "Application started with systemd"
fi

# Start Nginx if available
if command -v nginx &> /dev/null; then
    sudo systemctl restart nginx
    success "Nginx restarted"
fi

# Wait for application to start
log "Waiting for application to start..."
sleep 10

# Health check
log "Performing health check..."
if curl -f http://localhost:8250/health >/dev/null 2>&1; then
    success "Application is healthy"
else
    warning "Health check failed. Please check the application logs."
fi

# Display final information
log "Deployment completed!"
echo
echo "Application Information:"
echo "  - Application Directory: $APP_DIR"
echo "  - Service User: $SERVICE_USER"
echo "  - Server Port: 8250"
echo "  - Log Directory: /var/log/pos"
echo "  - Backup Directory: $APP_DIR/backups"
echo
echo "Useful Commands:"
echo "  - Check status: sudo systemctl status pos-grocery"
echo "  - View logs: sudo journalctl -u pos-grocery -f"
echo "  - Restart: sudo systemctl restart pos-grocery"
echo "  - Backup: $APP_DIR/scripts/backup.sh"
echo "  - Restore: $APP_DIR/scripts/restore.sh [backup_file]"
echo
echo "Next Steps:"
echo "  1. Update DNS to point to this server"
echo "  2. Configure SSL/TLS certificates"
echo "  3. Review and update environment configuration"
echo "  4. Test all functionality"
echo
success "Production deployment completed successfully!"




