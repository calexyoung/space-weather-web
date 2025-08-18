# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a comprehensive space weather monitoring and reporting platform built with Next.js that integrates real-time space weather data from multiple authoritative sources (NOAA SWPC, UK Met Office, HELIO, NASA DONKI) and provides AI-powered analysis, report generation, and professional visualization capabilities.

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

### Testing & Validation
Since there are no test scripts configured, use:
```bash
# Type checking (TypeScript validation)
npx tsc --noEmit

# Lint checking
npm run lint
```

## Architecture Overview

### Technology Stack
- **Framework**: Next.js 15.4.6 with React 19 and TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **UI**: Tailwind CSS with shadcn/ui components (Radix UI based)
- **AI Integration**: Multi-provider LLM support (OpenAI, Anthropic, Google)
- **Data Visualization**: D3.js for timeline charts, Recharts for widgets
- **Templates**: Handlebars for report generation

### Key Architectural Patterns

1. **API Routes Structure**: All API endpoints follow REST patterns under `/api/`:
   - Data fetching endpoints return standardized responses via `createApiResponse()`
   - Error handling uses `createApiError()` with typed error codes
   - Streaming support for real-time data and chat responses

2. **Data Source Abstraction**: 
   - Each source (NOAA, UKMO, HELIO) has its own scraper module
   - `aggregator.ts` provides unified interface for parallel fetching
   - `source-mapping.ts` utility centralizes API endpoint management

3. **LLM Service Layer**:
   - Provider abstraction allows switching between OpenAI/Anthropic/Google
   - Function calling support for AI agents to fetch data
   - Fallback demo mode when API keys not configured

4. **Widget Framework**:
   - Base widget class for consistent behavior
   - Auto-refresh with configurable intervals
   - Data fetching abstraction layer

5. **Report Generation Pipeline**:
   - Template-based generation with Handlebars
   - Version control and soft delete support
   - Multi-format export (Markdown, HTML, JSON)

## Critical Implementation Details

### Environment Configuration
The application requires these environment variables:
- `DATABASE_URL`: PostgreSQL connection string
- LLM API keys: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `GOOGLE_API_KEY`
- `DEFAULT_LLM_PROVIDER`: Default AI provider selection
- Optional: Email configuration for notifications

### Data Flow
1. **Real-time Data**: External APIs → Scrapers → Normalizers → Database → API Routes → UI Components
2. **Report Generation**: Data Sources → LLM Service → Template Engine → Database → Export Service
3. **Event Tracking**: NASA DONKI API → Event Parser → Event Chain Analyzer → PEARS Report Generator

### State Management
- No global state management library - relies on React hooks and server state
- Real-time updates use Server-Sent Events (SSE) for streaming
- Widget state managed locally with auto-refresh mechanisms

### Database Schema
- `SpaceWeatherReport`: Main report storage with versioning
- `NormalizedReport`: Standardized data from various sources
- `ChatConversation` & `ChatMessage`: Chat history tracking
- `FetchLog`: Source monitoring and health tracking
- Extensive indexing for search and performance

### Security Considerations
- Input validation using Zod schemas throughout
- API routes validate request bodies before processing
- Database queries use Prisma's query builder (SQL injection protection)
- Environment variables for sensitive configuration

## Common Development Tasks

### Adding a New Data Source
1. Create scraper module in `src/lib/sources/`
2. Implement normalization function following `NormalizedReport` interface
3. Add to aggregator in `src/lib/sources/aggregator.ts`
4. Create API route in `src/app/api/sources/`
5. Add to source selector UI component

### Creating New Widgets
1. Extend `WidgetBase` class in `src/lib/widgets/`
2. Implement data fetching in `src/lib/widgets/data-fetcher.ts`
3. Create widget component in `src/components/widgets/`
4. Register in widget manager

### Adding Report Templates
1. Create template file in `src/lib/templates/defaults/`
2. Register in template service
3. Add template schema if needed
4. Update template selector UI

### Implementing New API Endpoints
1. Create route handler in appropriate `/api/` directory
2. Define request/response schemas with Zod
3. Use `createApiResponse()` and `createApiError()` utilities
4. Add proper error handling and logging

## Performance Optimization Points
- Database queries use proper indexing (see schema)
- Parallel data fetching in aggregator
- SSE for streaming responses (chat and real-time data)
- Component-level code splitting via Next.js dynamic imports
- Turbopack enabled for faster development builds

## Known Integration Points
- NOAA SWPC API for space weather discussions and forecasts
- UK Met Office Space Weather API
- HELIO Network for solar activity monitoring
- NASA CCMC DONKI for comprehensive event database
- GOES satellite data for X-ray and proton flux
- ACE/DSCOVR for solar wind parameters

## Deployment Considerations
- Ensure PostgreSQL database is properly configured
- Set all required environment variables
- Run database migrations before starting
- Configure proper CORS headers for API access
- Monitor fetch logs for data source health