import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, Clock, MapPin } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { PersonnelProfile, Survey } from "@shared/schema";

const createAirSampleSchema = z.object({
  surveyId: z.string().optional(),
  personnelId: z.string().optional(),
  sampleType: z.enum(['personal', 'area', 'background', 'outdoor']),
  analyte: z.enum(['asbestos', 'lead', 'cadmium', 'hexavalent_chromium', 'silica', 'heavy_metals', 'benzene', 'toluene', 'other']),
  customAnalyte: z.string().optional(),
  samplingMethod: z.enum(['pcm', 'tem', 'plm', 'xrf', 'icp', 'gravimetric', 'active', 'passive']).optional(),
  
  // Location
  location: z.string().min(1, "Location is required"),
  area: z.string().optional(),
  building: z.string().optional(),
  floor: z.string().optional(),
  room: z.string().optional(),
  
  // Sampling parameters
  pumpId: z.string().optional(),
  flowRate: z.string().optional(),
  samplingDuration: z.string().optional(),
  
  // Environmental conditions
  temperature: z.string().optional(),
  humidity: z.string().optional(),
  pressure: z.string().optional(),
  windSpeed: z.string().optional(),
  windDirection: z.string().optional(),
  
  // Timing
  startTime: z.string().min(1, "Start time is required"),
  endTime: z.string().optional(),
  
  // Chain of custody
  collectedBy: z.string().min(1, "Collector name is required"),
  witnessedBy: z.string().optional(),
  chainOfCustody: z.string().optional(),
  
  // Laboratory
  labId: z.string().optional(),
  labSampleId: z.string().optional(),
  analysisMethod: z.string().optional(),
  
  // Notes
  fieldNotes: z.string().optional(),
});

type CreateAirSampleFormData = z.infer<typeof createAirSampleSchema>;

interface CreateAirSampleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personnel: PersonnelProfile[];
}

export function CreateAirSampleModal({ open, onOpenChange, personnel }: CreateAirSampleModalProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("basic");

  // Fetch surveys for selection
  const { data: surveys = [] } = useQuery<Survey[]>({
    queryKey: ["/api/surveys"],
    enabled: open,
  });

  const form = useForm<CreateAirSampleFormData>({
    resolver: zodResolver(createAirSampleSchema),
    defaultValues: {
      sampleType: "area",
      analyte: "asbestos",
      startTime: new Date().toISOString().slice(0, 16),
      collectedBy: "",
      location: "",
    },
  });

  const createSampleMutation = useMutation({
    mutationFn: (data: CreateAirSampleFormData) => apiRequest("/api/air-samples", "POST", {
        ...data,
        startTime: new Date(data.startTime).toISOString(),
        endTime: data.endTime ? new Date(data.endTime).toISOString() : null,
        flowRate: data.flowRate ? parseFloat(data.flowRate) : null,
        samplingDuration: data.samplingDuration ? parseInt(data.samplingDuration) : null,
        temperature: data.temperature ? parseFloat(data.temperature) : null,
        humidity: data.humidity ? parseFloat(data.humidity) : null,
        pressure: data.pressure ? parseFloat(data.pressure) : null,
        windSpeed: data.windSpeed ? parseFloat(data.windSpeed) : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/air-samples"] });
      toast({
        title: "Success",
        description: "Air sample created successfully",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create air sample",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateAirSampleFormData) => {
    createSampleMutation.mutate(data);
  };

  const watchedSampleType = form.watch("sampleType");
  const watchedAnalyte = form.watch("analyte");

  useEffect(() => {
    if (!open) {
      form.reset();
      setActiveTab("basic");
    }
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Air Sample</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="sampling">Sampling</TabsTrigger>
                <TabsTrigger value="environment">Environment</TabsTrigger>
                <TabsTrigger value="chain">Chain of Custody</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="sampleType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sample Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-sample-type">
                              <SelectValue placeholder="Select sample type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="personal">Personal</SelectItem>
                            <SelectItem value="area">Area</SelectItem>
                            <SelectItem value="background">Background</SelectItem>
                            <SelectItem value="outdoor">Outdoor</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {watchedSampleType === "personal" && (
                    <FormField
                      control={form.control}
                      name="personnelId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Personnel</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-personnel">
                                <SelectValue placeholder="Select personnel" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {personnel.map((person) => (
                                <SelectItem key={person.id} value={person.id}>
                                  {person.firstName} {person.lastName} - {person.jobTitle}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="analyte"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Analyte</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-analyte">
                              <SelectValue placeholder="Select analyte" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="asbestos">Asbestos</SelectItem>
                            <SelectItem value="lead">Lead</SelectItem>
                            <SelectItem value="cadmium">Cadmium</SelectItem>
                            <SelectItem value="hexavalent_chromium">Hexavalent Chromium</SelectItem>
                            <SelectItem value="silica">Silica</SelectItem>
                            <SelectItem value="heavy_metals">Heavy Metals</SelectItem>
                            <SelectItem value="benzene">Benzene</SelectItem>
                            <SelectItem value="toluene">Toluene</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {watchedAnalyte === "other" && (
                    <FormField
                      control={form.control}
                      name="customAnalyte"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Custom Analyte</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter analyte name" {...field} data-testid="input-custom-analyte" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="surveyId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Associated Survey (Optional)</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-survey">
                              <SelectValue placeholder="Select survey" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {surveys.map((survey: Survey) => (
                              <SelectItem key={survey.id} value={survey.id}>
                                {survey.siteName} - {new Date(survey.surveyDate).toLocaleDateString()}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Location</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Main Building Entrance" {...field} data-testid="input-location" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="area"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Area</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Mechanical Room" {...field} data-testid="input-area" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="building"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Building</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Building A" {...field} data-testid="input-building" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="floor"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Floor</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 3rd Floor" {...field} data-testid="input-floor" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="sampling" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="samplingMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sampling Method</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-sampling-method">
                              <SelectValue placeholder="Select method" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="pcm">PCM (Phase Contrast Microscopy)</SelectItem>
                            <SelectItem value="tem">TEM (Transmission Electron Microscopy)</SelectItem>
                            <SelectItem value="plm">PLM (Polarized Light Microscopy)</SelectItem>
                            <SelectItem value="xrf">XRF (X-Ray Fluorescence)</SelectItem>
                            <SelectItem value="icp">ICP (Inductively Coupled Plasma)</SelectItem>
                            <SelectItem value="gravimetric">Gravimetric</SelectItem>
                            <SelectItem value="active">Active Sampling</SelectItem>
                            <SelectItem value="passive">Passive Sampling</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pumpId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pump ID</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., PUMP-001" {...field} data-testid="input-pump-id" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="flowRate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Flow Rate (L/min)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 2.0" type="number" step="0.1" {...field} data-testid="input-flow-rate" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="samplingDuration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sampling Duration (minutes)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 480" type="number" {...field} data-testid="input-sampling-duration" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Time</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} data-testid="input-start-time" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="endTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Time (Optional)</FormLabel>
                        <FormControl>
                          <Input type="datetime-local" {...field} data-testid="input-end-time" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="environment" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="temperature"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Temperature (°C)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 22.5" type="number" step="0.1" {...field} data-testid="input-temperature" />
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
                          <Input placeholder="e.g., 65" type="number" {...field} data-testid="input-humidity" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="pressure"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Pressure (kPa)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 101.3" type="number" step="0.1" {...field} data-testid="input-pressure" />
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
                        <FormLabel>Wind Speed (m/s)</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 3.2" type="number" step="0.1" {...field} data-testid="input-wind-speed" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="windDirection"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Wind Direction</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., NW, Southeast" {...field} data-testid="input-wind-direction" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="chain" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="collectedBy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Collected By</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter collector name" {...field} data-testid="input-collected-by" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="witnessedBy"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Witnessed By</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter witness name" {...field} data-testid="input-witnessed-by" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="labId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Laboratory ID</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., LAB-001" {...field} data-testid="input-lab-id" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="labSampleId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Lab Sample ID</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., 2024-001234" {...field} data-testid="input-lab-sample-id" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="chainOfCustody"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Chain of Custody Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter chain of custody details..." 
                          rows={3} 
                          {...field} 
                          data-testid="textarea-chain-custody"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="fieldNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Field Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter field observations and notes..." 
                          rows={4} 
                          {...field} 
                          data-testid="textarea-field-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </TabsContent>
            </Tabs>

            <div className="flex justify-end space-x-2 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createSampleMutation.isPending}
                data-testid="button-create-sample"
              >
                {createSampleMutation.isPending ? "Creating..." : "Create Air Sample"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}