from flask import Blueprint, request
import os
import pandas as pd
import numpy as np

import config
from utils.responses import success_response, error_response
from services.incidents import add_incident, get_active_incidents, BOOST_VALUES
from services.geocoding import distance_kms

incidents_bp = Blueprint('incidents', __name__)

@incidents_bp.route('/incidents', methods=['POST'])
def report_incident():
    """
    Submits crowdsourced reports and flags nearby zone risk boosts.
    Request body:
    {
      "region": str,
      "lat": float,
      "lng": float,
      "category": str,
      "note": str
    }
    """
    body = request.get_json() or {}
    default_region = list(config.REGIONS.keys())[0] if config.REGIONS else 'karnataka'
    region_id = body.get('region', default_region)
    lat = body.get('lat')
    lng = body.get('lng')
    category = body.get('category', 'poor_lighting')
    note = body.get('note', '')
    
    if region_id not in config.REGIONS:
        return error_response(f"Region '{region_id}' not found.", 404)
        
    if lat is None or lng is None:
        return error_response("Coordinates (lat, lng) are required.", 400)
        
    try:
        lat = float(lat)
        lng = float(lng)
        
        # Add report to memory database
        report = add_incident(region_id, lat, lng, category, note)
        
        # Find nearest zone in region dataset
        affected_zone_id = None
        cleaned_csv = os.path.join(config.DATA_DIR, region_id, 'cleaned.csv')
        
        if os.path.exists(cleaned_csv):
            df = pd.read_csv(cleaned_csv)
            min_dist = 2.5 # Maximum 2.5 Kms tolerance
            for idx, row in df.iterrows():
                z_lat = float(row['latitude'])
                z_lng = float(row['longitude'])
                d = distance_kms(lat, lng, z_lat, z_lng)
                if d < min_dist:
                    min_dist = d
                    affected_zone_id = row['area_name'].strip().lower().replace(" ", "_")
                    
        boost = BOOST_VALUES.get(category.lower(), 5.0)
        
        return success_response({
            "status": "success",
            "report_id": report['id'],
            "affected_zone_id": affected_zone_id,
            "temporary_score_boost": boost
        })
    except Exception as e:
        return error_response(f"Reporting incident failed: {str(e)}", 500)

@incidents_bp.route('/regions/<region_id>/incidents', methods=['GET'])
def get_incidents(region_id):
    """
    Retrieves all active incident reports for a region.
    """
    if region_id not in config.REGIONS:
        return error_response(f"Region '{region_id}' not found.", 404)
        
    try:
        active = get_active_incidents(region_id)
        return success_response({"incidents": active})
    except Exception as e:
        return error_response(f"Failed to fetch incidents: {str(e)}", 500)
