# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a comprehensive space weather monitoring and reporting platform built with Next.js that integrates real-time space weather data from multiple authoritative sources (NOAA SWPC, UK Met Office, HELIO, NASA DONKI) and provides AI-powered analysis, report generation, professional visualization capabilities, and advanced security features.

## Recent Major Updates (2025)

### Security Enhancements
- **Authentication System**: JWT-based auth with access/refresh tokens
- **CSRF Protection**: Token-based CSRF protection for state-changing operations
- **Rate Limiting**: Multi-tier rate limiting for different API endpoints
- **API Key Management**: Secure API key validation and rotation system
- **Security Headers**: Comprehensive security headers (CSP, HSTS, etc.)
- **Input Sanitization**: XSS prevention and SQL injection protection

### Data Quality Framework
- **Data Validation**: Schema-based validation for all external data sources
- **Cache Management**: Intelligent caching with TTL and invalidation strategies
- **Health Monitoring**: Real-time data source health tracking and alerting
- **Data Fetcher**: Unified fetching with retry logic and error recovery

### New Features
- **Alert Engine**: Real-time space weather alert monitoring and notifications
- **Multi-Satellite View**: Comprehensive satellite data visualization
- **Solar Cycle Dashboard**: Long-term solar activity tracking
- **Enhanced Solar Wind Data**: Advanced solar wind parameters and predictions
- **Python Backend Integration**: Scientific computing capabilities via Python services

### New Pages
- `/widgets`: Widget showcase and testing interface
- `/activity`: Real-time space weather activity dashboard
- `/current-activity`: Current conditions monitoring
- `/long-term-activity`: Historical and trend analysis
- `/swx-reports`: Professional space weather reports

## Development Commands

### Core Development
```bash
# Start development server with Turbopack
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run ESLint
npm run lint

# Type checking
npx tsc --noEmit
```

### Database Management
```bash
# Run database migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# Open Prisma Studio GUI
npx prisma studio

# Reset database
npx prisma migrate reset

# Seed database with sample data
npx prisma db seed
```

### Python Backend
```bash
# Start Python backend server
cd python-backend
python app.py

# Install Python dependencies
pip install -r requirements.txt
```

### Testing & Validation
```bash
# Type checking (TypeScript validation)
npx tsc --noEmit

# Lint checking
npm run lint

# Security audit
npm audit

# Check for vulnerabilities
npm audit fix
```

## Architecture Overview

### Technology Stack
- **Framework**: Next.js 15.4.6 with React 19 and TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **UI**: Tailwind CSS with shadcn/ui components (Radix UI based)
- **AI Integration**: Multi-provider LLM support (OpenAI, Anthropic, Google)
- **Data Visualization**: D3.js for timeline charts, Recharts for widgets
- **Templates**: Handlebars for report generation
- **Security**: JWT authentication, CSRF protection, rate limiting
- **Python Backend**: Flask server for scientific computing and data analysis

### Key Architectural Patterns

1. **API Routes Structure**: All API endpoints follow REST patterns under `/api/`:
   - Data fetching endpoints return standardized responses via `createApiResponse()`
   - Error handling uses `createApiError()` with typed error codes
   - Streaming support for real-time data and chat responses
   - Rate limiting applied based on endpoint type

2. **Security Architecture**:
   - **Authentication**: JWT-based with access/refresh token pattern
   - **Authorization**: Role-based access control (admin, editor, viewer)
   - **CSRF Protection**: Double-submit cookie pattern
   - **Rate Limiting**: Token bucket algorithm with Redis/in-memory storage
   - **API Security**: API key validation with rotation support
   - **Headers**: Security headers applied via middleware

3. **Data Quality Layer**:
   - **Validation**: Zod schemas for all data sources
   - **Caching**: Multi-tier cache with TTL and invalidation
   - **Monitoring**: Health checks and availability tracking
   - **Recovery**: Automatic retry with exponential backoff

4. **Data Source Abstraction**: 
   - Each source (NOAA, UKMO, HELIO, DONKI) has its own scraper module
   - `aggregator.ts` provides unified interface for parallel fetching
   - `source-mapping.ts` utility centralizes API endpoint management
   - Data quality validation at ingestion point

5. **LLM Service Layer**:
   - Provider abstraction allows switching between OpenAI/Anthropic/Google
   - Function calling support for AI agents to fetch data
   - Fallback demo mode when API keys not configured
   - Token usage tracking and optimization

6. **Widget Framework**:
   - Base widget class for consistent behavior
   - Auto-refresh with configurable intervals
   - Data fetching abstraction layer
   - Error boundaries and fallback UI
   - Performance monitoring

7. **Report Generation Pipeline**:
   - Template-based generation with Handlebars
   - Version control and soft delete support
   - Multi-format export (Markdown, HTML, JSON)
   - AI-powered analysis and insights

## Critical Implementation Details

### Environment Configuration
Required environment variables:
```bash
# Database
DATABASE_URL="postgresql://..."

# Authentication
JWT_SECRET="your-secret-key"
JWT_REFRESH_SECRET="your-refresh-secret"

# LLM Providers
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."
GOOGLE_API_KEY="..."
DEFAULT_LLM_PROVIDER="openai|anthropic|google"

# Security
CSRF_SECRET="your-csrf-secret"
API_KEY_SECRET="your-api-key-secret"

# Python Backend
PYTHON_BACKEND_URL="http://localhost:5000"

# Optional
EMAIL_HOST="smtp.example.com"
EMAIL_PORT="587"
EMAIL_USER="user@example.com"
EMAIL_PASSWORD="..."
```

### Data Flow
1. **Real-time Data**: External APIs → Scrapers → Validators → Normalizers → Cache → Database → API Routes → UI Components
2. **Report Generation**: Data Sources → LLM Service → Template Engine → Database → Export Service
3. **Event Tracking**: NASA DONKI API → Event Parser → Event Chain Analyzer → PEARS Report Generator
4. **Alert System**: Data Sources → Alert Engine → Criteria Evaluation → Notification System → UI Updates

### State Management
- No global state management library - relies on React hooks and server state
- Real-time updates use Server-Sent Events (SSE) for streaming
- Widget state managed locally with auto-refresh mechanisms
- Authentication state managed via context providers

### Database Schema
Core tables:
- `SpaceWeatherReport`: Main report storage with versioning
- `NormalizedReport`: Standardized data from various sources
- `ChatConversation` & `ChatMessage`: Chat history tracking
- `FetchLog`: Source monitoring and health tracking
- `User` & `Session`: Authentication and session management
- `AlertCriteria` & `Alert`: Alert configuration and history
- Extensive indexing for search and performance

### Security Implementation

#### Authentication Flow
1. User login → Validate credentials → Generate JWT tokens
2. Access token (15min) for API requests
3. Refresh token (7 days) for token renewal
4. Token rotation on refresh
5. Blacklist support for revocation

#### Authorization Levels
- **Admin**: Full system access
- **Editor**: Create/edit reports and data
- **Viewer**: Read-only access

#### Rate Limiting Tiers
- `AUTH`: 5 requests/minute (login/register)
- `API_READ`: 100 requests/minute
- `API_WRITE`: 20 requests/minute
- `REPORT_GENERATION`: 5 requests/hour
- `PUBLIC`: 30 requests/minute
- `HEALTH`: 60 requests/minute

### Data Quality Standards

#### Validation Rules
- Schema validation for all external data
- Type checking with TypeScript
- Runtime validation with Zod
- Data range and boundary checks
- Timestamp validation and normalization

#### Cache Strategy
- L1: In-memory cache (5-15 min TTL)
- L2: Redis cache (1-24 hour TTL)
- L3: Database cache (persistent)
- Intelligent invalidation on updates

## Common Development Tasks

### Adding a New Data Source
1. Create scraper module in `src/lib/sources/`
2. Add validation schema in `src/lib/data-quality/validator.ts`
3. Implement normalization function following `NormalizedReport` interface
4. Add to aggregator in `src/lib/sources/aggregator.ts`
5. Create API route in `src/app/api/sources/`
6. Add health monitoring in `src/lib/data-quality/monitor.ts`
7. Update source selector UI component

### Creating New Widgets
1. Extend `WidgetBase` class in `src/lib/widgets/`
2. Implement data fetching in `src/lib/widgets/data-fetcher.ts`
3. Create widget component in `src/components/widgets/`
4. Add validation schema for widget data
5. Register in widget manager
6. Add to widgets showcase page

### Implementing Security Features
1. Add route to middleware configuration
2. Define authorization requirements
3. Implement rate limiting tier
4. Add CSRF protection if state-changing
5. Validate and sanitize inputs
6. Add security headers as needed

### Adding Report Templates
1. Create template file in `src/lib/templates/defaults/`
2. Register in template service
3. Add template schema with validation
4. Update template selector UI
5. Test with various data scenarios

### Implementing New API Endpoints
1. Create route handler in appropriate `/api/` directory
2. Define request/response schemas with Zod
3. Add authentication/authorization checks
4. Implement rate limiting
5. Use `createApiResponse()` and `createApiError()` utilities
6. Add proper error handling and logging
7. Document in OpenAPI spec if public

## Performance Optimization Points
- Database queries use proper indexing and connection pooling
- Parallel data fetching in aggregator with Promise.all
- SSE for streaming responses (chat and real-time data)
- Component-level code splitting via Next.js dynamic imports
- Turbopack enabled for faster development builds
- Intelligent caching to reduce external API calls
- Request deduplication for concurrent identical requests
- Lazy loading for heavy components

## Integration Points

### External Data Sources
- **NOAA SWPC**: Space weather discussions, forecasts, alerts
- **UK Met Office**: European space weather monitoring
- **HELIO Network**: Solar activity and heliophysics data
- **NASA DONKI**: Comprehensive space weather event database
- **GOES Satellites**: X-ray flux, proton flux, magnetometer data
- **ACE/DSCOVR**: Real-time solar wind parameters
- **SDO**: Solar imagery and active region tracking

### Python Backend Services
- Solar flare prediction models
- Satellite orbit calculations
- Advanced statistical analysis
- Machine learning pipelines
- Scientific data processing

## Monitoring & Observability

### Health Checks
- `/api/health`: Overall system health
- `/api/health/data-quality`: Data source status
- `/api/status`: Detailed component status

### Metrics Tracked
- API response times
- Data source availability
- Cache hit rates
- Error rates by endpoint
- User activity patterns
- Alert trigger frequency

### Logging
- Structured logging with context
- Error tracking with stack traces
- Performance monitoring
- Security event logging
- Data quality issues

## Deployment Considerations

### Pre-deployment Checklist
1. Set all required environment variables
2. Configure PostgreSQL with proper credentials
3. Run database migrations: `npx prisma migrate deploy`
4. Set up Redis for production rate limiting
5. Configure CORS for your domain
6. Set up SSL/TLS certificates
7. Configure firewall rules
8. Set up monitoring and alerting
9. Configure backup strategy
10. Test security headers

### Production Optimizations
- Enable production mode in Next.js
- Use CDN for static assets
- Configure proper caching headers
- Enable gzip/brotli compression
- Set up database connection pooling
- Configure rate limiting with Redis
- Enable APM (Application Performance Monitoring)
- Set up error tracking (e.g., Sentry)

### Scaling Considerations
- Horizontal scaling with load balancer
- Database read replicas for heavy queries
- Redis cluster for distributed caching
- Queue system for background jobs
- CDN for global content delivery
- Separate Python backend scaling

## Security Best Practices

### Code Security
- Never commit secrets or API keys
- Use environment variables for configuration
- Sanitize all user inputs
- Validate data at every boundary
- Use parameterized database queries
- Implement proper error handling
- Avoid exposing internal errors to users

### Infrastructure Security
- Keep dependencies updated
- Regular security audits
- Implement WAF (Web Application Firewall)
- Use secrets management service
- Enable audit logging
- Regular penetration testing
- Incident response plan

### Compliance
- GDPR compliance for EU users
- Data retention policies
- Privacy policy implementation
- Terms of service
- Cookie consent management
- Data encryption at rest and in transit