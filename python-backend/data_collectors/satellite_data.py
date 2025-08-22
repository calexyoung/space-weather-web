import requests
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any
import json

class SatelliteDataCollector:
    def __init__(self):
        self.noaa_base_url = "https://services.swpc.noaa.gov"
        self.session = requests.Session()
    
    def fetch_goes_xray_data(self) -> Dict[str, Any]:
        """Fetch GOES X-ray flux data"""
        try:
            url = f"{self.noaa_base_url}/json/goes/primary/xrays-7-day.json"
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            processed_data = []
            for entry in data:
                if entry.get('energy') == '0.05-0.4nm':
                    processed_data.append({
                        'timestamp': entry['time_tag'],
                        'flux': entry['flux'],
                        'channel': 'short'
                    })
                elif entry.get('energy') == '0.1-0.8nm':
                    processed_data.append({
                        'timestamp': entry['time_tag'],
                        'flux': entry['flux'],
                        'channel': 'long'
                    })
            
            df = pd.DataFrame(processed_data)
            if not df.empty:
                df['timestamp'] = pd.to_datetime(df['timestamp'])
                df['flux'] = pd.to_numeric(df['flux'], errors='coerce')
                
                long_channel = df[df['channel'] == 'long'].tail(288)
                
                current_flux = float(long_channel.iloc[-1]['flux']) if not long_channel.empty else 0
                classification = self._classify_xray_flux(current_flux)
                
                return {
                    'current_flux': current_flux,
                    'classification': classification,
                    'max_24h': float(long_channel['flux'].max()) if not long_channel.empty else 0,
                    'background_level': float(long_channel['flux'].quantile(0.1)) if not long_channel.empty else 0,
                    'data_points': len(processed_data),
                    'last_update': df['timestamp'].max().isoformat() if not df.empty else None
                }
            
            return {}
        except Exception as e:
            print(f"Error fetching GOES X-ray data: {e}")
            return {}
    
    def fetch_goes_proton_data(self) -> Dict[str, Any]:
        """Fetch GOES proton flux data"""
        try:
            url = f"{self.noaa_base_url}/json/goes/primary/integral-protons-1-day.json"
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            energy_channels = {}
            for entry in data:
                energy = entry.get('energy', 'unknown')
                if energy not in energy_channels:
                    energy_channels[energy] = []
                energy_channels[energy].append({
                    'timestamp': entry['time_tag'],
                    'flux': entry['flux']
                })
            
            results = {}
            for energy, measurements in energy_channels.items():
                df = pd.DataFrame(measurements)
                if not df.empty:
                    df['timestamp'] = pd.to_datetime(df['timestamp'])
                    df['flux'] = pd.to_numeric(df['flux'], errors='coerce')
                    
                    current = float(df.iloc[-1]['flux']) if not df.empty else 0
                    
                    results[energy] = {
                        'current_flux': current,
                        'max_24h': float(df['flux'].max()),
                        'avg_24h': float(df['flux'].mean()),
                        'alert_threshold_exceeded': current > 10 if '>=10MeV' in energy else False
                    }
            
            sep_event = any(ch.get('alert_threshold_exceeded', False) for ch in results.values())
            
            return {
                'channels': results,
                'sep_event_in_progress': sep_event,
                'last_update': datetime.utcnow().isoformat()
            }
        except Exception as e:
            print(f"Error fetching GOES proton data: {e}")
            return {}
    
    def fetch_goes_magnetometer_data(self) -> Dict[str, Any]:
        """Fetch GOES magnetometer data"""
        try:
            url = f"{self.noaa_base_url}/json/goes/primary/magnetometers-1-day.json"
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            
            measurements = []
            for entry in data:
                measurements.append({
                    'timestamp': entry['time_tag'],
                    'hp': entry.get('Hp', 0),
                    'he': entry.get('He', 0),
                    'hn': entry.get('Hn', 0),
                    'total': entry.get('Ht', 0)
                })
            
            df = pd.DataFrame(measurements)
            if not df.empty:
                df['timestamp'] = pd.to_datetime(df['timestamp'])
                for col in ['hp', 'he', 'hn', 'total']:
                    df[col] = pd.to_numeric(df[col], errors='coerce')
                
                latest = df.iloc[-1]
                variation = df['total'].std()
                
                return {
                    'current_field': {
                        'hp': float(latest['hp']),
                        'he': float(latest['he']),
                        'hn': float(latest['hn']),
                        'total': float(latest['total'])
                    },
                    'variation_24h': float(variation),
                    'disturbance_level': self._classify_disturbance(variation),
                    'timestamp': latest['timestamp'].isoformat()
                }
            
            return {}
        except Exception as e:
            print(f"Error fetching GOES magnetometer data: {e}")
            return {}
    
    def fetch_ace_data(self) -> Dict[str, Any]:
        """Fetch ACE satellite solar wind data"""
        try:
            urls = {
                'swepam': f"{self.noaa_base_url}/products/solar-wind/plasma-1-day.json",
                'mag': f"{self.noaa_base_url}/products/solar-wind/mag-1-day.json"
            }
            
            results = {}
            
            for data_type, url in urls.items():
                response = self.session.get(url, timeout=10)
                response.raise_for_status()
                data = response.json()
                
                if data_type == 'swepam':
                    df = pd.DataFrame(data[1:], columns=data[0])
                    df['time_tag'] = pd.to_datetime(df['time_tag'])
                    df['density'] = pd.to_numeric(df['density'], errors='coerce')
                    df['speed'] = pd.to_numeric(df['speed'], errors='coerce')
                    
                    results['plasma'] = {
                        'current_speed': float(df.iloc[-1]['speed']) if not df.empty else None,
                        'current_density': float(df.iloc[-1]['density']) if not df.empty else None
                    }
                
                elif data_type == 'mag':
                    df = pd.DataFrame(data[1:], columns=data[0])
                    df['time_tag'] = pd.to_datetime(df['time_tag'])
                    df['bz_gsm'] = pd.to_numeric(df['bz_gsm'], errors='coerce')
                    df['bt'] = pd.to_numeric(df['bt'], errors='coerce')
                    
                    results['magnetic'] = {
                        'current_bz': float(df.iloc[-1]['bz_gsm']) if not df.empty else None,
                        'current_bt': float(df.iloc[-1]['bt']) if not df.empty else None
                    }
            
            results['propagation_time_minutes'] = self._calculate_propagation_time(
                results.get('plasma', {}).get('current_speed', 400)
            )
            
            return results
        except Exception as e:
            print(f"Error fetching ACE data: {e}")
            return {}
    
    def fetch_latest_data(self, satellite_type: str = 'goes') -> Dict[str, Any]:
        """Fetch latest data from specified satellite"""
        if satellite_type.lower() == 'goes':
            return {
                'xray': self.fetch_goes_xray_data(),
                'proton': self.fetch_goes_proton_data(),
                'magnetometer': self.fetch_goes_magnetometer_data()
            }
        elif satellite_type.lower() == 'ace':
            return self.fetch_ace_data()
        else:
            return {'error': f'Unknown satellite type: {satellite_type}'}
    
    def _classify_xray_flux(self, flux: float) -> str:
        """Classify X-ray flux into solar flare classes"""
        if flux < 1e-8:
            return 'A-class'
        elif flux < 1e-7:
            return 'B-class'
        elif flux < 1e-6:
            return 'C-class'
        elif flux < 1e-5:
            return 'M-class'
        elif flux < 1e-4:
            return 'X-class'
        else:
            return f'X{int(flux/1e-4)}-class'
    
    def _classify_disturbance(self, variation: float) -> str:
        """Classify magnetic field disturbance level"""
        if variation < 10:
            return 'Quiet'
        elif variation < 20:
            return 'Unsettled'
        elif variation < 30:
            return 'Active'
        elif variation < 50:
            return 'Minor Storm'
        else:
            return 'Major Storm'
    
    def _calculate_propagation_time(self, solar_wind_speed: float) -> float:
        """Calculate propagation time from L1 to Earth in minutes"""
        l1_distance_km = 1500000  # Approximate distance from L1 to Earth
        if solar_wind_speed > 0:
            return (l1_distance_km / solar_wind_speed) / 60
        return 60  # Default to 60 minutes