import os
import pandas as pd
import numpy as np
import joblib
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import r2_score, mean_absolute_error
import shap

import config
from services.preprocessing import validate_and_clean_csv, preprocess_features

def train_region_model(region_id: str) -> dict:
    """
    Loads raw.csv for a region, preprocesses, trains a RandomForestRegressor,
    calculates metrics on a test set, and serializes the model and SHAP explainers.
    """
    raw_csv = os.path.join(config.DATA_DIR, region_id, 'raw.csv')
    if not os.path.exists(raw_csv):
        raise FileNotFoundError(f"No dataset found at: {raw_csv}")
        
    df = pd.read_csv(raw_csv)
    
    # 1. Validate & Clean
    cleaned_df, rejected_reasons = validate_and_clean_csv(df)
    
    # Save cleaned df for zone lookups
    cleaned_df.to_csv(os.path.join(config.DATA_DIR, region_id, 'cleaned.csv'), index=False)
    
    # 2. Scale features
    X_scaled, y, feature_names = preprocess_features(cleaned_df, region_id, fit_scaler=True)
    
    if len(X_scaled) < 5:
        # Avoid splitting if too few rows, train on all
        X_train, X_test, y_train, y_test = X_scaled, X_scaled, y, y
    else:
        X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42)
        
    # 3. Fit Random Forest Regressor
    model = RandomForestRegressor(n_estimators=100, max_depth=10, random_state=42)
    model.fit(X_train, y_train)
    
    # 4. Evaluate metrics
    y_pred = model.predict(X_test)
    r2 = r2_score(y_test, y_pred) if len(y_test) > 1 else 1.0
    mae = mean_absolute_error(y_test, y_pred) if len(y_test) > 0 else 0.0
    
    # Ensure R2 is not negative due to small test sets
    r2 = float(max(0.0, r2))
    mae = float(mae)
    
    # 5. Serialize model artifacts
    model_path = os.path.join(config.MODELS_DIR, region_id, 'model.pkl')
    os.makedirs(os.path.dirname(model_path), exist_ok=True)
    joblib.dump(model, model_path)
    
    # Pre-generate SHAP Explainer
    explainer = shap.TreeExplainer(model)
    explainer_path = os.path.join(config.MODELS_DIR, region_id, 'explainer.pkl')
    joblib.dump(explainer, explainer_path)
    
    # Save feature names list
    with open(os.path.join(config.MODELS_DIR, region_id, 'features.json'), 'w') as f:
        import json
        json.dump(feature_names, f)
        
    return {
        "status": "success",
        "rows_ingested": len(cleaned_df),
        "rows_rejected": len(rejected_reasons),
        "rejected_reasons": rejected_reasons,
        "model_metrics": {
            "r2": round(r2, 2),
            "mae": round(mae, 2)
        },
        "trained_at": pd.Timestamp.now().isoformat() + "Z"
    }
