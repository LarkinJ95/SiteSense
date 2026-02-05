import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WeatherWidget } from "@/components/weather-widget";
import { EquipmentTracker, type Equipment } from "@/components/equipment-tracker";
import { OfflineIndicator } from "@/components/offline-indicator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useOffline } from "@/hooks/use-offline";
import { Smartphone, Wifi, WifiOff, MapPin, Compass, Clock, Battery } from "lucide-react";

export default function FieldTools() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [weather, setWeather] = useState<any>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const { isOnline, syncOfflineData, pendingCount } = useOffline();

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting location:", error);
          // Show user-friendly error message
          alert("Unable to get your location. Please check location permissions in your browser settings.");
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000
        }
      );
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold" data-testid="field-tools-title">Field Tools</h1>
          <p className="text-gray-600 mt-2">Mobile field survey tools and utilities</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={isOnline ? "secondary" : "destructive"} className="flex items-center gap-1">
            {isOnline ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {isOnline ? "Online" : "Offline"}
          </Badge>
          {pendingCount > 0 && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {pendingCount} pending
            </Badge>
          )}
        </div>
      </div>

      {/* Mobile Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Smartphone className="h-5 w-5" />
              Device Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Connection:</span>
                <Badge variant={isOnline ? "secondary" : "destructive"}>
                  {isOnline ? "Online" : "Offline"}
                </Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Battery:</span>
                <div className="flex items-center gap-1">
                  <Battery className="h-4 w-4 text-green-600" />
                  <span className="text-sm">Good</span>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">GPS:</span>
                <Badge variant={location ? "secondary" : "outline"}>
                  {location ? "Active" : "Inactive"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="h-5 w-5" />
              Location
            </CardTitle>
          </CardHeader>
          <CardContent>
            {location ? (
              <div className="space-y-2">
                <div className="text-sm">
                  <strong>Latitude:</strong> {location.lat.toFixed(6)}
                </div>
                <div className="text-sm">
                  <strong>Longitude:</strong> {location.lng.toFixed(6)}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={getCurrentLocation}
                  data-testid="button-update-location"
                >
                  <Compass className="h-4 w-4 mr-2" />
                  Update
                </Button>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-3">Location not available</p>
                <Button
                  size="sm"
                  onClick={getCurrentLocation}
                  data-testid="button-get-location"
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Get Location
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Clock className="h-5 w-5" />
              Sync Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pendingCount > 0 ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  {pendingCount} items pending sync
                </p>
                {isOnline && (
                  <Button
                    size="sm"
                    onClick={syncOfflineData}
                    data-testid="button-sync-now"
                  >
                    Sync Now
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center text-green-600">
                <div className="text-sm font-medium">All synced</div>
                <div className="text-xs text-gray-500">Data is up to date</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Weather Conditions */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Weather Conditions</h2>
        <WeatherWidget 
          onWeatherUpdate={setWeather}
          latitude={location?.lat}
          longitude={location?.lng}
        />
      </div>

      {/* Equipment Management */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Equipment Management</h2>
        <EquipmentTracker equipment={equipment} onEquipmentChange={setEquipment} />
      </div>

      {/* Offline Data Management */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Offline Data</h2>
        <OfflineIndicator />
      </div>

      {/* Field Survey Tips */}
      <Card>
        <CardHeader>
          <CardTitle>Field Survey Tips</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <strong>Weather Documentation:</strong> Record weather conditions at the start of each survey for environmental context.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <strong>Equipment Calibration:</strong> Check equipment calibration status before starting field work.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <strong>GPS Accuracy:</strong> Wait for GPS signal stabilization before recording location data.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <div>
                <strong>Offline Mode:</strong> Data will be stored locally when offline and synced when connection is restored.
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}