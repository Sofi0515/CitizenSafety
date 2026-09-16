import urllib.request
import urllib.parse
import json
import time
import math
import os
import pandas as pd
import config

# Fallback centroid coordinates database for common area names
FALLBACK_DATABASE = {
    # Bangalore
    "electronic city": (12.8399, 77.6770),
    "whitefield": (12.9698, 77.7500),
    "majestic": (12.9774, 77.5729),
    "koramangala": (12.9279, 77.6271),
    "indiranagar": (12.9719, 77.6412),
    "yeshwanthpur": (13.0238, 77.5385),
    
    # Delhi NCR
    "connaught place": (28.6304, 77.2177),
    "noida sector 62": (28.6275, 77.3724),
    "gurugram cyber city": (28.4950, 77.0878),
    "dwarka": (28.5859, 77.0498),
    "saket": (28.5222, 77.2100),
    
    # Mumbai
    "bandra west": (19.0583, 72.8302),
    "andheri east": (19.1176, 72.8631),
    "nariman point": (18.9269, 72.8228),
    "dadar": (19.0178, 72.8478),
    "thane": (19.1828, 72.9612),
    
    # Uttar Pradesh
    "hazratganj lucknow": (26.8486, 80.9454),
    "noida": (28.5355, 77.3910),
    "taj ganj agra": (27.1642, 78.0407),
    "varanasi cantt": (25.3263, 82.9876),
    "prayagraj junction": (25.4429, 81.8294)
}

def distance_kms(lat1, lon1, lat2, lon2) -> float:
    """
    Computes haversine distance in Kms.
    """
    R = 6371.0 # Earth radius
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2)**2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

def geocode(area_name: str, region_id: str) -> tuple[float, float]:
    """
    Geocodes area name using OSM Nominatim. Falls back to coordinates database.
    """
    clean_name = area_name.strip().lower()
    
    # Check fallback database first
    if clean_name in FALLBACK_DATABASE:
        return FALLBACK_DATABASE[clean_name]
        
    # Query Nominatim
    query = f"{area_name}, {config.REGIONS[region_id]['name']}, India"
    url = f"https://nominatim.openstreetmap.org/search?q={urllib.parse.quote(query)}&format=json&limit=1"
    
    try:
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'SafeNetAI-Dashboard-Demo/1.0 (priya@example.com)'}
        )
        time.sleep(1.1) # Respect 1req/sec Nominatim policy
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode())
            if data:
                lat = float(data[0]['lat'])
                lng = float(data[0]['lon'])
                return lat, lng
    except Exception:
        pass
        
    # Return region center default centroid as last resort
    center = config.REGIONS[region_id]['center']
    return center['lat'], center['lng']

def reverse_geocode(lat: float, lng: float) -> dict:
    """
    Identifies which of the 4 supported regions is closest to the coords,
    looks up address details via Nominatim, and scans for closest zones.
    """
    default_region = list(config.REGIONS.keys())[0] if config.REGIONS else "karnataka"
    nearest_region = default_region
    min_dist = float('inf')
    
    for r_id, reg in config.REGIONS.items():
        dist = distance_kms(lat, lng, reg['center']['lat'], reg['center']['lng'])
        if dist < min_dist:
            min_dist = dist
            nearest_region = r_id
            
    # 2. Query Nominatim for human-readable label
    place_name = f"Latitude {round(lat, 4)}, Longitude {round(lng, 4)}"
    url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lng}&format=json"
    
    try:
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'SafeNetAI-Dashboard-Demo/1.0 (priya@example.com)'}
        )
        time.sleep(1.1)
        with urllib.request.urlopen(req, timeout=5) as response:
            data = json.loads(response.read().decode())
            if data:
                place_name = data.get('display_name', place_name).split(',')[0].strip()
                # Append neighborhood details
                addr = data.get('address', {})
                suburb = addr.get('suburb', addr.get('neighbourhood', addr.get('city_district', '')))
                if suburb:
                    place_name = f"{suburb}, {place_name}"
    except Exception:
        pass
        
    # 3. Check for closest zone in the dataset
    matched_zone_id = None
    cleaned_csv = os.path.join(config.DATA_DIR, nearest_region, 'cleaned.csv')
    if os.path.exists(cleaned_csv):
        try:
            df = pd.read_csv(cleaned_csv)
            closest_dist = 2.5 # Maximum 2.5 km tolerance
            for idx, row in df.iterrows():
                z_lat = float(row['latitude'])
                z_lng = float(row['longitude'])
                d = distance_kms(lat, lng, z_lat, z_lng)
                if d < closest_dist:
                    closest_dist = d
                    # zone_id mapping (area_name slugified)
                    matched_zone_id = row['area_name'].strip().lower().replace(" ", "_")
        except Exception:
            pass
            
    return {
        "region_id": nearest_region,
        "place_name": place_name,
        "matched_zone_id": matched_zone_id
    }

def ip_geocode() -> tuple[float, float]:
    """
    Geolocates client IP using ipapi.co fallback.
    Returns:
        (lat, lng)
    """
    url = "https://ipapi.co/json/"
    try:
        req = urllib.request.Request(
            url, 
            headers={'User-Agent': 'SafeNetAI-Dashboard-Demo/1.0'}
        )
        with urllib.request.urlopen(req, timeout=4) as response:
            data = json.loads(response.read().decode())
            if 'latitude' in data and 'longitude' in data:
                return float(data['latitude']), float(data['longitude'])
    except Exception:
        pass
    # default fallback center
    return 12.9716, 77.5946
