import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler
import os
import joblib
import config

REQUIRED_COLUMNS = [
    'area_name', 'latitude', 'longitude', 'traffic_index', 'crime_rate', 'weather_severity'
]

OPTIONAL_COLUMNS = [
    'population_density', 'past_incidents_30d', 'avg_response_time_min', 
    'street_lighting_score', 'police_patrol_frequency', 'risk_score'
]

def calculate_synthetic_risk(row) -> float:
    """
    Computes risk score synthetically if not present in the dataset.
    Formula: 40% crime, 30% traffic, 30% weather, slightly modified by patrol/lighting if present.
    """
    crime = float(row.get('crime_rate', 50))
    traffic = float(row.get('traffic_index', 50))
    weather = float(row.get('weather_severity', 50))
    
    score = (crime * 0.4) + (traffic * 0.3) + (weather * 0.3)
    
    # Adjust slightly based on lighting and patrol if optional fields exist
    if 'street_lighting_score' in row and not pd.isna(row['street_lighting_score']):
        # Higher lighting reduces risk
        score -= (float(row['street_lighting_score']) - 50) * 0.05
    if 'police_patrol_frequency' in row and not pd.isna(row['police_patrol_frequency']):
        # Higher patrol frequency reduces risk
        score -= (float(row['police_patrol_frequency']) - 50) * 0.05
        
    return float(np.clip(score, 0, 100))

def validate_and_clean_csv(df: pd.DataFrame) -> tuple[pd.DataFrame, list[str]]:
    """
    Validates column headers, non-empty structures, and imputes nulls.
    Returns:
        (cleaned_df, rejected_reasons)
    """
    cleaned = df.copy()
    rejected_reasons = []
    
    # Check required columns
    missing_req = [col for col in REQUIRED_COLUMNS if col not in cleaned.columns]
    if missing_req:
        raise ValueError(f"Missing required columns in dataset: {', '.join(missing_req)}")
        
    # Check for empty rows
    cleaned = cleaned.dropna(how='all')
    
    # Track row validation status
    valid_indices = []
    for idx, row in cleaned.iterrows():
        row_num = idx + 1
        
        # Check required columns have non-null numeric values where applicable
        is_valid = True
        for col in REQUIRED_COLUMNS[1:]: # skip area_name string
            try:
                val = row.get(col)
                if pd.isna(val):
                    # We might be able to fill coords later in geocoding services,
                    # but if traffic/crime/weather is null, it's rejected.
                    if col in ['traffic_index', 'crime_rate', 'weather_severity']:
                        rejected_reasons.append(f"Row {row_num}: '{col}' cannot be null.")
                        is_valid = False
            except Exception:
                rejected_reasons.append(f"Row {row_num}: '{col}' failed numeric parsing.")
                is_valid = False
                
        if is_valid:
            valid_indices.append(idx)
            
    cleaned = cleaned.loc[valid_indices].copy()
    
    # Median imputations for optional numeric columns
    for col in OPTIONAL_COLUMNS[:-1]: # skip risk_score
        if col in cleaned.columns:
            median_val = cleaned[col].median()
            if pd.isna(median_val):
                median_val = 50.0
            cleaned[col] = cleaned[col].fillna(median_val)
        else:
            cleaned[col] = 50.0 # Default fallback if column does not exist
            
    # Calculate synthetic risk label if absent
    if 'risk_score' not in cleaned.columns:
        cleaned['risk_score'] = cleaned.apply(calculate_synthetic_risk, axis=1)
        rejected_reasons.append("Warning: 'risk_score' label absent. Synthetic labels computed via fallback formula.")
    else:
        # Fill missing values in risk_score
        cleaned['risk_score'] = cleaned['risk_score'].fillna(cleaned.apply(calculate_synthetic_risk, axis=1))
        
    return cleaned, rejected_reasons

def preprocess_features(df: pd.DataFrame, region_id: str, fit_scaler: bool = False) -> tuple[np.ndarray, np.ndarray, list[str]]:
    """
    Performs feature engineering and scales values using StandardScaler.
    Returns:
        scaled_X: numpy array of scaled features
        y: target risk score labels
        feature_names: list of engineered feature labels
    """
    X = df.copy()
    
    # Feature Engineering
    # 1. Rush Hour Traffic Weight (standard 25% bump)
    X['rush_hour_traffic_weight'] = X['traffic_index'] * 1.25
    
    # 2. Hazard Index (correlation of traffic index and weather severity)
    X['hazard_index'] = (X['traffic_index'] * X['weather_severity']) / 100.0
    
    feature_names = [
        'traffic_index', 'crime_rate', 'weather_severity', 
        'population_density', 'past_incidents_30d', 'avg_response_time_min', 
        'street_lighting_score', 'police_patrol_frequency',
        'rush_hour_traffic_weight', 'hazard_index'
    ]
    
    X_features = X[feature_names].values
    y = X['risk_score'].values
    
    scaler_path = os.path.join(config.MODELS_DIR, region_id, 'scaler.pkl')
    
    if fit_scaler:
        scaler = StandardScaler()
        scaled_X = scaler.fit_transform(X_features)
        os.makedirs(os.path.dirname(scaler_path), exist_ok=True)
        joblib.dump(scaler, scaler_path)
    else:
        if os.path.exists(scaler_path):
            scaler = joblib.load(scaler_path)
            scaled_X = scaler.transform(X_features)
        else:
            # Fallback scaling if model isn't trained yet
            scaler = StandardScaler()
            scaled_X = scaler.fit_transform(X_features)
            
    return scaled_X, y, feature_names
