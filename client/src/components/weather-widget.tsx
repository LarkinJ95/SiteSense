import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useWeather } from "@/hooks/use-weather";
import { Cloud, Sun, CloudRain, Wind, Thermometer, Droplets, RefreshCw, MapPin, Gauge, Umbrella } from "lucide-react";

interface WeatherWidgetProps {
  onWeatherUpdate?: (weather: any) => void;
  latitude?: number;
  longitude?: number;
}

export function WeatherWidget({ onWeatherUpdate, latitude, longitude }: WeatherWidgetProps) {
  const { weather, loading, error, getCurrentWeather } = useWeather();
  const [forecast, setForecast] = useState<any[] | null>(null);
  const [forecastError, setForecastError] = useState<string | null>(null);

  useEffect(() => {
    // Auto-load weather on component mount
    getCurrentWeather(latitude, longitude);
  }, [latitude, longitude]);

  useEffect(() => {
    let isActive = true;

    const getCoords = async () => {
      if (typeof latitude === "number" && typeof longitude === "number") {
        return { lat: latitude, lon: longitude };
      }
      const stored = localStorage.getItem("last-weather-coords");
      if (stored) {
        try {
          return JSON.parse(stored) as { lat: number; lon: number };
        } catch {
          // ignore parse errors
        }
      }
      return null;
    };

    const loadForecast = async () => {
      const coords = await getCoords();
      if (!coords) return;
      try {
        const response = await fetch(
          `/api/weather/forecast?lat=${encodeURIComponent(coords.lat)}&lon=${encodeURIComponent(coords.lon)}`
        );
        if (!response.ok) {
          const text = await response.text();
          throw new Error(text || "Failed to fetch forecast");
        }
        const data = await response.json();
        if (isActive) {
          setForecast(Array.isArray(data?.list) ? data.list : []);
          setForecastError(null);
        }
      } catch (err) {
        if (isActive) {
          setForecastError(err instanceof Error ? err.message : "Failed to fetch forecast");
        }
      }
    };

    loadForecast();
    const interval = window.setInterval(loadForecast, 30 * 60 * 1000);
    return () => {
      isActive = false;
      window.clearInterval(interval);
    };
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

  const getWindDirection = (degrees: number | null | undefined) => {
    if (typeof degrees !== "number") return "—";
    const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  };

  const dailyForecast = useMemo(() => {
    if (!forecast || !forecast.length) return [];
    const days: Record<string, { date: Date; temps: number[]; pop: number[]; icon: string | null }> = {};
    for (const item of forecast) {
      if (!item?.dt) continue;
      const date = new Date(item.dt * 1000);
      const key = date.toDateString();
      if (!days[key]) {
        days[key] = { date, temps: [], pop: [], icon: item?.weather?.[0]?.main || null };
      }
      if (Number.isFinite(Number(item?.main?.temp))) {
        days[key].temps.push(Number(item.main.temp));
      }
      if (Number.isFinite(Number(item?.pop))) {
        days[key].pop.push(Number(item.pop));
      }
    }
    return Object.values(days)
      .slice(0, 7)
      .map((day) => {
        const high = day.temps.length ? Math.round(Math.max(...day.temps)) : null;
        const low = day.temps.length ? Math.round(Math.min(...day.temps)) : null;
        const precip = day.pop.length ? Math.round(Math.max(...day.pop) * 100) : null;
        return {
          label: day.date.toLocaleDateString(undefined, { weekday: "short" }),
          high,
          low,
          precip,
          icon: day.icon || "Unknown",
        };
      });
  }, [forecast]);

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
            <span className="text-sm font-medium">
              {weather.windSpeed} mph {getWindDirection((weather as any)?.windDeg)}
            </span>
          </div>
        </div>
        
        <div className="mt-4 space-y-2">
          <p className="text-sm text-gray-600">{weather.description}</p>
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
            <div className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {weather.location}
            </div>
            <div className="flex items-center gap-1">
              <Gauge className="h-3 w-3" />
              {(weather as any)?.pressure ? `${(weather as any).pressure} mb` : "Pressure —"}
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Umbrella className="h-4 w-4 text-blue-500" />
            Weekly Forecast
          </div>
          {forecastError ? (
            <p className="text-xs text-red-600 mt-2">{forecastError}</p>
          ) : dailyForecast.length ? (
            <div className="grid grid-cols-2 md:grid-cols-7 gap-3 mt-3">
              {dailyForecast.map((day) => (
                <div key={day.label} className="rounded-md border border-gray-200 dark:border-gray-700 p-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{day.label}</span>
                    <span>{getWeatherIcon(day.icon)}</span>
                  </div>
                  <div className="mt-2 space-y-1 text-gray-600 dark:text-gray-300">
                    <div>High {day.high ?? "--"}°</div>
                    <div>Low {day.low ?? "--"}°</div>
                    <div>Precip {day.precip ?? "--"}%</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500 mt-2">Forecast unavailable.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
