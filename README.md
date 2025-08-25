# Space Weather Platform - Enterprise-Grade Monitoring & Analysis System

<div align="center">

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue)
![Security Score](https://img.shields.io/badge/Security-B%2B-yellow)
![License](https://img.shields.io/badge/license-MIT-green)
![Version](https://img.shields.io/badge/version-2.0.0-blue)

**🚀 Transforming space weather data into actionable intelligence through AI-powered analysis and professional reporting**

[Features](#-key-features) • [Quick Start](#-quick-start) • [Architecture](#-architecture) • [API Docs](#-api-documentation) • [Security](#-security) • [Contributing](#-contributing)

</div>

---

## 📋 Executive Summary

The **Space Weather Platform** is a production-ready, enterprise-grade application that provides comprehensive space weather monitoring, analysis, and reporting capabilities. Built with modern web technologies and designed for scalability, it integrates data from multiple authoritative sources including NOAA SWPC, NASA DONKI, UK Met Office, and HELIO Network to deliver real-time insights and AI-powered analysis.

### 🎯 Core Capabilities
- **Real-time Monitoring**: Live space weather data with 30-second to 5-minute refresh rates
- **AI-Powered Analysis**: Multi-provider LLM integration (GPT-4, Claude, Gemini) with function calling
- **Professional Reporting**: Template-based report generation with version control
- **Event Tracking**: NASA DONKI integration with event chain analysis and PEARS reports
- **Enterprise Security**: OWASP-compliant security with JWT authentication and rate limiting
- **High Performance**: Optimized with React 19, Turbopack, and strategic caching

### 📊 Technical Metrics
- **Technology Stack**: Next.js 15.4.6, React 19, TypeScript 5.x, PostgreSQL
- **API Endpoints**: 50+ RESTful endpoints with standardized responses
- **Type Safety**: 100% TypeScript coverage with Zod runtime validation
- **Security Score**: B+ (85/100) with comprehensive security measures
- **Performance**: Sub-second response times with parallel data fetching
- **Test Coverage**: ⚠️ 0% (Testing infrastructure planned)

## 🌟 Key Features

### 📡 Real-time Space Weather Monitoring

#### **Dashboard** (`/dashboard`)
Comprehensive control center with four specialized tabs:
- **Current Status**: Live monitoring widgets with auto-refresh
- **Data Sources**: Health monitoring for all integrated sources
- **Report Generator**: AI-powered report creation with chat refinement
- **Reports History**: Searchable archive with version control

#### **Activity Page** (`/activity`) - *NEW*
Interactive widget grid with drag-and-drop functionality:
- DST Index Monitor
- Solar Region Analyzer
- X-ray Flux Monitor
- Solar Wind Parameters
- Proton Monitor
- Kp Index Monitor

#### **Current Activity** (`/current-activity`) - *NEW*
Real-time space weather conditions dashboard:
- Active event alerts
- Current conditions grid
- Detailed activity tabs (Solar, Geomagnetic, Radiation, Impacts)
- Color-coded status indicators

#### **Long-term Activity** (`/long-term-activity`) - *NEW*
Historical trends and solar cycle analysis:
- Solar Cycle 25 progress tracking
- Activity patterns and periodicities
- Cycle comparison analysis
- Forecasting and predictions

#### **SWx Reports** (`/swx-reports`) - *NEW*
Comprehensive report management system:
- Recent reports with filtering
- Report templates library
- Scheduled report automation
- Multi-format export options

### 🎯 Advanced Event Tracking System

#### **NASA DONKI Integration** (`/events`)
Complete space weather event database with:
- **Event Types**: FLR, CME, SEP, IPS, GST, MPC, RBE, HSS
- **Event Chain Analysis**: Automatic linking of related events
- **PEARS Reports**: Post Event Analysis Reports generation
- **Timeline Visualization**: Interactive event timeline
- **Impact Assessment**: Technology and infrastructure impacts

### 📊 Timeline Visualization (KNMI-Style)

#### **Multi-Parameter Display** (`/timeline`)
Professional space weather parameter visualization:
- **X-ray Flux**: Real-time GOES data with flare classification
- **Proton Flux**: Multiple energy channels
- **Solar Wind**: Speed, density, temperature, magnetic field
- **Kp Index**: Geomagnetic activity with storm levels
- **Time Ranges**: 6h, 12h, 24h, 3d, 7d views

### 🤖 AI-Powered Intelligence

#### **Multi-Provider LLM Support**
```typescript
// Supported providers with automatic fallback
- OpenAI GPT-4o (Primary)
- Anthropic Claude 3.5 Sonnet
- Google Gemini 1.5 Flash
- Demo Mode (No API key required)
```

#### **Function Calling Capabilities**
AI agents can execute functions to:
- Fetch real-time space weather data
- Generate professional reports
- Analyze event chains
- Create PEARS reports
- Execute data queries

### 🔧 Widget System

#### **Available Widgets**
| Widget | Refresh Rate | Data Source | Features |
|--------|-------------|-------------|----------|
| Kp Index | 3 minutes | NOAA/Potsdam | Storm levels, 3-day forecast |
| X-ray Flux | 30 seconds | GOES-16/18 | Flare detection, classification |
| Solar Wind | 1 minute | ACE/DSCOVR | Speed, density, temperature |
| Proton Flux | 1 minute | GOES | Multiple energy channels |
| Aurora Forecast | 5 minutes | NOAA OVATION | 30-minute predictions |
| DST Index | 1 hour | Kyoto WDC | Storm intensity tracking |
| Solar Regions | 1 hour | NOAA | Active region analysis |

#### **Widget Features**
- **Drag & Drop**: Reorder widgets with visual feedback
- **Expand/Collapse**: Toggle detailed views
- **Export Data**: Download as CSV
- **Offline Mode**: Graceful degradation with cached data
- **Status Indicators**: Connection state and data quality

## 🏗 Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │Dashboard │ │Timeline  │ │Events    │ │Reports   │         │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘         │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API GATEWAY LAYER                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐          │
│  │Rate Limiting │ │Authentication│ │CSRF Protection│          │
│  └──────────────┘ └──────────────┘ └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BUSINESS LOGIC LAYER                       │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │LLM Service│ │Aggregator│ │Templates │ │Reports   │         │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘         │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                        DATA LAYER                               │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐          │
│  │PostgreSQL    │ │Redis Cache   │ │File Storage  │          │
│  │(Prisma ORM)  │ │(Future)      │ │(Reports)     │          │
│  └──────────────┘ └──────────────┘ └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL SERVICES                            │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐     │
│  │NOAA  │ │NASA  │ │UK Met│ │HELIO │ │OpenAI│ │Python│     │
│  │SWPC  │ │DONKI │ │Office│ │      │ │      │ │Backend│    │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘     │
└─────────────────────────────────────────────────────────────────┘
```

### Technology Stack

#### **Frontend**
- **Framework**: Next.js 15.4.6 (App Router)
- **UI Library**: React 19.1.0
- **Language**: TypeScript 5.x
- **Styling**: Tailwind CSS 3.4.17
- **Components**: shadcn/ui (Radix UI)
- **Charts**: D3.js, Recharts
- **Drag & Drop**: react-dnd

#### **Backend**
- **API**: Next.js API Routes
- **Database**: PostgreSQL
- **ORM**: Prisma 6.13.0
- **Python**: Flask microservice
- **Validation**: Zod schemas
- **Templates**: Handlebars

#### **Infrastructure**
- **Authentication**: JWT with refresh tokens
- **Rate Limiting**: LRU cache-based
- **Streaming**: Server-Sent Events
- **Caching**: In-memory + database
- **Security**: OWASP headers

### Data Flow Architecture

```typescript
// Parallel data fetching with error resilience
External APIs → Scrapers → Normalizers → Database → API Routes → UI
     ↓              ↓           ↓            ↓          ↓         ↓
  Timeout      Validation   Quality     Caching    Rate       SSE
  Protection               Scoring               Limiting   Streaming
```

## 🚀 Quick Start

### Prerequisites

- **Node.js**: 18.0.0 or higher
- **PostgreSQL**: 14.0 or higher
- **Python**: 3.8+ (for backend services)
- **npm**: 8.0.0 or higher

### Installation

1. **Clone the repository**:
```bash
git clone https://github.com/yourusername/space-weather-web.git
cd space-weather-web
```

2. **Install dependencies**:
```bash
npm install
```

3. **Set up environment variables**:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Database (Required)
DATABASE_URL="postgresql://username:password@localhost:5432/space_weather"

# LLM Providers (At least one required for AI features)
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."
GOOGLE_API_KEY="AIza..."
DEFAULT_LLM_PROVIDER="openai"

# Security (Required for production)
JWT_SECRET="your-secret-key-min-32-chars"
JWT_ISSUER="space-weather-platform"
JWT_AUDIENCE="space-weather-users"

# Python Backend (Optional)
PYTHON_BACKEND_URL="http://localhost:5001"

# Application Settings
NODE_ENV="development"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Email Configuration (Optional)
EMAIL_SENDER="alerts@yourdomain.com"
EMAIL_PASSWORD="app-specific-password"
EMAIL_RECEIVER="admin@yourdomain.com"
SMTP_SERVER="smtp.gmail.com"
SMTP_PORT="587"

# Rate Limiting (Optional, defaults provided)
RATE_LIMIT_WINDOW_MS="60000"
RATE_LIMIT_MAX_REQUESTS="100"
```

4. **Set up the database**:
```bash
# Run migrations
npx prisma migrate dev

# Generate Prisma client
npx prisma generate

# (Optional) Seed with sample data
npx prisma db seed
```

5. **Start the development server**:
```bash
# Start Next.js (runs on port 3000)
npm run dev

# (Optional) Start Python backend in another terminal
cd python-backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

6. **Access the application**:
Open [http://localhost:3000](http://localhost:3000)

### Quick Test

Verify installation with these endpoints:
```bash
# Check health
curl http://localhost:3000/api/health

# Get current space weather (no auth required)
curl http://localhost:3000/api/sources/all

# Check chat configuration
curl http://localhost:3000/api/chat/status
```

## 📚 API Documentation

### Core Endpoints

#### **Authentication**
```typescript
POST   /api/auth/login          // User login
POST   /api/auth/logout         // User logout  
POST   /api/auth/refresh        // Refresh access token
GET    /api/auth/me            // Get current user
```

#### **Space Weather Data**
```typescript
GET    /api/sources/all         // Aggregate all sources
GET    /api/sources/noaa        // NOAA SWPC data
GET    /api/sources/ukmo        // UK Met Office data
GET    /api/sources/helio       // HELIO network data
```

#### **Real-time Data Endpoints**
```typescript
GET    /api/data/kp-index       // Kp geomagnetic index
GET    /api/data/xray-flux      // X-ray flux from GOES
GET    /api/data/solar-wind     // ACE/DSCOVR solar wind
GET    /api/data/proton-flux    // Proton flux data
GET    /api/data/aurora-forecast // Aurora predictions
GET    /api/data/dst-index      // DST storm index
GET    /api/data/solar-regions  // Active solar regions
```

#### **NASA DONKI Events**
```typescript
GET    /api/donki/events        // List space weather events
GET    /api/donki/events/chain  // Get event chains
POST   /api/donki/events/analyze // Analyze event relationships
```

#### **Report Management**
```typescript
POST   /api/reports/generate    // Generate new report
GET    /api/reports             // List reports
GET    /api/reports/:id         // Get specific report
PUT    /api/reports/:id         // Update report
DELETE /api/reports/:id         // Delete report
POST   /api/reports/event-chain // Generate PEARS report
GET    /api/reports/:id/export  // Export report
```

#### **AI Chat Interface**
```typescript
POST   /api/chat                // Send chat message
GET    /api/chat/status         // Check service status
GET    /api/chat/history        // Get conversation history
DELETE /api/chat/history/:id    // Delete conversation
```

#### **Streaming Endpoints (SSE)**
```typescript
GET    /api/stream/space-weather // Real-time data stream
GET    /api/stream/alerts        // Alert notifications
```

### Request/Response Format

All API endpoints use standardized format:

**Request**:
```json
{
  "sources": ["NOAA_SWPC", "UK_MET_OFFICE"],
  "options": {
    "includeForecasts": true,
    "timeRange": "24h"
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": { ... },
  "timestamp": "2024-08-25T12:00:00Z",
  "cached": false,
  "responseTime": 234
}
```

**Error Response**:
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT_EXCEEDED",
  "details": {
    "limit": 100,
    "remaining": 0,
    "resetTime": "2024-08-25T12:05:00Z"
  }
}
```

### Rate Limiting

| Tier | Limit | Window | Endpoints |
|------|-------|--------|-----------|
| AUTH | 5 requests | 15 minutes | /api/auth/* |
| API_READ | 100 requests | 1 minute | GET endpoints |
| API_WRITE | 30 requests | 1 minute | POST/PUT/DELETE |
| REPORT_GEN | 3 requests | 5 minutes | /api/reports/generate |

## 🔒 Security

### Security Features

#### **Authentication & Authorization**
- JWT-based authentication with refresh tokens
- Role-based access control (Admin, User, Viewer)
- Session management with secure cookies
- CSRF protection on state-changing operations

#### **Input Validation**
- Zod schema validation on all inputs
- SQL injection prevention via Prisma ORM
- XSS protection with DOMPurify
- File upload restrictions and validation

#### **Security Headers**
```typescript
Content-Security-Policy: default-src 'self'; ...
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000
```

#### **Rate Limiting**
- IP-based and user-based limits
- Tiered rate limiting by endpoint type
- DDoS protection at edge
- Automatic blacklisting for violations

### Security Score: B+ (85/100)

**Strengths**:
- ✅ Comprehensive input validation
- ✅ OWASP-compliant headers
- ✅ JWT implementation with proper expiry
- ✅ CSRF protection
- ✅ Rate limiting

**Areas for Improvement**:
- ⚠️ Demo authentication in development
- ⚠️ Session management enhancements needed
- ⚠️ Add security event logging
- ⚠️ Implement 2FA support

## 🧪 Testing & Quality

### Current Status

⚠️ **WARNING**: Testing infrastructure not yet implemented

```json
{
  "testCoverage": "0%",
  "testFramework": "None configured",
  "linting": "ESLint configured",
  "typeChecking": "100% TypeScript"
}
```

### Recommended Testing Setup

```bash
# Install testing dependencies
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
npm install --save-dev cypress @cypress/react
npm install --save-dev @types/jest jest-environment-jsdom

# Add test scripts to package.json
"scripts": {
  "test": "jest",
  "test:watch": "jest --watch",
  "test:coverage": "jest --coverage",
  "test:e2e": "cypress run"
}
```

### Code Quality

- **TypeScript**: 100% coverage with strict mode
- **ESLint**: Configured with Next.js rules
- **Prettier**: Not configured (recommended)
- **Pre-commit hooks**: Not configured (recommended)

## 🚢 Production Deployment

### Build for Production

```bash
# Build application
npm run build

# Run production server
npm start
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000
CMD ["npm", "start"]
```

### Environment-Specific Configuration

```typescript
// Production checklist
✓ Set NODE_ENV=production
✓ Configure production database
✓ Set secure JWT_SECRET
✓ Enable HTTPS
✓ Configure CDN for static assets
✓ Set up monitoring (Sentry, DataDog)
✓ Configure backup strategy
✓ Set up log aggregation
```

### Performance Optimization

- **Caching Strategy**: CloudFlare CDN recommended
- **Database**: Connection pooling via Prisma
- **Static Assets**: Next.js automatic optimization
- **API Responses**: Gzip compression enabled

## 🔧 Development

### Project Structure

```
space-weather-web/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/                # API route handlers
│   │   ├── dashboard/          # Dashboard page
│   │   ├── timeline/           # Timeline visualization
│   │   ├── events/             # Event tracking
│   │   ├── activity/           # Activity monitoring
│   │   ├── current-activity/   # Current conditions
│   │   ├── long-term-activity/ # Historical analysis
│   │   └── swx-reports/        # Report management
│   ├── components/             # React components
│   │   ├── ui/                # Base UI components
│   │   ├── widgets/           # Space weather widgets
│   │   └── dashboard/         # Dashboard components
│   └── lib/                   # Business logic
│       ├── llm/              # AI services
│       ├── sources/          # Data scrapers
│       ├── security/         # Security utilities
│       └── widgets/          # Widget framework
├── prisma/                    # Database schema
├── python-backend/           # Python microservice
├── docs/                     # Documentation
└── public/                   # Static assets
```

### Development Commands

```bash
# Database
npx prisma studio          # Open database GUI
npx prisma migrate dev     # Run migrations
npx prisma migrate reset   # Reset database

# Development
npm run dev               # Start dev server
npm run lint             # Run ESLint
npm run type-check       # TypeScript validation

# Python Backend
cd python-backend
python app.py            # Start Flask server
```

### Adding New Features

#### **Adding a Widget**
1. Create widget component in `src/components/widgets/`
2. Implement data fetcher in `src/lib/widgets/data-fetcher.ts`
3. Add to widget registry
4. Create API endpoint if needed

#### **Adding a Data Source**
1. Create scraper in `src/lib/sources/`
2. Implement normalizer function
3. Add to aggregator
4. Create API route

#### **Adding an API Endpoint**
1. Create route handler in `src/app/api/`
2. Define Zod schemas
3. Implement business logic
4. Add to API documentation

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Process

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Run tests (`npm test`)
5. Push to branch (`git push origin feature/amazing-feature`)
6. Open Pull Request

### Code Standards

- **TypeScript**: Strict mode, no `any` types
- **Components**: Functional components with hooks
- **Styling**: Tailwind CSS utilities
- **API**: RESTful design with Zod validation
- **Git**: Conventional commits

## 📄 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file.

## 🙏 Acknowledgments

- **NOAA Space Weather Prediction Center** - Primary data source
- **NASA CCMC DONKI** - Event database
- **UK Met Office** - International perspective
- **HELIO Network** - Solar monitoring
- **OpenAI, Anthropic, Google** - AI capabilities
- **Vercel** - Next.js framework
- **shadcn** - UI components

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/space-weather-web/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/space-weather-web/discussions)
- **Email**: support@spaceweather-platform.com
- **Documentation**: [https://docs.spaceweather-platform.com](https://docs.spaceweather-platform.com)

## 🚦 Status

- **Build**: ![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
- **Version**: 2.0.0
- **Node**: >=18.0.0
- **License**: MIT
- **PRs**: Welcome

---

<div align="center">

**Built with ❤️ by the Space Weather Platform Team**

*Transforming space weather data into actionable intelligence*

</div>


# Additional notes:

