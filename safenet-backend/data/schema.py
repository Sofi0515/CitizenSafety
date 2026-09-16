import pandas as pd
import numpy as np

# Pinned expected data types for validation of the 22 accident fields
ACCIDENT_SCHEMA = {
    'State Name': str,
    'City Name': str,
    'Year': (int, np.integer),
    'Month': str,
    'Day of Week': str,
    'Time of Day': str,
    'Accident Severity': str,
    'Number of Vehicles Involved': (int, np.integer),
    'Number of Casualties': (int, np.integer),
    'Number of Fatalities': (int, np.integer),
    'Vehicle Type Involved': str,
    'Weather Conditions': str,
    'Road Type': str,
    'Road Condition': str,
    'Lighting Conditions': str,
    'Speed Limit (km/h)': (int, float, np.integer, np.floating),
    'Driver Age': (int, np.integer),
    'Driver Gender': str,
    'Alcohol Involvement': str,
    'Accident Location Details': str
}

OPTIONAL_IMPUTATIONS = {
    'Traffic Control Presence': 'Unknown',
    'Driver License Status': 'Unknown'
}

def validate_and_clean_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """
    Validates uploaded road-accident datasets against the 22-column schema.
    Applies standard imputations for missing values and formats types.
    """
    cleaned_df = df.copy()
    
    # 1. Verify required columns
    missing_cols = [col for col in ACCIDENT_SCHEMA if col not in cleaned_df.columns]
    if missing_cols:
        raise ValueError(f"Uploaded CSV is missing required columns: {', '.join(missing_cols)}")
        
    # 2. Impute optional columns with 'Unknown'
    for col, default_val in OPTIONAL_IMPUTATIONS.items():
        if col not in cleaned_df.columns:
            cleaned_df[col] = default_val
        else:
            cleaned_df[col] = cleaned_df[col].fillna(default_val).astype(str)
            
    # 3. Cast values to their appropriate type
    for col, expected_type in ACCIDENT_SCHEMA.items():
        try:
            if isinstance(expected_type, tuple):
                cleaned_df[col] = pd.to_numeric(cleaned_df[col], errors='raise')
            else:
                cleaned_df[col] = cleaned_df[col].astype(expected_type).str.strip()
        except Exception as e:
            raise ValueError(f"Column '{col}' failed type casting validation: {str(e)}")
            
    # 4. Normalize severity cases to title case
    cleaned_df['Accident Severity'] = cleaned_df['Accident Severity'].str.title()
    valid_severities = ['Minor', 'Serious', 'Fatal']
    invalid_severities = cleaned_df[~cleaned_df['Accident Severity'].isin(valid_severities)]
    if not invalid_severities.empty:
        raise ValueError(f"Invalid Accident Severity values found: {invalid_severities['Accident Severity'].unique()}. Must be one of: {valid_severities}")
        
    return cleaned_df
