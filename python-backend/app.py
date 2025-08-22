from flask import Flask, jsonify, request
from flask_cors import CORS
import os
from dotenv import load_dotenv
from data_collectors.space_weather_collector import SpaceWeatherCollector
from data_collectors.satellite_data import SatelliteDataCollector
from data_collectors.solar_analysis import SolarAnalyzer

load_dotenv()

app = Flask(__name__)
CORS(app, origins=['http://localhost:3000', 'http://localhost:3006', 'http://localhost:3007'])

space_weather = SpaceWeatherCollector()
satellite = SatelliteDataCollector()
solar = SolarAnalyzer()

@app.route('/api/python/health', methods=['GET'])
def health_check():
    return jsonify({'success': True, 'data': {'status': 'healthy', 'service': 'python-backend'}})

@app.route('/api/python/solar-analysis', methods=['GET'])
def get_solar_analysis():
    try:
        data = solar.analyze_current_conditions()
        return jsonify({'success': True, 'data': data})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/python/satellite-data', methods=['GET'])
def get_satellite_data():
    try:
        satellite_type = request.args.get('type', 'goes')
        data = satellite.fetch_latest_data(satellite_type)
        return jsonify({'success': True, 'data': data})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/python/space-weather/forecast', methods=['GET'])
def get_forecast():
    try:
        days = int(request.args.get('days', 3))
        forecast = space_weather.generate_forecast(days)
        return jsonify({'success': True, 'data': forecast})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/python/space-weather/alerts', methods=['GET'])
def get_alerts():
    try:
        alerts = space_weather.check_alerts()
        return jsonify({'success': True, 'data': alerts})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/python/analyze-image', methods=['POST'])
def analyze_image():
    try:
        data = request.json
        image_url = data.get('url')
        analysis_type = data.get('type', 'solar')
        
        if analysis_type == 'solar':
            result = solar.analyze_solar_image(image_url)
        else:
            result = {'error': 'Unknown analysis type'}
            
        return jsonify({'success': True, 'data': result})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PYTHON_PORT', 5001))
    app.run(debug=True, host='0.0.0.0', port=port)