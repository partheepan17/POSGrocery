# ===========================================
# Grocery POS - Multi-stage Docker Build
# ===========================================

# Stage 1: Build the application
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production=false

# Copy source code
COPY . .

# Build the application
RUN npm run build:prod

# Stage 2: Production server with Nginx
FROM nginx:alpine AS runner

# Set environment variables
ENV NGINX_PORT=80
ENV NGINX_WORKER_PROCESSES=auto
ENV NGINX_WORKER_CONNECTIONS=1024

# Install additional packages for health checks and utilities
RUN apk add --no-cache \
    curl \
    tzdata \
    && rm -rf /var/cache/apk/*

# Copy built application from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy custom Nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy environment configuration template
COPY .env.example /usr/share/nginx/html/.env.example

# Create directory for logs
RUN mkdir -p /var/log/nginx && \
    touch /var/log/nginx/access.log && \
    touch /var/log/nginx/error.log

# Set proper permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/log/nginx && \
    chmod -R 755 /usr/share/nginx/html

# Add health check script
RUN echo '#!/bin/sh' > /usr/local/bin/healthcheck.sh && \
    echo 'curl -f http://localhost:$NGINX_PORT/ > /dev/null 2>&1' >> /usr/local/bin/healthcheck.sh && \
    chmod +x /usr/local/bin/healthcheck.sh

# Health check configuration
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD /usr/local/bin/healthcheck.sh

# Expose port
EXPOSE ${NGINX_PORT}

# Add labels for metadata
LABEL maintainer="Grocery POS Team"
LABEL version="1.0.0"
LABEL description="Grocery POS - Point of Sale System"
LABEL org.opencontainers.image.title="Grocery POS"
LABEL org.opencontainers.image.description="Lightweight Grocery/FMCG Point of Sale System"
LABEL org.opencontainers.image.version="1.0.0"
LABEL org.opencontainers.image.vendor="Grocery POS Team"
LABEL org.opencontainers.image.licenses="MIT"
LABEL org.opencontainers.image.source="https://github.com/your-org/grocery-pos"

# Create startup script that handles environment variables
RUN echo '#!/bin/sh' > /docker-entrypoint.sh && \
    echo 'set -e' >> /docker-entrypoint.sh && \
    echo '' >> /docker-entrypoint.sh && \
    echo '# Update Nginx configuration with environment variables' >> /docker-entrypoint.sh && \
    echo 'envsubst '"'"'$NGINX_PORT $NGINX_WORKER_PROCESSES $NGINX_WORKER_CONNECTIONS'"'"' < /etc/nginx/conf.d/default.conf > /tmp/nginx.conf' >> /docker-entrypoint.sh && \
    echo 'mv /tmp/nginx.conf /etc/nginx/conf.d/default.conf' >> /docker-entrypoint.sh && \
    echo '' >> /docker-entrypoint.sh && \
    echo '# Start Nginx' >> /docker-entrypoint.sh && \
    echo 'echo "Starting Grocery POS on port $NGINX_PORT..."' >> /docker-entrypoint.sh && \
    echo 'echo "Worker processes: $NGINX_WORKER_PROCESSES"' >> /docker-entrypoint.sh && \
    echo 'echo "Worker connections: $NGINX_WORKER_CONNECTIONS"' >> /docker-entrypoint.sh && \
    echo 'exec nginx -g "daemon off;"' >> /docker-entrypoint.sh && \
    chmod +x /docker-entrypoint.sh

# Use custom entrypoint
ENTRYPOINT ["/docker-entrypoint.sh"]

# ===========================================
# Build Instructions
# ===========================================
#
# Build the image:
#   docker build -t grocery-pos:latest .
#
# Run the container:
#   docker run -d \
#     --name grocery-pos \
#     -p 8080:80 \
#     --env-file .env \
#     --restart unless-stopped \
#     grocery-pos:latest
#
# Development with volume mounting:
#   docker run -d \
#     --name grocery-pos-dev \
#     -p 8080:80 \
#     -v $(pwd)/data:/data \
#     --env-file .env \
#     grocery-pos:latest
#
# ===========================================
# Environment Variables
# ===========================================
#
# See .env.example for all available environment variables
# Key variables for Docker deployment:
#
# NGINX_PORT=80                    # Port inside container
# NGINX_WORKER_PROCESSES=auto      # Number of worker processes
# NGINX_WORKER_CONNECTIONS=1024    # Connections per worker
#
# Application variables:
# VITE_APP_NAME=Grocery POS
# VITE_APP_ENV=production
# VITE_CURRENCY=LKR
# VITE_BACKUP_PROVIDER=local
# VITE_BACKUP_ENCRYPTION_KEY=your-key-here
#
# ===========================================
# Security Considerations
# ===========================================
#
# 1. Always use HTTPS in production
# 2. Set strong encryption keys
# 3. Use Docker secrets for sensitive data
# 4. Run with non-root user in production
# 5. Regularly update base images
# 6. Scan images for vulnerabilities
#
# ===========================================



