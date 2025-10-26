/**
 * PM2 Ecosystem Configuration for POS Grocery System
 * This configuration manages the Node.js backend process
 */

module.exports = {
  apps: [
    {
      name: 'pos-grocery-backend',
      script: './dist/index.js',
      cwd: '/var/www/pos-grocery/server',
      instances: 1,
      exec_mode: 'fork',
      
      // Environment variables
      env: {
        NODE_ENV: 'production',
        PORT: 8250,
        JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
        JWT_EXPIRES_IN: '24h',
        DB_PATH: '/var/www/pos-grocery/data/pos-grocery.db',
        LOG_LEVEL: 'info',
        CORS_ORIGINS: 'http://localhost,http://127.0.0.1',
        REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
        CACHE_TTL_PRODUCTS: 60,
        RATE_LIMIT_WINDOW_MS: 900000,
        RATE_LIMIT_RPM: 200,
        RATE_LIMIT_BURST: 50
      },
      
      // Production environment overrides
      env_production: {
        NODE_ENV: 'production',
        LOG_LEVEL: 'warn',
        CORS_ORIGINS: 'http://your-domain.com,https://your-domain.com'
      },
      
      // Development environment overrides
      env_development: {
        NODE_ENV: 'development',
        LOG_LEVEL: 'debug',
        CORS_ORIGINS: 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000'
      },
      
      // Process management
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      min_uptime: '10s',
      max_restarts: 10,
      
      // Logging
      log_file: '/var/log/pos-grocery/combined.log',
      out_file: '/var/log/pos-grocery/out.log',
      error_file: '/var/log/pos-grocery/error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      
      // Health monitoring
      health_check_grace_period: 3000,
      health_check_fatal_exceptions: true,
      
      // Advanced options
      kill_timeout: 5000,
      listen_timeout: 3000,
      restart_delay: 4000,
      
      // Source map support
      source_map_support: true,
      
      // Node.js options
      node_args: '--max-old-space-size=1024'
    }
  ],

  // Deployment configuration
  deploy: {
    production: {
      user: 'pos-grocery',
      host: ['your-server-ip'],
      ref: 'origin/main',
      repo: 'git@github.com:your-username/pos-grocery.git',
      path: '/var/www/pos-grocery',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build:all && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};











