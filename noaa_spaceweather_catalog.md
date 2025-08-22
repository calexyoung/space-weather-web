# NOAA Space Weather JSON Data Catalog
**Source:** https://services.swpc.noaa.gov/json/
**Last Updated:** August 22, 2025

## Overview
This catalog documents all available space weather data in JSON format from NOAA's Space Weather Prediction Center (SWPC).

## Directory Structure

### Root Level JSON Files
These files are available directly at the root `/json/` directory:

1. **boulder_k_index_1m.json** - Boulder K-index data (1-minute resolution)
2. **edited_events.json** - Edited space weather events
3. **electron_fluence_forecast.json** - Electron fluence forecasts
4. **enlil_time_series.json** - ENLIL solar wind model time series data
5. **f107_cm_flux.json** - F10.7 cm radio flux measurements
6. **icao-space-weather-advisories.json** - ICAO space weather advisories for aviation
7. **ovation_aurora_latest.json** - Latest OVATION aurora model data
8. **planetary_k_index_1m.json** - Planetary K-index data (1-minute resolution)
9. **predicted_f107cm_flux.json** - Predicted F10.7 cm flux values
10. **predicted_fredericksburg_a_index.json** - Predicted Fredericksburg A-index
11. **predicted_monthly_sunspot_number.json** - Monthly sunspot number predictions
12. **solar-radio-flux.json** - Solar radio flux measurements
13. **solar_probabilities.json** - Solar event probabilities
14. **solar_regions.json** - Active solar region information
15. **sunspot_report.json** - Sunspot reports

### ACE Satellite Data (`/json/ace/`)
Advanced Composition Explorer satellite measurements:

#### EPAM (Electron, Proton, and Alpha Monitor) - `/json/ace/epam/`
- **ace_epam_32s.json** - 32-second resolution data
- **ace_epam_5m.json** - 5-minute resolution data

#### MAG (Magnetometer) - `/json/ace/mag/`
- **ace_mag_1h.json** - 1-hour resolution magnetic field data

#### SIS (Solar Isotope Spectrometer) - `/json/ace/sis/`
- **ace_sis_32s.json** - 32-second resolution data
- **ace_sis_5m.json** - 5-minute resolution data

#### SWEPAM (Solar Wind Electron Proton Alpha Monitor) - `/json/ace/swepam/`
- **ace_swepam_1h.json** - 1-hour resolution solar wind data

### DSCOVR Satellite Data (`/json/dscovr/`)
Deep Space Climate Observatory measurements:
- **dscovr_mag_1s.json** - 1-second resolution magnetometer data

### Geospace Data (`/json/geospace/`)
Geomagnetic activity indices:
- **geospace_dst_1_hour.json** - DST index (1-hour data)
- **geospace_dst_7_day.json** - DST index (7-day data)
- **geospace_pred_est_kp_1_hour.json** - Predicted/estimated Kp (1-hour)
- **geospce_pred_est_kp_7_day.json** - Predicted/estimated Kp (7-day)

### GOES Satellite Data (`/json/goes/`)
Geostationary Operational Environmental Satellites data:

#### Configuration Files
- **instrument-sources.json** - Instrument source configuration
- **satellite-longitudes.json** - Satellite longitude positions

#### Primary Satellite (`/json/goes/primary/`)
Time-series data for various periods (6-hour, 1-day, 3-day, 7-day):

**Particle Data:**
- Differential electrons (4 time periods)
- Differential protons (4 time periods)
- Integral electrons (4 time periods + 7-day fluence)
- Integral protons (4 time periods + 7-day fluence + plot data)

**Magnetometer Data:**
- magnetometers-*.json (4 time periods)

**X-ray Data:**
- xrays-*.json (4 time periods)
- xray-background-7-day.json
- xray-flares-7-day.json
- xray-flares-latest.json

#### Secondary Satellite (`/json/goes/secondary/`)
Same data types as primary satellite (backup measurements)

### Lists/GeoJSON Data (`/json/lists/`)
Geographic region data:

#### Regional GeoJSON (`/json/lists/rgeojson/`)
- **rgeojson.json** - General regional GeoJSON data
- **rgeojson_FB1DLP.json** - FB1DLP region data
- **rgeojson_US-Canada-1D.json** - US-Canada 1-day region data

### Real-Time Solar Wind (RTSW) Data (`/json/rtsw/`)
Real-time solar wind measurements:
- **rtsw_ephemerides_1h.json** - 1-hour ephemerides data
- **rtsw_mag_1m.json** - 1-minute magnetometer data
- **rtsw_wind_1m.json** - 1-minute solar wind data

### Solar Cycle Data (`/json/solar-cycle/`)
Long-term solar cycle observations and predictions:
- **2019-predicted-solar-cycle.json** - 2019 solar cycle predictions
- **f10-7cm-flux.json** - F10.7 cm flux observations
- **f10-7cm-flux-smoothed.json** - Smoothed F10.7 cm flux
- **observed-solar-cycle-indices.json** - Observed solar cycle indices
- **predicted-solar-cycle.json** - Current solar cycle predictions
- **solar-cycle-25-f10-7cm-flux-predicted-high-low.json** - Cycle 25 flux predictions (high/low bounds)
- **solar-cycle-25-predicted.json** - Solar Cycle 25 predictions
- **solar-cycle-25-ssn-predicted-high-low.json** - Cycle 25 sunspot number predictions (high/low bounds)
- **sunspots.json** - Sunspot observations
- **sunspots-smoothed.json** - Smoothed sunspot numbers
- **swpc_observed_ssn.json** - SWPC observed sunspot numbers

### STEREO Satellite Data (`/json/stereo/`)
Solar Terrestrial Relations Observatory data:
- **stereo_a_1m.json** - STEREO-A 1-minute resolution data

## Data Categories Summary

### Real-Time Monitoring
- Solar wind (ACE, DSCOVR, RTSW)
- Magnetometer readings (ACE, DSCOVR, GOES)
- Particle measurements (ACE, GOES)
- X-ray flux (GOES)

### Indices & Forecasts
- K-indices (Boulder, Planetary)
- A-indices (Fredericksburg)
- DST indices
- Aurora forecasts (OVATION)
- Electron fluence forecasts

### Solar Activity
- Sunspot numbers and reports
- Solar regions
- Solar flares
- F10.7 cm radio flux
- Solar event probabilities

### Long-Term Data
- Solar cycle observations
- Solar cycle predictions
- Historical trends

## Access Pattern
All JSON files can be accessed via:
`https://services.swpc.noaa.gov/json/[path-to-file]`

Example:
- Root file: `https://services.swpc.noaa.gov/json/planetary_k_index_1m.json`
- Subdirectory file: `https://services.swpc.noaa.gov/json/ace/mag/ace_mag_1h.json`