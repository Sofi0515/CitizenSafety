export type RiskLevel = 'Low' | 'Medium' | 'High';

export interface WeatherInfo {
  temp: number;
  condition: 'Clear' | 'Rainy' | 'Cloudy' | 'Stormy' | 'Foggy';
  humidity: number; // percentage
  wind: number; // km/h
  visibility: number; // km
}

export interface SHAPContribution {
  factor: string;
  value: number; // Positive drives risk up, negative drives risk down
  category: 'Traffic' | 'Crime' | 'Weather' | 'Infrastructure' | 'Demographics' | 'Response';
}

export interface Zone {
  id: string;
  name: string;
  city: string;
  riskScore: number; // 0 - 100
  riskLevel: RiskLevel;
  coordinates: [number, number]; // [lat, lng]
  factors: {
    traffic: number; // slider 0-100
    crime: number; // slider 0-100
    weather: number; // slider 0-100
  };
  weather: WeatherInfo;
  shapContributions: SHAPContribution[];
  explanation: string;
  confidenceScore: number; // percentage 0-100
  modelName: string;
}

export interface SafetyAlert {
  id: string;
  zoneId: string;
  zoneName: string;
  city: string;
  severity: RiskLevel;
  title: string;
  description: string;
  timestamp: string;
  acknowledged: boolean;
}

export interface CityData {
  name: string;
  center: [number, number];
  zoom: number;
}

export interface ConfusionMatrixData {
  labels: string[];
  matrix: number[][];
}

export interface FeatureImportanceItem {
  label: string;
  value: number;
}

export interface ModelComparisonItem {
  model: string;
  accuracy: number;
  selected: boolean;
}

export interface TrainingHistoryItem {
  fold: string;
  accuracy: number;
}

export interface ModelPerformanceData {
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  test_sample_count: number;
  confusion_matrix: ConfusionMatrixData;
  feature_importance: FeatureImportanceItem[];
  model_comparison: ModelComparisonItem[];
  training_history?: TrainingHistoryItem[];
  region_id?: string;
  region_name?: string;
}

