# Deployment Guide

This guide covers how to build and deploy the Space Weather Web application with both the Next.js frontend and Python backend.

## Prerequisites

- Node.js 18+ and npm installed
- Python 3.8+ installed
- PostgreSQL database configured
- Environment variables properly set (see `.env.example`)

## Building the Application

### 1. Install Dependencies

```bash
# Install Node.js dependencies
npm install

# Install Python dependencies (first time only)
npm run python:install
```

### 2. Build for Production

```bash
# Run TypeScript type checking and build
npm run build
```

This creates an optimized production build in the `.next` directory.

## Running in Production

After a successful build, you need to run both the Next.js server and Python backend as separate processes:

### Option 1: Run Both Services Separately (Recommended for Production)

**Terminal 1 - Next.js Production Server:**
```bash
npm start
```
- Serves the built Next.js application
- Runs on port 3000 by default
- Uses the optimized production build from `.next` directory

**Terminal 2 - Python Backend:**
```bash
npm run python:dev
```
Or directly:
```bash
cd python-backend && ./start.sh
```
- Runs the FastAPI Python engine
- Runs on port 8000 by default
- Provides AI/ML capabilities and additional data processing

### Option 2: Development Mode (Both Together)

For development only, you can run both services concurrently:
```bash
npm run dev:all
```
This uses Turbopack for faster development builds but is not suitable for production.

## How the Services Communicate

### Architecture
- **Next.js App (Port 3000)**: Handles the web UI, API routes, and server-side rendering
- **Python Backend (Port 8000)**: Provides AI/ML processing, advanced data analysis, and specialized computations

### Communication Flow
1. The Next.js app makes API calls to the Python backend through:
   - `/api/python/proxy` route which forwards requests to `http://localhost:8000`
   - Direct server-side API calls from Next.js API routes to the Python backend

2. The Python backend runs independently as a standalone FastAPI service
   - It doesn't depend on whether Next.js is in dev or production mode
   - Provides REST API endpoints consumed by the Next.js application

### API Proxy Configuration
The Next.js app includes a proxy route at `/api/python/proxy` that forwards requests:
```typescript
// Requests to /api/python/proxy are forwarded to http://localhost:8000
// Example: /api/python/proxy/analyze → http://localhost:8000/analyze
```

## Production Deployment Strategies

### 1. Traditional Server Deployment

Deploy both services on the same or different servers:

```bash
# Using PM2 for process management
pm2 start npm --name "nextjs-app" -- start
pm2 start python-backend/start.sh --name "python-backend"

# Using systemd (create service files)
sudo systemctl start space-weather-web
sudo systemctl start space-weather-python
```

### 2. Docker Deployment

Create separate containers for each service:

```dockerfile
# Next.js Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY .next ./.next
COPY public ./public
EXPOSE 3000
CMD ["npm", "start"]
```

```dockerfile
# Python Dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY python-backend/requirements.txt .
RUN pip install -r requirements.txt
COPY python-backend .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 3. Cloud Platform Deployment

**Vercel (Next.js) + Cloud Run (Python):**
- Deploy Next.js to Vercel
- Deploy Python backend to Google Cloud Run, AWS Lambda, or Azure Functions
- Update environment variables to point to production Python backend URL

**Environment Variables for Production:**
```env
# .env.production
PYTHON_BACKEND_URL=https://your-python-backend.com
DATABASE_URL=postgresql://...
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

## Environment Configuration

### Required Environment Variables

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/space_weather

# API Keys (for full functionality)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_API_KEY=...
NASA_API_KEY=...

# JWT Configuration
JWT_SECRET=your-secret-key-min-32-chars
JWT_EXPIRY=24h
REFRESH_TOKEN_EXPIRY=7d

# Python Backend
PYTHON_BACKEND_URL=http://localhost:8000

# Optional Email Configuration
EMAIL_SERVER_HOST=smtp.gmail.com
EMAIL_SERVER_PORT=587
EMAIL_FROM=noreply@example.com
```

### Database Setup

Before starting the application:

```bash
# Run database migrations
npx prisma migrate deploy

# Generate Prisma client
npx prisma generate

# Optional: Seed with sample data
npx prisma db seed
```

## Health Checks and Monitoring

### Next.js Health Check
```bash
curl http://localhost:3000/api/health
```

### Python Backend Health Check
```bash
curl http://localhost:8000/health
```

### Data Quality Monitoring
```bash
curl http://localhost:3000/api/health/data-quality
```

## Performance Optimization

### Next.js Optimizations
- Static pages are pre-rendered at build time
- API routes use caching headers for frequently accessed data
- Images are optimized automatically by Next.js

### Python Backend Optimizations
- Use Redis for caching (if configured)
- Enable connection pooling for database
- Run with multiple workers: `uvicorn main:app --workers 4`

## Troubleshooting

### Common Issues

1. **Python backend not accessible:**
   - Check if Python process is running: `ps aux | grep python`
   - Verify port 8000 is not blocked by firewall
   - Check Python logs: `cd python-backend && tail -f logs/app.log`

2. **Database connection errors:**
   - Verify DATABASE_URL is correct
   - Ensure PostgreSQL is running
   - Check database permissions

3. **Build failures:**
   - Clear cache: `rm -rf .next node_modules && npm install`
   - Check TypeScript errors: `npx tsc --noEmit`
   - Review build logs for specific errors

### Logging

- Next.js logs: Check console output or configure logging service
- Python logs: Located in `python-backend/logs/`
- Database queries: Enable Prisma logging in development

## Security Considerations

1. **Production Checklist:**
   - [ ] Set strong JWT_SECRET (minimum 32 characters)
   - [ ] Configure CORS properly for your domain
   - [ ] Enable rate limiting on API routes
   - [ ] Use HTTPS in production
   - [ ] Sanitize all user inputs
   - [ ] Keep dependencies updated

2. **API Security:**
   - JWT authentication is required for protected routes
   - Rate limiting is applied per endpoint
   - Input validation using Zod schemas

3. **Environment Variables:**
   - Never commit `.env` files to version control
   - Use secret management services in production
   - Rotate API keys regularly

## Backup and Recovery

### Database Backup
```bash
# Backup database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql

# Restore database
psql $DATABASE_URL < backup_20240101.sql
```

### Application State
- Reports are stored in the database with versioning
- User sessions are JWT-based (stateless)
- Cache can be cleared without data loss

## Scaling Considerations

### Horizontal Scaling
- Next.js: Can run multiple instances behind a load balancer
- Python: Can run multiple workers or instances
- Database: Consider read replicas for heavy read loads

### Vertical Scaling
- Increase memory for data-intensive operations
- More CPU cores for parallel Python processing
- SSD storage for faster database queries

## Maintenance Mode

To put the app in maintenance mode:

1. Create a maintenance page
2. Configure your load balancer or reverse proxy to serve it
3. Or use Next.js middleware to redirect all requests

Example middleware:
```typescript
// src/middleware.ts
export function middleware(request: NextRequest) {
  if (process.env.MAINTENANCE_MODE === 'true') {
    return NextResponse.rewrite(new URL('/maintenance', request.url))
  }
}
```

## Useful Commands Summary

```bash
# Development
npm run dev              # Next.js dev mode with Turbopack
npm run python:dev       # Python backend
npm run dev:all          # Both concurrently

# Production
npm run build            # Build Next.js for production
npm start                # Start Next.js production server
npm run python:dev       # Start Python backend

# Database
npx prisma migrate dev   # Run migrations (dev)
npx prisma migrate deploy # Run migrations (production)
npx prisma studio        # Open database GUI

# Maintenance
npm run lint             # Run ESLint
npx tsc --noEmit        # Type checking
```

## Support and Documentation

- Main documentation: `/docs/README.md`
- API documentation: `/docs/API.md`
- Security audit: `/docs/SECURITY-AUDIT-2025.md`
- Architecture details: `/CLAUDE.md`

For issues or questions, refer to the project repository or documentation.