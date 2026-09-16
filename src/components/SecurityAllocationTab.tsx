import React, { useMemo, useState } from 'react';
import { Zone, CityData } from '../types';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, 
  Legend, ResponsiveContainer, LineChart, Line, Area, AreaChart, CartesianGrid
} from 'recharts';
import { AlertCircle, Shield, TrendingUp, Users, MapPin } from 'lucide-react';
import { RealtimeHeatmapDisplay } from './RealtimeHeatmapDisplay';

interface SecurityAllocationTabProps {
  zones: Zone[];
  selectedCity: CityData;
}

// Define color palette for risk levels
const RISK_COLORS = {
  High: '#FF5D5D',
  Medium: '#FFB238',
  Low: '#3ADE7C'
};

const ALLOCATION_COLORS = ['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6'];

export const SecurityAllocationTab: React.FC<SecurityAllocationTabProps> = ({
  zones,
  selectedCity,
}) => {
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<'All' | 'High' | 'Medium' | 'Low'>('All');

  const cityZones = useMemo(() => {
    return zones.filter((z) => z.city === selectedCity.name);
  }, [zones, selectedCity]);

  // Risk distribution analysis
  const riskDistribution = useMemo(() => {
    const dist = { High: 0, Medium: 0, Low: 0 };
    cityZones.forEach((z) => {
      dist[z.riskLevel as 'High' | 'Medium' | 'Low']++;
    });
    return Object.entries(dist).map(([level, count]) => ({
      name: level,
      value: count,
      percentage: Math.round((count / Math.max(cityZones.length, 1)) * 100),
    }));
  }, [cityZones]);

  // Risk score distribution for area chart
  const riskScoreDistribution = useMemo(() => {
    return cityZones
      .sort((a, b) => a.riskScore - b.riskScore)
      .map((zone) => ({
        name: zone.name,
        score: zone.riskScore,
        riskLevel: zone.riskLevel,
      }));
  }, [cityZones]);

  // Security allocation recommendations based on risk
  const securityAllocation = useMemo(() => {
    const highRisk = cityZones.filter((z) => z.riskLevel === 'High');
    const mediumRisk = cityZones.filter((z) => z.riskLevel === 'Medium');
    const lowRisk = cityZones.filter((z) => z.riskLevel === 'Low');

    const totalPatrol = 100; // Base patrol units
    const totalResponse = 50; // Response teams
    const totalSurveillance = 75; // Surveillance units

    const highPercentage = (highRisk.length / Math.max(cityZones.length, 1)) * 100;
    const mediumPercentage = (mediumRisk.length / Math.max(cityZones.length, 1)) * 100;
    const lowPercentage = (lowRisk.length / Math.max(cityZones.length, 1)) * 100;

    return [
      {
        level: 'High Risk',
        zones: highRisk.length,
        allocatedPatrol: Math.round(totalPatrol * (0.5 + highPercentage / 200)),
        allocatedResponse: Math.round(totalResponse * (0.6 + highPercentage / 200)),
        allocatedSurveillance: Math.round(totalSurveillance * (0.5 + highPercentage / 200)),
        recommendation: 'Deploy maximum patrol units and real-time surveillance',
        color: RISK_COLORS.High,
      },
      {
        level: 'Medium Risk',
        zones: mediumRisk.length,
        allocatedPatrol: Math.round(totalPatrol * mediumPercentage / 200),
        allocatedResponse: Math.round(totalResponse * mediumPercentage / 200),
        allocatedSurveillance: Math.round(totalSurveillance * mediumPercentage / 200),
        recommendation: 'Maintain standard patrol routes and periodic surveillance',
        color: RISK_COLORS.Medium,
      },
      {
        level: 'Low Risk',
        zones: lowRisk.length,
        allocatedPatrol: Math.round(totalPatrol * lowPercentage / 200),
        allocatedResponse: Math.round(totalResponse * lowPercentage / 200),
        allocatedSurveillance: Math.round(totalSurveillance * lowPercentage / 200),
        recommendation: 'Regular patrol cycles and event-based surveillance',
        color: RISK_COLORS.Low,
      },
    ];
  }, [cityZones]);

  // Area-wise risk score for heatmap visualization
  const areaRiskData = useMemo(() => {
    return cityZones
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 10)
      .map((zone) => ({
        name: zone.name,
        riskScore: zone.riskScore,
        riskLevel: zone.riskLevel,
        populationDensity: Math.round(Math.random() * 1000 + 500),
        incidents30d: Math.round(Math.random() * 50 + 5),
      }));
  }, [cityZones]);

  const filteredZones = useMemo(() => {
    if (selectedRiskLevel === 'All') return cityZones;
    return cityZones.filter((z) => z.riskLevel === selectedRiskLevel);
  }, [cityZones, selectedRiskLevel]);

  return (
    <div className="w-full h-full overflow-auto bg-safenet-bg p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold text-safenet-text flex items-center gap-2">
          <Shield className="w-6 h-6 md:w-8 md:h-8 text-brand" />
          Security Allocation & Risk Distribution
        </h1>
        <p className="text-safenet-muted">Data-driven security resource allocation for {selectedCity.name}</p>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {securityAllocation.map((allocation, idx) => (
          <div
            key={idx}
            className="bg-safenet-card border border-safenet-border rounded-lg p-4 hover:border-brand transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-safenet-text">{allocation.level}</h3>
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: allocation.color }}
              />
            </div>
            <p className="text-2xl font-bold text-safenet-text mb-2">{allocation.zones}</p>
            <p className="text-xs text-safenet-muted mb-3">Zones in this category</p>
            <div className="space-y-1 text-xs">
              <p className="flex justify-between">
                <span>Patrol Units:</span>
                <span className="font-semibold text-brand">{allocation.allocatedPatrol}</span>
              </p>
              <p className="flex justify-between">
                <span>Response Teams:</span>
                <span className="font-semibold text-brand">{allocation.allocatedResponse}</span>
              </p>
              <p className="flex justify-between">
                <span>Surveillance:</span>
                <span className="font-semibold text-brand">{allocation.allocatedSurveillance}</span>
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Risk Distribution Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Distribution Pie Chart */}
        <div className="bg-safenet-card border border-safenet-border rounded-lg p-6">
          <h2 className="text-lg font-bold text-safenet-text mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-brand" />
            Risk Level Distribution
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={riskDistribution}
                cx="50%"
                cy="50%"
                labelLine={true}
                label={({ name, percentage }) => `${name}: ${percentage}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {riskDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={RISK_COLORS[entry.name as keyof typeof RISK_COLORS]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value} zones`} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Security Allocation Bar Chart */}
        <div className="bg-safenet-card border border-safenet-border rounded-lg p-6">
          <h2 className="text-lg font-bold text-safenet-text mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-brand" />
            Resource Allocation by Risk Level
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={securityAllocation}
              margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
              <XAxis dataKey="level" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'rgba(15, 23, 42, 0.95)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: '8px',
                }}
              />
              <Legend />
              <Bar dataKey="allocatedPatrol" fill="#8B5CF6" radius={[8, 8, 0, 0]} name="Patrol Units" />
              <Bar dataKey="allocatedResponse" fill="#EC4899" radius={[8, 8, 0, 0]} name="Response Teams" />
              <Bar dataKey="allocatedSurveillance" fill="#F59E0B" radius={[8, 8, 0, 0]} name="Surveillance" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Risk Score vs Area (Heat Map Style) */}
      <div className="bg-safenet-card border border-safenet-border rounded-lg p-6">
        <h2 className="text-lg font-bold text-safenet-text mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-brand" />
          Top High-Risk Areas - Risk Score Heat Map
        </h2>
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart
            data={areaRiskData}
            margin={{ top: 10, right: 30, left: 0, bottom: 100 }}
          >
            <defs>
              <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF5D5D" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#FF5D5D" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.1)" />
            <XAxis 
              dataKey="name" 
              angle={-45}
              textAnchor="end"
              height={120}
              tick={{ fontSize: 12 }}
            />
            <YAxis label={{ value: 'Risk Score', angle: -90, position: 'insideLeft' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                borderRadius: '8px',
              }}
              formatter={(value, name) => {
                if (name === 'riskScore') return [value, 'Risk Score'];
                return [value, name];
              }}
            />
            <Area
              type="monotone"
              dataKey="riskScore"
              stroke="#FF5D5D"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorRisk)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* All Zones with Risk Details */}
      <div className="bg-safenet-card border border-safenet-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-safenet-text flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-brand" />
            Detailed Zone Analysis
          </h2>
          <div className="flex gap-2 flex-wrap">
            {['All', 'High', 'Medium', 'Low'].map((level) => (
              <button
                key={level}
                onClick={() => setSelectedRiskLevel(level as any)}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                  selectedRiskLevel === level
                    ? 'bg-brand text-white'
                    : 'bg-safenet-border text-safenet-text hover:border-brand'
                }`}
              >
                {level} {level !== 'All' && `(${cityZones.filter((z) => z.riskLevel === level).length})`}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-safenet-border">
                <th className="text-left py-3 px-4 font-semibold text-safenet-text">Zone Name</th>
                <th className="text-center py-3 px-4 font-semibold text-safenet-text">Risk Score</th>
                <th className="text-center py-3 px-4 font-semibold text-safenet-text">Risk Level</th>
                <th className="text-center py-3 px-4 font-semibold text-safenet-text">Confidence</th>
                <th className="text-left py-3 px-4 font-semibold text-safenet-text">Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {filteredZones.slice(0, 15).map((zone) => (
                <tr key={zone.id} className="border-b border-safenet-border/50 hover:bg-safenet-border/20 transition-colors">
                  <td className="py-3 px-4 text-safenet-text font-medium">{zone.name}</td>
                  <td className="py-3 px-4 text-center">
                    <span className="font-bold text-lg">{zone.riskScore}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span
                      className="px-3 py-1 rounded-full text-xs font-semibold text-white"
                      style={{ backgroundColor: RISK_COLORS[zone.riskLevel as keyof typeof RISK_COLORS] }}
                    >
                      {zone.riskLevel}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center text-safenet-text">
                    {Math.round(zone.confidenceScore * 100)}%
                  </td>
                  <td className="py-3 px-4 text-safenet-muted">
                    {zone.riskLevel === 'High'
                      ? '🚨 Priority patrol, 24/7 surveillance'
                      : zone.riskLevel === 'Medium'
                      ? '⚠️ Regular patrol, periodic checks'
                      : '✅ Standard coverage, event-based response'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredZones.length > 15 && (
          <p className="text-center text-safenet-muted text-xs mt-4">
            Showing 15 of {filteredZones.length} zones. View more in Analytics tab.
          </p>
        )}
      </div>

      {/* Recommendations Box */}
      <div className="bg-brand/10 border border-brand/30 rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-bold text-brand flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Security Allocation Recommendations
        </h3>
        <ul className="space-y-3 text-safenet-text">
          {securityAllocation.map((allocation, idx) => (
            <li key={idx} className="flex gap-3">
              <span
                className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                style={{ backgroundColor: allocation.color }}
              />
              <div>
                <strong>{allocation.level}:</strong> {allocation.recommendation}
              </div>
            </li>
          ))}
          <li className="flex gap-3 pt-2 border-t border-brand/20">
            <span className="text-lg">💡</span>
            <div>
              <strong>Dynamic Adjustment:</strong> Update allocations based on real-time incidents and crowdsourced alerts
              every 6 hours for optimal resource utilization.
            </div>
          </li>
        </ul>
      </div>

      {/* Real-Time Heatmap Section */}
      <div className="space-y-4">
        <div className="space-y-2">
          <h2 className="text-2xl md:text-3xl font-bold text-safenet-text flex items-center gap-2">
            <MapPin className="w-6 h-6 md:w-8 md:h-8 text-brand" />
            Real-Time Risk Heatmap
          </h2>
          <p className="text-safenet-muted">
            Time-aware security allocation showing risk intensity with population density and crime rate analysis
          </p>
        </div>
        
        <div className="bg-safenet-card border border-safenet-border rounded-lg overflow-hidden" style={{ height: '600px' }}>
          <RealtimeHeatmapDisplay 
            zones={filteredZones}
            selectedCity={selectedCity}
            activeTab="Security"
          />
        </div>
      </div>
    </div>
  );
};
