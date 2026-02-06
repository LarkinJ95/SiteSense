import { useState, useEffect } from 'react';

export interface WeatherData {
  conditions: string;
  temperature: number; // Fahrenheit
  humidity: number; // Percentage
  windSpeed: number; // mph
  description: string;
  location: string;
}

export function useWeather() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCoords, setLastCoords] = useState<{ lat: number; lon: number } | null>(() => {
    const stored = localStorage.getItem("last-weather-coords");
    return stored ? JSON.parse(stored) : null;
  });

  const getCurrentWeather = async (latitude?: number, longitude?: number) => {
    setLoading(true);
    setError(null);
    
    try {
      // If no coordinates provided, try to get current location
      if (!latitude || !longitude) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject);
          });
          latitude = position.coords.latitude;
          longitude = position.coords.longitude;
        } catch {
          if (lastCoords) {
            latitude = lastCoords.lat;
            longitude = lastCoords.lon;
          }
        }
      }
      if (latitude && longitude) {
        const coords = { lat: latitude, lon: longitude };
        setLastCoords(coords);
        localStorage.setItem("last-weather-coords", JSON.stringify(coords));
      }

      if (latitude && longitude) {
        const response = await fetch(
          `/api/weather/current?lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}`
        );
        if (!response.ok) {
          let message = "Failed to fetch weather data";
          try {
            const errorBody = await response.json();
            if (errorBody?.message) {
              message = errorBody.message;
            }
          } catch {
            const text = await response.text();
            if (text) message = text;
          }
          throw new Error(message);
        }
        const data = await response.json();
        const weatherData: WeatherData = {
          conditions: data?.weather?.[0]?.main || "Unknown",
          temperature: Math.round(data?.main?.temp ?? 0),
          humidity: Math.round(data?.main?.humidity ?? 0),
          windSpeed: Math.round(data?.wind?.speed ?? 0),
          description: data?.weather?.[0]?.description || "Weather data unavailable",
          location: data?.name
            ? `${data.name}${data?.sys?.country ? `, ${data.sys.country}` : ""}`
            : latitude && longitude
              ? `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`
              : "Location unknown",
        };
        setWeather(weatherData);
        setError(null);
      } else {
        // Fallback to simulated data if no coordinates are available
        const mockWeatherData: WeatherData = {
          conditions: getWeatherConditions(),
          temperature: Math.round(Math.random() * 30 + 40), // 40-70°F
          humidity: Math.round(Math.random() * 40 + 40), // 40-80%
          windSpeed: Math.round(Math.random() * 20 + 5), // 5-25 mph
          description: getWeatherDescription(),
          location: latitude && longitude
            ? `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`
            : 'Location unknown'
        };
        setWeather(mockWeatherData);
        setError("Location not available. Showing simulated data.");
      }
    } catch (err) {
      const fallbackCoords = lastCoords;
      setWeather({
        conditions: getWeatherConditions(),
        temperature: Math.round(Math.random() * 30 + 40),
        humidity: Math.round(Math.random() * 40 + 40),
        windSpeed: Math.round(Math.random() * 20 + 5),
        description: 'Weather data unavailable',
        location: fallbackCoords
          ? `${fallbackCoords.lat.toFixed(2)}, ${fallbackCoords.lon.toFixed(2)}`
          : 'Location unknown'
      });
      setError(err instanceof Error ? err.message : "Weather data unavailable");
    } finally {
      setLoading(false);
    }
  };

  const getWeatherConditions = (): string => {
    const conditions = ['Clear', 'Partly Cloudy', 'Cloudy', 'Overcast', 'Light Rain', 'Rain', 'Windy'];
    return conditions[Math.floor(Math.random() * conditions.length)];
  };

  const getWeatherDescription = (): string => {
    const descriptions = [
      'Perfect conditions for outdoor survey work',
      'Good conditions with some clouds',
      'Overcast but suitable for field work',
      'Light rain - consider protective equipment',
      'Windy conditions - secure equipment',
      'Clear skies - excellent visibility'
    ];
    return descriptions[Math.floor(Math.random() * descriptions.length)];
  };

  return {
    weather,
    loading,
    error,
    getCurrentWeather,
    hasWeatherData: !!weather
  };
}
