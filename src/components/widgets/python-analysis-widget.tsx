'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, Activity, Satellite, Sun, RefreshCw, TrendingUp, AlertTriangle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PythonAnalysisWidgetProps {
  className?: string;
  config?: any;
  onConfigChange?: (updates: any) => void;
}

export function PythonAnalysisWidget({ className, config, onConfigChange }: PythonAnalysisWidgetProps) {
  const [loading, setLoading] = useState(false);
  const [solarData, setSolarData] = useState<any>(null);
  const [satelliteData, setSatelliteData] = useState<any>(null);
  const [forecast, setForecast] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pythonHealthy, setPythonHealthy] = useState<boolean | null>(null);

  const checkPythonHealth = async () => {
    try {
      const response = await fetch('/api/python/proxy?endpoint=health');
      const data = await response.json();
      setPythonHealthy(data.success);
      return data.success;
    } catch (error) {
      setPythonHealthy(false);
      return false;
    }
  };

  const fetchPythonData = async () => {
    setLoading(true);
    setError(null);

    const isHealthy = await checkPythonHealth();
    if (!isHealthy) {
      setError('Python backend is not available. Start it with: cd python-backend && python app.py');
      setLoading(false);
      return;
    }

    try {
      const [solarRes, satelliteRes, forecastRes, alertsRes] = await Promise.all([
        fetch('/api/python/proxy?endpoint=solar-analysis'),
        fetch('/api/python/proxy?endpoint=satellite-data&type=goes'),
        fetch('/api/python/proxy?endpoint=forecast&days=3'),
        fetch('/api/python/proxy?endpoint=alerts')
      ]);

      const [solarJson, satelliteJson, forecastJson, alertsJson] = await Promise.all([
        solarRes.json(),
        satelliteRes.json(),
        forecastRes.json(),
        alertsRes.json()
      ]);

      if (solarJson.success) setSolarData(solarJson.data);
      if (satelliteJson.success) setSatelliteData(satelliteJson.data);
      if (forecastJson.success) setForecast(forecastJson.data);
      if (alertsJson.success) setAlerts(alertsJson.data || []);
    } catch (err) {
      setError('Failed to fetch data from Python backend');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPythonData();
    const interval = setInterval(fetchPythonData, 60000);
    return () => clearInterval(interval);
  }, []);

  const getAlertIcon = (level: string) => {
    switch (level) {
      case 'severe':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'alert':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Activity className="h-4 w-4 text-blue-500" />;
    }
  };

  const getAlertBadgeVariant = (level: string): "default" | "destructive" | "outline" | "secondary" => {
    switch (level) {
      case 'severe':
        return 'destructive';
      case 'alert':
        return 'destructive';
      case 'warning':
        return 'secondary';
      default:
        return 'default';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Sun className="h-5 w-5" />
              Python Analysis Engine
            </CardTitle>
            <CardDescription>
              Advanced solar and space weather analysis
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {pythonHealthy !== null && (
              <Badge variant={pythonHealthy ? 'default' : 'destructive'}>
                {pythonHealthy ? 'Connected' : 'Disconnected'}
              </Badge>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={fetchPythonData}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {alerts.length > 0 && (
          <div className="mb-4 space-y-2">
            <h3 className="text-sm font-semibold">Active Alerts</h3>
            {alerts.map((alert, idx) => (
              <div key={idx} className="flex items-start gap-2 p-2 bg-gray-50 dark:bg-gray-900 rounded">
                {getAlertIcon(alert.level)}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={getAlertBadgeVariant(alert.level)} className="text-xs">
                      {alert.type}
                    </Badge>
                  </div>
                  <p className="text-sm mt-1">{alert.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        <Tabs defaultValue="solar" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="solar">Solar</TabsTrigger>
            <TabsTrigger value="satellite">Satellite</TabsTrigger>
            <TabsTrigger value="forecast">Forecast</TabsTrigger>
          </TabsList>

          <TabsContent value="solar" className="space-y-3">
            {solarData && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-gray-50 dark:bg-gray-900 rounded">
                    <p className="text-xs text-gray-500">F10.7 Index</p>
                    <p className="text-lg font-semibold">
                      {solarData.solar_indices?.['f10.7'] || 'N/A'}
                    </p>
                  </div>
                  <div className="p-2 bg-gray-50 dark:bg-gray-900 rounded">
                    <p className="text-xs text-gray-500">Sunspot Number</p>
                    <p className="text-lg font-semibold">
                      {solarData.solar_indices?.sunspot_number || 'N/A'}
                    </p>
                  </div>
                </div>

                {solarData.sunspot_analysis && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Active Regions</span>
                      <Badge>{solarData.sunspot_analysis.total_regions}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Complex Regions</span>
                      <Badge variant="destructive">
                        {solarData.sunspot_analysis.complex_regions}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Flare Potential</span>
                      <Badge variant="outline">
                        {solarData.sunspot_analysis.flare_potential}
                      </Badge>
                    </div>
                  </div>
                )}

                {solarData.flare_activity && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold">Flare Activity</h4>
                      <span className="text-xs text-gray-500">
                        Source: {solarData.flare_activity.data_source || 'NOAA'}
                      </span>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Badge variant="outline">24h</Badge>
                        <Badge>B: {solarData.flare_activity.counts_24h?.B || 0}</Badge>
                        <Badge>C: {solarData.flare_activity.counts_24h?.C || 0}</Badge>
                        <Badge>M: {solarData.flare_activity.counts_24h?.M || 0}</Badge>
                        <Badge>X: {solarData.flare_activity.counts_24h?.X || 0}</Badge>
                      </div>
                      {solarData.flare_activity.counts_3d && (
                        <div className="flex gap-2">
                          <Badge variant="outline">3d</Badge>
                          <Badge>B: {solarData.flare_activity.counts_3d?.B || 0}</Badge>
                          <Badge>C: {solarData.flare_activity.counts_3d?.C || 0}</Badge>
                          <Badge>M: {solarData.flare_activity.counts_3d?.M || 0}</Badge>
                          <Badge>X: {solarData.flare_activity.counts_3d?.X || 0}</Badge>
                        </div>
                      )}
                      <p className="text-sm">
                        Activity Level: <strong>{solarData.flare_activity.activity_level}</strong>
                      </p>
                    </div>
                    
                    {solarData.flare_activity.recent_flares && solarData.flare_activity.recent_flares.length > 0 && (
                      <div className="space-y-2">
                        <h5 className="text-xs font-semibold text-gray-600">Recent Flares</h5>
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs">
                            <thead className="bg-gray-50 dark:bg-gray-900">
                              <tr>
                                <th className="text-left p-1">Class</th>
                                <th className="text-left p-1">Peak</th>
                                <th className="text-left p-1">Region</th>
                                <th className="text-left p-1">Location</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                              {solarData.flare_activity.recent_flares.slice(0, 5).map((flare: any, idx: number) => (
                                <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-900">
                                  <td className="p-1 font-semibold">
                                    <span className={`${
                                      flare.class?.startsWith('X') ? 'text-red-600' :
                                      flare.class?.startsWith('M') ? 'text-orange-600' :
                                      flare.class?.startsWith('C') ? 'text-yellow-600' :
                                      'text-gray-600'
                                    }`}>
                                      {flare.class}
                                    </span>
                                  </td>
                                  <td className="p-1">
                                    {flare.peak ? new Date(flare.peak).toLocaleString('en-US', { 
                                      month: 'short', 
                                      day: 'numeric', 
                                      hour: '2-digit', 
                                      minute: '2-digit',
                                      timeZone: 'UTC',
                                      hour12: false
                                    }) + ' UTC' : 'N/A'}
                                  </td>
                                  <td className="p-1">{flare.region || 'N/A'}</td>
                                  <td className="p-1">{flare.location || 'N/A'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="satellite" className="space-y-3">
            {satelliteData && (
              <>
                {satelliteData.xray && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <Satellite className="h-4 w-4" />
                      X-Ray Flux
                    </h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 bg-gray-50 dark:bg-gray-900 rounded">
                        <p className="text-xs text-gray-500">Current</p>
                        <p className="text-sm font-semibold">
                          {satelliteData.xray.classification}
                        </p>
                      </div>
                      <div className="p-2 bg-gray-50 dark:bg-gray-900 rounded">
                        <p className="text-xs text-gray-500">Max 24h</p>
                        <p className="text-sm font-semibold">
                          {satelliteData.xray.max_24h?.toExponential(2)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {satelliteData.proton && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Proton Flux</h4>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">SEP Event</span>
                      <Badge variant={satelliteData.proton.sep_event_in_progress ? 'destructive' : 'outline'}>
                        {satelliteData.proton.sep_event_in_progress ? 'Active' : 'None'}
                      </Badge>
                    </div>
                  </div>
                )}

                {satelliteData.magnetometer && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold">Magnetometer</h4>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Disturbance Level</span>
                      <Badge>{satelliteData.magnetometer.disturbance_level}</Badge>
                    </div>
                    <div className="text-xs text-gray-500">
                      Variation: {satelliteData.magnetometer.variation_24h?.toFixed(1)} nT
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="forecast" className="space-y-3">
            {forecast && (
              <>
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    {forecast.forecast_period} Forecast
                  </h4>
                  
                  {forecast.current_conditions && (
                    <div className="p-2 bg-gray-50 dark:bg-gray-900 rounded space-y-1">
                      <p className="text-xs font-semibold">Current Conditions</p>
                      <div className="text-xs space-y-1">
                        <div>Solar Wind: {forecast.current_conditions.solar_wind_speed} km/s</div>
                        <div>Bz: {forecast.current_conditions.bz_component} nT</div>
                        <div>Dst: {forecast.current_conditions.dst_index?.toFixed(1)} nT</div>
                      </div>
                    </div>
                  )}

                  {forecast.predictions && (
                    <div className="space-y-2">
                      {forecast.predictions.map((pred: any, idx: number) => (
                        <div key={idx} className="p-2 border rounded">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold">{pred.date}</span>
                            <Badge variant="outline">Kp {pred.expected_kp}</Badge>
                          </div>
                          <div className="text-xs mt-1">
                            Storm Probability: {(pred.storm_probability * 100).toFixed(0)}%
                          </div>
                          <div className="text-xs text-gray-500">
                            {pred.expected_conditions}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}