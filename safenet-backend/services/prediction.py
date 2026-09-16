import os
import joblib
import pandas as pd
import numpy as np

import config

def get_risk_level(score: float) -> str:
    """
    Buckets risk scores using standard thresholds.
    """
    if score >= config.THRESHOLD_HIGH:
        return 'high'
    elif score >= config.THRESHOLD_MEDIUM:
        return 'medium'
    else:
        return 'low'

def predict_single_record(region_id: str, raw_features: dict) -> dict:
    """
    Scores an ad-hoc single-row feature dict.
    Calculates dynamic confidence from trees standard deviation.
    """
    model_path = os.path.join(config.MODELS_DIR, region_id, 'model.pkl')
    scaler_path = os.path.join(config.MODELS_DIR, region_id, 'scaler.pkl')
    
    if not os.path.exists(model_path) or not os.path.exists(scaler_path):
        raise FileNotFoundError(f"Model artifacts for region '{region_id}' not found.")
        
    model = joblib.load(model_path)
    scaler = joblib.load(scaler_path)
    
    # 1. Map features to list
    # Apply standard defaults for optional features if absent
    traffic = float(raw_features.get('traffic_index', 50))
    crime = float(raw_features.get('crime_rate', 50))
    weather = float(raw_features.get('weather_severity', 50))
    
    pop_density = float(raw_features.get('population_density', 50))
    incidents_30d = float(raw_features.get('past_incidents_30d', 50))
    response_time = float(raw_features.get('avg_response_time_min', 15))
    lighting = float(raw_features.get('street_lighting_score', 50))
    patrol = float(raw_features.get('police_patrol_frequency', 50))
    
    # Feature Engineering
    rush_hour_traffic_weight = traffic * 1.25
    hazard_index = (traffic * weather) / 100.0
    
    feature_vector = np.array([[
        traffic, crime, weather, pop_density, incidents_30d, 
        response_time, lighting, patrol, rush_hour_traffic_weight, hazard_index
    ]])
    
    # 2. Scale features
    scaled_vector = scaler.transform(feature_vector)
    
    # 3. Predict Score
    score = float(model.predict(scaled_vector)[0])
    score = float(np.clip(score, 0, 100))
    
    # 4. Predict Confidence (Ensemble variance across decision trees)
    # std deviation of estimator predictions
    tree_preds = np.array([dt.predict(scaled_vector)[0] for dt in model.estimators_])
    std_dev = float(np.std(tree_preds))
    
    # Map std_dev to 0-100 confidence
    confidence = float(np.clip(100 - (std_dev * 2.5), 65, 98))
    
    # 5. Get top factor explanations using simple feature-importance approximation for manual predicts
    # (keeps simulator endpoint fast, SHAP will be called on zones)
    features_list = [
        'traffic_index', 'crime_rate', 'weather_severity', 
        'population_density', 'past_incidents_30d', 'avg_response_time_min', 
        'street_lighting_score', 'police_patrol_frequency'
    ]
    feature_labels = {
        'traffic_index': "Traffic Congestion",
        'crime_rate': "Past Incident History",
        'weather_severity': "Weather Conditions",
        'population_density': "Population Density",
        'past_incidents_30d': "Past Incidents (30d)",
        'avg_response_time_min': "Emergency Response Coverage",
        'street_lighting_score': "Street Lighting",
        'police_patrol_frequency': "Police Patrols"
    }
    
    # Simple simulated top factors based on feature weights relative to 50 average
    factors = []
    if traffic > 50:
        factors.append({"label": feature_labels['traffic_index'], "value": int(round((traffic - 50) * 0.4))})
    if crime > 50:
        factors.append({"label": feature_labels['crime_rate'], "value": int(round((crime - 50) * 0.45))})
    if weather > 50:
        factors.append({"label": feature_labels['weather_severity'], "value": int(round((weather - 50) * 0.3))})
        
    # fallback default if all sliders are low
    if not factors:
        factors.append({"label": "Street Lighting", "value": -3})
        
    factors = sorted(factors, key=lambda x: abs(x['value']), reverse=True)
    
    return {
        "score": int(round(score)),
        "level": get_risk_level(score),
        "confidence": int(round(confidence)),
        "top_factors": factors
    }
