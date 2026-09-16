"""
API endpoints for data preprocessing automation and monitoring
"""

from flask import Blueprint, request, jsonify
import os
import json
from datetime import datetime
import threading
import logging

import config
from utils.responses import success_response, error_response
from ml.crime_preprocessor import CrimeDataPreprocessor

preprocessing_bp = Blueprint('preprocessing', __name__)

# Global preprocessing state
preprocessing_state = {
    'status': 'idle',  # idle, running, completed, failed
    'progress': 0,  # 0-100
    'current_step': '',
    'started_at': None,
    'completed_at': None,
    'error': None,
    'stats': None,
    'input_file': None,
    'output_file': None
}

logger = logging.getLogger(__name__)


@preprocessing_bp.route('/preprocessing/status', methods=['GET'])
def get_preprocessing_status():
    """Get current preprocessing status and progress"""
    return success_response({
        'status': preprocessing_state['status'],
        'progress': preprocessing_state['progress'],
        'current_step': preprocessing_state['current_step'],
        'started_at': preprocessing_state['started_at'],
        'completed_at': preprocessing_state['completed_at'],
        'error': preprocessing_state['error'],
        'stats': preprocessing_state['stats']
    })


@preprocessing_bp.route('/preprocessing/start', methods=['POST'])
def start_preprocessing():
    """Start crime dataset preprocessing in background"""
    
    if preprocessing_state['status'] == 'running':
        return error_response('Preprocessing already running', 400)
    
    # Reset state
    preprocessing_state['status'] = 'running'
    preprocessing_state['progress'] = 0
    preprocessing_state['current_step'] = 'Initializing...'
    preprocessing_state['started_at'] = datetime.now().isoformat()
    preprocessing_state['completed_at'] = None
    preprocessing_state['error'] = None
    preprocessing_state['stats'] = None
    
    # Input/output files
    input_file = os.path.join(config.DATA_RAW_DIR, 'crime_data.csv')
    output_file = os.path.join(config.DATA_PROCESSED_DIR, 'cleaned.parquet')
    
    preprocessing_state['input_file'] = input_file
    preprocessing_state['output_file'] = output_file
    
    if not os.path.exists(input_file):
        preprocessing_state['status'] = 'failed'
        preprocessing_state['error'] = f'Input file not found: {input_file}'
        return error_response(preprocessing_state['error'], 404)
    
    # Start preprocessing in background thread
    thread = threading.Thread(
        target=run_preprocessing_task,
        args=(input_file, output_file)
    )
    thread.daemon = True
    thread.start()
    
    return success_response({
        'message': 'Preprocessing started',
        'status': 'running',
        'input_file': input_file,
        'output_file': output_file
    })


@preprocessing_bp.route('/preprocessing/cancel', methods=['POST'])
def cancel_preprocessing():
    """Cancel ongoing preprocessing"""
    if preprocessing_state['status'] != 'running':
        return error_response('No preprocessing currently running', 400)
    
    # Note: In production, implement proper thread cancellation
    preprocessing_state['status'] = 'cancelled'
    preprocessing_state['error'] = 'Preprocessing cancelled by user'
    
    return success_response({'message': 'Preprocessing cancelled'})


@preprocessing_bp.route('/preprocessing/results', methods=['GET'])
def get_preprocessing_results():
    """Get preprocessing results and statistics"""
    
    if preprocessing_state['status'] != 'completed':
        return error_response(f'Preprocessing not completed. Status: {preprocessing_state["status"]}', 400)
    
    output_file = preprocessing_state['output_file']
    
    if not os.path.exists(output_file):
        return error_response('Processed file not found', 404)
    
    try:
        import pandas as pd
        df = pd.read_parquet(output_file)
        
        result = {
            'file_path': output_file,
            'file_size_mb': os.path.getsize(output_file) / (1024 * 1024),
            'total_records': len(df),
            'total_columns': len(df.columns),
            'columns': list(df.columns),
            'data_types': {str(k): str(v) for k, v in df.dtypes.items()},
            'statistics': preprocessing_state['stats'],
            'sample_data': df.head(10).to_dict('records')
        }
        
        return success_response(result)
    except Exception as e:
        return error_response(f'Failed to load results: {str(e)}', 500)


@preprocessing_bp.route('/preprocessing/validate', methods=['POST'])
def validate_input_file():
    """Validate input file before preprocessing"""
    input_file = os.path.join(config.DATA_RAW_DIR, 'crime_data.csv')
    
    if not os.path.exists(input_file):
        return error_response(f'File not found: {input_file}', 404)
    
    try:
        import pandas as pd
        df = pd.read_csv(input_file, nrows=100)
        
        validation = {
            'file_exists': True,
            'file_path': input_file,
            'file_size_mb': os.path.getsize(input_file) / (1024 * 1024),
            'readable': True,
            'total_rows': sum(1 for _ in open(input_file)),
            'columns': list(df.columns),
            'data_types': {str(k): str(v) for k, v in df.dtypes.items()},
            'missing_values': df.isnull().sum().to_dict(),
            'duplicates_in_sample': df.duplicated().sum(),
            'is_valid': True,
            'warnings': []
        }
        
        # Validation checks
        if validation['duplicates_in_sample'] > 0:
            validation['warnings'].append('Duplicates detected in data')
        
        missing_count = sum(validation['missing_values'].values())
        if missing_count > 0:
            validation['warnings'].append(f'Missing values detected: {missing_count} cells')
        
        return success_response(validation)
    except Exception as e:
        return error_response(f'Validation failed: {str(e)}', 500)


@preprocessing_bp.route('/preprocessing/data-quality', methods=['GET'])
def analyze_data_quality():
    """Analyze data quality of raw file"""
    input_file = os.path.join(config.DATA_RAW_DIR, 'crime_data.csv')
    
    if not os.path.exists(input_file):
        return error_response(f'File not found: {input_file}', 404)
    
    try:
        import pandas as pd
        df = pd.read_csv(input_file)
        
        quality_report = {
            'total_records': len(df),
            'total_columns': len(df.columns),
            'complete_records': len(df.dropna()),
            'completeness_percentage': round((len(df.dropna()) / len(df) * 100), 2),
            'duplicates': len(df) - len(df.drop_duplicates()),
            'deduplication_percentage': round((len(df) - len(df.drop_duplicates())) / len(df) * 100, 2),
            'missing_values_by_column': df.isnull().sum().to_dict(),
            'column_stats': {},
            'issues_found': []
        }
        
        # Numeric columns analysis
        numeric_cols = df.select_dtypes(include=['number']).columns
        for col in numeric_cols:
            quality_report['column_stats'][col] = {
                'type': 'numeric',
                'min': float(df[col].min()),
                'max': float(df[col].max()),
                'mean': float(df[col].mean()),
                'std': float(df[col].std()),
                'missing': int(df[col].isnull().sum())
            }
        
        # Categorical columns analysis
        categorical_cols = df.select_dtypes(include=['object']).columns
        for col in categorical_cols:
            quality_report['column_stats'][col] = {
                'type': 'categorical',
                'unique_values': int(df[col].nunique()),
                'missing': int(df[col].isnull().sum()),
                'top_values': df[col].value_counts().head(5).to_dict()
            }
        
        # Issue detection
        if quality_report['duplicates'] > 0:
            quality_report['issues_found'].append({
                'issue': 'Duplicates detected',
                'severity': 'medium',
                'count': quality_report['duplicates']
            })
        
        missing_total = sum(quality_report['missing_values_by_column'].values())
        if missing_total > 0:
            quality_report['issues_found'].append({
                'issue': 'Missing values',
                'severity': 'low' if missing_total < len(df) * 0.1 else 'medium',
                'count': missing_total
            })
        
        return success_response(quality_report)
    except Exception as e:
        return error_response(f'Quality analysis failed: {str(e)}', 500)


# Background preprocessing task
def run_preprocessing_task(input_file: str, output_file: str):
    """Run preprocessing in background"""
    
    try:
        preprocessor = CrimeDataPreprocessor(input_file, output_file)
        
        # Update state during preprocessing
        steps = [
            ('Loading data', 10),
            ('Handling duplicates', 20),
            ('Handling missing values', 30),
            ('Standardizing names', 40),
            ('Parsing datetime', 50),
            ('Handling outliers', 60),
            ('Validating constraints', 70),
            ('Computing risk scores', 80),
            ('Engineering features', 90),
            ('Saving results', 100)
        ]
        
        # Simulate progress through steps
        # In real scenario, you'd hook into preprocessor for actual progress
        
        preprocessing_state['current_step'] = 'Loading data...'
        preprocessing_state['progress'] = 5
        
        df, stats = preprocessor.run_pipeline()
        
        preprocessing_state['stats'] = stats
        preprocessing_state['progress'] = 100
        preprocessing_state['current_step'] = 'Complete'
        preprocessing_state['status'] = 'completed'
        preprocessing_state['completed_at'] = datetime.now().isoformat()
        
        logger.info(f"Preprocessing completed: {stats}")
        
    except Exception as e:
        preprocessing_state['status'] = 'failed'
        preprocessing_state['error'] = str(e)
        preprocessing_state['completed_at'] = datetime.now().isoformat()
        logger.error(f"Preprocessing failed: {e}")
