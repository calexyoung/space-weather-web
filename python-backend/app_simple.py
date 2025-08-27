from flask import Flask, jsonify, request
from flask_cors import CORS
import os
import logging
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

# Create logger for this module
logger = logging.getLogger('SpaceWeatherAPI')

app = Flask(__name__)
CORS(app, origins=['http://localhost:3000', 'http://localhost:3006', 'http://localhost:3007'])

# Log startup information
logger.info("=" * 60)
logger.info(f"Python Backend Starting - {datetime.now()}")
logger.info(f"Python port: {os.environ.get('PYTHON_PORT', 5001)}")
logger.info(f"CORS enabled for: localhost:3000, 3006, 3007")
logger.info("=" * 60)

@app.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/status', methods=['GET'])
def get_status():
    return jsonify({
        'status': 'operational',
        'message': 'Python backend is running',
        'timestamp': datetime.now().isoformat(),
        'version': '1.0.0',
        'services': {
            'space_weather': 'available',
            'satellite': 'available',
            'solar': 'available',
            'forecasting': 'available'
        }
    })

@app.route('/api/solar/status', methods=['GET'])
def solar_status():
    return jsonify({
        'status': 'active',
        'current_conditions': {
            'solar_flux': 142.5,
            'sunspot_number': 156,
            'flare_activity': 'moderate',
            'cme_count': 3
        },
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/satellite/status', methods=['GET'])  
def satellite_status():
    return jsonify({
        'status': 'operational',
        'satellites': {
            'GOES-16': 'online',
            'GOES-18': 'online',
            'DSCOVR': 'online',
            'ACE': 'online'
        },
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/forecast/status', methods=['GET'])
def forecast_status():
    return jsonify({
        'status': 'available',
        'next_update': '2024-08-27T00:00:00Z',
        'confidence': 0.75,
        'forecast': {
            '24hr': {'storm_probability': 0.15},
            '48hr': {'storm_probability': 0.25},
            '72hr': {'storm_probability': 0.20}
        },
        'timestamp': datetime.now().isoformat()
    })

if __name__ == '__main__':
    port = int(os.environ.get('PYTHON_PORT', 5001))
    logger.info(f"Starting Flask app on port {port}")
    app.run(host='0.0.0.0', port=port, debug=True)