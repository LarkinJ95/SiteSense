import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WeatherWidget } from "@/components/weather-widget";
import { EquipmentTracker, type Equipment } from "@/components/equipment-tracker";
import { OfflineIndicator } from "@/components/offline-indicator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useOffline } from "@/hooks/use-offline";
import { apiRequest } from "@/lib/queryClient";
import { Smartphone, Wifi, WifiOff, MapPin, Compass, Clock, Battery } from "lucide-react";

export default function FieldTools() {
  const [equipment, setEquipment] = useState<Equipment[]>(() => {
    const stored = localStorage.getItem("field-tools-equipment");
    return stored ? JSON.parse(stored) : [];
  });
  const [weather, setWeather] = useState<any>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [manualLat, setManualLat] = useState("");
  const [manualLng, setManualLng] = useState("");
  const [battery, setBattery] = useState<{ level: number; charging: boolean } | null>(null);
  const { isOnline, syncOfflineData, pendingCount } = useOffline();
  const saveTimeoutRef = useRef<number | null>(null);

  const { data: equipmentData } = useQuery<Equipment[]>({
    queryKey: ["/api/field-tools/equipment"],
  });

  const saveEquipmentMutation = useMutation({
    mutationFn: (items: Equipment[]) => apiRequest("PUT", "/api/field-tools/equipment", items),
  });

  useEffect(() => {
    if (equipmentData) {
      setEquipment(equipmentData);
      localStorage.setItem("field-tools-equipment", JSON.stringify(equipmentData));
    }
  }, [equipmentData]);

  useEffect(() => {
    const stored = localStorage.getItem("last-field-location");
    if (stored) {
      try {
        const coords = JSON.parse(stored);
        if (typeof coords?.lat === "number" && typeof coords?.lng === "number") {
          setLocation(coords);
          setManualLat(coords.lat.toFixed(6));
          setManualLng(coords.lng.toFixed(6));
        }
      } catch {
        // ignore invalid stored data
      }
    }
  }, []);

  const handleEquipmentChange = (items: Equipment[]) => {
    setEquipment(items);
    localStorage.setItem("field-tools-equipment", JSON.stringify(items));
    if (!navigator.onLine) return;
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = window.setTimeout(() => {
      saveEquipmentMutation.mutate(items);
    }, 300);
  };

  useEffect(() => {
    let batteryRef: any;
    let onChange: (() => void) | null = null;

    const loadBattery = async () => {
      if (!("getBattery" in navigator)) return;
      batteryRef = await (navigator as any).getBattery();
      const update = () => {
        setBattery({
          level: Math.round(batteryRef.level * 100),
          charging: batteryRef.charging,
        });
      };
      onChange = update;
      update();
      batteryRef.addEventListener("levelchange", update);
      batteryRef.addEventListener("chargingchange", update);
    };

    loadBattery();

    return () => {
      if (batteryRef && onChange) {
        batteryRef.removeEventListener("levelchange", onChange);
        batteryRef.removeEventListener("chargingchange", onChange);
      }
    };
  }, []);

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setLocation(coords);
          localStorage.setItem("last-field-location", JSON.stringify(coords));
        },
        (error) => {
          console.error("Error getting location:", error);
          const stored = localStorage.getItem("last-field-location");
          if (stored) {
            const coords = JSON.parse(stored);
            setLocation(coords);
            alert("Unable to get your location. Using last known location instead.");
            return;
          }
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

  const applyManualLocation = () => {
    const lat = Number(manualLat);
    const lng = Number(manualLng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      alert("Please enter valid latitude and longitude values.");
      return;
    }
    const coords = { lat, lng };
    setLocation(coords);
    localStorage.setItem("last-field-location", JSON.stringify(coords));
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
                  <span className="text-sm">
                    {battery ? `${battery.level}%${battery.charging ? " (Charging)" : ""}` : "Unknown"}
                  </span>
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
                <div className="pt-2 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Latitude"
                      value={manualLat}
                      onChange={(e) => setManualLat(e.target.value)}
                      data-testid="input-latitude"
                    />
                    <Input
                      placeholder="Longitude"
                      value={manualLng}
                      onChange={(e) => setManualLng(e.target.value)}
                      data-testid="input-longitude"
                    />
                  </div>
                  <Button size="sm" variant="secondary" onClick={applyManualLocation} data-testid="button-set-location">
                    Set Location
                  </Button>
                </div>
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
                <div className="mt-3 space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Latitude"
                      value={manualLat}
                      onChange={(e) => setManualLat(e.target.value)}
                      data-testid="input-latitude"
                    />
                    <Input
                      placeholder="Longitude"
                      value={manualLng}
                      onChange={(e) => setManualLng(e.target.value)}
                      data-testid="input-longitude"
                    />
                  </div>
                  <Button size="sm" variant="secondary" onClick={applyManualLocation} data-testid="button-set-location">
                    Set Location
                  </Button>
                </div>
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
        <EquipmentTracker equipment={equipment} onEquipmentChange={handleEquipmentChange} />
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
