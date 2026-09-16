import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import * as L from 'leaflet';
import { Zone, CityData } from '../types';
import { Navigation, RotateCcw } from 'lucide-react';

interface RiskMapProps {
  zones: Zone[];
  selectedCity: CityData;
  onSelectZone: (zone: Zone) => void;
  activeTab: string;
  totalStateZonesCount: number;
  onDetectLocation?: (lat: number, lng: number) => void;
}

// Map Resizer component to resolve hidden Leaflet resize issues
const MapResizer: React.FC<{ activeTab: string }> = ({ activeTab }) => {
  const map = useMap();
  useEffect(() => {
    if (activeTab === 'Overview') {
      const timer = setTimeout(() => {
        map.invalidateSize();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [activeTab, map]);
  return null;
};

// Map Recenter component when city changes
const MapRecenter: React.FC<{ center: [number, number]; zoom: number }> = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
};

export const RiskMap: React.FC<RiskMapProps> = ({ zones, selectedCity, onSelectZone, activeTab, totalStateZonesCount, onDetectLocation }) => {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>(selectedCity.center);
  const [mapZoom, setMapZoom] = useState<number>(selectedCity.zoom);

  // Sync state with selectedCity prop
  useEffect(() => {
    setMapCenter(selectedCity.center);
    setMapZoom(selectedCity.zoom);
  }, [selectedCity]);

  // Create custom marker icons with larger size for better visibility
  const createMarkerIcon = (riskLevel: 'Low' | 'Medium' | 'High') => {
    let color = '';
    let isHigh = false;
    
    if (riskLevel === 'High') {
      color = '#FF5D5D'; // risk-high
      isHigh = true;
    } else if (riskLevel === 'Medium') {
      color = '#FFB238'; // risk-medium
    } else {
      color = '#3ADE7C'; // risk-low
    }

    return L.divIcon({
      className: 'custom-div-icon',
      html: `
        <div class="relative flex items-center justify-center w-10 h-10">
          ${isHigh ? `<div class="absolute w-10 h-10 rounded-full opacity-40 animate-ping" style="background-color: ${color};"></div>` : ''}
          <div class="w-5 h-5 rounded-full border-2 border-white dark:border-[#0a0a0b] shadow-lg transition-transform duration-300 hover:scale-125" style="background-color: ${color};"></div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });
  };

  // Get current user location
  const handleUseMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
          setMapCenter([latitude, longitude]);
          setMapZoom(13);
          if (onDetectLocation) {
            onDetectLocation(latitude, longitude);
          }
        },
        (error) => {
          alert('Error getting geolocation: ' + error.message);
        }
      );
    } else {
      alert('Geolocation is not supported by this browser.');
    }
  };

  const handleResetView = () => {
    setMapCenter(selectedCity.center);
    setMapZoom(selectedCity.zoom);
    setUserLocation(null);
  };

  return (
    <div className="h-full flex flex-col bg-[#141417] border border-[#26262b] rounded-2xl shadow-card-dark overflow-hidden">
      {/* Header Controls matching screenshot */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b border-[#26262b] bg-[#141417]/50 gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-heading font-bold text-[#f5f5f5] text-base">
              Risk Map
            </h3>
            <span className="text-[10px] bg-[#26262b] text-[#a3a3a3] font-bold px-2.5 py-0.5 rounded-full font-mono">
              {zones.length} {zones.length === 1 ? 'zone' : 'zones'} shown
            </span>
          </div>
          <p className="text-xs text-safenet-muted mt-0.5">
            {selectedCity.name} - Live location & risk zones
          </p>
          {totalStateZonesCount < 5 && (
            <p className="text-[10px] text-[#ffb238] font-bold mt-1 tracking-wide">
              ⚠️ Limited data available for this state in the current dataset
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleUseMyLocation}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold border border-[#26262b] bg-[#0a0a0b] text-[#f5f5f5] hover:bg-[#141417] active:scale-95 transition-all rounded-lg"
          >
            <Navigation className="w-3.5 h-3.5 text-brand" />
            Use My Location
          </button>
          <button
            onClick={handleResetView}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold border border-[#26262b] bg-[#0a0a0b] text-[#f5f5f5] hover:bg-[#141417] active:scale-95 transition-all rounded-lg"
          >
            <RotateCcw className="w-3.5 h-3.5 text-brand" />
            Reset View
          </button>
        </div>
      </div>

      {/* Map Content */}
      <div className="flex-1 relative min-h-[300px]">
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          style={{ height: '100%', width: '100%', zIndex: 1 }}
          zoomControl={true}
        >
          <MapResizer activeTab={activeTab} />
          <MapRecenter center={mapCenter} zoom={mapZoom} />

          {/* Tile Layer (OSM with custom dark mode class injection via CSS filters in index.css) */}
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          {/* User Location marker */}
          {userLocation && (
            <Marker
              position={userLocation}
              icon={L.divIcon({
                className: 'user-icon',
                html: `
                  <div class="relative flex items-center justify-center w-8 h-8">
                    <div class="absolute w-8 h-8 rounded-full bg-blue-500/30 animate-pulse"></div>
                    <div class="w-3.5 h-3.5 rounded-full border-2 border-white bg-blue-500 shadow-md"></div>
                  </div>
                `
              })}
            >
              <Popup>
                <div className="text-xs font-semibold p-1">Your Current Location</div>
              </Popup>
            </Marker>
          )}

          {/* Heat map risk areas (concentric glow layers with enhanced visibility) */}
          {zones.map((zone) => {
            let color = '#3ADE7C';
            let baseOpacity = 0.1; // Base opacity for low risk
            
            if (zone.riskLevel === 'High') {
              color = '#FF5D5D';
              baseOpacity = 0.25; // Higher opacity for high risk
            } else if (zone.riskLevel === 'Medium') {
              color = '#FFB238';
              baseOpacity = 0.18; // Medium opacity for medium risk
            }
            
            return (
              <React.Fragment key={`heat-${zone.id}`}>
                {/* Outermost very faint circle - creates halo effect */}
                <Circle
                  center={zone.coordinates}
                  radius={2000}
                  pathOptions={{
                    fillColor: color,
                    fillOpacity: baseOpacity * 0.4,
                    stroke: false,
                    interactive: false
                  }}
                />
                {/* Outer wide gradient circle */}
                <Circle
                  center={zone.coordinates}
                  radius={1400}
                  pathOptions={{
                    fillColor: color,
                    fillOpacity: baseOpacity * 0.7,
                    stroke: false,
                    interactive: false
                  }}
                />
                {/* Middle circle with stronger color */}
                <Circle
                  center={zone.coordinates}
                  radius={900}
                  pathOptions={{
                    fillColor: color,
                    fillOpacity: baseOpacity * 1.2,
                    stroke: false,
                    interactive: false
                  }}
                />
                {/* Inner stronger color circle - most prominent */}
                <Circle
                  center={zone.coordinates}
                  radius={500}
                  pathOptions={{
                    fillColor: color,
                    fillOpacity: baseOpacity * 1.5,
                    stroke: true,
                    color: color,
                    weight: 1,
                    interactive: false
                  }}
                />
              </React.Fragment>
            );
          })}

          {/* Zone Markers */}
          {zones.map((zone) => (
            <Marker
              key={zone.id}
              position={zone.coordinates}
              icon={createMarkerIcon(zone.riskLevel)}
            >
              {/* Custom styled popup matching screenshot */}
              <Popup>
                <div className="p-1 min-w-[170px] text-center bg-[#141417] text-[#f5f5f5] rounded-lg">
                  <h4 className="font-heading font-bold text-sm mb-1 text-[#f5f5f5]">
                    {zone.name}
                  </h4>
                  <p className="text-xs text-safenet-muted mb-3">
                    Risk Score: <span className="font-mono font-bold text-[#f5f5f5]">{zone.riskScore}/100</span> •{' '}
                    <span 
                      className="font-bold" 
                      style={{ color: zone.riskLevel === 'High' ? '#ff5d5d' : zone.riskLevel === 'Medium' ? '#ffb238' : '#3ade7c' }}
                    >
                      {zone.riskLevel.toUpperCase()}
                    </span>
                  </p>
                  <button
                    onClick={() => onSelectZone(zone)}
                    className="w-full text-center px-4 py-1.5 text-xs font-bold bg-[#3b82f6] text-white hover:bg-[#2563eb] rounded-lg transition-all active:scale-95"
                  >
                    View Explanation
                  </button>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* Legend Overlay matching screenshot */}
        <div className="absolute bottom-4 left-4 z-[999] bg-[#141417]/95 backdrop-blur-md border border-[#26262b] p-3.5 rounded-xl shadow-lg flex flex-col gap-2 text-xs select-none">
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-[#ff5d5d]"></span>
            <span className="text-[#f5f5f5] font-semibold">High Risk</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-[#ffb238]"></span>
            <span className="text-[#f5f5f5] font-semibold">Medium Risk</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-3 h-3 rounded-full bg-[#3ade7c]"></span>
            <span className="text-[#f5f5f5] font-semibold">Low Risk</span>
          </div>
        </div>
      </div>
    </div>
  );
};
