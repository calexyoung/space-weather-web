# Multi-stage Dockerfile for Space Weather Web Application

# Stage 1: Node.js Dependencies
FROM node:20-alpine AS deps

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production && \
    npx prisma generate

# Stage 2: Node.js Builder
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./
COPY prisma ./prisma/

# Install all dependencies (including dev)
RUN npm ci

# Copy application source
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the Next.js application
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# Stage 3: Production Runner (Debian-based for better Python support)
FROM node:20-slim AS runner

WORKDIR /app

# Install runtime dependencies including Python and supervisor
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-dev \
    supervisor \
    postgresql-client \
    # Build dependencies for Python packages
    gcc \
    g++ \
    make \
    # Clean up
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PYTHONUNBUFFERED=1

# Create non-root user
RUN groupadd --system --gid 1001 nodejs && \
    useradd --system --uid 1001 --gid nodejs nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma

# Copy Python application
COPY python-backend/ /app/python-backend/

# Install Python packages (much faster on Debian than Alpine)
RUN pip3 install --break-system-packages --upgrade pip || pip3 install --upgrade pip
RUN pip3 install --break-system-packages --no-cache-dir -r /app/python-backend/requirements-docker.txt || \
    pip3 install --no-cache-dir -r /app/python-backend/requirements-docker.txt

# Copy supervisord config
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Copy entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh

# Make entrypoint executable
RUN chmod +x /docker-entrypoint.sh

# Set ownership
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose ports
EXPOSE 3000 5000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000/api/health', (r) => {if (r.statusCode !== 200) process.exit(1)})" || exit 1

# Start services
ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]