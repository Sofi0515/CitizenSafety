from flask import Flask
from flask_cors import CORS
import os

import config
from utils.responses import error_response
from services.scheduler import start_scheduler, stop_scheduler

# Import Blueprints
from routes.regions import regions_bp
from routes.zones import zones_bp
from routes.predict import predict_bp
from routes.explain import explain_bp
from routes.upload import upload_bp
from routes.location import location_bp
from routes.incidents import incidents_bp
from routes.performance import performance_bp
from api.preprocessing import preprocessing_bp
from api.analytics import analytics_bp

def create_app():
    app = Flask(__name__)
    
    # Enable CORS for frontend cross-origin requests
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    
    # Register blueprints under the /api prefix
    app.register_blueprint(regions_bp, url_prefix='/api')
    app.register_blueprint(zones_bp, url_prefix='/api')
    app.register_blueprint(predict_bp, url_prefix='/api')
    app.register_blueprint(explain_bp, url_prefix='/api')
    app.register_blueprint(upload_bp, url_prefix='/api')
    app.register_blueprint(location_bp, url_prefix='/api')
    app.register_blueprint(incidents_bp, url_prefix='/api')
    app.register_blueprint(performance_bp, url_prefix='/api')
    app.register_blueprint(preprocessing_bp, url_prefix='/api')
    app.register_blueprint(analytics_bp, url_prefix='/api')
    
    # Global error handlers
    @app.errorhandler(404)
    def page_not_found(e):
        return error_response("Endpoint or resource not found.", 404)
        
    @app.errorhandler(500)
    def server_error(e):
        return error_response(f"Internal server error: {str(e)}", 500)
        
    # Start live weather update scheduler in background
    # Runs every 5 minutes (300 seconds)
    start_scheduler(300)
    
    return app

app = create_app()

if __name__ == '__main__':
    # Running development server
    port = int(os.environ.get("PORT", 5000))
    try:
        app.run(host='0.0.0.0', port=port, debug=True)
    finally:
        stop_scheduler()
