# LAN Setup & Shared Printer Guide

This guide explains how to set up the POS system in a LAN environment with one server machine and multiple client terminals.

## Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   CLIENT 1      │    │   CLIENT 2      │    │   CLIENT N      │
│   (Terminal)    │    │   (Terminal)    │    │   (Terminal)    │
│                 │    │                 │    │                 │
│  Next.js App    │    │  Next.js App    │    │  Next.js App    │
│  Port: 3000     │    │  Port: 3000     │    │  Port: 3000     │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────┴─────────────┐
                    │        SERVER MACHINE     │
                    │                           │
                    │  • Database (SQLite)      │
                    │  • API Server (Port 8100) │
                    │  • Print Service          │
                    │  • Shared Printer         │
                    └───────────────────────────┘
```

## Server Machine Setup

### 1. Install Dependencies

```bash
# Navigate to server directory
cd server

# Install dependencies
npm install

# Build the server
npm run build
```

### 2. Configure Environment

```bash
# Copy environment template
cp env.example .env

# Edit .env file
nano .env
```

**Required Environment Variables:**
```env
NODE_ENV=production
PORT=8100
TZ=Asia/Colombo
SQLITE_PATH=./data/pos.db
PRINTER_NAME=POS_PRINTER
```

### 3. Set Up Shared Printer

#### Windows:
1. **Install Printer Driver**
   - Install the printer driver on the server machine
   - Test print to ensure it works

2. **Share the Printer**
   - Go to Control Panel → Devices and Printers
   - Right-click your printer → Printer properties
   - Go to Sharing tab
   - Check "Share this printer"
   - Set share name: `POS_PRINTER`
   - Click OK

3. **Find Server IP Address**
   ```cmd
   ipconfig
   ```
   Note the IPv4 address (e.g., `192.168.1.50`)

#### Linux/macOS:
1. **Install CUPS (if not already installed)**
   ```bash
   # Ubuntu/Debian
   sudo apt-get install cups
   
   # macOS (usually pre-installed)
   # No action needed
   ```

2. **Add Printer**
   ```bash
   # Add printer via CUPS web interface
   # Open browser: http://localhost:631
   # Or use lpadmin command
   sudo lpadmin -p POS_PRINTER -E -v usb://printer/device/uri
   ```

3. **Find Server IP Address**
   ```bash
   ip addr show  # Linux
   ifconfig      # macOS
   ```

### 4. Start the Server

```bash
# Start the server
npm start

# Or for development with auto-reload
npm run dev
```

**Expected Output:**
```
🚀 Starting POS Server...
📊 Running database migrations...
✅ Database migrations completed
✅ Database connection established
🎯 POS Server running on port 8100
🌐 Health check: http://localhost:8100/health
📋 API endpoints: http://localhost:8100/api/
🖨️  Print service: http://localhost:8100/api/print
📄 Environment: production
🕐 Timezone: Asia/Colombo
🖨️  Printer: POS_PRINTER
```

### 5. Verify Server Setup

```bash
# Test health endpoint
curl http://localhost:8100/health

# Test printer status
curl http://localhost:8100/api/health
```

## Client Terminal Setup

### 1. Install Dependencies

```bash
# Navigate to client directory (root of project)
cd ..

# Install dependencies
npm install

# Build the client
npm run build
```

### 2. Configure Environment

```bash
# Create .env.local file
echo "NEXT_PUBLIC_API_BASE_URL=http://192.168.1.50:8100" > .env.local
```

**Replace `192.168.1.50` with your server's actual IP address.**

### 3. Start Client

```bash
# Start the client
npm run dev

# Or for production
npm start
```

### 4. Verify Client Connection

1. Open browser: `http://localhost:3000`
2. Check browser console for any connection errors
3. Test a simple operation (like viewing products)

## Network Configuration

### Firewall Settings

#### Windows Server:
```cmd
# Allow port 8100 through Windows Firewall
netsh advfirewall firewall add rule name="POS Server" dir=in action=allow protocol=TCP localport=8100
```

#### Linux Server:
```bash
# Allow port 8100 through UFW
sudo ufw allow 8100

# Or with iptables
sudo iptables -A INPUT -p tcp --dport 8100 -j ACCEPT
```

### Router Configuration

1. **Static IP Assignment** (Recommended)
   - Assign static IP to server machine
   - Use router's DHCP reservation feature
   - Example: `192.168.1.50` for server

2. **Port Forwarding** (If needed)
   - Forward external port to server's port 8100
   - Only if clients are on different networks

## Testing the Setup

### 1. Server Health Check

```bash
# From any client machine
curl http://192.168.1.50:8100/health

# Expected response:
{
  "status": "ok",
  "time": "2025-01-05T12:30:45.000Z",
  "timezone": "Asia/Colombo",
  "server": {
    "platform": "win32",
    "node_version": "v18.17.0",
    "uptime": 3600,
    "memory": {...},
    "pid": 1234
  },
  "database": {
    "connected": true,
    "type": "sqlite"
  },
  "printer": {
    "installed": true,
    "default": "POS_PRINTER",
    "name": "POS_PRINTER",
    "available": true
  }
}
```

### 2. Test Print Functionality

1. **Create a test sale** on any client
2. **Process payment** and **print receipt**
3. **Verify receipt prints** on server's shared printer
4. **Check print job status** via API

### 3. Test Concurrent Operations

1. **Open multiple clients** (different browsers/machines)
2. **Create sales simultaneously**
3. **Verify unique receipt numbers**
4. **Check database consistency**

## Troubleshooting

### Common Issues

#### 1. Client Cannot Connect to Server

**Symptoms:**
- Client shows "Connection failed" error
- API calls return network errors

**Solutions:**
- Check server IP address is correct
- Verify server is running on port 8100
- Check firewall settings
- Test with `ping` and `telnet` commands

```bash
# Test connectivity
ping 192.168.1.50
telnet 192.168.1.50 8100
```

#### 2. Print Jobs Not Printing

**Symptoms:**
- Receipt generation succeeds
- No physical print output

**Solutions:**
- Check printer is shared correctly
- Verify printer name in environment
- Test printer directly from server
- Check print service logs

```bash
# Test printer directly (Windows)
echo "Test print" | lpr -P POS_PRINTER

# Test printer directly (Linux/macOS)
echo "Test print" | lp -d POS_PRINTER
```

#### 3. Database Lock Errors

**Symptoms:**
- "Database is locked" errors
- Concurrent operation failures

**Solutions:**
- Check SQLite WAL mode is enabled
- Verify proper database file permissions
- Restart server if needed

#### 4. Receipt Number Collisions

**Symptoms:**
- Duplicate receipt numbers
- Invoice creation failures

**Solutions:**
- Check server timezone is correct
- Verify receipt number generation logic
- Check for clock synchronization issues

### Debug Commands

```bash
# Check server status
curl http://192.168.1.50:8100/health

# Check printer status
curl http://192.168.1.50:8100/api/health

# Test print job
curl -X POST http://192.168.1.50:8100/api/print \
  -H "Content-Type: application/json" \
  -d '{"type":"receipt","format":"html","payload":{"test":true}}'

# Check database
sqlite3 data/pos.db "SELECT COUNT(*) FROM invoices;"
```

## Performance Optimization

### 1. Server Optimization

```bash
# Increase Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=4096"

# Use PM2 for process management
npm install -g pm2
pm2 start dist/index.js --name pos-server
pm2 startup
pm2 save
```

### 2. Database Optimization

```sql
-- Enable WAL mode for better concurrency
PRAGMA journal_mode = WAL;

-- Increase cache size
PRAGMA cache_size = 10000;

-- Set synchronous mode
PRAGMA synchronous = NORMAL;
```

### 3. Network Optimization

- Use wired connections for server
- Ensure stable power supply
- Consider UPS for server machine
- Monitor network latency

## Security Considerations

### 1. Network Security

- Use VPN for remote access
- Implement proper firewall rules
- Regular security updates
- Monitor access logs

### 2. Data Security

- Regular database backups
- Encrypt sensitive data
- Implement user authentication
- Audit trail logging

### 3. Print Security

- Secure printer access
- Monitor print jobs
- Implement print quotas
- Regular printer maintenance

## Maintenance

### Daily Tasks

- Check server health status
- Verify printer functionality
- Monitor disk space
- Check error logs

### Weekly Tasks

- Database backup
- Update dependencies
- Security patches
- Performance monitoring

### Monthly Tasks

- Full system backup
- Hardware maintenance
- Network optimization
- Security audit

## Support

For technical support:

1. Check server logs: `./logs/server.log`
2. Verify network connectivity
3. Test individual components
4. Contact system administrator

## Quick Reference

### Server Commands
```bash
# Start server
npm start

# Development mode
npm run dev

# Check status
curl http://localhost:8100/health

# View logs
tail -f logs/server.log
```

### Client Commands
```bash
# Start client
npm run dev

# Build for production
npm run build

# Test connection
curl http://localhost:3000/api/health
```

### Network Commands
```bash
# Find server IP
ipconfig  # Windows
ip addr   # Linux

# Test connectivity
ping 192.168.1.50
telnet 192.168.1.50 8100

# Check ports
netstat -an | grep 8100
```

