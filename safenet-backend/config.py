import os
from dotenv import load_dotenv

# Load env file
load_dotenv()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
MODELS_DIR = os.path.join(BASE_DIR, 'models')

# Define additional path constants
DATA_RAW_DIR = os.path.join(DATA_DIR, 'raw')
DATA_PROCESSED_DIR = os.path.join(DATA_DIR, 'processed')
MODELS_ARTIFACTS_DIR = os.path.join(MODELS_DIR, 'artifacts')
MODELS_REGISTRY_PATH = os.path.join(MODELS_DIR, 'registry.json')

# Create core shared folders
os.makedirs(DATA_RAW_DIR, exist_ok=True)
os.makedirs(DATA_PROCESSED_DIR, exist_ok=True)
os.makedirs(MODELS_ARTIFACTS_DIR, exist_ok=True)

import pandas as pd
import re
from collections import UserDict

# Attempt to load state and city coordinates lookup
try:
    from data.city_coordinates import STATE_COORDINATES, CITY_COORDINATES
except ImportError:
    import sys
    sys.path.append(BASE_DIR)
    from data.city_coordinates import STATE_COORDINATES, CITY_COORDINATES

def load_dynamic_regions():
    """
    Dynamically loads unique state names from raw accident & crime datasets,
    cross-referenced with full 36 Indian states/UTs coordinates.
    """
    raw_path = os.path.join(DATA_RAW_DIR, 'accident_prediction_india.csv')
    crime_path = os.path.join(DATA_RAW_DIR, 'crime_data.csv')
    processed_path = os.path.join(DATA_PROCESSED_DIR, 'cleaned.parquet')
    
    state_names_set = set()
    
    # 1. Read from raw accident dataset
    if os.path.exists(raw_path):
        try:
            df_acc = pd.read_csv(raw_path)
            if 'State Name' in df_acc.columns:
                for s in df_acc['State Name'].dropna().unique():
                    s_str = str(s).strip()
                    if s_str and s_str.lower() != 'nan':
                        state_names_set.add(s_str)
        except Exception:
            pass

    # 2. Read from crime dataset
    if os.path.exists(crime_path):
        try:
            df_crime = pd.read_csv(crime_path)
            col = 'States/UTs' if 'States/UTs' in df_crime.columns else df_crime.columns[0]
            for s in df_crime[col].dropna().unique():
                s_str = str(s).strip()
                if s_str and s_str.lower() != 'nan':
                    state_names_set.add(s_str)
        except Exception:
            pass

    # 3. Read from processed parquet if available
    if os.path.exists(processed_path):
        try:
            df_proc = pd.read_parquet(processed_path)
            if 'State Name' in df_proc.columns:
                for s in df_proc['State Name'].dropna().unique():
                    s_str = str(s).strip()
                    if s_str and s_str.lower() != 'nan':
                        state_names_set.add(s_str)
        except Exception:
            pass
            
    # 4. Ensure all standard 36 states and UTs in STATE_COORDINATES are included
    for state_key in STATE_COORDINATES.keys():
        # Title case canonical name
        canon_name = ' '.join(w.capitalize() for w in state_key.split())
        state_names_set.add(canon_name)

    unique_states = sorted(list(state_names_set))
    
    regions = {}
    for state in unique_states:
        state_id = re.sub(r'[\s\-\_]+', '_', state.lower().strip())
        
        # Center coordinates lookup
        norm_name = re.sub(r'[\s\-\_]+', ' ', state.lower().strip())
        center = None
        if norm_name in STATE_COORDINATES:
            lat, lng = STATE_COORDINATES[norm_name]
            center = {"lat": lat, "lng": lng}
        else:
            alt_name = norm_name.replace(' and ', ' & ')
            if alt_name in STATE_COORDINATES:
                lat, lng = STATE_COORDINATES[alt_name]
                center = {"lat": lat, "lng": lng}
            else:
                alt_name_2 = norm_name.replace(' & ', ' and ')
                if alt_name_2 in STATE_COORDINATES:
                    lat, lng = STATE_COORDINATES[alt_name_2]
                    center = {"lat": lat, "lng": lng}
                    
        if center is None:
            center = {"lat": 21.1458, "lng": 79.0882}
                
        regions[state_id] = {
            "id": state_id,
            "name": state,
            "center": center,
            "zoom": 7 if 'delhi' not in state_id and 'chandigarh' not in state_id and 'puducherry' not in state_id else 10
        }
        
    return regions

class DynamicRegionsDict(UserDict):
    """
    Mapping class representing dynamic regions that reloads if dataset updates
    and supports backwards-compatible mappings.
    """
    def __init__(self):
        super().__init__()
        self._last_mtime = 0
        
    def _get_dataset_mtime(self):
        raw_path = os.path.join(DATA_RAW_DIR, 'accident_prediction_india.csv')
        processed_path = os.path.join(DATA_PROCESSED_DIR, 'cleaned.parquet')
        mtime = 0
        if os.path.exists(processed_path):
            try:
                mtime = max(mtime, os.path.getmtime(processed_path))
            except OSError:
                pass
        if os.path.exists(raw_path):
            try:
                mtime = max(mtime, os.path.getmtime(raw_path))
            except OSError:
                pass
        return mtime

    def _ensure_loaded(self):
        current_mtime = self._get_dataset_mtime()
        if not self.data or current_mtime > self._last_mtime:
            self.data = load_dynamic_regions()
            self._last_mtime = current_mtime
            
    def _map_legacy_key(self, key):
        mapping = {
            "bangalore": "karnataka",
            "mumbai": "maharashtra",
            "delhi_ncr": "delhi"
        }
        if key not in self.data and key in mapping:
            return mapping[key]
        return key

    def __getitem__(self, key):
        self._ensure_loaded()
        mapped_key = self._map_legacy_key(key)
        if mapped_key in self.data:
            return self.data[mapped_key]
        return self.data[key]
        
    def __contains__(self, key):
        self._ensure_loaded()
        mapped_key = self._map_legacy_key(key)
        return (mapped_key in self.data) or (key in self.data)
        
    def keys(self):
        self._ensure_loaded()
        return self.data.keys()
        
    def values(self):
        self._ensure_loaded()
        return self.data.values()
        
    def items(self):
        self._ensure_loaded()
        return self.data.items()
        
    def get(self, key, default=None):
        self._ensure_loaded()
        mapped_key = self._map_legacy_key(key)
        if mapped_key in self.data:
            return self.data[mapped_key]
        return self.data.get(key, default)

REGIONS = DynamicRegionsDict()

# Risk score thresholds
THRESHOLD_HIGH = 75
THRESHOLD_MEDIUM = 50

# API Keys loaded from .env
OPENWEATHER_API_KEY = os.getenv('OPENWEATHER_API_KEY', '')
IPINFO_API_KEY = os.getenv('IPINFO_API_KEY', '')
GOOGLE_MAPS_API_KEY = os.getenv('GOOGLE_MAPS_API_KEY', '')

# Ensure standard path structures exist
def migrate_legacy_data():
    """
    Utility function to migrate any seeded/trained directories matching legacy IDs
    to their state counterparts to ensure zero data loss.
    """
    import shutil
    mapping = {
        "bangalore": "karnataka",
        "mumbai": "maharashtra",
        "delhi_ncr": "delhi"
    }
    for old_id, new_id in mapping.items():
        # Migrate data folder
        old_data = os.path.join(DATA_DIR, old_id)
        new_data = os.path.join(DATA_DIR, new_id)
        if os.path.exists(old_data) and os.listdir(old_data):
            os.makedirs(new_data, exist_ok=True)
            for f in os.listdir(old_data):
                src = os.path.join(old_data, f)
                dst = os.path.join(new_data, f)
                if os.path.isfile(src) and not os.path.exists(dst):
                    try:
                        shutil.copy2(src, dst)
                    except Exception:
                        pass
                        
        # Migrate models folder
        old_models = os.path.join(MODELS_DIR, old_id)
        new_models = os.path.join(MODELS_DIR, new_id)
        if os.path.exists(old_models) and os.listdir(old_models):
            os.makedirs(new_models, exist_ok=True)
            for f in os.listdir(old_models):
                src = os.path.join(old_models, f)
                dst = os.path.join(new_models, f)
                if os.path.isfile(src) and not os.path.exists(dst):
                    try:
                        shutil.copy2(src, dst)
                    except Exception:
                        pass

# Migrate any existing legacy data on import
migrate_legacy_data()

# Ensure standard path structures exist for active dynamic regions
for r_id in list(REGIONS.keys()):
    os.makedirs(os.path.join(DATA_DIR, r_id), exist_ok=True)
    os.makedirs(os.path.join(MODELS_DIR, r_id), exist_ok=True)
