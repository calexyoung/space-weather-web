# Docker Setup Guide for Space Weather Web Application

## Overview

This document provides comprehensive instructions for building, running, and deploying the Space Weather Web application using Docker. The application consists of a Next.js frontend, Python scientific computing backend, PostgreSQL database, and Redis cache, all orchestrated through Docker Compose.

## Architecture

The Docker setup uses a multi-stage build process to optimize image size and security:

```
┌─────────────────────────────────────────────────────────┐
│                   Docker Compose Stack                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Next.js    │  │    Python    │  │  PostgreSQL  │  │
│  │   App        │←→│   Backend    │←→│   Database   │  │
│  │  Port 3000   │  │  Port 5000   │  │  Port 5432   │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│           │                │                 │          │
│           └────────────────┴─────────────────┘          │
│                           │                              │
│                    ┌──────────────┐                     │
│                    │    Redis     │                     │
│                    │    Cache     │                     │
│                    │  Port 6379   │                     │
│                    └──────────────┘                     │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Prerequisites

- Docker Engine 20.10+ or Docker Desktop
- Docker Compose 2.0+
- At least 4GB of available RAM
- 10GB of available disk space

## Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/space-weather-web.git
cd space-weather-web
```

### 2. Configure Environment Variables

Copy the example environment file and configure it:

```bash
cp .env.docker.example .env
```

Edit `.env` file with your configuration:

```bash
# Required configurations
DB_USER=spaceweather
DB_PASSWORD=your-secure-password-here  # Change this!
DB_NAME=spaceweather

# Generate secure secrets (use different values for each)
JWT_SECRET=generate-a-secure-random-string-min-32-chars
JWT_REFRESH_SECRET=generate-another-secure-random-string
CSRF_SECRET=generate-csrf-secret-here
API_KEY_SECRET=generate-api-key-secret-here

# Optional: LLM Provider API Keys
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
DEFAULT_LLM_PROVIDER=openai
```

### 3. Build and Run

```bash
# Build and start all services
docker-compose up --build -d

# View logs
docker-compose logs -f

# Check service health
docker-compose ps
```

### 4. Access the Application

- **Main Application**: http://localhost:3000
- **Python Backend API**: http://localhost:5000
- **PostgreSQL Database**: localhost:5432
- **Redis Cache**: localhost:6379

## Dockerfile Details

### Multi-Stage Build Process

The Dockerfile uses a 5-stage build process for optimization:

#### Stage 1: Python Backend Builder
```dockerfile
FROM python:3.11-slim AS python-builder
```
- Installs build dependencies (gcc, g++, build-essential)
- Compiles Python scientific packages (NumPy, SciPy, Pandas, etc.)
- Creates optimized Python environment

#### Stage 2: Node.js Dependencies
```dockerfile
FROM node:20-alpine AS deps
```
- Installs production Node.js dependencies
- Generates Prisma client for database access
- Minimal Alpine Linux for smaller size

#### Stage 3: Next.js Builder
```dockerfile
FROM node:20-alpine AS builder
```
- Builds the Next.js application
- Compiles TypeScript to JavaScript
- Creates optimized production bundle

#### Stage 4: Python Runtime
```dockerfile
FROM python:3.11-slim AS python-runtime
```
- Minimal runtime dependencies
- Copies compiled Python packages from builder
- Prepares Python environment for production

#### Stage 5: Production Runner
```dockerfile
FROM node:20-alpine AS runner
```
- Final production image
- Combines Next.js and Python applications
- Runs as non-root user for security
- Uses Supervisor to manage both services

## Docker Compose Configuration

### Services

#### PostgreSQL Database
```yaml
postgres:
  image: postgres:16-alpine
  environment:
    POSTGRES_USER: ${DB_USER:-spaceweather}
    POSTGRES_PASSWORD: ${DB_PASSWORD:-changeme}
    POSTGRES_DB: ${DB_NAME:-spaceweather}
  volumes:
    - postgres_data:/data/postgres
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-spaceweather}"]
```

#### Redis Cache
```yaml
redis:
  image: redis:7-alpine
  volumes:
    - redis_data:/data
  healthcheck:
    test: ["CMD", "redis-cli", "ping"]
```

#### Main Application
```yaml
app:
  build:
    context: .
    dockerfile: Dockerfile
  ports:
    - "3000:3000"  # Next.js
    - "5000:5000"  # Python Backend
  depends_on:
    postgres:
      condition: service_healthy
    redis:
      condition: service_healthy
```

## Environment Variables Reference

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | JWT signing secret (min 32 chars) | Random string |
| `JWT_REFRESH_SECRET` | JWT refresh token secret | Random string |
| `CSRF_SECRET` | CSRF protection secret | Random string |
| `API_KEY_SECRET` | API key encryption secret | Random string |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | OpenAI API key for LLM features | None |
| `ANTHROPIC_API_KEY` | Anthropic Claude API key | None |
| `GOOGLE_API_KEY` | Google AI API key | None |
| `DEFAULT_LLM_PROVIDER` | Default LLM provider | `openai` |
| `PYTHON_BACKEND_URL` | Python backend URL | `http://localhost:5000` |
| `REDIS_URL` | Redis connection URL | `redis://redis:6379` |
| `NODE_ENV` | Node.js environment | `production` |

## Development Workflow

### Running in Development Mode

```bash
# Start services with live reload
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up

# Or use local development (without Docker)
npm run dev          # Next.js frontend
npm run python:dev   # Python backend
```

### Database Management

```bash
# Run migrations
docker-compose exec app npx prisma migrate deploy

# Create a new migration
docker-compose exec app npx prisma migrate dev --name your_migration_name

# Open Prisma Studio
docker-compose exec app npx prisma studio

# Reset database (WARNING: Deletes all data)
docker-compose exec app npx prisma migrate reset
```

### Accessing Service Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f postgres
docker-compose logs -f redis

# Last 100 lines
docker-compose logs --tail=100 app
```

### Shell Access

```bash
# Access application container
docker-compose exec app sh

# Access database
docker-compose exec postgres psql -U spaceweather

# Access Redis CLI
docker-compose exec redis redis-cli
```

## Production Deployment

### Building for Production

```bash
# Build production image
docker build -t space-weather-web:latest .

# Tag for registry
docker tag space-weather-web:latest your-registry.com/space-weather-web:latest

# Push to registry
docker push your-registry.com/space-weather-web:latest
```

### Production Docker Compose

Create a `docker-compose.prod.yml`:

```yaml
version: '3.8'

services:
  app:
    image: your-registry.com/space-weather-web:latest
    restart: always
    environment:
      NODE_ENV: production
      NEXT_PUBLIC_API_URL: https://your-domain.com
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs
```

Run in production:

```bash
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Security Considerations

1. **Use Secrets Management**
   ```bash
   # Create Docker secrets
   echo "your-secret" | docker secret create jwt_secret -
   ```

2. **Network Isolation**
   ```yaml
   networks:
     frontend:
     backend:
     database:
   ```

3. **Resource Limits**
   ```yaml
   services:
     app:
       deploy:
         resources:
           limits:
             cpus: '2'
             memory: 2G
   ```

4. **Read-Only Root Filesystem**
   ```yaml
   services:
     app:
       read_only: true
       tmpfs:
         - /tmp
   ```

## Health Monitoring

### Health Check Endpoints

- **Application Health**: `http://localhost:3000/api/health`
- **Data Quality**: `http://localhost:3000/api/health/data-quality`
- **Python Backend**: `http://localhost:5000/health`

### Monitoring with Docker

```bash
# Check container health
docker-compose ps

# View resource usage
docker stats

# Inspect container
docker-compose exec app sh -c "ps aux"
```

## Troubleshooting

### Common Issues

#### 1. Database Connection Failed
```bash
# Check PostgreSQL logs
docker-compose logs postgres

# Verify connection
docker-compose exec postgres pg_isready

# Test connection manually
docker-compose exec app sh -c "npx prisma db push"
```

#### 2. Port Already in Use
```bash
# Find process using port
lsof -i :3000
lsof -i :5432

# Or change ports in docker-compose.yml
ports:
  - "3001:3000"  # Changed external port
```

#### 3. Build Failures
```bash
# Clear Docker cache
docker system prune -a

# Build with no cache
docker-compose build --no-cache

# Check disk space
df -h
```

#### 4. Permission Issues
```bash
# Fix ownership
docker-compose exec -u root app chown -R nextjs:nodejs /app

# Check permissions
docker-compose exec app ls -la
```

#### 5. Memory Issues
```bash
# Increase Docker memory (Docker Desktop)
# Preferences > Resources > Memory

# Or use swap
docker-compose up --compatibility
```

### Debugging

```bash
# Interactive debugging
docker-compose run --rm app sh

# View running processes
docker-compose exec app ps aux

# Check environment variables
docker-compose exec app env

# Network debugging
docker-compose exec app ping postgres
docker-compose exec app nc -zv redis 6379
```

## Backup and Recovery

### Database Backup

```bash
# Backup database
docker-compose exec postgres pg_dump -U spaceweather spaceweather > backup.sql

# Automated backup script
#!/bin/bash
BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR
docker-compose exec -T postgres pg_dump -U spaceweather spaceweather > "$BACKUP_DIR/backup_$TIMESTAMP.sql"
```

### Database Restore

```bash
# Restore from backup
docker-compose exec -T postgres psql -U spaceweather spaceweather < backup.sql
```

### Volume Backup

```bash
# Backup volumes
docker run --rm -v space-weather-web_postgres_data:/data -v $(pwd):/backup alpine tar czf /backup/postgres_data.tar.gz /data

# Restore volumes
docker run --rm -v space-weather-web_postgres_data:/data -v $(pwd):/backup alpine tar xzf /backup/postgres_data.tar.gz -C /
```

## Performance Optimization

### Image Size Optimization

- Multi-stage builds reduce final image size by ~70%
- Alpine Linux base images for minimal footprint
- Production dependencies only (no dev tools)
- Optimized layer caching

### Build Time Optimization

```bash
# Enable BuildKit for faster builds
DOCKER_BUILDKIT=1 docker-compose build

# Use build cache mounts
# Add to Dockerfile:
RUN --mount=type=cache,target=/root/.npm npm ci
```

### Runtime Optimization

1. **Connection Pooling**
   - Prisma connection pool configured
   - PostgreSQL max_connections tuned

2. **Caching Strategy**
   - Redis for session storage
   - Static asset caching
   - API response caching

3. **Resource Allocation**
   ```yaml
   services:
     postgres:
       shm_size: '256mb'
       command: postgres -c shared_buffers=256MB -c max_connections=100
   ```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Docker Build and Push

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Login to Registry
        uses: docker/login-action@v2
        with:
          registry: your-registry.com
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}
      
      - name: Build and Push
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: your-registry.com/space-weather-web:latest
          cache-from: type=registry,ref=your-registry.com/space-weather-web:buildcache
          cache-to: type=registry,ref=your-registry.com/space-weather-web:buildcache,mode=max
```

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/)
- [Next.js Docker Example](https://github.com/vercel/next.js/tree/canary/examples/with-docker)
- [PostgreSQL Docker Hub](https://hub.docker.com/_/postgres)
- [Redis Docker Hub](https://hub.docker.com/_/redis)

## Support

For issues specific to Docker setup:
1. Check the troubleshooting section above
2. Review Docker logs: `docker-compose logs`
3. Ensure all prerequisites are met
4. Verify environment variables are set correctly

For application-specific issues, refer to the main README.md file.