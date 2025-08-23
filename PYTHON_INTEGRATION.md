# Python Backend Integration for Space Weather Web

## Overview

This document describes the Python backend integration that provides advanced data gathering and analysis capabilities for the Space Weather monitoring platform. The Python backend runs alongside the Next.js application and offers scientific computing capabilities through specialized data collectors and analysis modules.

## Architecture

### System Components

```
┌─────────────────┐         ┌──────────────────┐         ┌─────────────────┐
│   Next.js App   │ ◄────► │  Proxy API Route │ ◄────► │  Python Backend │
│   (Port 3000)   │         │   /api/python/*  │         │   (Port 5000)   │
└─────────────────┘         └──────────────────┘         └─────────────────┘
                                                                  │
                                                                  ▼
                                                          ┌──────────────┐
                                                          │ NOAA SWPC    │
                                                          │ GOES/ACE     │
                                                          │ Solar Data   │
                                                          └──────────────┘
```

## Python Backend Components

### 1. Flask API Server (`python-backend/app.py`)
- RESTful API with CORS support
- Endpoints for solar analysis, satellite data, forecasting, and alerts
- Modular architecture for easy extension

### 2. Data Collectors

#### SpaceWeatherCollector (`data_collectors/space_weather_collector.py`)
- **Solar Wind Data**: Real-time ACE/DSCOVR measurements
- **Magnetometer Data**: GOES satellite magnetic field readings
- **Dst Index Calculation**: Estimated disturbance storm time index
- **Forecasting**: 3-day statistical forecast generation
- **Alert System**: Automated alert generation based on thresholds

#### SatelliteDataCollector (`data_collectors/satellite_data.py`)
- **GOES X-ray Flux**: Solar flare classification and monitoring
- **GOES Proton Flux**: Solar energetic particle detection
- **GOES Magnetometer**: Geosynchronous orbit magnetic field
- **ACE Data**: L1 solar wind and magnetic field parameters

#### SolarAnalyzer (`data_collectors/solar_analysis.py`)
- **Solar Indices**: F10.7, sunspot numbers, smoothed values
- **Sunspot Analysis**: Active region complexity and flare potential
- **Flare Activity**: 24-hour flare counts and classification
- **Image Analysis**: Solar image processing (requires OpenCV)
- **Solar Rotation**: Differential rotation calculations

## API Endpoints

### Health Check
```
GET /api/python/health
Response: { "status": "healthy", "service": "python-backend" }
```

### Solar Analysis
```
GET /api/python/solar-analysis
Response: {
  "solar_indices": { "f10.7": 120, "sunspot_number": 45 },
  "sunspot_analysis": { "total_regions": 3, "complex_regions": 1 },
  "flare_activity": { "counts_24h": {"C": 5, "M": 1, "X": 0} },
  "overall_assessment": { ... }
}
```

### Satellite Data
```
GET /api/python/satellite-data?type=goes
Response: {
  "xray": { "current_flux": 1e-7, "classification": "B-class" },
  "proton": { "sep_event_in_progress": false },
  "magnetometer": { "disturbance_level": "Quiet" }
}
```

### Space Weather Forecast
```
GET /api/python/space-weather/forecast?days=3
Response: {
  "forecast_period": "3 days",
  "current_conditions": { ... },
  "predictions": [
    { "date": "2025-08-22", "storm_probability": 0.15, "expected_kp": 3 }
  ]
}
```

### Alerts
```
GET /api/python/space-weather/alerts
Response: [
  {
    "level": "warning",
    "type": "solar_wind",
    "message": "High solar wind speed detected: 650 km/s"
  }
]
```

### Image Analysis
```
POST /api/python/analyze-image
Body: { "url": "image_url", "type": "solar" }
Response: {
  "brightness_analysis": { ... },
  "potential_features": ["Active regions detected"]
}
```

## Next.js Integration

### 1. TypeScript Client (`src/lib/python-backend/client.ts`)
- Fully typed API client
- Error handling and timeout management
- Configurable backend URL

### 2. Proxy Route (`src/app/api/python/proxy/route.ts`)
- Handles CORS and authentication
- Unified error handling
- Request/response validation

### 3. Python Analysis Widget (`src/components/widgets/python-analysis-widget.tsx`)
- Real-time display of Python-generated data
- Three tabs: Solar, Satellite, Forecast
- Alert system integration
- Auto-refresh capability

### 4. Widget Registration
- Added to widget manager system
- Configurable refresh interval
- Persistent settings in localStorage

## Installation & Setup

### Quick Start

```bash
# Install all dependencies (Node.js and Python)
npm run python:install

# Run both Next.js and Python backend
npm run dev:all
```

### Manual Setup

```bash
# Navigate to Python backend
cd python-backend

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install Python dependencies
pip install -r requirements.txt

# Start Flask server
python app.py
```

## Development Commands

### Package.json Scripts
```json
{
  "python:install": "Install Python dependencies",
  "python:dev": "Start Python backend",
  "dev:all": "Run Next.js and Python concurrently"
}
```

### Testing Endpoints
```bash
# Health check
curl http://localhost:5000/api/python/health

# Solar analysis
curl http://localhost:5000/api/python/solar-analysis

# Through Next.js proxy
curl http://localhost:3000/api/python/proxy?endpoint=solar-analysis
```

## Configuration

### Environment Variables

#### Python Backend (.env)
```env
FLASK_ENV=development
PYTHON_PORT=5000
REDIS_HOST=localhost  # Optional
REDIS_PORT=6379       # Optional
```

#### Next.js (.env.local)
```env
NEXT_PUBLIC_PYTHON_BACKEND_URL=http://localhost:5000
```

## Data Sources

The Python backend fetches real-time data from:
- **NOAA Space Weather Prediction Center (SWPC)**
- **GOES Satellite Network**
- **ACE/DSCOVR Solar Wind Monitors**
- **Solar Dynamics Observatory (SDO)**

## Key Features

### Advanced Analysis
- Statistical forecasting models
- Dst index calculation
- Solar rotation calculations
- Flare potential assessment

### Real-time Monitoring
- Automated alert generation
- Configurable thresholds
- Multi-parameter analysis

### Extensibility
- Modular collector architecture
- Easy to add new data sources
- Plugin-style analysis modules

## Troubleshooting

### Common Issues

#### Port Conflicts
If port 5000 is in use:
1. Change port in `python-backend/.env`
2. Update `NEXT_PUBLIC_PYTHON_BACKEND_URL` in Next.js

#### Missing Dependencies
```bash
cd python-backend
pip install -r requirements.txt
```

#### CORS Errors
Ensure the Flask app includes your development URL in CORS origins.

#### Python Not Found
Ensure Python 3.8+ is installed:
```bash
python3 --version
```

## Future Enhancements

- [ ] Redis caching for improved performance
- [ ] WebSocket support for real-time updates
- [ ] Machine learning models for improved forecasting
- [ ] Historical data analysis and trends
- [ ] Integration with ESA and JAXA data sources
- [ ] Automated report generation with AI insights
- [ ] Docker containerization for easier deployment

## Dependencies

### Python Requirements
- Flask 3.0.0 - Web framework
- pandas 2.1.4 - Data analysis
- numpy 1.26.2 - Numerical computing
- astropy 6.0.0 - Astronomy utilities
- sunpy 5.1.0 - Solar physics
- beautifulsoup4 4.12.2 - Web scraping
- requests 2.31.0 - HTTP client

### Optional Dependencies
- opencv-python - Image analysis
- redis 5.0.1 - Caching
- celery 5.3.4 - Task queue

## Performance Considerations

1. **Caching**: Consider implementing Redis caching for frequently accessed data
2. **Rate Limiting**: Implement rate limiting for external API calls
3. **Production Server**: Use Gunicorn or uWSGI instead of Flask's development server
4. **Database**: Consider storing historical data for trend analysis

## Security Notes

- API endpoints are protected by CORS configuration
- No sensitive data is exposed through the API
- Consider adding authentication for production deployment
- Implement rate limiting to prevent abuse

---

*Generated: August 21, 2025*  
*Version: 1.0.0*  
*Status: Development*