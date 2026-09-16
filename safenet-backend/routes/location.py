from flask import Blueprint, request
from utils.responses import success_response, error_response
from services.geocoding import reverse_geocode, ip_geocode

location_bp = Blueprint('location', __name__)

@location_bp.route('/location/detect', methods=['POST'])
def detect_location():
    """
    Identifies region from browser coordinates.
    Request body:
    {
      "lat": float,
      "lng": float
    }
    """
    body = request.get_json() or {}
    lat = body.get('lat')
    lng = body.get('lng')
    
    # IP Geolocation fallback if coords are missing
    if lat is None or lng is None:
        lat, lng = ip_geocode()
        
    try:
        detection = reverse_geocode(float(lat), float(lng))
        return success_response(detection)
    except Exception as e:
        return error_response(f"Location detection failed: {str(e)}", 500)
