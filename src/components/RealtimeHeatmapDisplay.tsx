import React, { useEffect, useState, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Circle, Marker, Popup, useMap } from 'react-leaflet';
import * as L from 'leaflet';
import { Zone, CityData } from '../types';
import { Clock, AlertTriangle, TrendingUp, Zap } from 'lucide-react';
import { apiClient } from '../api/client';

interface RealtimeHeatmapProps {
  zones: Zone[];
  selectedCity: CityData;
  activeTab: string;
  autoRefreshInterval?: number; // milliseconds (default: 60000 = 1 minute)
}

interface RealTimeZoneData {
  name: string;
  real_time_risk: number;
  risk_level: string;
  color: string;
  security_action: string;
  latitude: number;
  longitude: number;
  crime_rate: number;
  base_risk_score: number;
  current_hour: number;
  population_factor: number;
  traffic_index: number;
  incidents_30d: number;
  confidence: number;
}

const getISTHour = () => {
  const dateStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  return new Date(dateStr).getHours();
};

const getISTTimeString = () => {
  return new Date().toLocaleTimeString("en-US", { timeZone: "Asia/Kolkata" });
};

const MapResizer: React.FC<{ activeTab: string }> = ({ activeTab }) => {
  const map = useMap();
  useEffect(() => {
    if (activeTab === 'Security') {
      const timer = setTimeout(() => {
        map.invalidateSize();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeTab, map]);
  return null;
};

const MapRecenter: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

export const RealtimeHeatmapDisplay: React.FC<RealtimeHeatmapProps> = ({
  zones,
  selectedCity,
  activeTab,
  autoRefreshInterval = 60000, // Default: 1 minute
}) => {
  const [heatmapData, setHeatmapData] = useState<RealTimeZoneData[]>([]);
  const [currentHour, setCurrentHour] = useState<number>(getISTHour());
  const [colorDistribution, setColorDistribution] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState<[number, number]>(selectedCity.center);
  const [mapZoom, setMapZoom] = useState<number>(selectedCity.zoom);
  const [isAutoUpdating, setIsAutoUpdating] = useState(true);
  const [lastUpdateTime, setLastUpdateTime] = useState<string>(getISTTimeString());
  const [updateCountdown, setUpdateCountdown] = useState<number>(Math.floor(autoRefreshInterval / 1000));
  const autoUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Update map when city changes
  useEffect(() => {
    setMapCenter(selectedCity.center);
    setMapZoom(selectedCity.zoom);
  }, [selectedCity]);

  // Function to fetch real-time heatmap data
  const fetchHeatmapData = async (hour?: number) => {
    setLoading(true);
    const stateId = selectedCity.name.toLowerCase().replace(/\s+/g, '_');
    const targetHour = hour !== undefined ? hour : getISTHour();
    
    try {
      const data: any = await apiClient.getRealtimeHeatmap(stateId, targetHour);
      if (data && data.heatmap_data) {
        setHeatmapData(data.heatmap_data);
        setColorDistribution(data.color_distribution);
        setCurrentHour(targetHour);
        setLastUpdateTime(getISTTimeString());
      }
    } catch (err) {
      console.warn('Failed to fetch real-time heatmap:', err);
      // Fallback: use mock data
      setHeatmapData(
        zones
          .filter((z) => z.city === selectedCity.name)
          .map((z) => ({
            name: z.name,
            real_time_risk: z.riskScore,
            risk_level: z.riskLevel,
            color:
              z.riskLevel === 'High'
                ? '#FF5D5D'
                : z.riskLevel === 'Medium'
                ? '#FFB238'
                : '#3ADE7C',
            security_action: `Security level: ${z.riskLevel}`,
            latitude: z.coordinates[0],
            longitude: z.coordinates[1],
            crime_rate: z.factors?.crime || 50,
            base_risk_score: z.riskScore,
            current_hour: targetHour,
            population_factor: 0.6,
            traffic_index: z.factors?.traffic || 50,
            incidents_30d: 5,
            confidence: z.confidenceScore,
          }))
      );
    } finally {
      setLoading(false);
    }
  };

  // Auto-update effect
  useEffect(() => {
    if (!isAutoUpdating) return;

    // Initial fetch
    fetchHeatmapData();

    // Setup auto-update interval
    autoUpdateIntervalRef.current = setInterval(() => {
      const newHour = getISTHour();
      fetchHeatmapData(newHour);
    }, autoRefreshInterval);

    return () => {
      if (autoUpdateIntervalRef.current) {
        clearInterval(autoUpdateIntervalRef.current);
      }
    };
  }, [selectedCity, isAutoUpdating, autoRefreshInterval, zones]);

  // Countdown timer for next update
  useEffect(() => {
    if (!isAutoUpdating) return;

    setUpdateCountdown(Math.floor(autoRefreshInterval / 1000));

    countdownIntervalRef.current = setInterval(() => {
      setUpdateCountdown((prev) => {
        if (prev <= 1) {
          return Math.floor(autoRefreshInterval / 1000);
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [isAutoUpdating, autoRefreshInterval]);

  // Time period indicator
  const getTimePeriod = (hour: number) => {
    if (22 <= hour || hour < 6) return { period: '🌙 Night (Low Population - HIGH RISK)', risk: 'CRITICAL' };
    if ((6 <= hour && hour < 9) || (17 <= hour && hour < 20))
      return { period: '🌅 Commute Hours (Medium Population)', risk: 'HIGH' };
    return { period: '☀️ Peak Hours (High Population)', risk: 'MEDIUM' };
  };

  const timePeriod = getTimePeriod(currentHour);

  // Create heatmap marker
  const createHeatmapMarker = (zone: RealTimeZoneData) => {
    return L.divIcon({
      className: 'custom-heatmap-icon',
      html: `
        <div class="relative flex items-center justify-center">
          <div class="absolute w-16 h-16 rounded-full opacity-30 animate-pulse" style="background-color: ${zone.color};"></div>
          <div class="w-8 h-8 rounded-full border-2 border-white dark:border-[#0a0a0b] shadow-lg" style="background-color: ${zone.color};"></div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
    });
  };

  // Build concentric circles for heatmap visualization
  const buildHeatmapLayers = () => {
    return heatmapData.map((zone) => {
      // Radius based on risk level
      const radiusMultiplier = zone.real_time_risk / 100; // 0-1 scale
      const maxRadius = 2500; // Maximum 2.5km

      return (
        <React.Fragment key={`heatmap-${zone.name}`}>
          {/* Outermost circle - very faint */}
          <Circle
            center={[zone.latitude, zone.longitude]}
            radius={maxRadius * radiusMultiplier}
            pathOptions={{
              fillColor: zone.color,
              fillOpacity: 0.08,
              stroke: false,
              interactive: false,
            }}
          />
          {/* Middle circle */}
          <Circle
            center={[zone.latitude, zone.longitude]}
            radius={maxRadius * radiusMultiplier * 0.6}
            pathOptions={{
              fillColor: zone.color,
              fillOpacity: 0.15,
              stroke: false,
              interactive: false,
            }}
          />
          {/* Inner circle - most opaque */}
          <Circle
            center={[zone.latitude, zone.longitude]}
            radius={maxRadius * radiusMultiplier * 0.3}
            pathOptions={{
              fillColor: zone.color,
              fillOpacity: 0.3,
              stroke: true,
              color: zone.color,
              weight: 2,
              interactive: false,
            }}
          />
        </React.Fragment>
      );
    });
  };

  return (
    <div className="h-full flex flex-col bg-safenet-bg">
      {/* Header with Time Control */}
      <div className="bg-safenet-card border-b border-safenet-border p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-safenet-text flex items-center gap-2">
              <Clock className="w-5 h-5 text-brand" />
              Real-Time Risk Heatmap
            </h2>
            <p className="text-sm text-safenet-muted mt-1">
              Time-aware security allocation based on crime rate and population density
            </p>
          </div>
        </div>

        {/* Time Period Indicator */}
        <div className="bg-safenet-bg border border-safenet-border rounded-lg p-3 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0 text-brand" />
          <div>
            <p className="font-semibold text-safenet-text">{timePeriod.period}</p>
            <p className="text-xs text-safenet-muted mt-1">
              {22 <= currentHour || currentHour < 6
                ? '⚠️ Low population increases vulnerability. Deploy maximum security resources.'
                : (6 <= currentHour && currentHour < 9) || (17 <= currentHour && currentHour < 20)
                ? '📍 Commute hours: Security spread across zones with heightened response.'
                : '✅ Peak hours: Population spread reduces vulnerability in high-crime areas.'}
            </p>
          </div>
        </div>

        {/* Hour Slider */}
        <div className="flex items-center gap-4">
          <label className="text-sm font-semibold text-safenet-text">Simulate Hour:</label>
          <input
            type="range"
            min="0"
            max="23"
            value={currentHour}
            onChange={(e) => setCurrentHour(parseInt(e.target.value))}
            className="flex-1 h-2 bg-safenet-border rounded-lg appearance-none cursor-pointer accent-brand"
          />
          <span className="text-sm font-mono font-bold bg-brand/20 px-3 py-1 rounded text-brand min-w-[50px] text-center">
            {currentHour.toString().padStart(2, '0')}:00
          </span>
        </div>

        {/* Color Legend with Zone Distribution */}
        {colorDistribution && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {[
              { level: 'CRITICAL', color: '#FF5D5D', label: '🚨 Critical' },
              { level: 'HIGH', color: '#FFB238', label: '⚠️ High' },
              { level: 'MEDIUM', color: '#FFF700', label: '📍 Medium' },
              { level: 'LOW', color: '#3ADE7C', label: '✅ Low' },
              { level: 'SAFE', color: 'transparent', label: '✓ Safe' },
            ].map((item) => (
              <div key={item.level} className="flex items-center gap-2 text-xs">
                <div
                  className="w-4 h-4 rounded-full border border-safenet-border"
                  style={{
                    backgroundColor: item.color,
                  }}
                />
                <span className="text-safenet-text">
                  {item.label} ({colorDistribution[item.level] || 0})
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Map Container */}
      <div className="flex-1 relative min-h-0">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-safenet-bg/80 z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand mx-auto mb-2"></div>
              <p className="text-safenet-muted">Loading real-time heatmap...</p>
            </div>
          </div>
        ) : null}

        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: '100%', width: '100%', zIndex: 1 }}
          zoomControl={true}
        >
          <MapResizer activeTab={activeTab} />
          <MapRecenter center={mapCenter} zoom={mapZoom} />

          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* Heatmap circles */}
          {buildHeatmapLayers()}

          {/* Zone markers */}
          {heatmapData.map((zone) => (
            <Marker
              key={zone.name}
              position={[zone.latitude, zone.longitude]}
              icon={createHeatmapMarker(zone)}
            >
              <Popup>
                <div className="p-2 bg-safenet-card text-safenet-text rounded-lg space-y-2 min-w-[220px]">
                  <h4 className="font-bold text-lg">{zone.name}</h4>
                  <div className="space-y-1 text-xs">
                    <p>
                      <strong>Real-Time Risk:</strong>{' '}
                      <span style={{ color: zone.color }} className="font-bold">
                        {zone.real_time_risk.toFixed(1)}/100
                      </span>
                    </p>
                    <p>
                      <strong>Risk Level:</strong> {zone.risk_level}
                    </p>
                    <p>
                      <strong>Crime Rate:</strong> {zone.crime_rate.toFixed(1)}
                    </p>
                    <p>
                      <strong>Population Factor:</strong> {(zone.population_factor * 100).toFixed(0)}%
                    </p>
                    <p>
                      <strong>Traffic:</strong> {zone.traffic_index.toFixed(1)}
                    </p>
                    <p className="text-[10px] mt-2 p-2 bg-safenet-bg rounded italic border border-safenet-border">
                      {zone.security_action}
                    </p>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Legend Overlay */}
        <div className="absolute bottom-4 left-4 z-[999] bg-safenet-card/95 backdrop-blur-md border border-safenet-border p-4 rounded-xl shadow-lg space-y-3 text-xs select-none">
          <div className="font-bold text-safenet-text">Risk Level & Security Action</div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#FF5D5D' }} />
              <div>
                <p className="font-semibold text-safenet-text">CRITICAL</p>
                <p className="text-[10px] text-safenet-muted">🚨 Max security deployment</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#FFB238' }} />
              <div>
                <p className="font-semibold text-safenet-text">HIGH</p>
                <p className="text-[10px] text-safenet-muted">⚠️ Heightened security</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#FFF700' }} />
              <div>
                <p className="font-semibold text-safenet-text">MEDIUM</p>
                <p className="text-[10px] text-safenet-muted">📍 Standard protocols</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#3ADE7C' }} />
              <div>
                <p className="font-semibold text-safenet-text">LOW</p>
                <p className="text-[10px] text-safenet-muted">✅ Minimal security</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
