# Explainable AI-Based Risk Analytics and Decision Support for Smart Urban Safety — Backend API

This is the Python-based Flask + ML Explainability backend for **Explainable AI-Based Risk Analytics and Decision Support for Smart Urban Safety (Urban Safety AI)**. It calculates live safety risk scores, hosts an interactive simulator, calculates SHAP feature contributions for explainability diagnostics, and handles CSV dataset uploads.

---

## ⚡ Setup & Installation

### 1. Requirements & Virtual Environment
Ensure you have Python 3.10+ installed. Spin up a virtual environment and activate it:

```bash
# Create environment
python -m venv venv

# Activate (Windows Command Prompt)
venv\Scripts\activate

# Activate (macOS/Linux or Git Bash)
source venv/bin/activate
```

Install the dependencies listed in `requirements.txt`:
```bash
pip install -r requirements.txt
```

---

## 💾 Seeding & Training Demo Models

We provide a built-in seeder script `seed_demo_data.py` to generate realistic baseline datasets for **Bengaluru, Delhi, Mumbai, and Uttar Pradesh**. 

Executing this script automatically generates the raw datasets and trains the machine learning models:

```bash
python seed_demo_data.py
```

*This will generate the persistent classifier, regressor, and SHAP explainer weights under `models/artifacts/`.*

---

## 🚀 Running the Web Server

Start the Flask development server on port `5000`:

```bash
python app.py
```

The service will boot up locally at `http://localhost:5000/`. You can check server health at `http://localhost:5000/`.

---

## 🌐 API Endpoint Contracts

All JSON responses are structured in a unified envelope:
`{"data": ..., "error": null}` or `{"data": null, "error": "Reason"}`.

### Standard Routes:
- `GET /api/cities` &rarr; Retrieves city registry data (names, lat/lng centers, zoom configurations).
- `GET /api/cities/<city_id>/zones` &rarr; Retrieves all zones for a city, pre-evaluated with model risk scores and classifications.
- `POST /api/predict` &rarr; Returns an ad-hoc risk evaluation based on simulator slider configurations.
- `GET /api/cities/<city_id>/analytics/kpis` &rarr; Returns KPI analytics cards, counts, and trend sparklines.
- `GET /api/cities/<city_id>/analytics/risk-by-area` &rarr; Returns Recharts bar data.
- `GET /api/cities/<city_id>/analytics/leaderboard` &rarr; Lists the top 5 high-risk zones.
- `GET /api/cities/<city_id>/explain/<zone_id>` &rarr; Calculates local SHAP features and yields natural language descriptions.
- `POST /api/upload` &rarr; Multipart file ingestion (`file` and `city_id`). If the city is new, it auto-registers in `data/cities.json` and begins training asynchronously in a background thread.

---

## 🧠 Triggering Retraining manually

If you want to trigger model training for a city from the command line:

```bash
python -m ml.train --city bengaluru
```
