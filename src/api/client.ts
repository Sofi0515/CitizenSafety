import { Zone, SafetyAlert, ModelPerformanceData } from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

async function fetchJson(url: string, options?: RequestInit) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `HTTP error ${res.status}`);
  }
  const json = await res.json();
  if (json.error) {
    throw new Error(json.error);
  }
  return json.data;
}

export const apiClient = {
  // Query all regions
  getCities: (): Promise<any> => 
    fetchJson(`${API_BASE}/regions`),
    
  // Query zones inside a region
  getZones: (cityName: string): Promise<Zone[]> => {
    const slug = cityName.toLowerCase().trim().replace(/[\s\-\_]+/g, '_');
    return fetchJson(`${API_BASE}/regions/${slug}/zones`).then(res => {
      return (res.zones || []).map((z: any) => ({
        id: z.id,
        name: z.name,
        city: cityName,
        riskScore: z.score,
        riskLevel: z.level ? (z.level.charAt(0).toUpperCase() + z.level.slice(1)) : 'Low',
        coordinates: [z.lat, z.lng] as [number, number],
        factors: z.factors || { traffic: 50, crime: 50, weather: 50 },
        weather: z.weather || { temp: 23, condition: 'Cloudy', humidity: 70, wind: 10, visibility: 10 },
        shapContributions: z.shapContributions || [],
        explanation: z.explanation || '',
        confidenceScore: z.confidence || 90,
        modelName: z.modelName || 'Gradient Boosted Forest Ensemble'
      }));
    });
  },
    
  getAlerts: (cityName: string): Promise<SafetyAlert[]> => {
    const slug = cityName.toLowerCase().trim().replace(/[\s\-\_]+/g, '_');
    return fetchJson(`${API_BASE}/regions/${slug}/alerts`).then(res => res.alerts);
  },
    
  acknowledgeAlert: (alertId: string): Promise<any> => 
    Promise.resolve({ id: alertId, acknowledged: true }),
    
  notifyAuthorities: (_alertId: string): Promise<any> => 
    Promise.resolve({ success: true }),
    
  // Live ML prediction scoring with safety controls
  getPrediction: (
    cityName: string, 
    weather: number, 
    crime: number, 
    traffic: number
  ): Promise<{ risk_score: number, risk_level: string, confidence_score: number, top_factors?: any[] }> => {
    const slug = cityName.toLowerCase().trim().replace(/[\s\-\_]+/g, '_');
    return fetchJson(`${API_BASE}/predict/manual`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        region: slug, 
        traffic_index: traffic, 
        crime_rate: crime,
        weather_severity: weather
      })
    }).then(res => ({
      risk_score: res.score,
      risk_level: res.level,
      confidence_score: res.confidence,
      top_factors: res.top_factors
    }));
  },
    
  getKPIs: (cityName: string): Promise<any> => {
    const slug = cityName.toLowerCase().trim().replace(/[\s\-\_]+/g, '_');
    return fetchJson(`${API_BASE}/regions/${slug}/kpis`);
  },
    
  getExplanation: (cityName: string, zoneId: string): Promise<any> => {
    const slug = cityName.toLowerCase().trim().replace(/[\s\-\_]+/g, '_');
    return fetchJson(`${API_BASE}/regions/${slug}/zones/${zoneId}/explain`);
  },
  
  // Auto-detect region from browser coordinate
  detectLocation: (lat: number, lng: number): Promise<any> => {
    return fetchJson(`${API_BASE}/location/detect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lng })
    });
  },
  
  // Submit crowdsourced incident reports
  reportIncident: (
    cityName: string,
    lat: number,
    lng: number,
    category: string,
    note: string
  ): Promise<any> => {
    const slug = cityName.toLowerCase().trim().replace(/[\s\-\_]+/g, '_');
    return fetchJson(`${API_BASE}/incidents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        region: slug,
        lat,
        lng,
        category,
        note
      })
    });
  },
  
  // Retrieve crowdsourced reports
  getIncidents: (cityName: string): Promise<any[]> => {
    const slug = cityName.toLowerCase().trim().replace(/[\s\-\_]+/g, '_');
    return fetchJson(`${API_BASE}/regions/${slug}/incidents`).then(res => res.incidents);
  },
  
  // Real-time heatmap with color-coded risk
  getRealtimeHeatmap: (stateId: string, hour?: number): Promise<any> => {
    const url = new URL(`${API_BASE}/states/${stateId}/analytics/heatmap/realtime`);
    if (hour !== undefined) {
      url.searchParams.append('hour', hour.toString());
    }
    return fetchJson(url.toString());
  },
  
  // Real-time heatmap grid format for visualization
  getRealtimeHeatmapGrid: (stateId: string, hour?: number): Promise<any> => {
    const url = new URL(`${API_BASE}/states/${stateId}/analytics/heatmap/realtime/grid`);
    if (hour !== undefined) {
      url.searchParams.append('hour', hour.toString());
    }
    return fetchJson(url.toString());
  },
  
  // Real-time security allocation recommendations
  getRealtimeSecurityAllocation: (stateId: string, hour?: number): Promise<any> => {
    const url = new URL(`${API_BASE}/states/${stateId}/analytics/security-allocation/realtime`);
    if (hour !== undefined) {
      url.searchParams.append('hour', hour.toString());
    }
    return fetchJson(url.toString());
  },
  
  // Get risk by area (enhanced for analytics)
  getRiskByArea: (cityName: string, range?: string): Promise<any[]> => {
    const slug = cityName.toLowerCase().trim().replace(/[\s\-\_]+/g, '_');
    const url = new URL(`${API_BASE}/states/${slug}/analytics/risk-by-area`);
    if (range) {
      url.searchParams.append('range', range);
    }
    return fetchJson(url.toString());
  },

  // Get model performance analysis evaluation metrics
  getModelPerformance: (cityName: string): Promise<ModelPerformanceData> => {
    const slug = cityName.toLowerCase().trim().replace(/[\s\-\_]+/g, '_');
    return fetchJson(`${API_BASE}/regions/${slug}/model-performance`);
  }
};
