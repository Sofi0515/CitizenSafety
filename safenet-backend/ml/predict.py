import os
import joblib
import pandas as pd
import numpy as np
import config
from ml.preprocessing import preprocess_dataframe, FEATURE_COLS

def predict_record(raw_features: dict) -> dict:
    """
    Predicts accident risk score and severity level for a custom feature dict.
    raw_features requires:
    {
      'State Name': str,
      'City Name': str,
      'Vehicle Type Involved': str,
      'Weather Conditions': str,
      'Road Type': str,
      'Road Condition': str,
      'Lighting Conditions': str,
      'Traffic Control Presence': str,
      'Driver Gender': str,
      'Driver License Status': str,
      'Alcohol Involvement': str,
      'Accident Location Details': str,
      'Number of Vehicles Involved': int,
      'Speed Limit (km/h)': float,
      'Driver Age': int,
      'Time of Day': str (e.g. '18:30'),
      'Day of Week': str (e.g. 'Friday')
    }
    """
    model_clf_path = os.path.join(config.MODELS_ARTIFACTS_DIR, 'model_clf.joblib')
    model_reg_path = os.path.join(config.MODELS_ARTIFACTS_DIR, 'model_reg.joblib')
    encoders_path = os.path.join(config.MODELS_ARTIFACTS_DIR, 'encoders.joblib')
    
    if not os.path.exists(model_clf_path) or not os.path.exists(model_reg_path):
        raise FileNotFoundError("Model artifacts not found. Please train the national model first.")

    # Load models
    model_clf = joblib.load(model_clf_path)
    model_reg = joblib.load(model_reg_path)
    
    # 1. Create single-row DataFrame
    # Fill in defaults if any columns are missing
    df_row = pd.DataFrame([raw_features])
    
    # Fill defaults for required schema structure
    defaults = {
        'State Name': 'Karnataka',
        'City Name': 'Bengaluru',
        'Vehicle Type Involved': 'Car',
        'Weather Conditions': 'Clear',
        'Road Type': 'City Road',
        'Road Condition': 'Dry',
        'Lighting Conditions': 'Day',
        'Traffic Control Presence': 'Unknown',
        'Driver Gender': 'Male',
        'Driver License Status': 'Unknown',
        'Alcohol Involvement': 'No',
        'Accident Location Details': 'Straight Road',
        'Number of Vehicles Involved': 2,
        'Speed Limit (km/h)': 50,
        'Driver Age': 35,
        'Time of Day': '12:00',
        'Day of Week': 'Wednesday'
    }
    for col, val in defaults.items():
        if col not in df_row.columns:
            df_row[col] = val

    # 2. Process features
    X, _ = preprocess_dataframe(df_row, fit_encoder=False, encoder_path=encoders_path)
    
    # 3. Score
    predicted_score = float(model_reg.predict(X)[0])
    predicted_label = str(model_clf.predict(X)[0])
    
    # Calculate confidence score
    classes = list(model_clf.classes_)
    probs = model_clf.predict_proba(X)[0]
    pred_idx = classes.index(predicted_label)
    confidence = float(probs[pred_idx] * 100)
    
    return {
        "risk_score": round(predicted_score, 1),
        "risk_level": predicted_label,
        "confidence_score": round(confidence, 1)
    }
