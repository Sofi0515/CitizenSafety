import React, { useState, useEffect } from 'react';
import { Zone } from '../types';
import { Brain, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';
import { apiClient } from '../api/client';

interface ExplainabilityTabProps {
  zones: Zone[];
  selectedZone: Zone | null;
  onSelectZone: (zone: Zone) => void;
}

export const ExplainabilityTab: React.FC<ExplainabilityTabProps> = ({
  zones,
  selectedZone,
  onSelectZone,
}) => {
  const [explanationData, setExplanationData] = useState<any>({
    shapContributions: selectedZone?.shapContributions || [],
    explanation: selectedZone?.explanation || '',
    confidenceScore: selectedZone?.confidenceScore || 92,
    modelName: selectedZone?.modelName || 'Gradient Boosted Ensemble',
    riskScore: selectedZone?.riskScore || 0,
    riskLevel: selectedZone?.riskLevel || 'Low'
  });

  // Query live SHAP explainability payload
  useEffect(() => {
    if (!selectedZone) return;
    apiClient.getExplanation(selectedZone.city, selectedZone.id)
      .then((data) => {
        if (data) {
          setExplanationData({
            shapContributions: data.factors || data.shapContributions || [],
            explanation: data.explanation || `The ML model predicted a risk score of ${data.score} for ${selectedZone.name}. The primary drivers of safety risks in this zone are explained below.`,
            confidenceScore: data.confidence || data.confidenceScore || 92,
            modelName: data.model_name || data.modelName || 'Gradient Boosted Forest Ensemble',
            riskScore: data.score || data.riskScore || 0,
            riskLevel: data.level || data.riskLevel || 'Low'
          });
        }
      })
      .catch((err) => {
        console.warn("API offline, falling back to local static SHAP metrics:", err);
        setExplanationData({
          shapContributions: selectedZone.shapContributions,
          explanation: selectedZone.explanation,
          confidenceScore: selectedZone.confidenceScore || 92,
          modelName: selectedZone.modelName || 'Gradient Boosted Forest Ensemble',
          riskScore: selectedZone.riskScore,
          riskLevel: selectedZone.riskLevel
        });
      });
  }, [selectedZone]);

  if (!selectedZone) {
    return (
      <div className="h-full flex items-center justify-center text-safenet-muted font-heading text-sm bg-[#0a0a0b] rounded-2xl border border-[#26262b] p-8">
        No zone selected. Select a state and city zone to view explainability data.
      </div>
    );
  }

  // Sort SHAP values so positive drivers are on top, mitigators on bottom
  const sortedContributions = [...explanationData.shapContributions].sort(
    (a, b) => b.value - a.value
  );

  // SVG parameters for circular confidence ring
  const radius = 42;
  const strokeWidth = 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (explanationData.confidenceScore / 100) * circumference;

  // Find maximum absolute value in contributions to set symmetric range limits dynamically
  const maxAbsVal = Math.max(...sortedContributions.map(c => Math.abs(c.value)), 5); // default to at least 5
  const rangeLimit = Math.ceil(maxAbsVal * 1.15); // Add 15% padding

  return (
    <div className="h-full w-full flex flex-col p-6 overflow-y-auto select-none bg-[#0a0a0b] gap-6 text-[#f5f5f5]">
      {/* 2-Column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Left Card: SHAP Contributions & NL Summary */}
        <div className="lg:col-span-3 bg-[#141417] border border-[#26262b] rounded-2xl p-6 shadow-card-dark flex flex-col justify-between gap-6">
          <div>
            {/* Card Header with Dropdown inside */}
            <div className="flex items-center justify-between border-b border-[#26262b] pb-4 mb-6">
              <div>
                <h3 className="font-heading font-bold text-base flex items-center gap-2">
                  <Brain className="w-5 h-5 text-brand" />
                  Why This Prediction?
                </h3>
                <p className="text-xs text-safenet-muted mt-0.5">
                  Explaining the risk score for {selectedZone.name}
                </p>
              </div>

              {/* Selector */}
              <select
                value={selectedZone.id}
                onChange={(e) => {
                  const zone = zones.find((z) => z.id === e.target.value);
                  if (zone) onSelectZone(zone);
                }}
                className="bg-[#0a0a0b] border border-[#26262b] text-[#f5f5f5] rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:border-brand cursor-pointer shadow-inner"
              >
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
            </div>

            {/* SHAP Chart Container */}
            <div className="relative space-y-4">
              
              {/* Grid Lines Behind Bars */}
              <div className="absolute left-[140px] md:left-[180px] right-[50px] top-0 bottom-6 pointer-events-none z-0">
                {/* Vertical Grid Lines */}
                <div className="absolute left-[0%] top-0 bottom-0 w-[1px] border-l border-dashed border-[#26262b]/80"></div>
                <div className="absolute left-[25%] top-0 bottom-0 w-[1px] border-l border-dashed border-[#26262b]/80"></div>
                <div className="absolute left-[50%] top-0 bottom-0 w-[1px] border-l border-dashed border-[#26262b]/80"></div>
                <div className="absolute left-[75%] top-0 bottom-0 w-[1px] border-l border-dashed border-[#26262b]/80"></div>
                <div className="absolute left-[100%] top-0 bottom-0 w-[1px] border-l border-dashed border-[#26262b]/80"></div>
              </div>

              {/* Row Items */}
              {sortedContributions.map((contrib, i) => {
                const isPositive = contrib.value > 0;
                const absValue = Math.abs(contrib.value);
                const percentVal = (absValue / rangeLimit) * 50;
                
                // Calculate position relative to the 50% mark (centered zero line)
                let barStyle = {};
                if (isPositive) {
                  barStyle = {
                    left: '50%',
                    width: `${percentVal}%`,
                  };
                } else {
                  barStyle = {
                    left: `${50 - percentVal}%`,
                    width: `${percentVal}%`,
                  };
                }

                return (
                  <div key={i} className="flex items-center text-xs relative z-10">
                    
                    {/* Feature Label */}
                    <div className="w-[140px] md:w-[180px] pr-4 text-safenet-muted font-heading font-medium truncate text-right">
                      {contrib.label || contrib.factor}
                    </div>

                    {/* Bar Area */}
                    <div className="flex-1 h-6 bg-[#0a0a0b]/40 rounded relative overflow-visible">
                      <div
                        className={`absolute top-1 bottom-1 rounded-sm transition-all duration-500 ${
                          isPositive ? 'bg-[#ff5d5d]' : 'bg-[#3ade7c]'
                        }`}
                        style={barStyle}
                      />
                    </div>

                    {/* Numeric Value Label */}
                    <div className="w-[50px] pl-3 text-left font-mono font-bold">
                      <span style={{ color: isPositive ? '#ff5d5d' : '#3ade7c' }}>
                        {isPositive ? '+' : '-'}{absValue}%
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Bottom Grid Axis Labels */}
              <div className="flex items-center text-[10px]">
                <div className="w-[140px] md:w-[180px]" />
                <div className="flex-1 h-6 relative mt-1 text-safenet-muted font-mono select-none">
                  <span className="absolute transform -translate-x-1/2" style={{ left: '0%' }}>{-rangeLimit}</span>
                  <span className="absolute transform -translate-x-1/2" style={{ left: '25%' }}>{-Math.round(rangeLimit / 2)}</span>
                  <span className="absolute transform -translate-x-1/2" style={{ left: '50%' }}>0</span>
                  <span className="absolute transform -translate-x-1/2" style={{ left: '75%' }}>{Math.round(rangeLimit / 2)}</span>
                  <span className="absolute transform -translate-x-1/2" style={{ left: '100%' }}>{rangeLimit}</span>
                </div>
                <div className="w-[50px]" />
              </div>

            </div>
          </div>

          {/* Natural Language Explanation Banner */}
          <div className="border border-[#26262b] bg-[#0a0a0b]/40 p-4 rounded-xl flex items-start gap-3">
            <p className="text-xs text-safenet-muted leading-relaxed font-sans font-medium">
              {explanationData.explanation}
            </p>
          </div>
        </div>

        {/* Right Card: Confidence Ring, Model Badge & Stat Indicators */}
        <div className="lg:col-span-2 bg-[#141417] border border-[#26262b] rounded-2xl p-6 shadow-card-dark flex flex-col items-center justify-between min-h-[400px]">
          
          {/* Circular Confidence Meter */}
          <div className="flex flex-col items-center justify-center text-center mt-4">
            <div className="relative flex items-center justify-center w-36 h-36">
              <svg width="144" height="144" viewBox="0 0 100 100" className="rotate-[-90deg]">
                {/* Background Ring */}
                <circle
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="transparent"
                  stroke="#26262b"
                  strokeWidth={strokeWidth}
                />
                {/* Foreground active ring (Mint green matching screenshot) */}
                <motion.circle
                  cx="50"
                  cy="50"
                  r={radius}
                  fill="transparent"
                  stroke="#3ade7c"
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  strokeLinecap="round"
                />
              </svg>
              {/* Centered details */}
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-3xl font-black font-heading text-[#f5f5f5] tracking-tight">
                  {explanationData.confidenceScore}%
                </span>
                <span className="text-[9px] text-safenet-muted font-bold tracking-widest uppercase mt-0.5">
                  CONFIDENCE
                </span>
              </div>
            </div>

            {/* Model Name Pill */}
            <div className="mt-6 px-4 py-1.5 bg-[#ef4444]/10 border border-[#ef4444]/20 rounded-full text-xs font-bold text-[#ff5d5d] tracking-wide">
              Model: {explanationData.modelName}
            </div>
          </div>

          {/* Two Stat boxes side by side */}
          <div className="w-full grid grid-cols-2 gap-4 mt-6">
            
            {/* Stat Box 1: Risk Score */}
            <div className="bg-[#0a0a0b] border border-[#26262b] rounded-xl p-4 flex flex-col items-center justify-center text-center">
              <div className="text-2xl font-bold font-mono text-[#f5f5f5] tracking-tight">
                {explanationData.riskScore}/100
              </div>
              <div className="text-[9px] font-bold text-safenet-muted tracking-widest uppercase mt-1">
                RISK SCORE
              </div>
            </div>

            {/* Stat Box 2: Risk Level */}
            <div className="bg-[#0a0a0b] border border-[#26262b] rounded-xl p-4 flex flex-col items-center justify-center text-center">
              <div 
                className="text-2xl font-black font-heading tracking-tight"
                style={{ color: explanationData.riskLevel === 'High' ? '#ff5d5d' : '#ffb238' }}
              >
                {explanationData.riskLevel.toUpperCase()}
              </div>
              <div className="text-[9px] font-bold text-safenet-muted tracking-widest uppercase mt-1">
                RISK LEVEL
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Row 2: Tactical Security Allotment & Resource Allocation Strategy */}
      <div className="bg-[#141417] border border-[#26262b] rounded-2xl p-6 shadow-card-dark flex flex-col gap-6">
        <div className="flex items-center gap-2 border-b border-[#26262b] pb-4">
          <ShieldAlert className="w-5 h-5 text-brand animate-pulse" />
          <div>
            <h3 className="font-heading font-bold text-base text-[#f5f5f5]">
              Tactical Security Allotment & Resource Allocation Plan
            </h3>
            <p className="text-xs text-safenet-muted mt-0.5">
              Prescriptive dispatch and technology directives optimized for {selectedZone.name} ({explanationData.riskLevel} Risk)
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Column 1: Risk Assessment */}
          <div className="bg-[#0a0a0b]/60 border border-[#26262b] p-5 rounded-xl flex flex-col gap-4">
            <h4 className="text-xs font-bold text-brand uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-brand rounded-full"></span>
              1. Area Risk Assessment
            </h4>
            <div className="text-xs text-safenet-muted leading-relaxed flex flex-col gap-2">
              <p>
                The predicted safety risk for <strong>{selectedZone.name}</strong> is driven primarily by the following factors:
              </p>
              <ul className="list-disc pl-4 space-y-1">
                {sortedContributions.slice(0, 3).map((c, i) => (
                  <li key={i}>
                    <span className="text-[#f5f5f5] font-semibold">{c.label || c.factor}</span>: contributing {c.value > 0 ? '+' : ''}{c.value}% to total risk.
                  </li>
                ))}
              </ul>
              <p className="mt-2">
                {explanationData.riskLevel === 'High' ? (
                  <span className="text-[#ff5d5d] font-semibold">Critical hazard levels require immediate intervention and multi-agency response coordination.</span>
                ) : explanationData.riskLevel === 'Medium' ? (
                  <span className="text-[#ffb238] font-semibold">Elevated hazard parameters suggest proactive mitigation to prevent incident spikes.</span>
                ) : (
                  <span className="text-[#3ade7c] font-semibold">Stable safety profile. Maintain standard deterrence and monitoring protocols.</span>
                )}
              </p>
            </div>
          </div>

          {/* Column 2: Equipment & Technology */}
          <div className="bg-[#0a0a0b]/60 border border-[#26262b] p-5 rounded-xl flex flex-col gap-4">
            <h4 className="text-xs font-bold text-brand uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-brand rounded-full"></span>
              2. Technology & Equipment
            </h4>
            <div className="text-xs text-safenet-muted leading-relaxed flex flex-col gap-2">
              <p>Deploy the following systems to address local infrastructure risk vectors:</p>
              {explanationData.riskLevel === 'High' ? (
                <div className="space-y-2 mt-2">
                  <div className="p-2.5 bg-[#ff5d5d]/10 border border-[#ff5d5d]/20 rounded-lg">
                    <div className="font-semibold text-[#f5f5f5] text-[11px]">AI-Powered CCTV & ANPR</div>
                    <div className="text-[10px] text-safenet-muted mt-0.5">High-definition cameras with automatic number plate recognition at all entry/exit corridors.</div>
                  </div>
                  <div className="p-2.5 bg-[#ff5d5d]/10 border border-[#ff5d5d]/20 rounded-lg">
                    <div className="font-semibold text-[#f5f5f5] text-[11px]">Smart Panic Booths & Audio Sensors</div>
                    <div className="text-[10px] text-safenet-muted mt-0.5">Interactive emergency booths with direct VoIP lines and automated sound-frequency monitoring.</div>
                  </div>
                </div>
              ) : explanationData.riskLevel === 'Medium' ? (
                <div className="space-y-2 mt-2">
                  <div className="p-2.5 bg-[#ffb238]/10 border border-[#ffb238]/20 rounded-lg">
                    <div className="font-semibold text-[#f5f5f5] text-[11px]">Optimized LED Lighting & CCTV</div>
                    <div className="text-[10px] text-safenet-muted mt-0.5">Solar-powered LED streetlights to cover dark spots, with standard IP cameras.</div>
                  </div>
                  <div className="p-2.5 bg-[#ffb238]/10 border border-[#ffb238]/20 rounded-lg">
                    <div className="font-semibold text-[#f5f5f5] text-[11px]">Emergency Call Boxes</div>
                    <div className="text-[10px] text-safenet-muted mt-0.5">Physical call buttons positioned every 500m along high-traffic pedestrian paths.</div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 mt-2">
                  <div className="p-2.5 bg-[#3ade7c]/10 border border-[#3ade7c]/20 rounded-lg">
                    <div className="font-semibold text-[#f5f5f5] text-[11px]">Smart Lighting Grids</div>
                    <div className="text-[10px] text-safenet-muted mt-0.5">Standard municipal street lighting checks and community alert billboards.</div>
                  </div>
                  <div className="p-2.5 bg-[#3ade7c]/10 border border-[#3ade7c]/20 rounded-lg">
                    <div className="font-semibold text-[#f5f5f5] text-[11px]">Digital Info Kiosks</div>
                    <div className="text-[10px] text-safenet-muted mt-0.5">Public help interfaces displaying transit and safety helpline numbers.</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Column 3: Security Personnel Allotment */}
          <div className="bg-[#0a0a0b]/60 border border-[#26262b] p-5 rounded-xl flex flex-col gap-4">
            <h4 className="text-xs font-bold text-brand uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-brand rounded-full"></span>
              3. Patrol & Personnel Allotment
            </h4>
            <div className="text-xs text-safenet-muted leading-relaxed flex flex-col gap-2">
              <p>Recommended staffing and deployment schedule for maximum deterrence:</p>
              {explanationData.riskLevel === 'High' ? (
                <div className="space-y-2 mt-2">
                  <div className="p-2.5 bg-[#ff5d5d]/10 border border-[#ff5d5d]/20 rounded-lg">
                    <div className="font-semibold text-[#f5f5f5] text-[11px]">High-Frequency Patrols</div>
                    <div className="text-[10px] text-safenet-muted mt-0.5">Deploy 4-6 mobile police/security units on active rotation (20 min intervals).</div>
                  </div>
                  <div className="p-2.5 bg-[#ff5d5d]/10 border border-[#ff5d5d]/20 rounded-lg">
                    <div className="font-semibold text-[#f5f5f5] text-[11px]">Stationary Checkpoints</div>
                    <div className="text-[10px] text-safenet-muted mt-0.5">Establish permanent check-posts at primary intersections during peak hours (18:00 - 02:00).</div>
                  </div>
                </div>
              ) : explanationData.riskLevel === 'Medium' ? (
                <div className="space-y-2 mt-2">
                  <div className="p-2.5 bg-[#ffb238]/10 border border-[#ffb238]/20 rounded-lg">
                    <div className="font-semibold text-[#f5f5f5] text-[11px]">Randomized Mobile Patrols</div>
                    <div className="text-[10px] text-safenet-muted mt-0.5">Deploy 2-3 patrol units with random routing schedules (45 min intervals).</div>
                  </div>
                  <div className="p-2.5 bg-[#ffb238]/10 border border-[#ffb238]/20 rounded-lg">
                    <div className="font-semibold text-[#f5f5f5] text-[11px]">Community Policing Integration</div>
                    <div className="text-[10px] text-safenet-muted mt-0.5">Coordinate with local neighborhood watch coordinators and post weekly safety reports.</div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 mt-2">
                  <div className="p-2.5 bg-[#3ade7c]/10 border border-[#3ade7c]/20 rounded-lg">
                    <div className="font-semibold text-[#f5f5f5] text-[11px]">Standard Deterrence Patrols</div>
                    <div className="text-[10px] text-safenet-muted mt-0.5">1-2 routine patrol checks daily. Maintain active on-call response team.</div>
                  </div>
                  <div className="p-2.5 bg-[#3ade7c]/10 border border-[#3ade7c]/20 rounded-lg">
                    <div className="font-semibold text-[#f5f5f5] text-[11px]">Bi-weekly Audits</div>
                    <div className="text-[10px] text-safenet-muted mt-0.5">Perform standard security infrastructure health checks every 14 days.</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
