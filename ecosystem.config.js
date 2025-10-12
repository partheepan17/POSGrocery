module.exports = {
  apps: [
    {
      name: 'pos-server',
      script: 'dist/index.js',
      cwd: './server',
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 8250
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 8250,
        FAST_DEV: 'false'
      },
      env_fast: {
        NODE_ENV: 'development',
        PORT: 8250,
        FAST_DEV: 'true',
        SKIP_MIGRATIONS: 'true',
        SKIP_HARDWARE_CHECKS: 'true'
      },
      error_file: './logs/server-error.log',
      out_file: './logs/server-out.log',
      log_file: './logs/server-combined.log',
      time: true,
      max_memory_restart: '1G',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      // Graceful shutdown
      kill_retry_time: 100,
      // Health monitoring
      health_check_grace_period: 3000,
      // Logging configuration
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      // Log rotation settings
      log_type: 'json',
      log_rotate_max_size: '10M',
      log_rotate_retain: 7,
      log_rotate_compress: true,
      log_rotate_interval: '1d',
      // Process management
      autorestart: true,
      watch: false,
      ignore_watch: ['node_modules', 'logs', 'data'],
      // Environment specific settings
      node_args: '--max-old-space-size=1024'
    }
  ],

  // Deployment configuration
  deploy: {
    production: {
      user: 'pos',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:your-org/pos-grocery.git',
      path: '/opt/pos-grocery',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build:all && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
