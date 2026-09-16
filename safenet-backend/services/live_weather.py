import urllib.request
import json
import config

def get_live_weather(lat: float, lng: float) -> dict:
    """
    Fetches weather data from OpenWeatherMap using the API key in config.
    Degrades gracefully to mock values if API key is missing or fetch fails.
    """
    if not config.OPENWEATHER_API_KEY:
        # Graceful fallback: return neutral dummy weather data
        return {
            "temp": 24,
            "condition": "Cloudy",
            "humidity": 68,
            "wind": 14,
            "visibility": 8,
            "severity_score": 35.0
        }
        
    url = f"http://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lng}&appid={config.OPENWEATHER_API_KEY}&units=metric"
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=3) as response:
            data = json.loads(response.read().decode())
            
            # Extract parameters
            temp = int(round(data['main']['temp']))
            humidity = int(data['main']['humidity'])
            wind = int(round(data['wind']['speed'] * 3.6)) # m/s to km/h
            visibility = int(data.get('visibility', 10000) / 1000) # m to km
            
            # Map condition to label & severity score
            main_weather = data['weather'][0]['main'].lower()
            condition = "Clear"
            severity = 15.0
            
            if "rain" in main_weather or "drizzle" in main_weather:
                condition = "Rainy"
                severity = 65.0
            elif "thunderstorm" in main_weather:
                condition = "Stormy"
                severity = 85.0
            elif "cloud" in main_weather:
                condition = "Cloudy"
                severity = 35.0
            elif "fog" in main_weather or "mist" in main_weather or "haze" in main_weather:
                condition = "Foggy"
                severity = 55.0
            elif "clear" in main_weather:
                condition = "Sunny"
                severity = 10.0
                
            return {
                "temp": temp,
                "condition": condition,
                "humidity": humidity,
                "wind": wind,
                "visibility": visibility,
                "severity_score": severity
            }
    except Exception:
        # Fallback in case of timeout or rate limit
        return {
            "temp": 23,
            "condition": "Cloudy",
            "humidity": 70,
            "wind": 12,
            "visibility": 9,
            "severity_score": 30.0
        }
