from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import logging
from datetime import datetime
from dotenv import load_dotenv
from data_collectors.space_weather_collector import SpaceWeatherCollector
from data_collectors.satellite_data import SatelliteDataCollector
from data_collectors.solar_analysis import SolarAnalyzer

load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

# Create logger for this module
logger = logging.getLogger('SpaceWeatherAPI')

# Also log to file
file_handler = logging.FileHandler('python-backend.log')
file_handler.setLevel(logging.INFO)
file_handler.setFormatter(logging.Formatter(
    '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
))
logger.addHandler(file_handler)

app = Flask(__name__)
CORS(app, origins=['http://localhost:3000', 'http://localhost:3006', 'http://localhost:3007'])

# Log startup information
logger.info("=" * 60)
logger.info(f"Python Backend Starting - {datetime.now()}")
import flask
logger.info(f"Flask version: {flask.__version__}")
logger.info(f"Python port: {os.environ.get('PYTHON_PORT', 5001)}")
logger.info(f"CORS enabled for: localhost:3000, 3006, 3007")
logger.info("=" * 60)

space_weather = SpaceWeatherCollector()
satellite = SatelliteDataCollector()
solar = SolarAnalyzer()

# Log collector initialization
logger.info("Data collectors initialized successfully")

# Add request logging middleware
@app.before_request
def log_request():
    logger.info(f"Request: {request.method} {request.path} from {request.remote_addr}")
    if request.args:
        logger.debug(f"Query params: {dict(request.args)}")

@app.after_request
def log_response(response):
    logger.info(f"Response: {response.status_code} for {request.method} {request.path}")
    return response

@app.route('/api/python/health', methods=['GET'])
def health_check():
    logger.debug("Health check requested")
    return jsonify({'success': True, 'data': {'status': 'healthy', 'service': 'python-backend'}})

@app.route('/api/python/solar-analysis', methods=['GET'])
def get_solar_analysis():
    try:
        logger.info("Solar analysis requested")
        data = solar.analyze_current_conditions()
        logger.info(f"Solar analysis completed successfully")
        return jsonify({'success': True, 'data': data})
    except Exception as e:
        logger.error(f"Solar analysis failed: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/python/satellite-data', methods=['GET'])
def get_satellite_data():
    try:
        satellite_type = request.args.get('type', 'goes')
        logger.info(f"Satellite data requested for type: {satellite_type}")
        data = satellite.fetch_latest_data(satellite_type)
        logger.info(f"Satellite data fetched successfully for {satellite_type}")
        return jsonify({'success': True, 'data': data})
    except Exception as e:
        logger.error(f"Satellite data fetch failed for {satellite_type}: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/python/space-weather/forecast', methods=['GET'])
def get_forecast():
    try:
        days = int(request.args.get('days', 3))
        logger.info(f"Weather forecast requested for {days} days")
        forecast = space_weather.generate_forecast(days)
        logger.info(f"Weather forecast generated successfully for {days} days")
        return jsonify({'success': True, 'data': forecast})
    except Exception as e:
        logger.error(f"Weather forecast generation failed: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/python/space-weather/alerts', methods=['GET'])
def get_alerts():
    try:
        logger.info("Space weather alerts requested")
        alerts = space_weather.check_alerts()
        logger.info(f"Found {len(alerts) if alerts else 0} active alerts")
        return jsonify({'success': True, 'data': alerts})
    except Exception as e:
        logger.error(f"Alert check failed: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/python/analyze-image', methods=['POST'])
def analyze_image():
    try:
        data = request.json
        image_url = data.get('url')
        analysis_type = data.get('type', 'solar')
        logger.info(f"Image analysis requested - Type: {analysis_type}, URL: {image_url[:50]}...")
        
        if analysis_type == 'solar':
            result = solar.analyze_solar_image(image_url)
            logger.info("Solar image analysis completed successfully")
        else:
            result = {'error': 'Unknown analysis type'}
            logger.warning(f"Unknown analysis type requested: {analysis_type}")
            
        return jsonify({'success': True, 'data': result})
    except Exception as e:
        logger.error(f"Image analysis failed: {str(e)}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

# Error handler for 404
@app.errorhandler(404)
def not_found(error):
    logger.warning(f"404 Not Found: {request.path}")
    return jsonify({'success': False, 'error': 'Endpoint not found'}), 404

# Error handler for 500
@app.errorhandler(500)
def internal_error(error):
    logger.error(f"500 Internal Server Error: {str(error)}", exc_info=True)
    return jsonify({'success': False, 'error': 'Internal server error'}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PYTHON_PORT', 5001))
    logger.info(f"Starting Flask application on port {port}")
    logger.info(f"Debug mode: {os.environ.get('FLASK_ENV', 'production') == 'development'}")
    logger.info("Python backend ready to serve requests")
    logger.info("-" * 60)
    
    # Run the application
    app.run(debug=True, host='0.0.0.0', port=port)
    
    # Log shutdown (won't usually reach here in debug mode)
    logger.info("Python backend shutting down")