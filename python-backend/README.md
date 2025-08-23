# Python Backend for Space Weather Web

This Python backend provides advanced data analysis and collection capabilities for the Space Weather monitoring platform.

## Features

- **Solar Analysis**: Real-time analysis of solar conditions including sunspot regions, flare potential, and solar indices
- **Satellite Data Collection**: Direct interface with GOES, ACE, and DSCOVR satellites for space weather parameters
- **Space Weather Forecasting**: Statistical forecasting models for geomagnetic storms
- **Alert System**: Automated alert generation based on configurable thresholds
- **Image Analysis**: Solar image processing capabilities (requires OpenCV)

## Installation

### Quick Start

From the main project directory:

```bash
# Install Python dependencies
npm run python:install

# Start Python backend
npm run python:dev

# Or run both Next.js and Python together
npm run dev:all
```

### Manual Installation

```bash
cd python-backend

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the server
python app.py
```

## API Endpoints

The Python backend runs on port 5000 by default and provides the following endpoints:

### Health Check
- `GET /api/python/health` - Check if the backend is running

### Solar Analysis
- `GET /api/python/solar-analysis` - Get comprehensive solar condition analysis

### Satellite Data
- `GET /api/python/satellite-data?type=goes` - Fetch satellite data (goes/ace)

### Space Weather Forecast
- `GET /api/python/space-weather/forecast?days=3` - Get N-day forecast

### Alerts
- `GET /api/python/space-weather/alerts` - Get current space weather alerts

### Image Analysis
- `POST /api/python/analyze-image` - Analyze solar images
  ```json
  {
    "url": "image_url",
    "type": "solar"
  }
  ```

## Integration with Next.js

The Python backend is integrated with the Next.js frontend through:

1. **Proxy API Route**: `/api/python/proxy` handles all requests to Python backend
2. **TypeScript Client**: `src/lib/python-backend/client.ts` provides typed interface
3. **Python Analysis Widget**: Displays Python-generated data in the UI

## Data Sources

The backend fetches data from:
- NOAA Space Weather Prediction Center (SWPC)
- GOES Satellite Network
- ACE/DSCOVR Solar Wind Monitors
- Solar Dynamics Observatory (SDO)

## Advanced Features

### Custom Analysis Modules

You can add custom analysis modules by:

1. Creating a new module in `data_collectors/`
2. Importing it in `app.py`
3. Adding a new endpoint

Example:
```python
# data_collectors/custom_analyzer.py
class CustomAnalyzer:
    def analyze(self):
        return {"result": "analysis"}

# In app.py
from data_collectors.custom_analyzer import CustomAnalyzer
custom = CustomAnalyzer()

@app.route('/api/python/custom', methods=['GET'])
def custom_analysis():
    return jsonify({'success': True, 'data': custom.analyze()})
```

## Environment Variables

Create a `.env` file based on `.env.example`:

```env
FLASK_ENV=development
PYTHON_PORT=5000
```

## Troubleshooting

### Port Already in Use
If port 5000 is already in use, change it in `.env`:
```env
PYTHON_PORT=5001
```

Then update the Next.js environment:
```env
NEXT_PUBLIC_PYTHON_BACKEND_URL=http://localhost:5001
```

### Missing Dependencies
If you encounter import errors, ensure all dependencies are installed:
```bash
pip install -r requirements.txt
```

### CORS Issues
The backend is configured to accept requests from localhost:3000, 3006, and 3007. Add additional origins in `app.py` if needed.

## Development

### Adding New Data Sources

1. Create a new collector class in `data_collectors/`
2. Implement data fetching and normalization methods
3. Add endpoints in `app.py`
4. Update the TypeScript client in the frontend

### Testing

Run the backend and test endpoints:
```bash
# Health check
curl http://localhost:5000/api/python/health

# Solar analysis
curl http://localhost:5000/api/python/solar-analysis

# Satellite data
curl http://localhost:5000/api/python/satellite-data?type=goes
```

## Performance Considerations

- Data is fetched on-demand; consider implementing caching with Redis
- For production, use a WSGI server like Gunicorn instead of Flask's development server
- Implement rate limiting for external API calls

## Future Enhancements

- [ ] Redis caching layer
- [ ] WebSocket support for real-time updates
- [ ] Machine learning models for improved forecasting
- [ ] Historical data analysis
- [ ] Integration with additional data sources (ESA, JAXA)
- [ ] Automated report generation with AI insights