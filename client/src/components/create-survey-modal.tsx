import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { CreateSurveyFormData } from "@/lib/types";
import { WeatherWidget } from "@/components/weather-widget";
import { EquipmentTracker, type Equipment } from "@/components/equipment-tracker";
import { OfflineIndicator } from "@/components/offline-indicator";
import { TemplateSelector } from "@/components/template-selector";
import { Badge } from "@/components/ui/badge";
import { X, FileText, ClipboardList, Camera, Upload } from "lucide-react";

type InspectorOption = {
  personId: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  active?: boolean;
  isInspector?: boolean;
};

const createSurveySchema = z.object({
  siteName: z.string().min(1, "Site name is required"),
  address: z.string().optional(),
  jobNumber: z.string().optional(),
  surveyType: z.string().min(1, "Survey type is required"),
  surveyDate: z.string().min(1, "Survey date is required"),
  inspector: z.string().min(1, "Inspector is required"),
  notes: z.string().optional(),
  enableGPS: z.boolean().default(false),
  useTemplate: z.boolean().default(false),
  requirePhotos: z.boolean().default(false),
  // Weather and equipment are handled separately
});

interface CreateSurveyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateSurveyModal({ open, onOpenChange }: CreateSurveyModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [weather, setWeather] = useState<any>(null);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [selectedSitePhoto, setSelectedSitePhoto] = useState<File | null>(null);

  const { data: inspectors = [] } = useQuery<InspectorOption[]>({
    queryKey: ["/api/personnel?inspectors=1&active=1&compact=1"],
    enabled: open,
  });

  const form = useForm<CreateSurveyFormData>({
    resolver: zodResolver(createSurveySchema),
    defaultValues: {
      siteName: "",
      address: "",
      jobNumber: "",
      surveyType: "",
      surveyDate: new Date().toISOString().split('T')[0],
      inspector: "",
      notes: "",
      enableGPS: false,
      useTemplate: false,
      requirePhotos: false,
    },
  });

  const createSurveyMutation = useMutation({
    mutationFn: async (data: CreateSurveyFormData) => {
      const surveyData = {
        ...data,
        inspector: data.inspector,
        // Add weather data if available
        weatherConditions: weather?.conditions,
        temperature: weather?.temperature?.toString(),
        humidity: weather?.humidity?.toString(),
        windSpeed: weather?.windSpeed?.toString(),
        // Add equipment data
        equipmentUsed: equipment.map(e => `${e.name} (${e.serialNumber})`),
        calibrationDates: equipment.map(e => e.calibrationDate),
      };
      
      // Create survey first
      const response = await apiRequest("POST", "/api/surveys", {
        ...surveyData,
        surveyDate: new Date(data.surveyDate).toISOString(),
      });
      const survey = await response.json();
      
      // If there's a site photo, upload it
      if (selectedSitePhoto) {
        const formData = new FormData();
        formData.append('sitePhoto', selectedSitePhoto);
        await apiRequest("POST", `/api/surveys/${survey.id}/site-photo`, formData);
      }
      
      return survey;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/surveys"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Survey Created",
        description: "New survey has been created successfully.",
      });
      onOpenChange(false);
      form.reset();
      setSelectedSitePhoto(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create survey",
        variant: "destructive",
      });
    },
  });

  const handleTemplateSelected = (template: any) => {
    setSelectedTemplate(template);
    // Pre-fill form with template defaults
    form.setValue("surveyType", template.surveyType);
    if (template.defaultSettings) {
      const settings = JSON.parse(template.defaultSettings);
      Object.entries(settings).forEach(([key, value]) => {
        if (form.getValues()[key as keyof CreateSurveyFormData] !== undefined) {
          form.setValue(key as keyof CreateSurveyFormData, value as any);
        }
      });
    }
    toast({
      title: "Template Applied",
      description: `Using template: ${template.name}`,
    });
  };

  const onSubmit = (data: CreateSurveyFormData) => {
    createSurveyMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="modal-create-survey">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Create New Survey
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              data-testid="button-close-modal"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        {/* Template Selector Component */}
        <TemplateSelector
          open={showTemplateSelector}
          onOpenChange={setShowTemplateSelector}
          onSelectTemplate={handleTemplateSelected}
          surveyType={form.watch("surveyType")}
        />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Site Information */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Site Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="siteName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Site Name *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter site name"
                          {...field}
                          data-testid="input-site-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="surveyType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Survey Type *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-survey-type">
                            <SelectValue placeholder="Select survey type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="asbestos">Asbestos Survey</SelectItem>
                          <SelectItem value="lead">Lead Paint Survey</SelectItem>
                          <SelectItem value="cadmium">Cadmium Survey</SelectItem>
                          <SelectItem value="asbestos-lead">Asbestos + Lead Combination</SelectItem>
                          <SelectItem value="asbestos-cadmium">Asbestos + Cadmium Combination</SelectItem>
                          <SelectItem value="lead-cadmium">Lead + Cadmium Combination</SelectItem>
                          <SelectItem value="asbestos-lead-cadmium">Asbestos + Lead + Cadmium Combination</SelectItem>
                          <SelectItem value="environmental">Environmental Survey</SelectItem>
                          <SelectItem value="structural">Structural Survey</SelectItem>
                          <SelectItem value="mold">Mold Assessment</SelectItem>
                          <SelectItem value="comprehensive">Comprehensive Hazmat Survey</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter site address"
                          {...field}
                          data-testid="input-address"
                        />
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
                      <FormLabel>Job Number</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter job/project number"
                          {...field}
                          data-testid="input-job-number"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Survey Details */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Survey Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="surveyDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Survey Date *</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          data-testid="input-survey-date"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
	                  name="inspector"
	                  render={({ field }) => (
	                    <FormItem>
	                      <FormLabel>Inspector *</FormLabel>
	                      <Select onValueChange={field.onChange} value={field.value}>
	                        <FormControl>
	                          <SelectTrigger data-testid="select-inspector">
	                            <SelectValue placeholder="Select inspector" />
	                          </SelectTrigger>
	                        </FormControl>
	                        <SelectContent>
	                          {inspectors.length ? (
	                            inspectors
	                              .filter((p) => Boolean(p.active))
	                              .map((p) => {
	                                const name = `${p.firstName || ""} ${p.lastName || ""}`.trim();
	                                return (
	                                  <SelectItem key={p.personId} value={name}>
	                                    {name}
	                                    {p.email ? ` (${p.email})` : ""}
	                                  </SelectItem>
	                                );
	                              })
	                          ) : (
	                            <SelectItem value="" disabled>
	                              No inspectors found
	                            </SelectItem>
	                          )}
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
                    <FormItem className="md:col-span-2">
                      <FormLabel>Project Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Add any project-specific notes or requirements"
                          {...field}
                          data-testid="textarea-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {/* Site Photo Upload */}
                <div className="md:col-span-2">
                  <FormLabel>Site Photo</FormLabel>
                  <div className="mt-2">
                    <div className="flex items-center justify-center w-full">
                      <label
                        htmlFor="site-photo-upload"
                        className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600"
                      >
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                          {selectedSitePhoto ? (
                            <>
                              <Camera className="w-8 h-8 mb-2 text-green-500" />
                              <p className="text-sm text-gray-500 dark:text-gray-400">
                                <span className="font-semibold">{selectedSitePhoto.name}</span>
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Click to change photo
                              </p>
                            </>
                          ) : (
                            <>
                              <Upload className="w-8 h-8 mb-2 text-gray-400" />
                              <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                                <span className="font-semibold">Click to upload</span> site photo
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                PNG, JPG, JPEG (MAX. 10MB)
                              </p>
                            </>
                          )}
                        </div>
                        <input
                          id="site-photo-upload"
                          type="file"
                          accept="image/png,image/jpeg,image/jpg"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 10 * 1024 * 1024) { // 10MB limit
                                toast({
                                  title: "File too large",
                                  description: "Please select an image smaller than 10MB",
                                  variant: "destructive",
                                });
                                return;
                              }
                              setSelectedSitePhoto(file);
                            }
                          }}
                          data-testid="input-site-photo"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Options */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Additional Options</h4>
              <div className="space-y-3">
                <FormField
                  control={form.control}
                  name="enableGPS"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-enable-gps"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Enable GPS tagging for observations</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="useTemplate"
                  render={({ field }) => (
                    <FormItem className="space-y-3">
                      <div className="flex items-center space-x-3">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={(checked) => {
                              field.onChange(checked);
                              if (!checked) {
                                setSelectedTemplate(null);
                              }
                            }}
                            data-testid="checkbox-use-template"
                          />
                        </FormControl>
                        <FormLabel>Use pre-built checklist template</FormLabel>
                      </div>
                      {field.value && (
                        <div className="ml-6 space-y-2">
                          {selectedTemplate ? (
                            <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                              <div className="flex items-center gap-2">
                                <ClipboardList className="h-4 w-4 text-blue-600" />
                                <div>
                                  <div className="font-medium text-sm">{selectedTemplate.name}</div>
                                  <div className="text-xs text-gray-600">{selectedTemplate.category}</div>
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setShowTemplateSelector(true)}
                              >
                                Change
                              </Button>
                            </div>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setShowTemplateSelector(true)}
                              className="w-full"
                              data-testid="button-select-template"
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              Select Template
                            </Button>
                          )}
                        </div>
                      )}
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="requirePhotos"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-require-photos"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Require photos for each observation</FormLabel>
                      </div>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Weather Conditions */}
            <div className="space-y-4">
              <WeatherWidget onWeatherUpdate={setWeather} />
            </div>

            {/* Equipment Tracking */}
            <div className="space-y-4">
              <EquipmentTracker equipment={equipment} onEquipmentChange={setEquipment} />
            </div>

            {/* Offline Status */}
            <div className="space-y-4">
              <OfflineIndicator />
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t">
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
                disabled={createSurveyMutation.isPending}
                className="bg-primary hover:bg-blue-700"
                data-testid="button-submit"
              >
                {createSurveyMutation.isPending ? "Creating..." : "Create Survey"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
