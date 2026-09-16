import React, { useState, useEffect } from 'react';
import { Shield, Bell, Search, Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface NavbarProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
  unreadCount: number;
  onOpenAlerts: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  darkMode,
  onToggleDarkMode,
  unreadCount,
  onOpenAlerts,
}) => {
  const [time, setTime] = useState<string>('');

  // Live clock generator matching screenshot format (e.g., 09:49 pm)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const formatted = now.toLocaleTimeString('en-US', {
        hour12: true,
        hour: '2-digit',
        minute: '2-digit',
      }).toLowerCase();
      setTime(formatted);
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-[60px] w-full flex items-center justify-between px-4 glass-nav border-b border-[#26262b] select-none z-[100] relative bg-[#0a0a0b]/80">
      
      {/* Brand Logo & Name matching screenshot */}
      <div className="flex items-center gap-2.5">
        <div className="relative w-9 h-9 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center overflow-hidden">
          {/* Subtle radar-sweep animation */}
          <div className="absolute inset-0 bg-radar-sweep animate-sweep opacity-30 origin-center"></div>
          <Shield className="w-5 h-5 text-brand z-10" />
        </div>
        <div>
          <div className="flex items-baseline gap-1.5">
            <span className="font-heading font-bold text-base md:text-lg tracking-tight bg-gradient-to-r from-safenet-text to-brand bg-clip-text text-transparent">
              Urban Safety AI
            </span>
          </div>
          <span className="text-[9px] text-safenet-muted block leading-none font-medium">
            Explainable AI-Based Risk Analytics and Decision Support for Smart Urban Safety
          </span>
        </div>
      </div>

      {/* Center live diagnostics status pill matching screenshot */}
      <div className="flex items-center gap-2 bg-[#141417] border border-[#26262b] px-3.5 py-1.5 rounded-full shadow-inner">
        <span className="relative flex h-2 w-2 mr-0.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span className="text-[10px] md:text-xs font-bold font-heading tracking-wide uppercase text-[#f5f5f5]">
          Live Monitoring
        </span>
        <span className="text-[10px] md:text-xs text-[#a3a3a3] font-sans ml-1">
          Updated {time}
        </span>
      </div>

      {/* Right control utilities */}
      <div className="flex items-center gap-2 md:gap-3">
        {/* Search button icon */}
        <button className="w-9 h-9 flex items-center justify-center border border-[#26262b] hover:border-brand/40 bg-[#141417] hover:bg-[#0a0a0b] text-[#f5f5f5] rounded-lg transition-colors">
          <Search className="w-4 h-4 text-[#a3a3a3]" />
        </button>

        {/* Theme Toggler (animated sun/moon) */}
        <button
          onClick={onToggleDarkMode}
          className="w-9 h-9 flex items-center justify-center border border-[#26262b] hover:border-brand/40 bg-[#141417] hover:bg-[#0a0a0b] text-[#f5f5f5] rounded-lg transition-colors"
          title="Toggle system theme"
          aria-label="Toggle dark and light theme"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={darkMode ? 'dark' : 'light'}
              initial={{ y: -10, opacity: 0, rotate: -45 }}
              animate={{ y: 0, opacity: 1, rotate: 0 }}
              exit={{ y: 10, opacity: 0, rotate: 45 }}
              transition={{ duration: 0.15 }}
            >
              {darkMode ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-400" />
              )}
            </motion.div>
          </AnimatePresence>
        </button>

        {/* Alert Notifications bell */}
        <button
          onClick={onOpenAlerts}
          className="w-9 h-9 flex items-center justify-center border border-[#26262b] hover:border-brand/40 bg-[#141417] hover:bg-[#0a0a0b] text-[#f5f5f5] rounded-lg relative transition-colors"
          title="Security Alerts"
          aria-label="Open security alerts panel"
        >
          <Bell className="w-4 h-4 text-[#a3a3a3]" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 min-w-[12px] h-[12px] flex items-center justify-center bg-risk-high text-white text-[8px] font-bold px-1 rounded-full border border-[#141417] shadow animate-pulse">
              {unreadCount}
            </span>
          )}
        </button>

        <span className="w-[1px] h-6 bg-[#26262b]"></span>

        {/* User initials "RA" matching screenshot */}
        <div className="w-8 h-8 rounded-full bg-brand/10 border border-brand/25 flex items-center justify-center font-heading font-black text-xs text-brand select-none">
          RA
        </div>
      </div>
    </header>
  );
};
