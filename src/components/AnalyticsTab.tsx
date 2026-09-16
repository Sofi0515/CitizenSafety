import React, { useState, useEffect, useMemo } from 'react';
import { Zone, CityData } from '../types';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, LineChart,
  Line, Area, AreaChart, CartesianGrid, Legend, ComposedChart, PieChart, Pie
} from 'recharts';
import { 
  ShieldAlert, Activity, CheckSquare, Gauge, TrendingUp, MapPin
} from 'lucide-react';

import { apiClient } from '../api/client';

interface AnalyticsTabProps {
  zones: Zone[];
  selectedCity: CityData;
  onSelectZoneAndTab: (zone: Zone) => void;
}

// Custom Sparkline SVG Generator
const Sparkline: React.FC<{ data?: number[]; color: string }> = ({ data, color }) => {
  const safeData = data && Array.isArray(data) && data.length > 0 ? data : [20, 22, 21, 24, 23, 25];
  const width = 100;
  const height = 24;
  const padding = 2;
  const max = Math.max(...safeData);
  const min = Math.min(...safeData);
  const range = max - min || 1;

  const points = safeData.map((val, index) => {
    const x = padding + (index / (safeData.length - 1)) * (width - padding * 2);
    const y = padding + (1 - (val - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className="overflow-visible select-none">
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
};

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({
  zones,
  selectedCity,
  onSelectZoneAndTab,
}) => {
  const [timeRange, setTimeRange] = useState<'Today' | '7 Days' | '30 Days'>('Today');
  const [chartData, setChartData] = useState<any[]>([]);
  const [kpiData, setKpiData] = useState<any>({
    total_zones: 24,
    active_high_risk: 7,
    avg_risk_score: 67,
    predictions_today: 1842,
    sparklines: {
      total_zones: [20, 21, 22, 22, 23, 24],
      active_high_risk: [4, 5, 5, 8, 6, 7],
      avg_risk_score: [72, 70, 69, 68, 67, 67],
      predictions_today: [1200, 1340, 1500, 1620, 1800, 1842]
    }
  });

  const cityZones = useMemo(() => {
    const matched = zones.filter((z) => z.city.toLowerCase() === selectedCity.name.toLowerCase());
    return matched.length > 0 ? matched : zones;
  }, [zones, selectedCity]);

  // Fetch dynamic city KPIs
  useEffect(() => {
    apiClient.getKPIs(selectedCity.name)
      .then((res) => {
        if (res) {
          const totalZones = res.total_zones ?? res.total_zones_monitored ?? cityZones.length;
          const activeHigh = res.active_high_risk ?? res.active_high_risk_alerts ?? cityZones.filter((z: any) => z.riskLevel === 'High' || z.score >= 70).length;
          const avgScore = res.avg_risk_score ?? (cityZones.length ? Math.round(cityZones.reduce((a: number, b: any) => a + (b.riskScore || b.score || 50), 0) / cityZones.length) : 55);
          const predsToday = res.predictions_today ?? res.predictions_generated_today ?? 1842;
          
          setKpiData({
            total_zones: totalZones,
            active_high_risk: activeHigh,
            avg_risk_score: avgScore,
            predictions_today: predsToday,
            sparklines: res.sparklines || {
              total_zones: [totalZones - 2, totalZones - 1, totalZones, totalZones, totalZones + 1, totalZones],
              active_high_risk: [Math.max(1, activeHigh - 1), activeHigh, activeHigh + 1, activeHigh, activeHigh - 1, activeHigh],
              avg_risk_score: [avgScore + 2, avgScore + 1, avgScore, avgScore - 1, avgScore, avgScore],
              predictions_today: [1200, 1340, 1500, 1620, 1800, predsToday]
            }
          });
        }
      })
      .catch((err) => console.warn("API offline, using static KPI fallback:", err));
  }, [selectedCity, cityZones]);

  // Generate interactive metrics variation based on time range (via API or offline fallback)
  useEffect(() => {
    const rangeKey = timeRange === 'Today' ? 'today' : timeRange === '7 Days' ? '7d' : '30d';
    apiClient.getRiskByArea(selectedCity.name, rangeKey)
      .then((data) => {
        if (data && Array.isArray(data) && data.length > 0) {
          setChartData(data);
        } else {
          throw new Error("No data returned");
        }
      })
      .catch(() => {
        // Fallback to static mapping from active city zones
        const fallback = cityZones
          .map((z, i) => {
            let score = z.riskScore || 50;
            if (timeRange === '7 Days') {
              score = Math.max(5, score - 2 + (i % 3));
            } else if (timeRange === '30 Days') {
              score = Math.max(5, score - 4 + (i % 7));
            }
            return {
              name: z.name,
              RiskScore: Math.round(score),
              rawZone: z
            };
          });
        setChartData(fallback);
      });
  }, [timeRange, selectedCity, cityZones]);

  // Sorting top 5 zones for the leaderboard
  const topRiskyZones = useMemo(() => {
    return [...cityZones]
      .sort((a, b) => (b.riskScore || 0) - (a.riskScore || 0))
      .slice(0, 5);
  }, [cityZones]);

  const getBarColor = (score: number) => {
    if (score >= 70) return '#ff5d5d'; // High
    if (score >= 40) return '#ffb238'; // Medium
    return '#3ade7c'; // Low
  };

  return (
    <div className="h-full w-full flex flex-col p-6 overflow-y-auto select-none bg-[#0a0a0b] gap-6 text-[#f5f5f5]">
      
      {/* 1. Top KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* KPI 1: Total Zones Monitored */}
        <div className="bg-[#141417] border border-[#26262b] rounded-2xl p-5 shadow-card-dark flex flex-col justify-between h-[120px] relative">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
               <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/25">
                <CheckSquare className="w-4 h-4 text-blue-400" />
              </div>
              <span className="text-[10px] font-bold text-safenet-muted font-heading uppercase tracking-wider">
                Total Zones Monitored
              </span>
            </div>
            <span className="text-[10px] font-bold text-[#3ade7c] bg-[#3ade7c]/10 border border-[#3ade7c]/20 px-1.5 py-0.5 rounded">
              +3
            </span>
          </div>
          <div className="flex items-end justify-between mt-2">
            <div className="text-2xl font-black font-heading text-[#f5f5f5]">
              {kpiData?.total_zones ?? 0}
            </div>
            <Sparkline data={kpiData?.sparklines?.total_zones} color="#3B82F6" />
          </div>
        </div>

        {/* KPI 2: Active High-Risk Alerts */}
        <div className="bg-[#141417] border border-[#26262b] rounded-2xl p-5 shadow-card-dark flex flex-col justify-between h-[120px] relative">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center border border-red-500/25">
                <ShieldAlert className="w-4 h-4 text-red-400" />
              </div>
              <span className="text-[10px] font-bold text-safenet-muted font-heading uppercase tracking-wider">
                Active High-Risk Alerts
              </span>
            </div>
            <span className="text-[10px] font-bold text-[#3ade7c] bg-[#3ade7c]/10 border border-[#3ade7c]/20 px-1.5 py-0.5 rounded">
              +2
            </span>
          </div>
          <div className="flex items-end justify-between mt-2">
            <div className="text-2xl font-black font-heading text-[#f5f5f5]">
              {kpiData?.active_high_risk ?? 0}
            </div>
            <Sparkline data={kpiData?.sparklines?.active_high_risk} color="#EF4444" />
          </div>
        </div>

        {/* KPI 3: City-Wide Average Risk Score */}
        <div className="bg-[#141417] border border-[#26262b] rounded-2xl p-5 shadow-card-dark flex flex-col justify-between h-[120px] relative">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/25">
                <Gauge className="w-4 h-4 text-amber-400" />
              </div>
              <span className="text-[10px] font-bold text-safenet-muted font-heading uppercase tracking-wider">
                City-Wide Avg Risk Score
              </span>
            </div>
            <span className="text-[10px] font-bold text-[#ff5d5d] bg-[#ff5d5d]/10 border border-[#ff5d5d]/20 px-1.5 py-0.5 rounded">
              -4%
            </span>
          </div>
          <div className="flex items-end justify-between mt-2">
            <div className="text-2xl font-black font-heading text-[#f5f5f5]">
              {kpiData?.avg_risk_score ?? 0}
            </div>
            <Sparkline data={kpiData?.sparklines?.avg_risk_score} color="#F59E0B" />
          </div>
        </div>

        {/* KPI 4: Predictions Generated Today */}
        <div className="bg-[#141417] border border-[#26262b] rounded-2xl p-5 shadow-card-dark flex flex-col justify-between h-[120px] relative">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/25">
                <Activity className="w-4 h-4 text-emerald-400" />
              </div>
              <span className="text-[10px] font-bold text-safenet-muted font-heading uppercase tracking-wider">
                Predictions Generated Today
              </span>
            </div>
            <span className="text-[10px] font-bold text-[#3ade7c] bg-[#3ade7c]/10 border border-[#3ade7c]/20 px-1.5 py-0.5 rounded">
              +12%
            </span>
          </div>
          <div className="flex items-end justify-between mt-2">
            <div className="text-2xl font-black font-heading text-[#f5f5f5]">
              {(kpiData?.predictions_today ?? 1842).toLocaleString()}
            </div>
            <Sparkline data={kpiData?.sparklines?.predictions_today} color="#22C55E" />
          </div>
        </div>

      </div>

      {/* 2. Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Left Column: Risk by Area Bar Chart */}
        <div className="lg:col-span-3 bg-[#141417] border border-[#26262b] rounded-2xl p-5 shadow-card-dark flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <h3 className="font-heading font-bold text-base text-[#f5f5f5]">
                Risk by Area
              </h3>
              <p className="text-xs text-safenet-muted">Comparative score across top monitored zones</p>
            </div>
            <div className="flex items-center gap-1 bg-[#0a0a0b] border border-[#26262b] p-1 rounded-lg">
              {(['Today', '7 Days', '30 Days'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`flex items-center gap-1 px-3 py-1 text-[10px] font-bold rounded-md transition-all ${
                    timeRange === r 
                      ? 'bg-brand text-white shadow-sm' 
                      : 'text-safenet-muted hover:text-safenet-text'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
              >
                <XAxis 
                  dataKey="name" 
                  stroke="var(--safenet-muted)" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                />
                <YAxis 
                  stroke="var(--safenet-muted)" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false} 
                  domain={[0, 100]}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(100, 116, 139, 0.05)' }}
                  contentStyle={{
                    backgroundColor: '#141417',
                    border: '1px solid #26262b',
                    borderRadius: '12px',
                    fontSize: '11px',
                    color: '#f5f5f5',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)'
                  }}
                />
                <Bar 
                  dataKey="RiskScore" 
                  radius={[6, 6, 0, 0]}
                  barSize={36}
                >
                  {chartData.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={getBarColor(entry.RiskScore)} 
                      opacity={0.9}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Column: Top 5 Risky Areas Leaderboard */}
        <div className="lg:col-span-2 bg-[#141417] border border-[#26262b] rounded-2xl p-5 shadow-card-dark flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-heading font-bold text-base text-[#f5f5f5]">
                Top 5 Risky Areas
              </h3>
              <p className="text-xs text-safenet-muted">Click a zone to see its explanation</p>
            </div>
            
            {/* Live Indicator Badge */}
            <div className="flex items-center gap-1.5 bg-[#0a0a0b] border border-[#26262b] px-2 py-1 rounded text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              Live
            </div>
          </div>

          <div className="flex-1 flex flex-col justify-between gap-4 py-1">
            {topRiskyZones.map((zone, index) => {
              const severityColor = getBarColor(zone.riskScore);
              
              return (
                <button
                  key={zone.id}
                  onClick={() => onSelectZoneAndTab(zone)}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl border border-transparent hover:border-[#26262b] hover:bg-[#0a0a0b]/60 text-left transition-all active:scale-[0.99] group"
                >
                  {/* Rank number in a box */}
                  <div className="flex items-center gap-3 flex-1 mr-4">
                    <span className="w-6 h-6 flex-shrink-0 flex items-center justify-center bg-[#0a0a0b] border border-[#26262b] rounded-lg text-xs font-mono font-bold text-safenet-muted group-hover:text-brand transition-colors">
                      {index + 1}
                    </span>
                    
                    {/* Zone name and progress bar */}
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-heading font-bold text-[#f5f5f5] truncate">
                        {zone.name}
                      </div>
                      
                      {/* Horizontal progress bar */}
                      <div className="w-full h-1.5 bg-[#0a0a0b] rounded-full overflow-hidden mt-1.5">
                        <div 
                          className="h-full rounded-full transition-all duration-500"
                          style={{ 
                            width: `${zone.riskScore}%`,
                            backgroundColor: severityColor 
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="text-right flex items-center gap-1.5">
                    <span className="text-sm font-bold font-mono" style={{ color: severityColor }}>
                      {zone.riskScore}
                    </span>
                  </div>

                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* 3. Risk Score vs Area - Heat Map Style Visualization */}
      <div className="bg-[#141417] border border-[#26262b] rounded-2xl p-5 shadow-card-dark flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-heading font-bold text-base text-[#f5f5f5] flex items-center gap-2">
              <MapPin className="w-5 h-5 text-brand" />
              Risk Score Distribution - Heat Map View
            </h3>
            <p className="text-xs text-safenet-muted mt-1">Area-wise risk assessment with color-coded heat map intensity</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Area Chart - Risk Score Trend */}
          <div className="bg-[#0a0a0b] rounded-xl p-4 border border-[#26262b]">
            <h4 className="text-sm font-semibold text-[#f5f5f5] mb-4">Risk Score by Area (Sorted)</h4>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[...cityZones].sort((a, b) => b.riskScore - a.riskScore).slice(0, 8).map(z => ({
                    name: z.name.split(' ')[0],
                    score: z.riskScore,
                    level: z.riskLevel
                  }))}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ff5d5d" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#ff5d5d" stopOpacity={0.1}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="var(--safenet-muted)" />
                  <YAxis tick={{ fontSize: 12 }} stroke="var(--safenet-muted)" domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#141417',
                      border: '1px solid #26262b',
                      borderRadius: '8px',
                      fontSize: '11px',
                      color: '#f5f5f5'
                    }}
                    formatter={(value) => [`${value}/100`, 'Risk Score']}
                  />
                  <Bar 
                    dataKey="score" 
                    fill="#ff5d5d" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Composed Chart - Multiple Metrics */}
          <div className="bg-[#0a0a0b] rounded-xl p-4 border border-[#26262b]">
            <h4 className="text-sm font-semibold text-[#f5f5f5] mb-4">Multi-Metric Area Analysis</h4>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart
                  data={[...cityZones].sort((a, b) => b.riskScore - a.riskScore).slice(0, 8).map(z => ({
                    name: z.name.split(' ')[0],
                    risk: z.riskScore,
                    traffic: z.factors?.traffic || 50,
                    crime: z.factors?.crime || 50
                  }))}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="var(--safenet-muted)" />
                  <YAxis tick={{ fontSize: 12 }} stroke="var(--safenet-muted)" />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: '#141417',
                      border: '1px solid #26262b',
                      borderRadius: '8px',
                      fontSize: '11px',
                      color: '#f5f5f5'
                    }}
                  />
                  <Legend />
                  <Bar dataKey="risk" fill="#ff5d5d" radius={[4, 4, 0, 0]} name="Risk Score" />
                  <Line type="monotone" dataKey="traffic" stroke="#f59e0b" strokeWidth={2} name="Traffic Index" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Heat Map Grid - Risk Intensity Visualization */}
        <div className="bg-[#0a0a0b] rounded-xl p-4 border border-[#26262b]">
          <h4 className="text-sm font-semibold text-[#f5f5f5] mb-4">Risk Intensity Heat Map Grid (Top 15 Areas)</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {[...cityZones].sort((a, b) => b.riskScore - a.riskScore).slice(0, 15).map((zone) => {
              let bgColor = '#3ADE7C';
              let intensity = 0.3;
              
              if (zone.riskLevel === 'High') {
                bgColor = '#FF5D5D';
                intensity = 0.9;
              } else if (zone.riskLevel === 'Medium') {
                bgColor = '#FFB238';
                intensity = 0.6;
              }
              
              return (
                <div 
                  key={zone.id} 
                  className="flex flex-col items-center justify-center p-3 rounded-lg border border-[#26262b] hover:border-brand/50 transition-all cursor-pointer group"
                  style={{
                    backgroundColor: `${bgColor}${Math.round(intensity * 50).toString(16).padStart(2, '0')}`,
                    borderColor: bgColor
                  }}
                >
                  <div className="text-center">
                    <p className="text-[10px] font-bold text-[#f5f5f5] truncate group-hover:text-brand transition-colors">
                      {zone.name.split(' ')[0]}
                    </p>
                    <p className="text-lg font-black font-mono text-white mt-1">
                      {zone.riskScore}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Detailed Region Risk & Safety Analytics Table */}
      <div className="bg-[#141417] border border-[#26262b] rounded-2xl p-5 shadow-card-dark flex flex-col gap-4">
        <div>
          <h3 className="font-heading font-bold text-base text-[#f5f5f5]">
            Area Risk & Safety Telemetry Table
          </h3>
          <p className="text-xs text-safenet-muted">Comprehensive metrics and risk profiles for all monitored areas in {selectedCity.name}</p>
        </div>
        
        <div className="overflow-x-auto w-full">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[#26262b] text-safenet-muted uppercase font-heading font-bold tracking-wider text-[10px]">
                <th className="py-3 px-4">Area Name</th>
                <th className="py-3 px-4">Risk Level</th>
                <th className="py-3 px-4">Risk Score</th>
                <th className="py-3 px-4">Traffic Index</th>
                <th className="py-3 px-4">Crime Rate</th>
                <th className="py-3 px-4">Weather Severity</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#26262b]/60">
              {cityZones.map((zone) => {
                const severityColor = getBarColor(zone.riskScore);
                return (
                  <tr key={zone.id} className="hover:bg-[#0a0a0b]/40 transition-colors">
                    <td className="py-3 px-4 font-bold text-[#f5f5f5]">{zone.name}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                            style={{
                              backgroundColor: `${severityColor}20`,
                              color: severityColor,
                              border: `1px solid ${severityColor}40`
                            }}>
                        {zone.riskLevel}
                      </span>
                    </td>
                    <td className="py-3 px-4 min-w-[150px]">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-bold w-12" style={{ color: severityColor }}>{zone.riskScore}/100</span>
                        <div className="flex-1 h-2 bg-[#0a0a0b] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${zone.riskScore}%`, backgroundColor: severityColor }}></div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold">{zone.factors?.traffic ?? 50}%</td>
                    <td className="py-3 px-4 font-mono font-semibold">{zone.factors?.crime ?? 50}%</td>
                    <td className="py-3 px-4 font-mono font-semibold">{zone.factors?.weather ?? 50}%</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onSelectZoneAndTab(zone)}
                        className="px-3 py-1 bg-brand/10 border border-brand/20 text-brand rounded-lg text-[10px] font-bold hover:bg-brand/20 active:scale-95 transition-all"
                      >
                        Explain
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
    </div>
  );
};
