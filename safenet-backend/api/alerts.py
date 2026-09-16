from flask import Blueprint, jsonify
from utils.responses import success_response, error_response

alerts_bp = Blueprint('alerts', __name__)

# In-memory store for alerts to enable live interactive state
ALERT_STORE = [
    {
        "id": "alert-1",
        "zoneId": "delhi-connaught-place",
        "zoneName": "Connaught Place",
        "city": "Delhi",
        "severity": "High",
        "title": "High Severity Crash Risk",
        "description": "Predictive algorithm flags severe crash probability at 82% due to nighttime darkness and alcohol-involvement indices.",
        "timestamp": "2 mins ago",
        "acknowledged": False
    },
    {
        "id": "alert-2",
        "zoneId": "maharashtra-bandra-west",
        "zoneName": "Bandra West",
        "city": "Maharashtra",
        "severity": "High",
        "title": "Wet Surface Skidding Warning",
        "description": "Heavy precipitation combining with high speed limit curves (80 km/h) yields elevated skidding probability.",
        "timestamp": "8 mins ago",
        "acknowledged": False
    },
    {
        "id": "alert-3",
        "zoneId": "uttar-pradesh-hazratganj-lucknow",
        "zoneName": "Hazratganj Lucknow",
        "city": "Uttar Pradesh",
        "severity": "High",
        "title": "Blindspot Junction Risk",
        "description": "Zero lighting controls combined with heavy-vehicle freight transit density flagged near Lucknow intersections.",
        "timestamp": "15 mins ago",
        "acknowledged": False
    }
]

@alerts_bp.route('/alerts', methods=['GET'])
def get_alerts():
    """
    Returns lists of active alerts.
    """
    return success_response(ALERT_STORE)

@alerts_bp.route('/alerts/<alert_id>/acknowledge', methods=['POST'])
def acknowledge_alert(alert_id):
    """
    Marks the given alert as read/acknowledged.
    """
    global ALERT_STORE
    for alert in ALERT_STORE:
        if alert['id'] == alert_id:
            alert['acknowledged'] = True
            return success_response(alert)
            
    return error_response(f"Alert with ID '{alert_id}' not found.", 404)

@alerts_bp.route('/alerts/<alert_id>/notify', methods=['POST'])
def notify_authorities(alert_id):
    """
    Triggers simulated tactical dispatch of authorities.
    """
    global ALERT_STORE
    for alert in ALERT_STORE:
        if alert['id'] == alert_id:
            dispatch_details = {
                "alert_id": alert_id,
                "dispatched": True,
                "status": "Tactical Units Routed",
                "target_zone": alert['zoneName'],
                "severity_level": alert['severity']
            }
            return success_response(dispatch_details)
            
    return error_response(f"Alert with ID '{alert_id}' not found.", 404)
