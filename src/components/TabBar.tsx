import React from 'react';
import { Map, BarChart3, Brain, Shield, Activity } from 'lucide-react';
import { motion } from 'framer-motion';

interface TabBarProps {
  activeTab: string;
  onChangeTab: (tabId: string) => void;
}

export const TabBar: React.FC<TabBarProps> = ({ activeTab, onChangeTab }) => {
  const tabs = [
    { id: 'Overview', label: 'Safety Overview', icon: Map },
    { id: 'Analytics', label: 'Risk Analytics', icon: BarChart3 },
    { id: 'Security', label: 'Security Allocation', icon: Shield },
    { id: 'Explainability', label: 'XAI (Explainability)', icon: Brain },
    { id: 'Performance', label: 'Performance Analysis', icon: Activity },
  ];

  return (
    <nav className="h-[46px] w-full bg-safenet-card border-b border-safenet-border px-4 flex items-center select-none z-50">
      <div 
        className="flex items-center gap-1 sm:gap-4 h-full"
        role="tablist"
        aria-label="Safety dashboard panels"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              id={`tab-${tab.id}`}
              onClick={() => onChangeTab(tab.id)}
              className={`relative h-full px-3 sm:px-4 flex items-center gap-2 text-xs md:text-sm font-heading font-semibold transition-colors duration-200 outline-none ${
                isActive 
                  ? 'text-brand' 
                  : 'text-safenet-muted hover:text-safenet-text'
              }`}
            >
              <Icon className="w-3.5 h-3.5 md:w-4 md:h-4" />
              <span>{tab.label}</span>

              {/* Sliding underline selection indicator */}
              {isActive && (
                <motion.div
                  layoutId="activeTabUnderline"
                  className="absolute bottom-0 left-0 right-0 h-[2px] bg-brand rounded-t-full"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
