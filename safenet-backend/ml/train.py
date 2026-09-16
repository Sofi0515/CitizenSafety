import os
import json
import pandas as pd
import numpy as np
import joblib
from datetime import datetime
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
import shap

import config
from data.schema import validate_and_clean_dataframe
from ml.preprocessing import preprocess_dataframe, FEATURE_COLS

def train_national_model():
    """
    Ingests the single national accident_prediction_india.csv dataset,
    runs cleaning, feature engineering, and encodings, and fits/pickles
    the RF models and SHAP explainers.
    """
    raw_csv_path = os.path.join(config.DATA_RAW_DIR, 'accident_prediction_india.csv')
    if not os.path.exists(raw_csv_path):
        raise FileNotFoundError(f"Accident dataset file not found at: {raw_csv_path}")

    # 1. Load and validate
    df = pd.read_csv(raw_csv_path)
    cleaned_df = validate_and_clean_dataframe(df)

    # Save processed dataframe cache
    os.makedirs(config.DATA_PROCESSED_DIR, exist_ok=True)
    processed_cache_path = os.path.join(config.DATA_PROCESSED_DIR, 'cleaned.parquet')
    cleaned_df.to_parquet(processed_cache_path, index=False)

    # 2. Preprocess features & target labels
    encoders_path = os.path.join(config.MODELS_ARTIFACTS_DIR, 'encoders.joblib')
    X, y = preprocess_dataframe(cleaned_df, fit_encoder=True, encoder_path=encoders_path)

    # 3. Train Classifier & Regressor
    # Choose hyper-parameters to avoid overfitting and keep memory compact
    model_clf = RandomForestClassifier(n_estimators=100, max_depth=12, random_state=42)
    model_reg = RandomForestRegressor(n_estimators=100, max_depth=12, random_state=42)

    model_clf.fit(X, y['risk_level'])
    model_reg.fit(X, y['risk_score'])

    # 4. Generate SHAP Explainer (fit on Classifier)
    explainer = shap.TreeExplainer(model_clf)

    # 5. Serialize Artifacts
    # Note: national model resides in models/artifacts/ directly
    joblib.dump(model_clf, os.path.join(config.MODELS_ARTIFACTS_DIR, 'model_clf.joblib'))
    joblib.dump(model_reg, os.path.join(config.MODELS_ARTIFACTS_DIR, 'model_reg.joblib'))
    joblib.dump(explainer, os.path.join(config.MODELS_ARTIFACTS_DIR, 'explainer.joblib'))
    
    with open(os.path.join(config.MODELS_ARTIFACTS_DIR, 'feature_names.json'), 'w') as f:
        json.dump(FEATURE_COLS, f)

    # Class balance counts
    class_counts = y['risk_level'].value_counts().to_dict()

    metadata = {
        "model_name": f"Accident Severity Random Forest v2 — trained {datetime.now().strftime('%Y-%m-%d')}",
        "trained_at": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        "n_samples": len(X),
        "class_balance": class_counts,
        "features": FEATURE_COLS
    }

    with open(os.path.join(config.MODELS_ARTIFACTS_DIR, 'metadata.json'), 'w') as f:
        json.dump(metadata, f, indent=2)

    # Update Registry
    registry = {
        "national_model": {
            "trained_at": metadata["trained_at"],
            "n_samples": metadata["n_samples"],
            "model_name": metadata["model_name"]
        }
    }
    with open(config.MODELS_REGISTRY_PATH, 'w') as f:
        json.dump(registry, f, indent=2)

    print("National model successfully trained and serialized.")
    return metadata

if __name__ == '__main__':
    train_national_model()
