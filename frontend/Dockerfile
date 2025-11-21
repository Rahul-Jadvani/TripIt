# Multi-stage build for 0x.ship Frontend (Production)
# React + Vite + Nginx

# Stage 1: Build
FROM node:20-alpine as builder

WORKDIR /app

# Install dependencies first (for layer caching)
COPY package*.json ./
RUN npm ci --ignore-scripts

# Copy source code
COPY . .

# Build arguments
ARG VITE_API_URL=https://backend.zer0.pro
ARG BUILD_ENV=production

# Set environment variables for build
ENV VITE_API_URL=${VITE_API_URL}
ENV NODE_ENV=production

# Build the application
RUN npm run build

# Stage 2: Production runtime with Nginx
FROM nginx:alpine

# Install wget for healthcheck
RUN apk add --no-cache wget

# Copy custom nginx configuration
COPY nginx.prod.conf /etc/nginx/conf.d/default.conf

# Copy built app from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Add nginx user permissions
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 755 /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
