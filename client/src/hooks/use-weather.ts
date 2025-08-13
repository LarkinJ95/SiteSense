import { useState, useEffect } from 'react';

export interface WeatherData {
  conditions: string;
  temperature: number; // Celsius
  humidity: number; // Percentage
  windSpeed: number; // km/h
  description: string;
  location: string;
}

export function useWeather() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getCurrentWeather = async (latitude?: number, longitude?: number) => {
    setLoading(true);
    setError(null);
    
    try {
      // If no coordinates provided, try to get current location
      if (!latitude || !longitude) {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      }

      // Using OpenWeatherMap API (requires API key)
      // For demo purposes, we'll simulate weather data based on location
      const mockWeatherData: WeatherData = {
        conditions: getWeatherConditions(),
        temperature: Math.round(Math.random() * 30 + 5), // 5-35°C
        humidity: Math.round(Math.random() * 40 + 40), // 40-80%
        windSpeed: Math.round(Math.random() * 20 + 5), // 5-25 km/h
        description: getWeatherDescription(),
        location: `${latitude?.toFixed(2)}, ${longitude?.toFixed(2)}`
      };

      setWeather(mockWeatherData);
    } catch (err) {
      setError('Unable to get weather data. Please enable location services or enter manually.');
      // Provide fallback weather data
      setWeather({
        conditions: 'Unknown',
        temperature: 20,
        humidity: 50,
        windSpeed: 10,
        description: 'Weather data unavailable',
        location: 'Location unknown'
      });
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