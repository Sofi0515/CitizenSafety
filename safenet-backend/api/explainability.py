from flask import Blueprint
from ml.explain import explain_aggregated_zone
from utils.responses import success_response, error_response
import config

explainability_bp = Blueprint('explainability', __name__)

@explainability_bp.route('/states/<state_id>/explain/<city_or_state_id>', methods=['GET'])
def get_explanation(state_id, city_or_state_id):
    """
    Returns SHAP explainability metrics for a city or state aggregate.
    """
    try:
        # Determine if state-level or city-level explanation is needed
        # Unknown rows are aggregated at state level
        if city_or_state_id.endswith('-unknown'):
            state_name = state_id.replace("_", " ")
            explanation = explain_aggregated_zone(state_name, is_state=True)
        else:
            # Extract city name (e.g. karnataka-bengaluru -> Bengaluru)
            prefix_len = len(state_id) + 1
            city_slug = city_or_state_id[prefix_len:]
            city_name = city_slug.replace("-", " ")
            explanation = explain_aggregated_zone(city_name, is_state=False)
            
        return success_response(explanation)
        
    except FileNotFoundError as e:
        return error_response(str(e), 404)
    except ValueError as e:
        return error_response(str(e), 400)
    except Exception as e:
        return error_response(f"SHAP explanation calculation failed: {str(e)}", 500)
