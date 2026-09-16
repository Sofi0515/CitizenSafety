import os
import pandas as pd
import numpy as np
import joblib
from sklearn.preprocessing import OrdinalEncoder

CATEGORICAL_COLS = [
    'State Name',
    'City Name',
    'Vehicle Type Involved',
    'Weather Conditions',
    'Road Type',
    'Road Condition',
    'Lighting Conditions',
    'Traffic Control Presence',
    'Driver Gender',
    'Driver License Status',
    'Alcohol Involvement',
    'Accident Location Details'
]

NUMERICAL_COLS = [
    'Number of Vehicles Involved',
    'Speed Limit (km/h)',
    'Driver Age',
    'hour',
    'is_night',
    'is_weekend'
]

FEATURE_COLS = CATEGORICAL_COLS + NUMERICAL_COLS

def parse_time_of_day(time_str: str) -> int:
    """
    Parses time strings like '13:45' or '1:30' into hour integer (0-23).
    """
    try:
        if ':' in str(time_str):
            parts = str(time_str).split(':')
            return int(parts[0])
        else:
            # Fallback for simple integer formats
            return int(float(time_str))
    except Exception:
        return 12  # Default to midday

def preprocess_dataframe(df: pd.DataFrame, fit_encoder: bool = False, encoder_path: str = None) -> tuple[pd.DataFrame, dict]:
    """
    Performs data cleaning, feature engineering, and ordinal encoding.
    Returns:
        X: Encoded feature matrix
        y: Targets dict {'risk_score': Series, 'risk_level': Series}
    """
    processed = df.copy()

    # 1. Clean missing categoricals
    processed['Traffic Control Presence'] = processed['Traffic Control Presence'].fillna('Unknown')
    processed['Driver License Status'] = processed['Driver License Status'].fillna('Unknown')

    # 2. Time-based feature engineering
    processed['hour'] = processed['Time of Day'].apply(parse_time_of_day)
    processed['is_night'] = processed['hour'].apply(lambda h: 1 if (h < 6 or h >= 20) else 0)
    
    # Map Day of Week to is_weekend
    weekend_days = ['saturday', 'sunday', 'sat', 'sun']
    processed['is_weekend'] = processed['Day of Week'].str.strip().str.lower().apply(
        lambda d: 1 if any(w in d for w in weekend_days) else 0
    )

    # 3. Derive target metrics (Accident Severity -> risk_level, risk_score) if targets are present
    y = {}
    if 'Accident Severity' in processed.columns:
        severity_map = {'Minor': 30, 'Serious': 65, 'Fatal': 95}
        processed['severity_weight'] = processed['Accident Severity'].map(severity_map).fillna(30)
        
        # Normalize casualties and fatalities dynamically
        def get_normalized(col):
            if col in processed.columns:
                c_min = processed[col].min()
                c_max = processed[col].max()
                rng = c_max - c_min
                return (processed[col] - c_min) / rng if rng > 0 else 0.0
            return 0.0
            
        norm_casualties = get_normalized('Number of Casualties')
        norm_fatalities = get_normalized('Number of Fatalities')
        
        # Composite risk score formula: 50% severity, 30% casualties, 20% fatalities
        raw_score = (
            (processed['severity_weight'] / 100.0) * 0.5 +
            norm_casualties * 0.3 +
            norm_fatalities * 0.2
        )
        processed['risk_score'] = (raw_score * 100.0).clip(0, 100).round(1)

        # Accident Severity -> risk_level mapping
        level_map = {'Fatal': 'High', 'Serious': 'Medium', 'Minor': 'Low'}
        processed['risk_level'] = processed['Accident Severity'].map(level_map).fillna('Low')

        y = {
            'risk_score': processed['risk_score'],
            'risk_level': processed['risk_level']
        }

    # 4. Ordinal encoding of categorical features
    if fit_encoder:
        encoder = OrdinalEncoder(handle_unknown='use_encoded_value', unknown_value=-1)
        processed[CATEGORICAL_COLS] = encoder.fit_transform(processed[CATEGORICAL_COLS].astype(str))
        if encoder_path:
            os.makedirs(os.path.dirname(encoder_path), exist_ok=True)
            joblib.dump(encoder, encoder_path)
    else:
        if encoder_path and os.path.exists(encoder_path):
            encoder = joblib.load(encoder_path)
            # handle unknown categories gracefully
            processed[CATEGORICAL_COLS] = encoder.transform(processed[CATEGORICAL_COLS].astype(str))
        else:
            raise FileNotFoundError(f"Encoding artifacts not found. Please train models first.")

    X = processed[FEATURE_COLS].copy()
    return X, y
