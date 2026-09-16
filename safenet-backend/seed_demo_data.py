import os
import pandas as pd
import numpy as np
import config
from services.training import train_region_model

# 1. Coordinate maps and metrics for each region's zones
SEEDED_ZONES = {
    "karnataka": [
        {"area_name": "Majestic", "lat": 12.9774, "lng": 77.5729, "traffic": 82, "crime": 68, "weather": 35, "lighting": 55, "patrol": 45},
        {"area_name": "Koramangala", "lat": 12.9279, "lng": 77.6271, "traffic": 64, "crime": 42, "weather": 30, "lighting": 82, "patrol": 78},
        {"area_name": "Indiranagar", "lat": 12.9719, "lng": 77.6412, "traffic": 72, "crime": 35, "weather": 30, "lighting": 85, "patrol": 75},
        {"area_name": "Electronic City", "lat": 12.8399, "lng": 77.6770, "traffic": 85, "crime": 28, "weather": 45, "lighting": 70, "patrol": 62},
        {"area_name": "Whitefield", "lat": 12.9698, "lng": 77.7500, "traffic": 78, "crime": 31, "weather": 40, "lighting": 68, "patrol": 58},
        {"area_name": "Yeshwanthpur", "lat": 13.0238, "lng": 77.5385, "traffic": 88, "crime": 55, "weather": 35, "lighting": 60, "patrol": 50}
    ],
    "delhi": [
        {"area_name": "Connaught Place", "lat": 28.6304, "lng": 77.2177, "traffic": 86, "crime": 72, "weather": 50, "lighting": 88, "patrol": 85},
        {"area_name": "Noida Sector 62", "lat": 28.6275, "lng": 77.3724, "traffic": 68, "crime": 48, "weather": 45, "lighting": 72, "patrol": 60},
        {"area_name": "Gurugram Cyber City", "lat": 28.4950, "lng": 77.0878, "traffic": 75, "crime": 34, "weather": 45, "lighting": 90, "patrol": 80},
        {"area_name": "Dwarka", "lat": 28.5859, "lng": 77.0498, "traffic": 58, "crime": 62, "weather": 40, "lighting": 65, "patrol": 55},
        {"area_name": "Saket", "lat": 28.5222, "lng": 77.2100, "traffic": 70, "crime": 50, "weather": 40, "lighting": 80, "patrol": 70}
    ],
    "maharashtra": [
        {"area_name": "Bandra West", "lat": 19.0583, "lng": 72.8302, "traffic": 78, "crime": 38, "weather": 65, "lighting": 85, "patrol": 80},
        {"area_name": "Andheri East", "lat": 19.1176, "lng": 72.8631, "traffic": 88, "crime": 45, "weather": 60, "lighting": 74, "patrol": 65},
        {"area_name": "Nariman Point", "lat": 18.9269, "lng": 72.8228, "traffic": 54, "crime": 20, "weather": 50, "lighting": 92, "patrol": 88},
        {"area_name": "Dadar", "lat": 19.0178, "lng": 72.8478, "traffic": 84, "crime": 52, "weather": 60, "lighting": 78, "patrol": 70},
        {"area_name": "Thane", "lat": 19.1828, "lng": 72.9612, "traffic": 75, "crime": 40, "weather": 55, "lighting": 68, "patrol": 58}
    ],
    "uttar_pradesh": [
        {"area_name": "Hazratganj Lucknow", "lat": 26.8486, "lng": 80.9454, "traffic": 80, "crime": 55, "weather": 40, "lighting": 82, "patrol": 75},
        {"area_name": "Noida", "lat": 28.5355, "lng": 77.3910, "traffic": 74, "crime": 58, "weather": 45, "lighting": 78, "patrol": 68},
        {"area_name": "Taj Ganj Agra", "lat": 27.1642, "lng": 78.0407, "traffic": 65, "crime": 48, "weather": 45, "lighting": 70, "patrol": 65},
        {"area_name": "Varanasi Cantt", "lat": 25.3263, "lng": 82.9876, "traffic": 85, "crime": 62, "weather": 35, "lighting": 60, "patrol": 50},
        {"area_name": "Prayagraj Junction", "lat": 25.4429, "lng": 81.8294, "traffic": 72, "crime": 50, "weather": 35, "lighting": 65, "patrol": 55}
    ]
}

def seed_regions_data():
    """
    Writes raw dataset CSV files and fits RandomForestRegressors for all regions.
    """
    print("=========================================================")
    print("      Seeding Urban Safety AI Multi-City Datasets...     ")
    print("=========================================================")
    
    for r_id, zones in SEEDED_ZONES.items():
        print(f"\n[Seeder] Seeding region: {r_id.upper()}")
        
        # Build DataFrame with standard + optional columns
        rows = []
        for z in zones:
            rows.append({
                "area_name": z['area_name'],
                "latitude": z['lat'],
                "longitude": z['lng'],
                "traffic_index": z['traffic'],
                "crime_rate": z['crime'],
                "weather_severity": z['weather'],
                "population_density": int(np.random.randint(1000, 8000)),
                "past_incidents_30d": int(np.random.randint(2, 20)),
                "avg_response_time_min": float(np.random.uniform(8.0, 22.0)),
                "street_lighting_score": z['lighting'],
                "police_patrol_frequency": z['patrol']
            })
            
        df = pd.DataFrame(rows)
        raw_csv = os.path.join(config.DATA_DIR, r_id, 'raw.csv')
        os.makedirs(os.path.dirname(raw_csv), exist_ok=True)
        df.to_csv(raw_csv, index=False)
        print(f"[Seeder] Wrote {len(df)} zones to {raw_csv}")
        
        # Train model
        print(f"[Seeder] Training ML model for {r_id}...")
        metrics = train_region_model(r_id)
        print(f"[Seeder] Model metrics: R2={metrics['model_metrics']['r2']}, MAE={metrics['model_metrics']['mae']}")
        
    print("\n=========================================================")
    print("           Seeding successfully completed!               ")
    print("=========================================================")

if __name__ == '__main__':
    seed_regions_data()
