import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useWeather } from "@/hooks/use-weather";
import { Cloud, Sun, CloudRain, Wind, Thermometer, Droplets, RefreshCw, MapPin } from "lucide-react";

interface WeatherWidgetProps {
  onWeatherUpdate?: (weather: any) => void;
  latitude?: number;
  longitude?: number;
}

export function WeatherWidget({ onWeatherUpdate, latitude, longitude }: WeatherWidgetProps) {
  const { weather, loading, error, getCurrentWeather } = useWeather();

  useEffect(() => {
    // Auto-load weather on component mount
    getCurrentWeather(latitude, longitude);
  }, [latitude, longitude]);

  useEffect(() => {
    if (weather && onWeatherUpdate) {
      onWeatherUpdate(weather);
    }
  }, [weather, onWeatherUpdate]);

  const getWeatherIcon = (conditions: string) => {
    const normalized = conditions.toLowerCase();
    if (normalized.includes("rain") || normalized.includes("shower") || normalized.includes("drizzle")) {
      return <CloudRain className="h-6 w-6 text-blue-500" />;
    }
    if (normalized.includes("wind")) {
      return <Wind className="h-6 w-6 text-gray-500" />;
    }
    if (normalized.includes("clear") || normalized.includes("sun")) {
      return <Sun className="h-6 w-6 text-yellow-500" />;
    }
    return <Cloud className="h-6 w-6 text-gray-400" />;
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin" />
            Loading Weather...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (error && !weather) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="text-red-600">Weather Unavailable</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-3">{error}</p>
          <Button 
            onClick={() => getCurrentWeather(latitude, longitude)}
            variant="outline"
            size="sm"
            data-testid="button-retry-weather"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!weather) return null;

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            {getWeatherIcon(weather.conditions)}
            Current Conditions
          </span>
          <Button 
            onClick={() => getCurrentWeather(latitude, longitude)}
            variant="ghost" 
            size="sm"
            data-testid="button-refresh-weather"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="flex items-center gap-1">
              {getWeatherIcon(weather.conditions)}
              {weather.conditions}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <Thermometer className="h-4 w-4 text-red-400" />
            <span className="text-sm font-medium">{weather.temperature}°F</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Droplets className="h-4 w-4 text-blue-400" />
            <span className="text-sm font-medium">{weather.humidity}% RH</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Wind className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium">{weather.windSpeed} mph</span>
          </div>
        </div>
        
        <div className="mt-4 space-y-2">
          <p className="text-sm text-gray-600">{weather.description}</p>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <MapPin className="h-3 w-3" />
            {weather.location}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
