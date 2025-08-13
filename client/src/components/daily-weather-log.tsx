import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from './ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit2, Trash2, CloudSun, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';

const weatherLogSchema = z.object({
  logDate: z.string().min(1, 'Date is required'),
  logTime: z.string().min(1, 'Time is required'),
  weatherConditions: z.string().optional(),
  temperature: z.string().optional(),
  humidity: z.string().optional(),
  barometricPressure: z.string().optional(),
  windSpeed: z.string().optional(),
  windDirection: z.string().optional(),
  precipitation: z.string().optional(),
  visibility: z.string().optional(),
  notes: z.string().optional(),
  loggedBy: z.string().optional(),
  coordinates: z.string().optional(),
});

type WeatherLogFormData = z.infer<typeof weatherLogSchema>;

interface DailyWeatherLogProps {
  jobId: string;
}

export function DailyWeatherLog({ jobId }: DailyWeatherLogProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingLog, setEditingLog] = useState<any>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isGettingWeather, setIsGettingWeather] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<WeatherLogFormData>({
    resolver: zodResolver(weatherLogSchema),
    defaultValues: {
      logDate: format(new Date(), 'yyyy-MM-dd'),
      logTime: format(new Date(), 'HH:mm'),
      weatherConditions: '',
      temperature: '',
      humidity: '',
      barometricPressure: '',
      windSpeed: '',
      windDirection: '',
      precipitation: '',
      visibility: '',
      notes: '',
      loggedBy: '',
      coordinates: '',
    },
  });

  // Fetch weather logs for the job
  const { data: weatherLogs = [], isLoading } = useQuery({
    queryKey: ['/api/air-monitoring', 'jobs', jobId, 'weather-logs'],
  });

  // Create weather log mutation
  const createWeatherLogMutation = useMutation({
    mutationFn: (data: WeatherLogFormData) =>
      apiRequest(`/api/air-monitoring/jobs/${jobId}/weather-logs`, {
        method: 'POST',
        body: {
          ...data,
          logTime: new Date(`${data.logDate}T${data.logTime}`).toISOString(),
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/air-monitoring', 'jobs', jobId, 'weather-logs'] });
      setIsAddDialogOpen(false);
      form.reset();
      toast({ title: 'Success', description: 'Weather log added successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to add weather log',
        variant: 'destructive',
      });
    },
  });

  // Update weather log mutation
  const updateWeatherLogMutation = useMutation({
    mutationFn: ({ id, ...data }: WeatherLogFormData & { id: string }) =>
      apiRequest(`/api/air-monitoring/weather-logs/${id}`, {
        method: 'PUT',
        body: {
          ...data,
          logTime: new Date(`${data.logDate}T${data.logTime}`).toISOString(),
        },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/air-monitoring', 'jobs', jobId, 'weather-logs'] });
      setEditingLog(null);
      toast({ title: 'Success', description: 'Weather log updated successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update weather log',
        variant: 'destructive',
      });
    },
  });

  // Delete weather log mutation
  const deleteWeatherLogMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/api/air-monitoring/weather-logs/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/air-monitoring', 'jobs', jobId, 'weather-logs'] });
      toast({ title: 'Success', description: 'Weather log deleted successfully' });
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete weather log',
        variant: 'destructive',
      });
    },
  });

  const handleGetCurrentLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        title: "Location Error",
        description: "Geolocation is not supported by this browser.",
        variant: "destructive",
      });
      return;
    }

    setIsGettingLocation(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000,
        });
      });

      const { latitude, longitude } = position.coords;
      const coordinates = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      form.setValue("coordinates", coordinates);

      toast({
        title: "Location Retrieved",
        description: `Coordinates: ${coordinates}`,
      });
    } catch (error: any) {
      let errorMessage = "Unable to retrieve location";
      if (error.code === 1) {
        errorMessage = "Location access denied. Please enable location services.";
      } else if (error.code === 2) {
        errorMessage = "Location unavailable. Please try again.";
      } else if (error.code === 3) {
        errorMessage = "Location request timed out. Please try again.";
      }

      toast({
        title: "Location Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleAutoFillWeather = async () => {
    const coordinates = form.getValues("coordinates");
    if (!coordinates) {
      toast({
        title: "Location Required",
        description: "Please get your GPS location first to autofill weather data.",
        variant: "destructive",
      });
      return;
    }

    setIsGettingWeather(true);
    try {
      const [lat, lon] = coordinates.split(', ').map(coord => parseFloat(coord.trim()));
      
      if (isNaN(lat) || isNaN(lon)) {
        throw new Error("Invalid coordinates format");
      }

      const apiKey = import.meta.env.VITE_WEATHERAPI_KEY || "c1145a0186e94444987162821251308";
      
      const weatherResponse = await fetch(
        `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${lat},${lon}&aqi=no`
      );

      if (!weatherResponse.ok) {
        throw new Error("Failed to fetch weather data");
      }

      const weatherData = await weatherResponse.json();
      const current = weatherData.current;
      
      // Fill in weather data using US standard units
      form.setValue("weatherConditions", current.condition.text);
      form.setValue("temperature", current.temp_f?.toFixed(1)); // Fahrenheit
      form.setValue("humidity", current.humidity?.toString());
      form.setValue("barometricPressure", current.pressure_in?.toFixed(2)); // Inches of mercury
      form.setValue("windSpeed", current.wind_mph?.toFixed(1)); // Miles per hour
      
      if (current.wind_degree !== undefined) {
        const windDirection = getWindDirection(current.wind_degree);
        form.setValue("windDirection", windDirection);
      }

      toast({
        title: "Weather Retrieved",
        description: `Current conditions: ${current.condition.text}, ${current.temp_f}°F`,
      });
    } catch (error: any) {
      toast({
        title: "Weather Error",
        description: error.message || "Failed to retrieve weather data",
        variant: "destructive",
      });
    } finally {
      setIsGettingWeather(false);
    }
  };

  const getWindDirection = (degrees: number): string => {
    const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
    const index = Math.round(degrees / 22.5) % 16;
    return directions[index];
  };

  const onSubmit = (data: WeatherLogFormData) => {
    if (editingLog) {
      updateWeatherLogMutation.mutate({ ...data, id: editingLog.id });
    } else {
      createWeatherLogMutation.mutate(data);
    }
  };

  const handleEdit = (log: any) => {
    setEditingLog(log);
    const logTime = new Date(log.logTime);
    form.reset({
      ...log,
      logDate: format(logTime, 'yyyy-MM-dd'),
      logTime: format(logTime, 'HH:mm'),
    });
    setIsAddDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this weather log?')) {
      deleteWeatherLogMutation.mutate(id);
    }
  };

  const resetForm = () => {
    setEditingLog(null);
    form.reset({
      logDate: format(new Date(), 'yyyy-MM-dd'),
      logTime: format(new Date(), 'HH:mm'),
      weatherConditions: '',
      temperature: '',
      humidity: '',
      barometricPressure: '',
      windSpeed: '',
      windDirection: '',
      precipitation: '',
      visibility: '',
      notes: '',
      loggedBy: '',
      coordinates: '',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Daily Weather Logs</h2>
          <p className="text-muted-foreground">Track weather conditions for each day of air sampling</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={(open) => {
          setIsAddDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-weather-log">
              <Plus className="mr-2 h-4 w-4" />
              Add Weather Log
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingLog ? 'Edit Weather Log' : 'Add Daily Weather Log'}</DialogTitle>
              <DialogDescription>
                Record weather conditions for this day of air sampling
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="logDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-log-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="logTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} data-testid="input-log-time" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleGetCurrentLocation}
                      disabled={isGettingLocation}
                      data-testid="button-get-location"
                    >
                      {isGettingLocation ? (
                        <>Getting Location...</>
                      ) : (
                        <>
                          <MapPin className="mr-2 h-4 w-4" />
                          Get GPS Location
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAutoFillWeather}
                      disabled={isGettingWeather}
                      data-testid="button-autofill-weather"
                    >
                      {isGettingWeather ? (
                        <>Getting Weather...</>
                      ) : (
                        <>
                          <CloudSun className="mr-2 h-4 w-4" />
                          Auto-fill Weather
                        </>
                      )}
                    </Button>
                  </div>

                  <FormField
                    control={form.control}
                    name="coordinates"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>GPS Coordinates</FormLabel>
                        <FormControl>
                          <Input placeholder="Click GPS button to get location" {...field} data-testid="input-coordinates" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="weatherConditions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Weather Conditions</FormLabel>
                        <FormControl>
                          <Input placeholder="Clear, sunny, overcast, etc." {...field} data-testid="input-weather-conditions" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="temperature"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Temperature (°F)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.1" placeholder="72.5" {...field} data-testid="input-temperature" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="humidity"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Humidity (%)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.1" placeholder="45.0" {...field} data-testid="input-humidity" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="barometricPressure"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Pressure (inHg)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="29.92" {...field} data-testid="input-pressure" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="windSpeed"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Wind Speed (mph)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.1" placeholder="7.2" {...field} data-testid="input-wind-speed" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="windDirection"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Wind Direction</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-wind-direction">
                              <SelectValue placeholder="Select wind direction" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="N">North</SelectItem>
                            <SelectItem value="NE">Northeast</SelectItem>
                            <SelectItem value="E">East</SelectItem>
                            <SelectItem value="SE">Southeast</SelectItem>
                            <SelectItem value="S">South</SelectItem>
                            <SelectItem value="SW">Southwest</SelectItem>
                            <SelectItem value="W">West</SelectItem>
                            <SelectItem value="NW">Northwest</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="loggedBy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Logged By</FormLabel>
                        <FormControl>
                          <Input placeholder="Name of person logging weather" {...field} data-testid="input-logged-by" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Additional weather observations..." {...field} data-testid="input-notes" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsAddDialogOpen(false);
                      resetForm();
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" data-testid="button-save-weather-log">
                    {editingLog ? 'Update Log' : 'Save Log'}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="text-center py-8">Loading weather logs...</div>
      ) : weatherLogs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">No weather logs recorded yet.</p>
            <p className="text-sm text-muted-foreground mt-2">Click "Add Weather Log" to start tracking daily weather conditions.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {weatherLogs.map((log: any) => (
            <Card key={log.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {format(new Date(log.logTime), 'EEEE, MMMM d, yyyy')}
                    </CardTitle>
                    <CardDescription>
                      {format(new Date(log.logTime), 'h:mm a')}
                      {log.loggedBy && ` • Logged by ${log.loggedBy}`}
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(log)}
                      data-testid={`button-edit-${log.id}`}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(log.id)}
                      data-testid={`button-delete-${log.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  {log.weatherConditions && (
                    <div>
                      <Label className="text-muted-foreground">Conditions</Label>
                      <p className="font-medium">{log.weatherConditions}</p>
                    </div>
                  )}
                  {log.temperature && (
                    <div>
                      <Label className="text-muted-foreground">Temperature</Label>
                      <p className="font-medium">{log.temperature}°F</p>
                    </div>
                  )}
                  {log.humidity && (
                    <div>
                      <Label className="text-muted-foreground">Humidity</Label>
                      <p className="font-medium">{log.humidity}%</p>
                    </div>
                  )}
                  {log.barometricPressure && (
                    <div>
                      <Label className="text-muted-foreground">Pressure</Label>
                      <p className="font-medium">{log.barometricPressure} inHg</p>
                    </div>
                  )}
                  {log.windSpeed && (
                    <div>
                      <Label className="text-muted-foreground">Wind Speed</Label>
                      <p className="font-medium">{log.windSpeed} mph</p>
                    </div>
                  )}
                  {log.windDirection && (
                    <div>
                      <Label className="text-muted-foreground">Wind Direction</Label>
                      <p className="font-medium">{log.windDirection}</p>
                    </div>
                  )}
                  {log.coordinates && (
                    <div>
                      <Label className="text-muted-foreground">Location</Label>
                      <p className="font-medium text-xs">{log.coordinates}</p>
                    </div>
                  )}
                </div>
                {log.notes && (
                  <div className="mt-4">
                    <Label className="text-muted-foreground">Notes</Label>
                    <p className="text-sm mt-1">{log.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}