import { useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, CloudSun, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Survey, insertAirMonitoringJobSchema } from "@shared/schema";

interface CreateAirJobModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const formSchema = insertAirMonitoringJobSchema.extend({
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().optional(),
});

type CreateAirJobFormData = z.infer<typeof formSchema>;

export function CreateAirJobModal({ open, onOpenChange }: CreateAirJobModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("basic");
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isGettingWeather, setIsGettingWeather] = useState(false);

  // Fetch surveys for selection
  const { data: surveys = [] } = useQuery<Survey[]>({
    queryKey: ["/api/surveys"],
    enabled: open,
  });

  const form = useForm<CreateAirJobFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      jobName: "",
      jobNumber: "",
      clientName: "",
      projectManager: "",
      siteName: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      country: "USA",
      status: "planning",
      workDescription: "",
      weatherConditions: "",
      notes: "",
    },
  });

  const createJobMutation = useMutation({
    mutationFn: (data: CreateAirJobFormData) => apiRequest("/api/air-monitoring-jobs", "POST", {
      ...data,
      startDate: new Date(data.startDate).toISOString(),
      endDate: data.endDate ? new Date(data.endDate).toISOString() : null,
      temperature: data.temperature ? parseFloat(data.temperature) : null,
      humidity: data.humidity ? parseFloat(data.humidity) : null,
      barometricPressure: data.barometricPressure ? parseFloat(data.barometricPressure) : null,
      windSpeed: data.windSpeed ? parseFloat(data.windSpeed) : null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/air-monitoring-jobs"] });
      toast({
        title: "Success",
        description: "Air monitoring job created successfully",
      });
      form.reset();
      onOpenChange(false);
      setActiveTab("basic");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create air monitoring job",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateAirJobFormData) => {
    createJobMutation.mutate(data);
  };

  const getCurrentLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        title: "GPS Not Available",
        description: "GPS location services are not supported by this browser",
        variant: "destructive",
      });
      return;
    }

    setIsGettingLocation(true);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
        );
      });

      const { latitude, longitude } = position.coords;
      const coordinateString = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      
      form.setValue("coordinates", coordinateString);
      
      toast({
        title: "Location Retrieved",
        description: `GPS coordinates: ${coordinateString}`,
      });
    } catch (error: any) {
      toast({
        title: "Location Error",
        description: error.message === "User denied Geolocation" 
          ? "Location access was denied. Please enable location permissions."
          : "Unable to retrieve location. Please check your GPS settings.",
        variant: "destructive",
      });
    } finally {
      setIsGettingLocation(false);
    }
  };

  const getWeatherData = async () => {
    if (!navigator.geolocation) {
      toast({
        title: "GPS Required",
        description: "GPS location is needed to get weather data",
        variant: "destructive",
      });
      return;
    }

    setIsGettingWeather(true);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
        );
      });

      const { latitude, longitude } = position.coords;
      
      // Use WeatherAPI.com - get API key from server environment
      const apiKey = import.meta.env.VITE_WEATHERAPI_KEY || "c1145a0186e94444987162821251308";
      
      console.log("API Key check:", apiKey ? "Available" : "Missing");
      
      if (!apiKey) {
        throw new Error("Weather API key not configured");
      }

      const weatherResponse = await fetch(
        `https://api.weatherapi.com/v1/current.json?key=${apiKey}&q=${latitude},${longitude}&aqi=no`
      );

      if (!weatherResponse.ok) {
        throw new Error("Weather service unavailable");
      }

      const weatherData = await weatherResponse.json();
      const current = weatherData.current;
      
      // Fill in weather data from WeatherAPI.com using US standard units
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
      let errorMessage = "Unable to retrieve weather data. Please enter manually.";
      
      if (error.message === "Weather API key not configured") {
        errorMessage = "WeatherAPI.com API key is not configured. Please contact your administrator.";
      } else if (error.message === "User denied Geolocation") {
        errorMessage = "Location access was denied. Please enable location permissions.";
      } else if (!navigator.onLine) {
        errorMessage = "No internet connection. Please check your connection and try again.";
      } else if (error.message.includes("service unavailable")) {
        errorMessage = "Weather service is currently unavailable. Please try again later.";
      }

      toast({
        title: "Weather Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsGettingWeather(false);
    }
  };

  const getWindDirection = (degrees: number): string => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(degrees / 45) % 8;
    return directions[index];
  };



  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="create-air-job-modal">
        <DialogHeader>
          <DialogTitle>Create New Air Monitoring Job</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="location">Location</TabsTrigger>
                <TabsTrigger value="weather">Weather</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="jobName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Air sampling at ABC Company" {...field} data-testid="input-job-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="jobNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Number *</FormLabel>
                        <FormControl>
                          <Input placeholder="AIR-2024-001" {...field} data-testid="input-job-number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="clientName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client Name</FormLabel>
                        <FormControl>
                          <Input placeholder="ABC Company" {...field} data-testid="input-client-name" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="projectManager"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Manager</FormLabel>
                        <FormControl>
                          <Input placeholder="John Smith" {...field} data-testid="input-project-manager" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date *</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-start-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-end-date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="surveyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Associated Survey (Optional)</FormLabel>
                      <Select onValueChange={(value) => field.onChange(value === "none" ? null : value)} value={field.value || "none"}>
                        <FormControl>
                          <SelectTrigger data-testid="select-survey">
                            <SelectValue placeholder="Select a survey" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No associated survey</SelectItem>
                          {surveys.map((survey) => (
                            <SelectItem key={survey.id} value={survey.id}>
                              {survey.siteName} - {survey.surveyType}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="location" className="space-y-4">
                <FormField
                  control={form.control}
                  name="siteName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Site Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="ABC Company Building A" {...field} data-testid="input-site-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address *</FormLabel>
                      <FormControl>
                        <Textarea placeholder="123 Main St" {...field} data-testid="input-address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="New York" {...field} data-testid="input-city" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Input placeholder="NY" {...field} data-testid="input-state" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ZIP Code</FormLabel>
                        <FormControl>
                          <Input placeholder="10001" {...field} data-testid="input-zip" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="coordinates"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>GPS Coordinates</FormLabel>
                      <div className="flex gap-2">
                        <FormControl>
                          <Input placeholder="40.7128, -74.0060" {...field} data-testid="input-coordinates" />
                        </FormControl>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={getCurrentLocation}
                          disabled={isGettingLocation}
                          data-testid="button-get-location"
                        >
                          {isGettingLocation ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <MapPin className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>

              <TabsContent value="weather" className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium">Weather Conditions</h3>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={getWeatherData}
                    disabled={isGettingWeather}
                    data-testid="button-get-weather"
                  >
                    {isGettingWeather ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Getting Weather...
                      </>
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
                  name="weatherConditions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Weather Conditions</FormLabel>
                      <FormControl>
                        <Input placeholder="Clear, sunny" {...field} data-testid="input-weather" />
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
                      <Select onValueChange={(value) => field.onChange(value === "none" ? null : value)} value={field.value || "none"}>
                        <FormControl>
                          <SelectTrigger data-testid="select-wind-direction">
                            <SelectValue placeholder="Select wind direction" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Not specified</SelectItem>
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
              </TabsContent>

              <TabsContent value="details" className="space-y-4">
                <FormField
                  control={form.control}
                  name="workDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Work Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Description of air monitoring activities..." {...field} data-testid="input-work-description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Initial Status</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-status">
                            <SelectValue placeholder="Select status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="planning">Planning</SelectItem>
                          <SelectItem value="setup">Setup</SelectItem>
                          <SelectItem value="sampling">Sampling</SelectItem>
                        </SelectContent>
                      </Select>
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
                        <Textarea placeholder="Additional notes and comments..." {...field} data-testid="input-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>

            <div className="flex justify-between pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel">
                Cancel
              </Button>
              <div className="flex gap-2">
                {activeTab !== "basic" && (
                  <Button type="button" variant="outline" onClick={() => {
                    const tabs = ["basic", "location", "weather", "details"];
                    const currentIndex = tabs.indexOf(activeTab);
                    if (currentIndex > 0) setActiveTab(tabs[currentIndex - 1]);
                  }}>
                    Previous
                  </Button>
                )}
                {activeTab !== "details" ? (
                  <Button type="button" onClick={() => {
                    const tabs = ["basic", "location", "weather", "details"];
                    const currentIndex = tabs.indexOf(activeTab);
                    if (currentIndex < tabs.length - 1) setActiveTab(tabs[currentIndex + 1]);
                  }}>
                    Next
                  </Button>
                ) : (
                  <Button type="submit" disabled={createJobMutation.isPending} data-testid="button-create-job">
                    {createJobMutation.isPending ? "Creating..." : "Create Job"}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}