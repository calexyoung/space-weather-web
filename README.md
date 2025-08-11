# Space Weather Platform - Complete Implementation

A comprehensive, AI-powered space weather monitoring and reporting platform built with Next.js. This enterprise-grade application transforms raw space weather data from multiple sources into actionable intelligence through real-time monitoring, AI-powered analysis, professional report generation, and advanced event tracking capabilities.

## 🌟 Features

### Real-time Monitoring Dashboard
- **Live Space Weather Widgets**: Kp index, solar wind parameters, X-ray flux, aurora forecasts
- **Data Source Health Monitoring**: NOAA SWPC, UK Met Office, HELIO network status
- **Interactive Visualizations**: Sparkline charts, trend indicators, status badges
- **Responsive Design**: NASA-inspired interface optimized for desktop and mobile

### Timeline Viewer (KNMI-Style)
- **Multi-Parameter Visualization**: X-ray flux, proton flux, magnetic field, solar wind, Kp index
- **Real-time Data Streaming**: Live updates from GOES satellites and L1 monitoring stations
- **Time Range Selection**: 6h, 12h, 24h, 3d, 7d viewing periods
- **Solar Activity Classification**: Automatic flare class detection (C, M, X-class events)
- **Professional Charts**: Color-coded parameters with scientific accuracy

### Advanced Event Tracking System
- **NASA DONKI Integration**: Complete database of space weather events
- **Event Chain Analysis**: Automatic linking of related events (FLR→CME→SEP→IPS→GST)
- **Multi-Event Types**: Solar flares, CMEs, SEP events, interplanetary shocks, geomagnetic storms
- **Intelligent Event Correlation**: Timeline-based relationship detection
- **PEARS Report Generation**: Post Event Analysis Reports with professional formatting

### AI-Powered Report Generation
- **Multi-Provider LLM Support**: OpenAI GPT-4, Anthropic Claude, Google Gemini
- **Interactive Chat Interface**: Refine reports through natural language conversation
- **Function Calling**: AI can fetch data, compose reports, and execute operations
- **Template System**: Professional templates for different audiences (Technical, Executive, Public, Alert)

### Enterprise Data Management
- **Advanced Search**: Full-text search across reports with relevance scoring
- **Version Control**: Track changes, compare versions, restore previous states
- **Bulk Operations**: Process multiple reports efficiently
- **Multi-format Export**: Markdown, HTML, JSON with styled outputs
- **Analytics Dashboard**: Usage statistics, performance metrics, trend analysis

### Production-Ready Architecture
- **Type-Safe**: Full TypeScript coverage with runtime validation
- **Database**: PostgreSQL with comprehensive Prisma schema
- **Error Handling**: Graceful degradation with comprehensive error boundaries
- **Performance**: Optimized queries, caching, real-time updates
- **Security**: Input validation, sanitization, authentication-ready

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- PostgreSQL database
- API keys for LLM providers (OpenAI, Anthropic, Google)

### Installation

1. **Clone and install dependencies**:
```bash
git clone <repository-url>
cd space-weather-web
npm install
```

2. **Configure environment variables**:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/space_weather"

# LLM Provider API Keys
OPENAI_API_KEY="your-openai-key"
ANTHROPIC_API_KEY="your-anthropic-key" 
GOOGLE_API_KEY="your-google-key"
DEFAULT_LLM_PROVIDER="openai"

# Application Settings
REPORTS_DIR="./data/reports"
NODE_ENV="development"

# Email Configuration (optional)
EMAIL_SENDER="your-email@domain.com"
EMAIL_PASSWORD="your-app-password"
EMAIL_RECEIVER="alerts@domain.com"
SMTP_SERVER="smtp.gmail.com"
SMTP_PORT="587"
```

3. **Set up the database**:
```bash
npx prisma migrate dev
npx prisma generate
```

4. **Start the development server**:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to access the dashboard.

## ✨ Key Features Added

### Enhanced Navigation & User Experience
- **Global Navigation Bar**: Seamless navigation between Dashboard, Timeline, and Events
- **Responsive Design**: Optimized for desktop and mobile viewing
- **Improved Error Handling**: Better user feedback with detailed error messages
- **Demo Mode**: Chat interface works even without API keys configured

### Timeline Visualization (KNMI-Inspired)
- **Real-time Space Weather Charts**: X-ray flux with automatic flare class detection
- **Multi-Parameter Display**: Proton flux, magnetic field, solar wind parameters
- **Interactive Time Ranges**: 6h to 7d viewing periods with live data updates
- **Professional Visualization**: Color-coded parameters matching scientific standards

### Advanced Event Management
- **Complete Event Database**: NASA DONKI integration with all event types
- **Intelligent Event Chains**: Automatic linking of related space weather events
- **PEARS Report Generation**: Professional Post Event Analysis Reports
- **Event Impact Assessment**: Technology impacts and space weather effects
- **Search & Filter**: Advanced event filtering and timeline analysis

### Technical Improvements  
- **Centralized API Mapping**: Unified source endpoint management
- **Enhanced Chat System**: Streaming responses with configuration validation
- **Better Error Recovery**: Graceful degradation and informative error messages
- **Source Mapping Utility**: Reusable URL mapping for data source APIs

## 📊 Architecture Overview

### Technology Stack
- **Frontend**: Next.js 15.4.6, React 19, TypeScript
- **Styling**: Tailwind CSS with NASA design system
- **UI Components**: shadcn/ui with custom themes
- **Database**: PostgreSQL with Prisma ORM
- **LLM Integration**: Multi-provider with function calling
- **Templates**: Handlebars with 25+ custom helpers
- **Real-time**: Server-Sent Events for live updates

### Project Structure
```
src/
├── app/
│   ├── dashboard/              # Main dashboard interface
│   ├── timeline/               # KNMI-style parameter visualization
│   ├── events/                 # NASA DONKI event tracking & PEARS
│   └── api/                    # API endpoints (20+ routes)
│       ├── chat/               # LLM chat with demo mode fallback
│       │   └── status/         # API configuration validation
│       ├── reports/            # Report management
│       │   └── event-chain/    # PEARS report generation
│       ├── sources/            # Data source APIs (noaa, ukmo, helio)
│       ├── donki/              # NASA DONKI event database
│       │   └── events/         # Space weather events API
│       ├── templates/          # Template management
│       └── data/               # Real-time data endpoints
├── components/
│   ├── dashboard/              # Dashboard tabs and layouts
│   ├── widgets/                # Real-time monitoring widgets
│   ├── navigation.tsx          # Global navigation component
│   └── ui/                     # Reusable UI components (Radix UI)
└── lib/
    ├── sources/                # Data source adapters
    ├── llm/                    # AI provider integrations
    ├── templates/              # Template engine
    ├── widgets/                # Widget framework
    ├── reports/                # Report management
    ├── exports/                # Export functionality
    └── utils/
        └── source-mapping.ts   # API endpoint mapping utility
```

## 🎯 Usage Guide

### Application Navigation
1. **Dashboard**: Main control center with 4 comprehensive tabs:
   - **Current Status**: Real-time space weather monitoring with live widgets
   - **Data Sources**: Monitor health and performance of data sources  
   - **Report Generator**: Create AI-powered reports with chat interface
   - **Reports History**: Manage, search, and export generated reports

2. **Timeline**: KNMI-style space weather parameter visualization
   - Real-time X-ray flux monitoring with flare class indicators
   - Proton flux measurements across multiple energy levels
   - Kp index geomagnetic activity display
   - Interactive time range selection and parameter filtering

3. **Events**: Advanced space weather event tracking and analysis
   - Complete NASA DONKI event database integration
   - Event chain analysis with automatic linking
   - Tabbed interface: All Events, Event Chains, Solar Flares, CMEs
   - PEARS report generation for event sequences
   - Professional event impact assessment

### Generating Reports
1. Select data sources and validate availability
2. Choose LLM provider and configuration options
3. Enter custom instructions or select a template
4. Generate report with live progress tracking
5. Refine through interactive chat interface
6. Export in multiple formats (Markdown, HTML, JSON)

### Real-time Monitoring
- **Auto-refresh**: Widgets update every 30 seconds to 5 minutes
- **Status Indicators**: Color-coded alerts for space weather events
- **Interactive Charts**: Click widgets for detailed views
- **Export Data**: Download widget data as CSV

### API Usage
All functionality is accessible via REST APIs:

```bash
# Fetch latest space weather data
GET /api/sources/all

# Get specific data parameters for timeline view
GET /api/data/xray-flux
GET /api/data/solar-wind  
GET /api/data/kp-index
GET /api/data/satellite-environment

# Fetch NASA DONKI events
GET /api/donki/events?dateRange=7d

# Generate a new report
POST /api/reports/generate
{
  "sources": ["NOAA_SWPC", "UK_MET_OFFICE"],
  "customInstructions": "Focus on satellite impacts",
  "template": "technical"
}

# Generate PEARS event chain report
POST /api/reports/event-chain
{
  "eventChain": {...},
  "analyst": "Space Weather Dashboard", 
  "format": "markdown"
}

# Chat with AI assistant (with demo mode fallback)
POST /api/chat
{
  "message": "Summarize the current geomagnetic conditions",
  "streaming": true,
  "context": { "reportId": "report-123" }
}

# Check chat service configuration
GET /api/chat/status

# Export report
GET /api/reports/report-123/export?format=html
```

## 🔧 Configuration

### LLM Providers
Configure multiple LLM providers in your environment:
- **OpenAI**: GPT-4 for comprehensive analysis
- **Anthropic**: Claude for detailed technical reports
- **Google**: Gemini for fast processing

### Data Sources
The platform integrates with multiple authoritative space weather data sources:

**Real-time Data Providers:**
- **NOAA SWPC**: Space weather discussions, forecasts, GOES satellite data
- **UK Met Office**: European space weather perspective and forecasting
- **HELIO Network**: Solar activity monitoring and flare detection

**Event Databases:**
- **NASA CCMC DONKI**: Comprehensive database of space weather events
  - Solar flares (FLR), Coronal Mass Ejections (CME)
  - Solar Energetic Particle events (SEP), Interplanetary Shocks (IPS)
  - Geomagnetic Storms (GST), Magnetopause Crossings (MPC)
  - Radio Blackouts (RBE) and event linkage analysis

**Satellite Data Sources:**
- **GOES-16/18**: X-ray flux, proton flux, magnetometer data
- **ACE/DSCOVR**: Solar wind parameters at L1 Lagrange point
- **Ground-based**: Kp index from global magnetometer networks

### Templates
Built-in templates for different use cases:
- **Standard**: General space weather reports
- **Technical**: Detailed analysis for specialists
- **Executive**: High-level summaries for decision makers
- **Alert**: Emergency notifications for significant events
- **PEARS**: Post Event Analysis Reports for space weather event chains
- **Custom**: User-defined templates with variables

## 🚢 Deployment

### Production Build
```bash
npm run build
npm start
```

### Environment Setup
1. Configure production database
2. Set up LLM provider accounts
3. Configure SMTP for notifications
4. Set up monitoring and logging

### Docker Deployment (Optional)
```dockerfile

FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🧪 Development

### Testing
```bash
npm run test          # Run unit tests
npm run test:e2e      # Run end-to-end tests
npm run lint          # Code linting
npm run type-check    # TypeScript validation
```

### Database Management
```bash
npx prisma studio           # Open database GUI
npx prisma migrate reset    # Reset database
npx prisma db seed          # Seed with sample data
```

### API Documentation
API routes are self-documenting with OpenAPI schemas. Access documentation at `/api/docs` (when implemented).

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **NOAA Space Weather Prediction Center** for data sources
- **UK Met Office** for space weather forecasts
- **HELIO Network** for solar activity data
- **NASA** for design inspiration and color schemes
- **OpenAI, Anthropic, Google** for LLM capabilities

## 📞 Support

For support, feature requests, or bug reports:
- Create an issue in the repository
- Email: support@spaceweather-platform.com
- Documentation: [docs.spaceweather-platform.com](https://docs.spaceweather-platform.com)

---

**🚀 Space Weather Platform** - Transforming space weather data into actionable intelligence through AI-powered analysis and professional reporting.