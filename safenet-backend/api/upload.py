import os
import uuid
import threading
from flask import Blueprint, request
import pandas as pd
from datetime import datetime

import config
from data.schema import validate_and_clean_dataframe
from ml.train import train_national_model
from utils.responses import success_response, error_response

upload_bp = Blueprint('upload', __name__)

# Global job tracking store (in-memory)
TRAINING_JOBS = {}

def run_training_thread(job_id: str):
    """
    Background worker thread to run retraining asynchronously.
    """
    global TRAINING_JOBS
    TRAINING_JOBS[job_id] = {
        "status": "training",
        "started_at": datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
        "error": None
    }
    try:
        train_national_model()
        TRAINING_JOBS[job_id]["status"] = "success"
    except Exception as e:
        TRAINING_JOBS[job_id]["status"] = "failed"
        TRAINING_JOBS[job_id]["error"] = str(e)

@upload_bp.route('/upload', methods=['POST'])
def upload_dataset():
    """
    Ingests road accident datasets and triggers retraining of the national models.
    """
    global TRAINING_JOBS
    
    if 'file' not in request.files:
        return error_response("No file segment found in the request multipart.", 400)
        
    file = request.files['file']
    
    if not file or file.filename == '':
        return error_response("Empty file submitted.", 400)
        
    if not file.filename.endswith('.csv'):
        return error_response("Invalid file format. Only CSV datasets are accepted.", 400)
        
    try:
        # 1. Read and validate CSV structure
        df = pd.read_csv(file)
        cleaned_df = validate_and_clean_dataframe(df)
        
        # 2. Save file over previous raw dataset
        os.makedirs(config.DATA_RAW_DIR, exist_ok=True)
        save_path = os.path.join(config.DATA_RAW_DIR, 'accident_prediction_india.csv')
        cleaned_df.to_csv(save_path, index=False)
        
        # 3. Trigger training thread
        job_id = str(uuid.uuid4())
        thread = threading.Thread(target=run_training_thread, args=(job_id,))
        thread.start()
        
        return success_response({
            "job_id": job_id,
            "status": "training",
            "message": "National road-accident dataset accepted. Retraining initiated in background."
        }, 202)
        
    except ValueError as e:
        return error_response(f"Schema Validation Error: {str(e)}", 400)
    except Exception as e:
        return error_response(f"Upload ingestion failed: {str(e)}", 500)

@upload_bp.route('/upload/status/<job_id>', methods=['GET'])
def get_job_status(job_id):
    """
    Returns the training status of the given job ID.
    """
    global TRAINING_JOBS
    job_info = TRAINING_JOBS.get(job_id)
    if not job_info:
        return error_response(f"Job ID '{job_id}' not found.", 404)
        
    return success_response(job_info)
