from flask import Blueprint, request
from ml.predict import predict_record
from utils.responses import success_response, error_response
import config

predict_bp = Blueprint('predict', __name__)

@predict_bp.route('/predict', methods=['POST'])
def post_prediction():
    """
    Executes an ad-hoc prediction based on simulator features.
    Request body schema:
    {
      "state_name": "Karnataka",
      "weather": "Rainy",
      "road_type": "National Highway",
      "road_condition": "Wet",
      "lighting": "Night/Dark",
      "speed_limit": 80,
      "alcohol_involvement": true,
      "time_of_day": "21:30",
      "vehicle_type": "Truck",
      "num_vehicles": 3
    }
    """
    data = request.get_json() or {}
    
    try:
        # Build features mapping slider parameters to the 22-field schema
        features = {
            'State Name': data.get('state_name', 'Karnataka'),
            'City Name': data.get('city_name', 'Unknown'),
            'Vehicle Type Involved': data.get('vehicle_type', 'Car'),
            'Weather Conditions': data.get('weather', 'Clear'),
            'Road Type': data.get('road_type', 'City Road'),
            'Road Condition': data.get('road_condition', 'Dry'),
            'Lighting Conditions': data.get('lighting', 'Day'),
            'Traffic Control Presence': 'Unknown',
            'Driver Gender': 'Male',
            'Driver License Status': 'Unknown',
            'Alcohol Involvement': 'Yes' if data.get('alcohol_involvement', False) else 'No',
            'Accident Location Details': 'Straight Road',
            'Number of Vehicles Involved': int(data.get('num_vehicles', 2)),
            'Speed Limit (km/h)': float(data.get('speed_limit', 50)),
            'Driver Age': 35,
            'Time of Day': data.get('time_of_day', '12:00'),
            'Day of Week': 'Wednesday'
        }
        
        prediction = predict_record(features)
        return success_response(prediction)
        
    except FileNotFoundError as e:
        return error_response(str(e), 404)
    except Exception as e:
        return error_response(f"Simulator prediction calculation failed: {str(e)}", 500)
