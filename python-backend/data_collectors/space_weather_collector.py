import requests
from datetime import datetime, timedelta
import pandas as pd
import numpy as np
from typing import Dict, List, Any

class SpaceWeatherCollector:
    def __init__(self):
        self.noaa_base_url = "https://services.swpc.noaa.gov"
        self.session = requests.Session()
    
    def fetch_solar_wind_data(self) -> Dict[str, Any]:
        """Fetch real-time solar wind data from ACE/DSCOVR"""
        try:
            url = f"{self.noaa_base_url}/products/solar-wind/plasma-7-day.json"
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            df = pd.DataFrame(data[1:], columns=data[0])
            
            df['time_tag'] = pd.to_datetime(df['time_tag'])
            df['density'] = pd.to_numeric(df['density'], errors='coerce')
            df['speed'] = pd.to_numeric(df['speed'], errors='coerce')
            df['temperature'] = pd.to_numeric(df['temperature'], errors='coerce')
            
            latest = df.iloc[-1]
            stats = {
                'current_speed': float(latest['speed']) if not pd.isna(latest['speed']) else None,
                'current_density': float(latest['density']) if not pd.isna(latest['density']) else None,
                'current_temperature': float(latest['temperature']) if not pd.isna(latest['temperature']) else None,
                'avg_speed_24h': float(df.tail(96)['speed'].mean()),
                'max_speed_24h': float(df.tail(96)['speed'].max()),
                'timestamp': latest['time_tag'].isoformat()
            }
            
            return stats
        except Exception as e:
            print(f"Error fetching solar wind data: {e}")
            return {}
    
    def fetch_magnetometer_data(self) -> Dict[str, Any]:
        """Fetch magnetometer data from GOES satellites"""
        try:
            url = f"{self.noaa_base_url}/products/solar-wind/mag-7-day.json"
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            df = pd.DataFrame(data[1:], columns=data[0])
            
            df['time_tag'] = pd.to_datetime(df['time_tag'])
            df['bx_gsm'] = pd.to_numeric(df['bx_gsm'], errors='coerce')
            df['by_gsm'] = pd.to_numeric(df['by_gsm'], errors='coerce')
            df['bz_gsm'] = pd.to_numeric(df['bz_gsm'], errors='coerce')
            df['bt'] = pd.to_numeric(df['bt'], errors='coerce')
            
            latest = df.iloc[-1]
            
            bz_values = df.tail(96)['bz_gsm'].dropna()
            southward_duration = (bz_values < 0).sum() * 15  # minutes
            
            stats = {
                'current_bz': float(latest['bz_gsm']) if not pd.isna(latest['bz_gsm']) else None,
                'current_bt': float(latest['bt']) if not pd.isna(latest['bt']) else None,
                'southward_duration_minutes': southward_duration,
                'avg_bt_24h': float(df.tail(96)['bt'].mean()),
                'timestamp': latest['time_tag'].isoformat()
            }
            
            return stats
        except Exception as e:
            print(f"Error fetching magnetometer data: {e}")
            return {}
    
    def calculate_dst_estimate(self) -> float:
        """Calculate estimated Dst index based on solar wind parameters"""
        try:
            solar_wind = self.fetch_solar_wind_data()
            mag_data = self.fetch_magnetometer_data()
            
            if not solar_wind or not mag_data:
                return 0.0
            
            v = solar_wind.get('current_speed', 400)
            bz = mag_data.get('current_bz', 0)
            
            if bz >= 0:
                dst = -2.0
            else:
                dst = -20.0 * np.sqrt(v/400) * abs(bz)
            
            return float(dst)
        except Exception as e:
            print(f"Error calculating Dst: {e}")
            return 0.0
    
    def generate_forecast(self, days: int = 3) -> Dict[str, Any]:
        """Generate space weather forecast using statistical methods"""
        try:
            solar_wind = self.fetch_solar_wind_data()
            mag_data = self.fetch_magnetometer_data()
            dst = self.calculate_dst_estimate()
            
            forecast = {
                'forecast_period': f"{days} days",
                'generated_at': datetime.utcnow().isoformat(),
                'current_conditions': {
                    'solar_wind_speed': solar_wind.get('current_speed'),
                    'bz_component': mag_data.get('current_bz'),
                    'dst_index': dst
                },
                'predictions': []
            }
            
            for day in range(1, days + 1):
                date = datetime.utcnow() + timedelta(days=day)
                
                storm_probability = 0.1
                if solar_wind.get('current_speed', 0) > 600:
                    storm_probability += 0.3
                if mag_data.get('current_bz', 0) < -10:
                    storm_probability += 0.4
                if dst < -50:
                    storm_probability += 0.2
                
                storm_probability = min(storm_probability, 0.95)
                
                prediction = {
                    'date': date.strftime('%Y-%m-%d'),
                    'storm_probability': round(storm_probability, 2),
                    'expected_kp': self._estimate_kp(storm_probability),
                    'expected_conditions': self._get_condition_description(storm_probability)
                }
                forecast['predictions'].append(prediction)
            
            return forecast
        except Exception as e:
            print(f"Error generating forecast: {e}")
            return {'error': str(e)}
    
    def check_alerts(self) -> List[Dict[str, Any]]:
        """Check for space weather alerts based on current conditions"""
        alerts = []
        
        try:
            solar_wind = self.fetch_solar_wind_data()
            mag_data = self.fetch_magnetometer_data()
            dst = self.calculate_dst_estimate()
            
            if solar_wind.get('current_speed', 0) > 700:
                alerts.append({
                    'level': 'warning',
                    'type': 'solar_wind',
                    'message': f"High solar wind speed detected: {solar_wind['current_speed']} km/s",
                    'timestamp': datetime.utcnow().isoformat()
                })
            
            if mag_data.get('current_bz', 0) < -15:
                alerts.append({
                    'level': 'alert',
                    'type': 'magnetic_field',
                    'message': f"Strong southward magnetic field: Bz = {mag_data['current_bz']} nT",
                    'timestamp': datetime.utcnow().isoformat()
                })
            
            if dst < -100:
                alerts.append({
                    'level': 'severe',
                    'type': 'geomagnetic_storm',
                    'message': f"Severe geomagnetic storm conditions: Dst = {dst:.1f} nT",
                    'timestamp': datetime.utcnow().isoformat()
                })
            
            if mag_data.get('southward_duration_minutes', 0) > 180:
                alerts.append({
                    'level': 'warning',
                    'type': 'sustained_southward',
                    'message': f"Sustained southward IMF for {mag_data['southward_duration_minutes']} minutes",
                    'timestamp': datetime.utcnow().isoformat()
                })
            
        except Exception as e:
            print(f"Error checking alerts: {e}")
        
        return alerts
    
    def _estimate_kp(self, storm_probability: float) -> int:
        """Estimate Kp index based on storm probability"""
        if storm_probability < 0.2:
            return 3
        elif storm_probability < 0.4:
            return 4
        elif storm_probability < 0.6:
            return 5
        elif storm_probability < 0.8:
            return 6
        else:
            return 7
    
    def _get_condition_description(self, storm_probability: float) -> str:
        """Get condition description based on storm probability"""
        if storm_probability < 0.2:
            return "Quiet to unsettled"
        elif storm_probability < 0.4:
            return "Active conditions likely"
        elif storm_probability < 0.6:
            return "Minor storm possible"
        elif storm_probability < 0.8:
            return "Moderate storm likely"
        else:
            return "Strong storm expected"