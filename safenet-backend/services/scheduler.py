import threading
import time
import os
import pandas as pd
import numpy as np
import joblib

import config
from services.live_weather import get_live_weather
from services.preprocessing import preprocess_features
from services.prediction import get_risk_level

_scheduler_thread = None
_stop_event = threading.Event()

def update_live_predictions():
    """
    Loops through all registered regions, fetches live weather conditions
    per coordinate, and recomputes the risk scores.
    """
    for r_id in config.REGIONS:
        cleaned_csv = os.path.join(config.DATA_DIR, r_id, 'cleaned.csv')
        model_path = os.path.join(config.MODELS_DIR, r_id, 'model.pkl')
        scaler_path = os.path.join(config.MODELS_DIR, r_id, 'scaler.pkl')
        
        if not os.path.exists(cleaned_csv) or not os.path.exists(model_path):
            continue
            
        try:
            df = pd.read_csv(cleaned_csv)
            model = joblib.load(model_path)
            scaler = joblib.load(scaler_path)
            
            # Feature list path
            features_json = os.path.join(config.MODELS_DIR, r_id, 'features.json')
            with open(features_json, 'r') as f:
                import json
                feature_names = json.load(f)
                
            scores = []
            levels = []
            
            # Fetch weather for each zone coordinate
            for idx, row in df.iterrows():
                lat = float(row['latitude'])
                lng = float(row['longitude'])
                
                # Fetch weather
                weather_info = get_live_weather(lat, lng)
                
                # Overwrite weather severity index dynamically
                df.at[idx, 'weather_severity'] = weather_info['severity_score']
                
                # Build feature row
                traffic = float(row['traffic_index'])
                crime = float(row['crime_rate'])
                weather_score = weather_info['severity_score']
                
                pop_density = float(row.get('population_density', 50))
                incidents_30d = float(row.get('past_incidents_30d', 50))
                response_time = float(row.get('avg_response_time_min', 15))
                lighting = float(row.get('street_lighting_score', 50))
                patrol = float(row.get('police_patrol_frequency', 50))
                
                rush_hour_traffic = traffic * 1.25
                hazard = (traffic * weather_score) / 100.0
                
                vec = np.array([[
                    traffic, crime, weather_score, pop_density, incidents_30d,
                    response_time, lighting, patrol, rush_hour_traffic, hazard
                ]])
                
                scaled = scaler.transform(vec)
                score = float(model.predict(scaled)[0])
                score = float(np.clip(score, 0, 100))
                
                scores.append(round(score, 1))
                levels.append(get_risk_level(score))
                
            # Write updated predictions back to cleaned.csv
            df['risk_score'] = scores
            df['risk_level'] = levels
            df.to_csv(cleaned_csv, index=False)
            
        except Exception as e:
            print(f"[Scheduler] Failed to update predictions for region '{r_id}': {str(e)}")

def _scheduler_loop(interval_sec):
    while not _stop_event.is_set():
        print("[Scheduler] Running live weather re-predictions job...")
        update_live_predictions()
        # Sleep in chunks to allow fast shutdown
        for _ in range(int(interval_sec)):
            if _stop_event.is_set():
                break
            time.sleep(1)

def start_scheduler(interval_sec=300):
    """
    Spawns background scheduler thread.
    """
    global _scheduler_thread
    if _scheduler_thread is not None and _scheduler_thread.is_alive():
        return
        
    _stop_event.clear()
    _scheduler_thread = threading.Thread(
        target=_scheduler_loop, 
        args=(interval_sec,),
        daemon=True
    )
    _scheduler_thread.start()
    print(f"[Scheduler] Background thread started. Running every {interval_sec} seconds.")

def stop_scheduler():
    global _scheduler_thread
    if _scheduler_thread is None:
        return
    _stop_event.set()
    _scheduler_thread.join(timeout=2)
    print("[Scheduler] Background thread stopped.")
