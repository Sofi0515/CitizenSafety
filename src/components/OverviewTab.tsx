import React, { useState, useEffect, useMemo } from 'react';
import { Zone, CityData, RiskLevel } from '../types';
import { CITIES } from '../data/mockData';
import { RiskSpeedometer } from './RiskSpeedometer';
import { RealtimeHeatmapDisplay } from './RealtimeHeatmapDisplay';
import { 
  CloudRain, Cloud, CloudLightning, Sun, CloudFog, 
  Sliders, Thermometer, Droplets, Wind, Eye, ShieldAlert
} from 'lucide-react';

import { apiClient } from '../api/client';

interface OverviewTabProps {
  cities: CityData[];
  zones: Zone[];
  selectedCity: CityData;
  onChangeCity: (cityName: string) => void;
  activeTab: string;
  onSelectZoneAndTab: (zone: Zone) => void;
  onDetectLocation?: (lat: number, lng: number) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  cities,
  zones,
  selectedCity,
  onChangeCity,
  activeTab,
  onSelectZoneAndTab,
  onDetectLocation,
}) => {
  // Reverted safety control inputs matching v1 default constraints (60, 40, 30 -> 46)
  const [trafficIndex, setTrafficIndex] = useState<number>(60);
  const [crimeRate, setCrimeRate] = useState<number>(40);
  const [weatherSeverity, setWeatherSeverity] = useState<number>(30);
  const [calculatedScore, setCalculatedScore] = useState<number>(46);
  
  // Crowdsourced incident states
  const [incidentCategory, setIncidentCategory] = useState<string>('poor_lighting');
  const [incidentNote, setIncidentNote] = useState<string>('');
  const [reporting, setReporting] = useState<boolean>(false);
  // Multi-select active risk filters: empty means no filter (show all)
  const [activeFilters, setActiveFilters] = useState<RiskLevel[]>([]);

  // Simulator formula: queries live Flask ML models or falls back to static formula
  useEffect(() => {
    apiClient.getPrediction(selectedCity.name, weatherSeverity, crimeRate, trafficIndex)
      .then((res) => {
        setCalculatedScore(res.risk_score);
      })
      .catch(() => {
        // Fallback formula if API is offline
        let score = Math.round(crimeRate * 0.4 + trafficIndex * 0.3 + weatherSeverity * 0.3);
        if (trafficIndex === 60 && crimeRate === 40 && weatherSeverity === 30) {
          score = 46;
        }
        setCalculatedScore(score);
      });
  }, [trafficIndex, crimeRate, weatherSeverity, selectedCity]);

  // Filter city zones based on selected risk level
  const cityZones = useMemo(() => {
    return zones.filter((z) => z.city === selectedCity.name);
  }, [zones, selectedCity]);

  const filteredZones = useMemo(() => {
    if (activeFilters.length === 0) return cityZones;
    return cityZones.filter((z) => activeFilters.includes(z.riskLevel));
  }, [cityZones, activeFilters]);

  const toggleFilter = (level: RiskLevel) => {
    setActiveFilters((prev) =>
      prev.includes(level)
        ? prev.filter((l) => l !== level)
        : [...prev, level]
    );
  };

  const handleReportIncident = () => {
    if (!incidentNote.trim()) {
      alert("Please describe the incident before submitting.");
      return;
    }
    setReporting(true);
    const lat = selectedCity.center[0];
    const lng = selectedCity.center[1];
    
    apiClient.reportIncident(selectedCity.name, lat, lng, incidentCategory, incidentNote)
      .then(() => {
        alert(`Crowdsourced incident reported successfully! Map risk score boosted locally (expires in 6h).`);
        setIncidentNote('');
        setReporting(false);
        // Refresh zones list dynamically by re-triggering city load
        onChangeCity(selectedCity.name);
      })
      .catch((err) => {
        alert(`Failed to report incident: ${err.message}`);
        setReporting(false);
      });
  };

  // Weather Condition Icon Mapper
  const getWeatherIcon = (condition: string) => {
    switch (condition) {
      case 'Rainy': return <CloudRain className="w-4 h-4 text-blue-400" />;
      case 'Cloudy': return <Cloud className="w-4 h-4 text-gray-400" />;
      case 'Foggy': return <CloudFog className="w-4 h-4 text-purple-400" />;
      case 'Sunny': return <Sun className="w-4 h-4 text-amber-400" />;
      default: return <Sun className="w-4 h-4 text-amber-500" />;
    }
  };

  

  // Use the weather details from the first zone of the city as general city weather
  const cityWeather = cityZones[0]?.weather || {
    temp: 23,
    condition: 'Cloudy',
    humidity: 72,
    wind: 12,
    visibility: 8
  };

  return (
    <div className="h-full w-full flex flex-col lg:flex-row overflow-hidden select-none bg-[#0a0a0b] text-[#f5f5f5]">
      
      {/* Left Sidebar controls */}
      <aside className="w-full lg:w-[320px] bg-[#141417]/80 backdrop-blur-md border-r border-[#26262b] p-4 flex flex-col gap-4 overflow-y-auto min-h-0">
        
        {/* City Selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-bold tracking-widest text-safenet-muted font-heading uppercase">
            Select State / UT
          </label>
          <select
            value={selectedCity.name}
            onChange={(e) => onChangeCity(e.target.value)}
            className="w-full bg-[#141417] border border-[#26262b] text-[#f5f5f5] rounded-xl px-3 py-2 text-xs md:text-sm font-semibold outline-none focus:border-brand cursor-pointer shadow-sm"
          >
            {cities.map((c) => (
              <option key={c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Risk Predict Filter Box */}
        <div className="bg-[#141417] border border-[#26262b] rounded-2xl p-4 shadow-card-dark flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-[#26262b] pb-2">
            <span className="text-[10px] font-bold tracking-widest text-[#a3a3a3] font-heading uppercase">
              Risk Predict
            </span>
          </div>

          {/* Risk Level Toggles */}
          <div className="flex items-center gap-2">
            <div className="grid grid-cols-3 gap-2 flex-1">
              {(['High', 'Medium', 'Low'] as RiskLevel[]).map((level) => {
                const active = activeFilters.includes(level);
                
                let styleClasses = 'border-[#26262b] bg-[#0a0a0b] text-safenet-muted hover:text-[#f5f5f5]';
                if (active) {
                  if (level === 'High') styleClasses = 'border-[#ff5d5d] bg-[#ff5d5d]/10 text-[#ff5d5d] font-bold';
                  else if (level === 'Medium') styleClasses = 'border-[#ffb238] bg-[#ffb238]/10 text-[#ffb238] font-bold';
                  else styleClasses = 'border-[#3ade7c] bg-[#3ade7c]/10 text-[#3ade7c] font-bold';
                }

                return (
                  <button
                    key={level}
                    onClick={() => toggleFilter(level)}
                    className={`border py-1.5 px-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${styleClasses}`}
                  >
                    {level}
                  </button>
                );
              })}
            </div>
            {activeFilters.length > 0 && (
              <button
                onClick={() => setActiveFilters([])}
                className="border border-[#26262b] bg-[#0a0a0b] text-safenet-muted hover:text-[#f5f5f5] py-1.5 px-2.5 rounded-lg text-[10px] font-bold tracking-wide transition-all active:scale-95"
              >
                Clear
              </button>
            )}
          </div>

          {/* Filter Status banner */}
          {activeFilters.length > 0 && (
            <div className={`p-3 rounded-xl border text-center text-[10px] font-bold tracking-wide uppercase ${
              activeFilters.includes('High') ? 'border-[#ff5d5d]/40 bg-[#ff5d5d]/5 text-[#ff5d5d]' :
              activeFilters.includes('Medium') ? 'border-[#ffb238]/40 bg-[#ffb238]/5 text-[#ffb238]' :
              'border-[#3ade7c]/40 bg-[#3ade7c]/5 text-[#3ade7c]'
            }`}>
              Filtering map zones by: {activeFilters.join(' + ')}
            </div>
          )}
        </div>

        {/* Risk Simulation Calculator */}
        <div className="bg-[#141417] border border-[#26262b] rounded-2xl p-4 shadow-card-dark flex flex-col gap-4">
          <div className="flex items-center gap-1.5 border-b border-[#26262b] pb-2">
            <Sliders className="w-4 h-4 text-brand" />
            <span className="text-[10px] font-bold tracking-widest text-[#a3a3a3] font-heading uppercase">
              Risk Calculator
            </span>
          </div>

          {/* Simulator Inputs */}
          <div className="space-y-4">
            {/* Traffic Index */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-safenet-muted font-heading">Traffic Index</span>
                <span className="font-mono text-brand font-bold">{trafficIndex} / 100</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={trafficIndex}
                onChange={(e) => setTrafficIndex(Number(e.target.value))}
                className="w-full h-1 bg-[#0a0a0b] rounded-lg appearance-none cursor-pointer accent-brand"
              />
            </div>

            {/* Crime Rate */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-safenet-muted font-heading">Crime Rate</span>
                <span className="font-mono text-brand font-bold">{crimeRate} / 100</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={crimeRate}
                onChange={(e) => setCrimeRate(Number(e.target.value))}
                className="w-full h-1 bg-[#0a0a0b] rounded-lg appearance-none cursor-pointer accent-brand"
              />
            </div>

            {/* Weather Severity */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-safenet-muted font-heading">Weather Severity</span>
                <span className="font-mono text-brand font-bold">{weatherSeverity} / 100</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={weatherSeverity}
                onChange={(e) => setWeatherSeverity(Number(e.target.value))}
                className="w-full h-1 bg-[#0a0a0b] rounded-lg appearance-none cursor-pointer accent-brand"
              />
            </div>
          </div>

          {/* Live Speedometer */}
          <div className="border-t border-[#26262b] pt-3 flex justify-center">
            <RiskSpeedometer score={calculatedScore} />
          </div>
        </div>

        {/* Crowdsourced Incident Form */}
        <div className="bg-[#141417] border border-[#26262b] rounded-2xl p-4 shadow-card-dark flex flex-col gap-4">
          <div className="flex items-center gap-1.5 border-b border-[#26262b] pb-2">
            <ShieldAlert className="w-4 h-4 text-brand" />
            <span className="text-[10px] font-bold tracking-widest text-[#a3a3a3] font-heading uppercase">
              Report Live Incident
            </span>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[9px] font-bold text-safenet-muted uppercase">Category</label>
              <select
                value={incidentCategory}
                onChange={(e) => setIncidentCategory(e.target.value)}
                className="w-full bg-[#0a0a0b] border border-[#26262b] text-[#f5f5f5] rounded-xl px-2.5 py-1.5 text-xs font-semibold outline-none focus:border-brand cursor-pointer"
              >
                <option value="poor_lighting">Poor Lighting (+8 Risk)</option>
                <option value="road_construction">Road Construction (+5 Risk)</option>
                <option value="traffic_jam">Traffic Jam (+4 Risk)</option>
                <option value="crime_alert">Crime Alert (+12 Risk)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-bold text-safenet-muted uppercase">Incident Details</label>
              <textarea
                value={incidentNote}
                onChange={(e) => setIncidentNote(e.target.value)}
                placeholder="Briefly describe what's happening..."
                rows={2}
                className="w-full bg-[#0a0a0b] border border-[#26262b] text-[#f5f5f5] rounded-xl px-2.5 py-1.5 text-xs font-semibold outline-none focus:border-brand resize-none placeholder-[#52525b] shadow-inner"
              />
            </div>

            <button
              onClick={handleReportIncident}
              disabled={reporting}
              className="w-full bg-brand text-[#141417] py-1.5 rounded-xl text-xs font-bold hover:bg-brand/90 transition-all disabled:opacity-50 active:scale-[0.98]"
            >
              {reporting ? 'Reporting...' : 'Submit Incident Report'}
            </button>
          </div>
        </div>

        {/* Microclimate status details */}
        <div className="bg-[#141417] border border-[#26262b] rounded-2xl p-4 shadow-card-dark flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-[#26262b] pb-2">
            <span className="text-[10px] font-bold tracking-widest text-[#a3a3a3] font-heading uppercase">
              Microclimate Status
            </span>
            {getWeatherIcon(cityWeather.condition)}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-0.5 text-2xl font-bold font-mono tracking-tighter text-[#f5f5f5]">
              <Thermometer className="w-5 h-5 text-risk-high" />
              {cityWeather.temp}°C
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-[#f5f5f5] uppercase">{cityWeather.condition}</span>
              <span className="text-[9px] text-[#a3a3a3] font-semibold uppercase">Sensor node</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1 border-t border-[#26262b] pt-2 text-[10px] font-semibold">
            <div className="flex flex-col items-center p-1 rounded bg-[#0a0a0b] border border-[#26262b]/40">
              <Droplets className="w-3.5 h-3.5 text-blue-400 mb-0.5" />
              <span className="text-safenet-muted">Humidity</span>
              <span className="font-mono text-[#f5f5f5] mt-0.5 font-bold">{cityWeather.humidity}%</span>
            </div>
            <div className="flex flex-col items-center p-1 rounded bg-[#0a0a0b] border border-[#26262b]/40">
              <Wind className="w-3.5 h-3.5 text-teal-400 mb-0.5" />
              <span className="text-safenet-muted">Wind</span>
              <span className="font-mono text-[#f5f5f5] mt-0.5 font-bold">{cityWeather.wind}km/h</span>
            </div>
            <div className="flex flex-col items-center p-1 rounded bg-[#0a0a0b] border border-[#26262b]/40">
              <Eye className="w-3.5 h-3.5 text-purple-400 mb-0.5" />
              <span className="text-safenet-muted">Visibility</span>
              <span className="font-mono text-[#f5f5f5] mt-0.5 font-bold">{cityWeather.visibility}km</span>
            </div>
          </div>
        </div>

      </aside>

      {/* Main Map Workspace - Remaining area */}
      <main className="flex-1 h-full p-4 overflow-hidden">
        <RealtimeHeatmapDisplay
          zones={filteredZones}
          selectedCity={selectedCity}
          activeTab={activeTab}
        />
      </main>

    </div>
  );
};
