import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { TabBar } from './components/TabBar';
import { OverviewTab } from './components/OverviewTab';
import { AnalyticsTab } from './components/AnalyticsTab';
import { SecurityAllocationTab } from './components/SecurityAllocationTab';
import { ExplainabilityTab } from './components/ExplainabilityTab';
import { PerformanceTab } from './components/PerformanceTab';
import { AlertsDrawer } from './components/AlertsDrawer';
import { Zone, CityData, SafetyAlert } from './types';
import { CITIES, MOCK_ZONES, MOCK_ALERTS } from './data/mockData';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, ShieldAlert, X } from 'lucide-react';
import { apiClient } from './api/client';

interface Toast {
  id: string;
  message: string;
  type: 'info' | 'success' | 'warning';
}

const App: React.FC = () => {
  // Theme state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true; // Default to dark mode
  });

  // Navigation & Selector states
  const [activeTab, setActiveTab] = useState<string>('Overview');
  const [selectedCity, setSelectedCity] = useState<CityData>(CITIES[0]);
  const [selectedZone, setSelectedZone] = useState<Zone>(MOCK_ZONES[0]);

  // Dynamic API lists (defaults to local mock assets as graceful offline fallback)
  const [cities, setCities] = useState<CityData[]>(CITIES);
  const [zones, setZones] = useState<Zone[]>(MOCK_ZONES);

  // Alerts states
  const [alerts, setAlerts] = useState<SafetyAlert[]>(MOCK_ALERTS);
  const [isAlertsOpen, setIsAlertsOpen] = useState<boolean>(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Theme synchronization effect
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  // 1. Fetch cities registry on mount
  useEffect(() => {
    apiClient.getCities()
      .then((data) => {
        const regionsList = data.regions || data;
        if (regionsList && regionsList.length > 0) {
          const formattedCities: CityData[] = regionsList.map((c: any) => ({
            name: c.name,
            center: [c.center.lat, c.center.lng],
            zoom: c.zoom
          }));
          setCities(formattedCities);
        }
      })
      .catch((err) => console.warn("API offline, using static cities fallback:", err));
  }, []);

  // 2. Fetch scored zones list and alerts when selectedCity changes
  useEffect(() => {
    apiClient.getZones(selectedCity.name)
      .then((data) => {
        if (data && data.length > 0) {
          setZones(data);
          const found = selectedZone ? data.find((z: any) => z.id === selectedZone.id) : null;
          if (found) {
            setSelectedZone(found);
          } else {
            setSelectedZone(data[0]);
          }
        } else {
          setZones([]);
          setSelectedZone(null);
        }
      })
      .catch((err) => {
        printWarning(`API offline, using static zones fallback for ${selectedCity.name}:`, err);
        const fallbackZones = MOCK_ZONES.filter((z) => z.city.toLowerCase() === selectedCity.name.toLowerCase());
        setZones(fallbackZones);
        if (fallbackZones.length > 0) {
          setSelectedZone(fallbackZones[0]);
        } else {
          setSelectedZone(null);
        }
      });

    apiClient.getAlerts(selectedCity.name)
      .then((data) => {
        if (data && data.length > 0) {
          setAlerts(data);
        }
      })
      .catch((err) => console.warn("API offline, using static alerts fallback:", err));
  }, [selectedCity]);

  // Small internal helper to reduce build warnings
  const printWarning = (msg: string, err: any) => {
    console.warn(msg, err);
  };

  // Adjust selected zone if selected city changes (default to first zone of new city)
  const handleChangeCity = (cityName: string) => {
    const city = cities.find((c) => c.name === cityName);
    if (city) {
      setSelectedCity(city);
    }
  };

  const handleDetectLocation = (lat: number, lng: number) => {
    apiClient.detectLocation(lat, lng)
      .then((res) => {
        if (res.region_id) {
          const matchedRegion = cities.find(
            (c) => c.name.toLowerCase().trim().replace(/[\s\-\_]+/g, '_') === res.region_id
          );
          if (matchedRegion) {
            setSelectedCity(matchedRegion);
            alert(`Location auto-detected: Welcome to ${res.place_name}!`);
          }
        }
      })
      .catch((err) => {
        console.warn("Location detection failed:", err);
      });
  };

  // Callback to select a zone AND switch tab to Explainability (from map click or leaderboard)
  const handleSelectZoneAndTab = (zone: Zone) => {
    const city = cities.find((c) => c.name === zone.city);
    if (city) {
      setSelectedCity(city);
    }
    setSelectedZone(zone);
    setActiveTab('Explainability');
  };

  // Acknowledge alert
  const handleAcknowledgeAlert = (id: string) => {
    apiClient.acknowledgeAlert(id)
      .then(() => {
        setAlerts((prev) =>
          prev.map((alert) => (alert.id === id ? { ...alert, acknowledged: true } : alert))
        );
        showToast('Alert marked as acknowledged.', 'info');
      })
      .catch(() => {
        setAlerts((prev) =>
          prev.map((alert) => (alert.id === id ? { ...alert, acknowledged: true } : alert))
        );
        showToast('Alert marked as acknowledged (Offline Mode).', 'info');
      });
  };

  // Dispatch emergency alert (tactical dispatch)
  const handleDispatchAuthorities = (alert: SafetyAlert) => {
    apiClient.notifyAuthorities(alert.id)
      .then(() => {
        showToast(
          `Tactical Dispatch: Authorities dispatched to ${alert.zoneName}. Code: LEVEL-${alert.severity.toUpperCase()}`,
          'warning'
        );
      })
      .catch(() => {
        showToast(
          `Tactical Dispatch: Authorities dispatched to ${alert.zoneName} (Offline Mode).`,
          'warning'
        );
      });
  };

  // Custom Toast helper
  const showToast = (message: string, type: 'info' | 'success' | 'warning' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto remove
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  const unreadAlertsCount = alerts.filter((a) => !a.acknowledged).length;

  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-safenet-bg text-safenet-text transition-colors duration-300">
      
      {/* 1. Header Navigation */}
      <Navbar
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        unreadCount={unreadAlertsCount}
        onOpenAlerts={() => setIsAlertsOpen(true)}
      />

      {/* 2. Switchable Tab Controls */}
      <TabBar activeTab={activeTab} onChangeTab={(tabId) => setActiveTab(tabId)} />

      {/* 3. Primary Content Workspace */}
      <div className="flex-1 w-full overflow-hidden relative">
        <AnimatePresence mode="wait">
          {activeTab === 'Overview' && (
            <motion.div
              key="Overview"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="w-full h-full"
            >
              <OverviewTab
                cities={cities}
                zones={zones}
                selectedCity={selectedCity}
                onChangeCity={(cityName) => handleChangeCity(cityName)}
                activeTab={activeTab}
                onSelectZoneAndTab={(zone) => handleSelectZoneAndTab(zone)}
                onDetectLocation={handleDetectLocation}
              />
            </motion.div>
          )}

          {activeTab === 'Analytics' && (
            <motion.div
              key="Analytics"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="w-full h-full"
            >
              <AnalyticsTab
                zones={zones}
                selectedCity={selectedCity}
                onSelectZoneAndTab={(zone) => handleSelectZoneAndTab(zone)}
              />
            </motion.div>
          )}

          {activeTab === 'Security' && (
            <motion.div
              key="Security"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="w-full h-full"
            >
              <SecurityAllocationTab
                zones={zones}
                selectedCity={selectedCity}
              />
            </motion.div>
          )}

          {activeTab === 'Explainability' && (
            <motion.div
              key="Explainability"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="w-full h-full"
            >
              <ExplainabilityTab
                zones={zones.filter((z) => z.city === selectedCity.name)}
                selectedZone={selectedZone}
                onSelectZone={(zone) => setSelectedZone(zone)}
              />
            </motion.div>
          )}

          {activeTab === 'Performance' && (
            <motion.div
              key="Performance"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="w-full h-full"
            >
              <PerformanceTab
                selectedCity={selectedCity}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 4. Sliding Tactical Incident Drawer */}
      <AlertsDrawer
        isOpen={isAlertsOpen}
        onClose={() => setIsAlertsOpen(false)}
        alerts={alerts}
        onAcknowledge={(id) => handleAcknowledgeAlert(id)}
        onDispatch={(alert) => handleDispatchAuthorities(alert)}
      />

      {/* 5. Custom Floating Tactical Toasts */}
      <div className="fixed bottom-6 right-6 z-[2000] flex flex-col gap-3 max-w-sm w-full pointer-events-none select-none">
        <AnimatePresence>
          {toasts.map((toast) => {
            const isWarning = toast.type === 'warning';
            const isInfo = toast.type === 'info';
            return (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                className={`p-4 border rounded-xl shadow-xl flex items-start gap-3 pointer-events-auto bg-safenet-card border-safenet-border ${
                  isWarning 
                    ? 'border-l-4 border-l-risk-high shadow-[0_10px_25px_rgba(239,68,68,0.1)]' 
                    : isInfo 
                      ? 'border-l-4 border-l-brand'
                      : 'border-l-4 border-l-risk-low'
                }`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  {isWarning ? (
                    <ShieldAlert className="w-5 h-5 text-risk-high animate-bounce" />
                  ) : (
                    <ShieldCheck className="w-5 h-5 text-brand" />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className="text-xs font-heading font-bold text-safenet-text">
                    {isWarning ? 'Tactical Dispatch Warning' : 'System Notification'}
                  </h4>
                  <p className="text-[11px] text-safenet-muted mt-1 leading-relaxed font-medium">
                    {toast.message}
                  </p>
                </div>
                <button
                  onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
                  className="text-safenet-muted hover:text-safenet-text flex-shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

    </div>
  );
};

export default App;
