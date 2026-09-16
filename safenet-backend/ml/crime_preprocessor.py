"""
Enhanced Crime Dataset Preprocessing Pipeline
Handles cleaning, validation, feature engineering, and risk scoring
for the Urban Safety AI Analytics Platform
"""

import os
import pandas as pd
import numpy as np
import warnings
from datetime import datetime
import logging

warnings.filterwarnings('ignore')

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

import config

class CrimeDataPreprocessor:
    """Enhanced preprocessing pipeline for crime dataset"""
    
    # Define valid states/UTs in India
    VALID_STATES = {
        'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
        'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
        'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
        'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana',
        'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Delhi', 'Puducherry',
        'Jammu and Kashmir', 'Ladakh', 'Chandigarh'
    }
    
    # Risk severity mapping
    SEVERITY_MAPPING = {
        'minor': 30, 'low': 30, 'slight': 30,
        'serious': 65, 'medium': 65, 'moderate': 65,
        'fatal': 95, 'high': 95, 'severe': 95
    }
    
    # Time periods
    NIGHT_HOURS = set(range(22, 24)) | set(range(0, 6))  # 10 PM to 6 AM
    RUSH_HOURS = set(range(7, 10)) | set(range(17, 20))  # 7-10 AM, 5-8 PM
    
    def __init__(self, input_file: str, output_file: str):
        """Initialize preprocessor with input/output paths"""
        self.input_file = input_file
        self.output_file = output_file
        self.df = None
        self.stats = {}
    
    def load_data(self) -> pd.DataFrame:
        """Load raw crime data"""
        logger.info(f"Loading data from {self.input_file}")
        try:
            if self.input_file.endswith('.csv'):
                self.df = pd.read_csv(self.input_file)
            elif self.input_file.endswith('.parquet'):
                self.df = pd.read_parquet(self.input_file)
            else:
                raise ValueError(f"Unsupported file format: {self.input_file}")
            
            logger.info(f"Loaded {len(self.df)} records with {len(self.df.columns)} columns")
            self.stats['initial_records'] = len(self.df)
            return self.df
        except Exception as e:
            logger.error(f"Failed to load data: {e}")
            raise
    
    def handle_duplicates(self) -> pd.DataFrame:
        """Remove duplicate records"""
        logger.info("Handling duplicates...")
        initial_count = len(self.df)
        
        # Remove complete duplicates
        self.df = self.df.drop_duplicates()
        
        # Remove duplicates based on key columns
        key_cols = [col for col in self.df.columns 
                   if col.lower() in ['city', 'date', 'time', 'severity', 'state']]
        if len(key_cols) >= 2:
            self.df = self.df.drop_duplicates(subset=key_cols, keep='first')
        
        removed = initial_count - len(self.df)
        logger.info(f"Removed {removed} duplicate records")
        self.stats['duplicates_removed'] = removed
        return self.df
    
    def handle_missing_values(self) -> pd.DataFrame:
        """Handle missing values with smart imputation"""
        logger.info("Handling missing values...")
        
        missing_report = self.df.isnull().sum()
        if missing_report.sum() > 0:
            logger.info(f"Missing values:\n{missing_report[missing_report > 0]}")
        
        # Numeric columns: use median
        numeric_cols = self.df.select_dtypes(include=[np.number]).columns
        for col in numeric_cols:
            if self.df[col].isnull().any():
                median_val = self.df[col].median()
                self.df[col].fillna(median_val, inplace=True)
                logger.info(f"  Filled {col} with median: {median_val}")
        
        # Categorical columns: use mode or default
        categorical_cols = self.df.select_dtypes(include=['object']).columns
        for col in categorical_cols:
            if self.df[col].isnull().any():
                mode_val = self.df[col].mode()[0] if len(self.df[col].mode()) > 0 else 'Unknown'
                self.df[col].fillna(mode_val, inplace=True)
                logger.info(f"  Filled {col} with mode: {mode_val}")
        
        self.stats['missing_values_handled'] = True
        return self.df
    
    def standardize_state_names(self) -> pd.DataFrame:
        """Standardize state/UT names"""
        logger.info("Standardizing state names...")
        
        state_col = next((col for col in self.df.columns 
                         if col.lower() in ['state', 'state_name', 'state_ut']), None)
        
        if state_col:
            self.df[state_col] = self.df[state_col].str.strip().str.title()
            
            # Map common variations
            state_mapping = {
                'Daman And Diu': 'Daman and Diu',
                'Puducherry': 'Puducherry',
                'Nct Of Delhi': 'Delhi',
                'Union Territory Of Puducherry': 'Puducherry',
            }
            self.df[state_col] = self.df[state_col].replace(state_mapping)
            
            invalid_states = self.df[~self.df[state_col].isin(self.VALID_STATES)][state_col].unique()
            if len(invalid_states) > 0:
                logger.warning(f"Invalid states found: {invalid_states}")
                # Mark for review or default to 'Unknown'
                self.df.loc[~self.df[state_col].isin(self.VALID_STATES), state_col] = 'Unknown'
        
        return self.df
    
    def parse_datetime_features(self) -> pd.DataFrame:
        """Extract temporal features from date/time columns"""
        logger.info("Extracting datetime features...")
        
        # Find date column
        date_col = next((col for col in self.df.columns 
                        if col.lower() in ['date', 'incident_date', 'occurrence_date']), None)
        
        if date_col:
            try:
                self.df[date_col] = pd.to_datetime(self.df[date_col], errors='coerce')
                
                # Extract features
                self.df['Year'] = self.df[date_col].dt.year
                self.df['Month'] = self.df[date_col].dt.month
                self.df['Day_of_Week'] = self.df[date_col].dt.dayofweek  # 0=Monday
                self.df['Is_Weekend'] = self.df['Day_of_Week'].isin([5, 6]).astype(int)
                self.df['Quarter'] = self.df[date_col].dt.quarter
                
                logger.info(f"  Extracted date features from {date_col}")
            except Exception as e:
                logger.warning(f"Failed to parse {date_col}: {e}")
        
        # Find time column
        time_col = next((col for col in self.df.columns 
                        if col.lower() in ['time', 'time_of_day', 'incident_time']), None)
        
        if time_col:
            try:
                # Parse time or assume 12:00 if missing
                def parse_time(t):
                    if pd.isna(t) or t == '' or t == 'Unknown':
                        return 12
                    try:
                        return int(pd.to_datetime(t, format='%H:%M:%S').hour)
                    except:
                        try:
                            return int(pd.to_datetime(t, format='%H:%M').hour)
                        except:
                            return 12
                
                self.df['Hour'] = self.df[time_col].apply(parse_time)
                self.df['Is_Night'] = self.df['Hour'].isin(self.NIGHT_HOURS).astype(int)
                self.df['Is_Rush_Hour'] = self.df['Hour'].isin(self.RUSH_HOURS).astype(int)
                
                logger.info(f"  Extracted time features from {time_col}")
            except Exception as e:
                logger.warning(f"Failed to parse {time_col}: {e}")
        
        return self.df
    
    def handle_outliers(self) -> pd.DataFrame:
        """Detect and handle outliers using IQR method"""
        logger.info("Handling outliers...")
        
        numeric_cols = ['traffic_index', 'crime_rate', 'population_density', 
                       'past_incidents_30d', 'avg_response_time_min']
        
        for col in numeric_cols:
            if col in self.df.columns:
                Q1 = self.df[col].quantile(0.25)
                Q3 = self.df[col].quantile(0.75)
                IQR = Q3 - Q1
                
                lower_bound = max(0, Q1 - 1.5 * IQR)
                upper_bound = Q3 + 1.5 * IQR
                
                outliers = self.df[(self.df[col] < lower_bound) | (self.df[col] > upper_bound)]
                
                if len(outliers) > 0:
                    logger.info(f"  {col}: Clamping {len(outliers)} outliers [{lower_bound:.2f}, {upper_bound:.2f}]")
                    self.df[col] = self.df[col].clip(lower_bound, upper_bound)
        
        self.stats['outliers_handled'] = True
        return self.df
    
    def validate_logical_constraints(self) -> pd.DataFrame:
        """Validate logical constraints in data"""
        logger.info("Validating logical constraints...")
        
        # Casualties >= Fatalities
        if 'Casualties' in self.df.columns and 'Fatalities' in self.df.columns:
            invalid = self.df['Fatalities'] > self.df['Casualties']
            if invalid.sum() > 0:
                logger.warning(f"  Fixed {invalid.sum()} records where Fatalities > Casualties")
                self.df.loc[invalid, 'Fatalities'] = self.df.loc[invalid, 'Casualties']
        
        # Age ranges (18-80)
        if 'Driver Age' in self.df.columns:
            self.df['Driver Age'] = self.df['Driver Age'].clip(18, 80)
        
        # Risk scores (0-100)
        if 'risk_score' in self.df.columns:
            self.df['risk_score'] = self.df['risk_score'].clip(0, 100)
        
        self.stats['constraints_validated'] = True
        return self.df
    
    def compute_risk_score(self) -> pd.DataFrame:
        """Compute comprehensive risk score"""
        logger.info("Computing risk scores...")
        
        if 'risk_score' in self.df.columns:
            logger.info("  Risk scores already present, skipping...")
            return self.df
        
        # Initialize
        self.df['risk_score'] = 50.0
        
        # Severity-based scoring
        severity_col = next((col for col in self.df.columns 
                            if col.lower() in ['severity', 'accident_severity']), None)
        if severity_col:
            self.df['severity_score'] = self.df[severity_col].str.lower().map(self.SEVERITY_MAPPING)
            self.df['severity_score'].fillna(50, inplace=True)
            self.df['risk_score'] = self.df['risk_score'] * 0.4 + self.df['severity_score'] * 0.6
        
        # Casualty-based scoring
        if 'Casualties' in self.df.columns:
            casualty_score = (self.df['Casualties'] / self.df['Casualties'].max() * 100).fillna(50)
            self.df['risk_score'] = self.df['risk_score'] * 0.7 + casualty_score * 0.3
        
        # Time-based adjustment
        if 'Is_Night' in self.df.columns:
            night_multiplier = 1 + (self.df['Is_Night'] * 0.2)  # +20% at night
            self.df['risk_score'] = (self.df['risk_score'] * night_multiplier).clip(0, 100)
        
        # Weekend adjustment
        if 'Is_Weekend' in self.df.columns:
            weekend_multiplier = 1 + (self.df['Is_Weekend'] * 0.1)  # +10% on weekends
            self.df['risk_score'] = (self.df['risk_score'] * weekend_multiplier).clip(0, 100)
        
        # Round to 1 decimal
        self.df['risk_score'] = self.df['risk_score'].round(1)
        
        logger.info(f"  Risk score range: {self.df['risk_score'].min():.1f} - {self.df['risk_score'].max():.1f}")
        logger.info(f"  Risk score mean: {self.df['risk_score'].mean():.1f}")
        return self.df
    
    def assign_risk_level(self) -> pd.DataFrame:
        """Assign risk levels (Low/Medium/High)"""
        logger.info("Assigning risk levels...")
        
        def get_risk_level(score):
            if score >= 75:
                return 'High'
            elif score >= 50:
                return 'Medium'
            else:
                return 'Low'
        
        self.df['risk_level'] = self.df['risk_score'].apply(get_risk_level)
        
        level_counts = self.df['risk_level'].value_counts()
        logger.info(f"  Risk level distribution:\n{level_counts}")
        
        return self.df
    
    def compute_confidence_score(self) -> pd.DataFrame:
        """Compute model confidence score based on data quality"""
        logger.info("Computing confidence scores...")
        
        # Start with base confidence
        self.df['confidence_score'] = 0.85
        
        # Reduce if data is imputed
        if 'Is_Night' not in self.df.columns:
            self.df['confidence_score'] -= 0.05
        
        # Reduce for outlier zones
        if 'crime_rate' in self.df.columns:
            outlier_crime = (self.df['crime_rate'] > self.df['crime_rate'].quantile(0.95)).astype(int)
            self.df['confidence_score'] -= (outlier_crime * 0.05)
        
        # Increase for consistent data
        if 'Year' in self.df.columns:
            recent_years = (self.df['Year'] >= 2020).astype(int)
            self.df['confidence_score'] += (recent_years * 0.05)
        
        self.df['confidence_score'] = self.df['confidence_score'].clip(0.5, 0.99).round(2)
        return self.df
    
    def engineer_features(self) -> pd.DataFrame:
        """Engineer additional features for ML models"""
        logger.info("Engineering features...")
        
        # Traffic-related features
        if 'traffic_index' in self.df.columns:
            self.df['high_traffic'] = (self.df['traffic_index'] > 60).astype(int)
            self.df['traffic_risk_factor'] = self.df['traffic_index'] / 100.0
        
        # Crime-related features
        if 'crime_rate' in self.df.columns:
            self.df['high_crime_zone'] = (self.df['crime_rate'] > 70).astype(int)
            self.df['crime_risk_factor'] = self.df['crime_rate'] / 100.0
        
        # Population density features
        if 'population_density' in self.df.columns:
            self.df['high_density'] = (self.df['population_density'] > 50).astype(int)
        
        # Incident features
        if 'past_incidents_30d' in self.df.columns:
            self.df['frequent_incidents'] = (self.df['past_incidents_30d'] > 10).astype(int)
        
        logger.info("  Feature engineering complete")
        return self.df
    
    def select_and_reorder_columns(self) -> pd.DataFrame:
        """Select and reorder columns for output"""
        logger.info("Selecting and reordering columns...")
        
        # Standard output schema
        essential_cols = [
            'State Name', 'City Name', 'latitude', 'longitude',
            'risk_score', 'risk_level', 'confidence_score',
            'crime_rate', 'traffic_index', 'weather_severity', 'population_density',
            'past_incidents_30d', 'avg_response_time_min', 'street_lighting_score',
            'police_patrol_frequency', 'Year', 'Month', 'Day_of_Week', 'Hour',
            'Is_Night', 'Is_Weekend', 'Is_Rush_Hour'
        ]
        
        # Include only columns that exist
        available_cols = [col for col in essential_cols if col in self.df.columns]
        
        # Add any extra columns
        extra_cols = [col for col in self.df.columns if col not in available_cols]
        
        self.df = self.df[available_cols + extra_cols]
        logger.info(f"  Selected {len(available_cols)} essential columns")
        return self.df
    
    def generate_summary_stats(self) -> dict:
        """Generate preprocessing summary statistics"""
        logger.info("Generating summary statistics...")
        
        self.stats['final_records'] = len(self.df)
        self.stats['records_processed'] = self.stats.get('initial_records', 0) - self.stats['final_records']
        self.stats['processed_at'] = datetime.now().isoformat()
        
        if 'risk_score' in self.df.columns:
            self.stats['risk_score_stats'] = {
                'min': float(self.df['risk_score'].min()),
                'max': float(self.df['risk_score'].max()),
                'mean': float(self.df['risk_score'].mean()),
                'std': float(self.df['risk_score'].std())
            }
        
        if 'risk_level' in self.df.columns:
            self.stats['risk_distribution'] = self.df['risk_level'].value_counts().to_dict()
        
        if 'State Name' in self.df.columns:
            self.stats['states_covered'] = int(self.df['State Name'].nunique())
        
        if 'City Name' in self.df.columns:
            self.stats['cities_covered'] = int(self.df['City Name'].nunique())
        
        return self.stats
    
    def save_processed_data(self) -> str:
        """Save processed data to output file"""
        logger.info(f"Saving processed data to {self.output_file}")
        
        try:
            os.makedirs(os.path.dirname(self.output_file) or '.', exist_ok=True)
            
            if self.output_file.endswith('.parquet'):
                self.df.to_parquet(self.output_file, index=False, compression='snappy')
            else:
                self.df.to_csv(self.output_file, index=False)
            
            file_size = os.path.getsize(self.output_file) / (1024 * 1024)  # MB
            logger.info(f"  Successfully saved: {self.output_file} ({file_size:.2f} MB)")
            return self.output_file
        except Exception as e:
            logger.error(f"Failed to save processed data: {e}")
            raise
    
    def run_pipeline(self) -> tuple:
        """Execute complete preprocessing pipeline"""
        logger.info("=" * 80)
        logger.info("CRIME DATASET PREPROCESSING PIPELINE")
        logger.info("=" * 80)
        
        self.load_data()
        self.handle_duplicates()
        self.handle_missing_values()
        self.standardize_state_names()
        self.parse_datetime_features()
        self.handle_outliers()
        self.validate_logical_constraints()
        self.compute_risk_score()
        self.assign_risk_level()
        self.compute_confidence_score()
        self.engineer_features()
        self.select_and_reorder_columns()
        self.generate_summary_stats()
        self.save_processed_data()
        
        logger.info("=" * 80)
        logger.info("PREPROCESSING COMPLETE")
        logger.info("=" * 80)
        logger.info(f"Statistics: {self.stats}")
        logger.info("=" * 80)
        
        return self.df, self.stats


def preprocess_crime_dataset():
    """Main function to preprocess crime data"""
    
    # Input and output paths
    input_file = os.path.join(config.DATA_RAW_DIR, 'crime_data.csv')
    output_file = os.path.join(config.DATA_PROCESSED_DIR, 'cleaned.parquet')
    
    if not os.path.exists(input_file):
        logger.error(f"Input file not found: {input_file}")
        return None, None
    
    # Run preprocessing
    preprocessor = CrimeDataPreprocessor(input_file, output_file)
    df, stats = preprocessor.run_pipeline()
    
    return df, stats


if __name__ == '__main__':
    df, stats = preprocess_crime_dataset()
    
    if df is not None:
        print("\n✅ Preprocessing completed successfully!")
        print(f"\nDataset Shape: {df.shape}")
        print(f"\nColumns: {list(df.columns)}")
        print(f"\nFirst few rows:\n{df.head()}")
        print(f"\nData types:\n{df.dtypes}")
