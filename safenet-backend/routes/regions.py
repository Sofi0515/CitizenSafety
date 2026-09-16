from flask import Blueprint
import config
from utils.responses import success_response

regions_bp = Blueprint('regions', __name__)

@regions_bp.route('/regions', methods=['GET'])
def list_regions():
    """
    Returns lists of active regional models, dynamically derived from the dataset
    or training cache registry.
    """
    regions_list = list(config.REGIONS.values())
    return success_response({"regions": regions_list})
