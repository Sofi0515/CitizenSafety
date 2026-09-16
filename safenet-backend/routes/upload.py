from flask import Blueprint, request
import os
import pandas as pd
import numpy as np

import config
from utils.responses import success_response, error_response
from services.geocoding import geocode
from services.training import train_region_model

upload_bp = Blueprint('upload', __name__)

@upload_bp.route('/regions/<region_id>/upload', methods=['POST'])
def upload_dataset(region_id):
    """
    Handles CSV upload, executes missing geocode coordinates, and trains
    region RandomForest models.
    """
    if region_id not in config.REGIONS:
        return error_response(f"Region '{region_id}' not found.", 404)
        
    if 'file' not in request.files:
        return error_response("No file attachment found in request.", 400)
        
    file = request.files['file']
    if file.filename == '':
        return error_response("Selected file is empty.", 400)
        
    if not file.filename.endswith('.csv'):
        return error_response("Only CSV formats are allowed.", 400)
        
    try:
        # Save raw uploaded file
        raw_path = os.path.join(config.DATA_DIR, region_id, 'raw.csv')
        os.makedirs(os.path.dirname(raw_path), exist_ok=True)
        file.save(raw_path)
        
        # Load and verify structure
        df = pd.read_csv(raw_path)
        
        # Ensure area_name column is present
        if 'area_name' not in df.columns:
            return error_response("Missing required column 'area_name' in CSV.", 400)
            
        # Standardize columns
        if 'latitude' not in df.columns or 'longitude' not in df.columns:
            df['latitude'] = np.nan
            df['longitude'] = np.nan
            
        # Geocode missing coordinates dynamically
        geocoded_count = 0
        for idx, row in df.iterrows():
            lat = row.get('latitude')
            lng = row.get('longitude')
            
            if pd.isna(lat) or pd.isna(lng):
                area_name = str(row['area_name'])
                new_lat, new_lng = geocode(area_name, region_id)
                df.at[idx, 'latitude'] = new_lat
                df.at[idx, 'longitude'] = new_lng
                geocoded_count += 1
                
        # Overwrite raw path with geocoded coordinates
        df.to_csv(raw_path, index=False)
        
        # Trigger model retraining
        results = train_region_model(region_id)
        
        # Clear cached model performance so endpoint recalculates on next request
        from routes.performance import clear_performance_cache
        clear_performance_cache(region_id)
        
        # Append geocode logging
        if geocoded_count > 0:
            results['rejected_reasons'].append(f"Geocoded {geocoded_count} areas lacking lat/lng coordinates via Nominatim.")
            
        return success_response(results)
        
    except Exception as e:
        return error_response(f"Upload and training failed: {str(e)}", 500)
