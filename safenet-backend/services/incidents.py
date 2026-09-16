import time
import uuid
from services.geocoding import distance_kms

# In-memory store for crowdsourced incident reports
INCIDENTS_DB = []

BOOST_VALUES = {
    "poor_lighting": 8.0,
    "road_construction": 5.0,
    "traffic_jam": 4.0,
    "crime_alert": 12.0
}

def add_incident(region_id: str, lat: float, lng: float, category: str, note: str) -> dict:
    """
    Submits a crowdsourced incident report.
    """
    report = {
        "id": str(uuid.uuid4()),
        "region_id": region_id,
        "lat": float(lat),
        "lng": float(lng),
        "category": category,
        "note": note,
        "created_at": time.time() # epoch float
    }
    INCIDENTS_DB.append(report)
    return report

def get_active_incidents(region_id: str) -> list:
    """
    Returns non-expired incident reports (created within last 6 hours).
    """
    now = time.time()
    active = []
    for r in INCIDENTS_DB:
        if r['region_id'] == region_id and (now - r['created_at']) < (6 * 3600):
            # Calculate remaining minutes
            remaining_mins = int(round((6 * 3600 - (now - r['created_at'])) / 60))
            active.append({
                "id": r['id'],
                "category": r['category'],
                "note": r['note'],
                "lat": r['lat'],
                "lng": r['lng'],
                "expires_in_mins": remaining_mins
            })
    return active

def calculate_zone_boosts(region_id: str, zone_lat: float, zone_lng: float) -> float:
    """
    Calculates the cumulative risk boost for a zone based on nearby active incidents.
    Maximum distance threshold: 2.5 km
    """
    now = time.time()
    total_boost = 0.0
    
    for r in INCIDENTS_DB:
        if r['region_id'] == region_id and (now - r['created_at']) < (6 * 3600):
            dist = distance_kms(zone_lat, zone_lng, r['lat'], r['lng'])
            if dist <= 2.5:
                # Add category specific boost value
                boost = BOOST_VALUES.get(r['category'].lower(), 5.0)
                # Linear time decay (full boost at start, 0 boost at 6 hours)
                time_ratio = (now - r['created_at']) / (6 * 3600)
                decayed_boost = boost * (1 - time_ratio)
                total_boost += decayed_boost
                
    return float(np_clip(total_boost, 0.0, 25.0)) # cap boost to max +25 risk points

# simple float clip utility
def np_clip(val, min_val, max_val):
    if val < min_val: return min_val
    if val > max_val: return max_val
    return val
