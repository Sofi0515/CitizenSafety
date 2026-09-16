import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertOctagon, ShieldCheck, Send, Check } from 'lucide-react';
import { SafetyAlert } from '../types';

interface AlertsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: SafetyAlert[];
  onAcknowledge: (id: string) => void;
  onDispatch: (alert: SafetyAlert) => void;
}

export const AlertsDrawer: React.FC<AlertsDrawerProps> = ({
  isOpen,
  onClose,
  alerts,
  onAcknowledge,
  onDispatch,
}) => {
  // Sort alerts: high severity and unacknowledged first
  const sortedAlerts = [...alerts].sort((a, b) => {
    if (a.acknowledged !== b.acknowledged) {
      return a.acknowledged ? 1 : -1;
    }
    const severityWeight = { High: 3, Medium: 2, Low: 1 };
    return severityWeight[b.severity] - severityWeight[a.severity];
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black z-[1000] cursor-pointer"
          />

          {/* Sliding Drawer Container */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed top-0 right-0 bottom-0 w-full sm:w-[420px] bg-safenet-card border-l border-safenet-border z-[1001] shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between p-4 border-b border-safenet-border bg-safenet-card/50">
              <div>
                <h2 className="font-heading font-bold text-base text-safenet-text flex items-center gap-2">
                  <AlertOctagon className="w-5 h-5 text-risk-high animate-pulse" />
                  Safety Incident Center
                </h2>
                <p className="text-xs text-safenet-muted mt-0.5">
                  Review and dispatch tactical safety alerts
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center border border-safenet-border rounded-lg text-safenet-text hover:bg-safenet-bg hover:text-brand transition-colors"
                aria-label="Close drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Incident Alert List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {sortedAlerts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                  <ShieldCheck className="w-12 h-12 text-risk-low" />
                  <p className="font-heading font-medium text-safenet-text">All zones cleared</p>
                  <p className="text-xs text-safenet-muted max-w-[200px]">No active threat telemetry detected by model predictions.</p>
                </div>
              ) : (
                sortedAlerts.map((alert) => {
                  const isHigh = alert.severity === 'High';
                  const isMedium = alert.severity === 'Medium';
                  const badgeColor = isHigh 
                    ? 'text-risk-high border-risk-high/30 bg-risk-high/10' 
                    : isMedium 
                      ? 'text-risk-medium border-risk-medium/30 bg-risk-medium/10'
                      : 'text-risk-low border-risk-low/30 bg-risk-low/10';

                  return (
                    <div
                      key={alert.id}
                      className={`p-4 border rounded-xl transition-all duration-300 ${
                        alert.acknowledged
                          ? 'border-safenet-border/60 bg-safenet-bg/40 opacity-70'
                          : isHigh
                            ? 'border-risk-high/30 bg-gradient-to-br from-safenet-card to-risk-high/5 shadow-[0_2px_12px_rgba(239,68,68,0.04)]'
                            : 'border-safenet-border bg-safenet-card shadow-sm'
                      }`}
                    >
                      {/* Top Meta info */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border tracking-wide uppercase ${badgeColor}`}>
                            {alert.severity} Risk
                          </span>
                          <span className="text-[10px] font-semibold text-safenet-muted">
                            {alert.timestamp}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold font-mono text-brand bg-brand/5 px-2 py-0.5 rounded border border-brand/10">
                          {alert.city}
                        </span>
                      </div>

                      {/* Title & Zone */}
                      <h3 className="font-heading font-bold text-xs md:text-sm text-safenet-text">
                        {alert.title}
                      </h3>
                      <p className="text-[10px] font-semibold text-brand mt-0.5">
                        Zone: {alert.zoneName}
                      </p>
                      
                      {/* Description */}
                      <p className="text-xs text-safenet-muted mt-2 leading-relaxed font-sans">
                        {alert.description}
                      </p>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 mt-4 pt-3 border-t border-safenet-border/60">
                        {/* Acknowledge */}
                        <button
                          onClick={() => onAcknowledge(alert.id)}
                          disabled={alert.acknowledged}
                          className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded-md text-[10px] md:text-xs font-bold transition-all border ${
                            alert.acknowledged
                              ? 'bg-transparent border-safenet-border text-safenet-muted cursor-not-allowed'
                              : 'bg-safenet-bg border-safenet-border hover:bg-safenet-border text-safenet-text'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5" />
                          {alert.acknowledged ? 'Acknowledged' : 'Acknowledge'}
                        </button>

                        {/* Dispatch tactical squad */}
                        <button
                          onClick={() => onDispatch(alert)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-brand text-white border border-brand hover:bg-brand-hover active:scale-95 transition-all rounded-md text-[10px] md:text-xs font-bold"
                        >
                          <Send className="w-3 h-3" />
                          Notify Authorities
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
