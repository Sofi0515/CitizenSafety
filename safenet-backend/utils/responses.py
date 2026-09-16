from flask import jsonify

def success_response(data, status_code=200):
    """
    Standard success response envelope.
    """
    return jsonify({
        "status": "success",
        "data": data
    }), status_code

def error_response(message, status_code=500):
    """
    Standard error response envelope.
    """
    return jsonify({
        "status": "error",
        "message": message
    }), status_code
