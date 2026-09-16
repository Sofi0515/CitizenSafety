import React from 'react';
import { motion } from 'framer-motion';

interface RiskSpeedometerProps {
  score: number; // 0 to 100
}

export const RiskSpeedometer: React.FC<RiskSpeedometerProps> = ({ score }) => {
  // Convert 0-100 score to degrees (from -90deg to +90deg)
  const angle = (score / 100) * 180 - 90;

  return (
    <div className="flex flex-col items-center justify-center p-2 relative select-none">
      <svg
        width="190"
        height="110"
        viewBox="0 0 100 70"
        className="overflow-visible"
      >
        <defs>
          <linearGradient id="gauge-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3ade7c" /> {/* Low: Green */}
            <stop offset="50%" stopColor="#ffb238" /> {/* Medium: Orange */}
            <stop offset="100%" stopColor="#ff5d5d" /> {/* High: Red */}
          </linearGradient>
        </defs>

        {/* Gauge Background track */}
        <path
          d="M 12 50 A 38 38 0 0 1 88 50"
          fill="none"
          stroke="#26262b"
          strokeWidth="8"
          strokeLinecap="round"
        />

        {/* Gauge Color Arc */}
        <path
          d="M 12 50 A 38 38 0 0 1 88 50"
          fill="none"
          stroke="url(#gauge-grad)"
          strokeWidth="8"
          strokeLinecap="round"
          opacity="0.9"
        />

        {/* Needle Pin */}
        <circle cx="50" cy="50" r="4.5" fill="#f5f5f5" />
        <circle cx="50" cy="50" r="2" fill="#141417" />

        {/* Needle with Framer Motion for smooth rotation */}
        <motion.g
          style={{ originX: '50px', originY: '50px' }}
          animate={{ rotate: angle }}
          transition={{ type: 'spring', stiffness: 50, damping: 12 }}
        >
          <line
            x1="50"
            y1="50"
            x2="50"
            y2="16"
            stroke="#f5f5f5"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <polygon
            points="48,22 52,22 50,13"
            fill="#f5f5f5"
          />
        </motion.g>
      </svg>

      {/* Numerical display matching screenshot */}
      <div className="text-center -mt-6">
        <span className="text-xl font-black font-heading text-[#f5f5f5]">
          {Math.round(score)}
        </span>
        <span className="text-xs text-safenet-muted font-heading ml-1">/ 100</span>
      </div>
    </div>
  );
};
