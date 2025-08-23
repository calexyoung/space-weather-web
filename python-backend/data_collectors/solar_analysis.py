import requests
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import json
from io import BytesIO
import base64

try:
    from PIL import Image
    import cv2
    HAS_IMAGE_LIBS = True
except ImportError:
    HAS_IMAGE_LIBS = False

try:
    from sunpy.net import Fido
    from sunpy.net import attrs as a
    HAS_SUNPY = True
except ImportError:
    HAS_SUNPY = False

class SolarAnalyzer:
    def __init__(self):
        self.noaa_base_url = "https://services.swpc.noaa.gov"
        self.session = requests.Session()
        
    def analyze_current_conditions(self) -> Dict[str, Any]:
        """Analyze current solar conditions and provide assessment"""
        try:
            solar_data = self._fetch_solar_indices()
            sunspot_data = self._fetch_sunspot_data()
            flare_data = self._fetch_recent_flares()
            
            analysis = {
                'timestamp': datetime.utcnow().isoformat(),
                'solar_indices': solar_data,
                'sunspot_analysis': sunspot_data,
                'flare_activity': flare_data,
                'overall_assessment': self._generate_assessment(solar_data, sunspot_data, flare_data)
            }
            
            return analysis
        except Exception as e:
            print(f"Error analyzing solar conditions: {e}")
            return {'error': str(e)}
    
    def _fetch_solar_indices(self) -> Dict[str, Any]:
        """Fetch current solar indices"""
        try:
            url = f"{self.noaa_base_url}/json/solar-cycle/observed-solar-cycle-indices.json"
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            
            data = response.json()
            if data:
                latest = data[-1]
                return {
                    'f10.7': latest.get('f10.7', None),
                    'smoothed_f10.7': latest.get('smoothed_f10.7', None),
                    'sunspot_number': latest.get('ssn', None),
                    'smoothed_ssn': latest.get('smoothed_ssn', None),
                    'date': latest.get('time-tag', None)
                }
            return {}
        except Exception as e:
            print(f"Error fetching solar indices: {e}")
            return {}
    
    def _fetch_sunspot_data(self) -> Dict[str, Any]:
        """Analyze sunspot regions and complexity"""
        try:
            url = f"{self.noaa_base_url}/json/regions/solar-regions.json"
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            
            regions = response.json()
            
            active_regions = []
            complex_regions = []
            
            for region in regions:
                if region.get('status') == 'active':
                    active_regions.append({
                        'number': region.get('region'),
                        'location': region.get('location'),
                        'area': region.get('area'),
                        'class': region.get('mag_class'),
                        'spots': region.get('number_spots')
                    })
                    
                    mag_class = region.get('mag_class', '')
                    if any(c in mag_class for c in ['beta-gamma', 'beta-gamma-delta', 'delta']):
                        complex_regions.append(region.get('region'))
            
            return {
                'total_regions': len(active_regions),
                'complex_regions': len(complex_regions),
                'regions': active_regions[:5],
                'flare_potential': self._assess_flare_potential(active_regions)
            }
        except Exception as e:
            print(f"Error fetching sunspot data: {e}")
            return {}
    
    def _fetch_recent_flares(self) -> Dict[str, Any]:
        """Fetch recent solar flare activity using SunPy if available, fallback to NOAA"""
        # Try SunPy first if available
        if HAS_SUNPY:
            try:
                # Set time range for the last 3 days
                tend = datetime.utcnow()
                tstart = tend - timedelta(days=3)
                
                # Format dates for SunPy
                tstart_str = tstart.strftime("%Y/%m/%d")
                tend_str = tend.strftime("%Y/%m/%d")
                
                # Search for flares using SunPy HEK
                result = Fido.search(
                    a.Time(tstart_str, tend_str),
                    a.hek.EventType("FL"),
                    a.hek.FL.GOESCls >= "B1.0",
                    a.hek.FRM.Name == "SSW Latest Events"
                )
                
                flare_counts = {'B': 0, 'C': 0, 'M': 0, 'X': 0}
                recent_flares = []
                
                if len(result) > 0:
                    # Process HEK results
                    for entry in result[0]:
                        goes_class = entry.get('fl_goescls', '')
                        if goes_class:
                            flare_class = goes_class[0].upper()
                            if flare_class in flare_counts:
                                flare_counts[flare_class] += 1
                            
                            # Convert times to ISO format
                            peak_time = entry.get('event_peaktime', entry.get('event_starttime', ''))
                            if hasattr(peak_time, 'iso'):
                                peak_time = peak_time.iso
                            
                            begin_time = entry.get('event_starttime', '')
                            if hasattr(begin_time, 'iso'):
                                begin_time = begin_time.iso
                                
                            end_time = entry.get('event_endtime', '')
                            if hasattr(end_time, 'iso'):
                                end_time = end_time.iso
                            
                            recent_flares.append({
                                'class': goes_class,
                                'begin': str(begin_time) if begin_time else '',
                                'peak': str(peak_time) if peak_time else '',
                                'end': str(end_time) if end_time else '',
                                'region': str(entry.get('ar_noaanum', 'Unknown')),
                                'location': f"N{float(entry.get('hgc_y', 0) or 0):.0f} {float(entry.get('hgc_x', 0) or 0):.0f}",
                                'intensity': float(entry.get('fl_peakflux', 0) or 0)
                            })
                    
                    # Sort by peak time (most recent first)
                    recent_flares.sort(key=lambda x: x['peak'] if x['peak'] else x['begin'], reverse=True)
                    
                    # Calculate 24h counts
                    flare_counts_24h = {'B': 0, 'C': 0, 'M': 0, 'X': 0}
                    cutoff_time = datetime.utcnow() - timedelta(hours=24)
                    
                    for flare in recent_flares:
                        try:
                            flare_time = datetime.fromisoformat(flare['peak'].replace('Z', '+00:00'))
                            if flare_time > cutoff_time:
                                flare_class = flare['class'][0].upper()
                                if flare_class in flare_counts_24h:
                                    flare_counts_24h[flare_class] += 1
                        except:
                            pass
                    
                    return {
                        'counts_24h': flare_counts_24h,
                        'counts_3d': flare_counts,
                        'recent_flares': recent_flares[:10],  # Return more flares
                        'activity_level': self._classify_activity_level(flare_counts_24h),
                        'data_source': 'SunPy HEK'
                    }
                
            except Exception as e:
                print(f"SunPy fetch failed, falling back to NOAA: {e}")
        
        # Fallback to original NOAA method
        try:
            url = f"{self.noaa_base_url}/json/goes/primary/xray-flares-1-day.json"
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            
            flares = response.json()
            
            flare_counts = {'B': 0, 'C': 0, 'M': 0, 'X': 0}
            recent_flares = []
            
            for flare in flares:
                class_type = flare.get('class_type', '')
                if class_type:
                    flare_class = class_type[0].upper()
                    if flare_class in flare_counts:
                        flare_counts[flare_class] += 1
                    
                    recent_flares.append({
                        'class': class_type,
                        'begin': flare.get('begin_time'),
                        'peak': flare.get('peak_time'),
                        'end': flare.get('end_time'),
                        'region': flare.get('region', 'Unknown'),
                        'location': flare.get('location', ''),
                        'intensity': flare.get('peak_flux', 0)
                    })
            
            recent_flares.sort(key=lambda x: x['peak'] if x['peak'] else x['begin'], reverse=True)
            
            return {
                'counts_24h': flare_counts,
                'counts_3d': flare_counts,  # Same as 24h for NOAA
                'recent_flares': recent_flares[:10],
                'activity_level': self._classify_activity_level(flare_counts),
                'data_source': 'NOAA SWPC'
            }
        except Exception as e:
            print(f"Error fetching flare data: {e}")
            return {
                'counts_24h': {'B': 0, 'C': 0, 'M': 0, 'X': 0},
                'counts_3d': {'B': 0, 'C': 0, 'M': 0, 'X': 0},
                'recent_flares': [],
                'activity_level': 'Unknown',
                'data_source': 'None'
            }
    
    def _assess_flare_potential(self, regions: List[Dict]) -> str:
        """Assess potential for solar flares based on active regions"""
        if not regions:
            return "Very Low"
        
        complex_count = sum(1 for r in regions if 'delta' in r.get('class', '').lower())
        large_regions = sum(1 for r in regions if r.get('area', 0) > 500)
        
        if complex_count >= 2 or large_regions >= 3:
            return "High"
        elif complex_count >= 1 or large_regions >= 2:
            return "Moderate"
        elif len(regions) >= 5:
            return "Low-Moderate"
        else:
            return "Low"
    
    def _classify_activity_level(self, flare_counts: Dict[str, int]) -> str:
        """Classify overall solar activity level"""
        if flare_counts.get('X', 0) > 0:
            return "Very High"
        elif flare_counts.get('M', 0) >= 3:
            return "High"
        elif flare_counts.get('M', 0) >= 1:
            return "Moderate"
        elif flare_counts.get('C', 0) >= 5:
            return "Low-Moderate"
        elif flare_counts.get('C', 0) >= 1:
            return "Low"
        elif flare_counts.get('B', 0) >= 1:
            return "Very Low"
        else:
            return "Quiet"
    
    def _generate_assessment(self, indices: Dict, sunspots: Dict, flares: Dict) -> Dict[str, Any]:
        """Generate overall solar assessment"""
        assessment = {
            'solar_cycle_phase': 'Unknown',
            'activity_trend': 'Unknown',
            'forecast_confidence': 'Medium',
            'key_risks': [],
            'recommendations': []
        }
        
        if indices.get('sunspot_number'):
            ssn = indices['sunspot_number']
            if ssn < 30:
                assessment['solar_cycle_phase'] = 'Minimum'
            elif ssn < 80:
                assessment['solar_cycle_phase'] = 'Rising/Declining'
            else:
                assessment['solar_cycle_phase'] = 'Maximum'
        
        if flares.get('activity_level') in ['High', 'Very High']:
            assessment['key_risks'].append('Elevated risk of radio blackouts')
            assessment['recommendations'].append('Monitor HF radio communications')
        
        if sunspots.get('flare_potential') in ['High', 'Moderate']:
            assessment['key_risks'].append(f"{sunspots['flare_potential']} potential for significant flares")
            assessment['recommendations'].append('Prepare for possible geomagnetic disturbances')
        
        if sunspots.get('complex_regions', 0) > 0:
            assessment['key_risks'].append(f"{sunspots['complex_regions']} magnetically complex regions present")
        
        return assessment
    
    def analyze_solar_image(self, image_url: str) -> Dict[str, Any]:
        """Analyze a solar image (if image processing libraries available)"""
        if not HAS_IMAGE_LIBS:
            return {
                'error': 'Image analysis libraries not installed',
                'suggestion': 'Install opencv-python and Pillow for image analysis'
            }
        
        try:
            response = requests.get(image_url, timeout=10)
            response.raise_for_status()
            
            img = Image.open(BytesIO(response.content))
            img_array = np.array(img)
            
            if len(img_array.shape) == 3:
                gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
            else:
                gray = img_array
            
            brightness_stats = {
                'mean': float(np.mean(gray)),
                'std': float(np.std(gray)),
                'max': float(np.max(gray)),
                'min': float(np.min(gray))
            }
            
            _, bright_regions = cv2.threshold(gray, 200, 255, cv2.THRESH_BINARY)
            num_bright_regions = cv2.countNonZero(bright_regions)
            bright_percentage = (num_bright_regions / gray.size) * 100
            
            analysis = {
                'image_dimensions': img.size,
                'brightness_analysis': brightness_stats,
                'bright_regions_percentage': round(bright_percentage, 2),
                'potential_features': self._identify_solar_features(gray, bright_percentage),
                'timestamp': datetime.utcnow().isoformat()
            }
            
            return analysis
            
        except Exception as e:
            return {'error': f'Failed to analyze image: {str(e)}'}
    
    def _identify_solar_features(self, gray_image: np.ndarray, bright_percentage: float) -> List[str]:
        """Identify potential solar features in image"""
        features = []
        
        if bright_percentage > 10:
            features.append("Possible active regions detected")
        if bright_percentage > 20:
            features.append("Significant bright areas - possible flare activity")
        
        edges = cv2.Canny(gray_image, 50, 150)
        edge_count = cv2.countNonZero(edges)
        
        if edge_count > gray_image.size * 0.05:
            features.append("Complex magnetic structures visible")
        
        return features if features else ["No significant features detected"]
    
    def calculate_solar_rotation(self, latitude: float = 0) -> Dict[str, float]:
        """Calculate solar rotation rate at given latitude"""
        a = 14.713  # degrees/day at equator
        b = -2.396  # differential rotation coefficient
        c = -1.787  # differential rotation coefficient
        
        lat_rad = np.radians(latitude)
        sin2_lat = np.sin(lat_rad) ** 2
        sin4_lat = sin2_lat ** 2
        
        rotation_rate = a + b * sin2_lat + c * sin4_lat
        
        return {
            'latitude': latitude,
            'rotation_rate_deg_per_day': round(rotation_rate, 3),
            'rotation_period_days': round(360 / rotation_rate, 2),
            'synodic_period_days': round(360 / (rotation_rate - 0.9856), 2)
        }