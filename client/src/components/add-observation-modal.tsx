import { useState, useEffect } from "react";
import type { Observation } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import type { CreateObservationFormData } from "@/lib/types";
import { X, CloudUpload, MapPin } from "lucide-react";

const createObservationSchema = z.object({
  area: z.string().min(1, "Area/Location is required"),
  homogeneousArea: z.string().optional(),
  materialType: z.string().min(1, "Material type is required"),
  condition: z.string().min(1, "Material condition is required"),
  quantity: z.string().optional(),
  riskLevel: z.string().optional(),
  sampleCollected: z.boolean().default(false),
  sampleId: z.string().optional(),
  collectionMethod: z.string().optional(),
  sampleNotes: z.string().optional(),
  // Lab Results
  asbestosType: z.string().optional(),
  asbestosPercentage: z.string().optional(),
  leadResultMgKg: z.string().optional(),
  cadmiumResultMgKg: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  notes: z.string().optional(),
});

interface AddObservationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  surveyId: string;
  editingObservation?: Observation | null;
}

export function AddObservationModal({ open, onOpenChange, surveyId, editingObservation }: AddObservationModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const form = useForm<CreateObservationFormData>({
    resolver: zodResolver(createObservationSchema),
    defaultValues: {
      area: "",
      homogeneousArea: "",
      materialType: "",
      condition: "",
      quantity: "",
      riskLevel: "",
      sampleCollected: false,
      sampleId: "",
      collectionMethod: "",
      sampleNotes: "",
      asbestosType: "",
      asbestosPercentage: "",
      leadResultMgKg: "",
      cadmiumResultMgKg: "",
      latitude: "",
      longitude: "",
      notes: "",
    },
  });

  // Reset form when editing observation changes
  useEffect(() => {
    if (editingObservation) {
      form.reset({
        area: editingObservation.area,
        homogeneousArea: editingObservation.homogeneousArea || "",
        materialType: editingObservation.materialType,
        condition: editingObservation.condition,
        quantity: editingObservation.quantity || "",
        riskLevel: editingObservation.riskLevel || "",
        sampleCollected: editingObservation.sampleCollected ?? false,
        sampleId: editingObservation.sampleId || "",
        collectionMethod: editingObservation.collectionMethod || "",
        sampleNotes: editingObservation.sampleNotes || "",
        asbestosType: editingObservation.asbestosType || "",
        asbestosPercentage: editingObservation.asbestosPercentage || "",
        leadResultMgKg: editingObservation.leadResultMgKg || "",
        cadmiumResultMgKg: editingObservation.cadmiumResultMgKg || "",
        latitude: editingObservation.latitude || "",
        longitude: editingObservation.longitude || "",
        notes: editingObservation.notes || "",
      });
    } else {
      form.reset({
        area: "",
        homogeneousArea: "",
        materialType: "",
        condition: "",
        quantity: "",
        riskLevel: "",
        sampleCollected: false,
        sampleId: "",
        collectionMethod: "",
        sampleNotes: "",
        asbestosType: "",
        asbestosPercentage: "",
        leadResultMgKg: "",
        cadmiumResultMgKg: "",
        latitude: "",
        longitude: "",
        notes: "",
      });
    }
  }, [editingObservation, form]);

  const createObservationMutation = useMutation({
    mutationFn: async (data: CreateObservationFormData) => {
      const observationData = {
        ...data,
        surveyId,
        latitude: data.latitude ? parseFloat(data.latitude) : undefined,
        longitude: data.longitude ? parseFloat(data.longitude) : undefined,
        // Calculate percentages for lead and cadmium
        leadResultPercent: data.leadResultMgKg ? (parseFloat(data.leadResultMgKg) / 10000).toString() : undefined,
        cadmiumResultPercent: data.cadmiumResultMgKg ? (parseFloat(data.cadmiumResultMgKg) / 10000).toString() : undefined,
      };

      let observation;
      if (editingObservation) {
        // Update existing observation
        const response = await apiRequest("PUT", `/api/observations/${editingObservation.id}`, observationData);
        observation = await response.json();
      } else {
        // Create new observation
        const response = await apiRequest("POST", "/api/observations", observationData);
        observation = await response.json();
      }

      // Upload photos if any
      if (selectedFiles.length > 0) {
        const formData = new FormData();
        selectedFiles.forEach(file => {
          formData.append('photos', file);
        });

        await apiRequest("POST", `/api/observations/${observation.id}/photos`, formData);
      }

      return observation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/surveys", surveyId, "observations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: editingObservation ? "Observation Updated" : "Observation Added",
        description: editingObservation 
          ? "Observation has been updated successfully." 
          : "New observation has been created successfully.",
      });
      onOpenChange(false);
      form.reset();
      setSelectedFiles([]);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || (editingObservation ? "Failed to update observation" : "Failed to create observation"),
        variant: "destructive",
      });
    },
  });

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "GPS Not Available",
        description: "Geolocation is not supported by this browser.",
        variant: "destructive",
      });
      return;
    }

    setIsGettingLocation(true);
    toast({
      title: "Getting Location",
      description: "Requesting your current location...",
    });

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude.toFixed(6);
        const lng = position.coords.longitude.toFixed(6);
        
        form.setValue("latitude", lat);
        form.setValue("longitude", lng);
        
        toast({
          title: "Location Retrieved",
          description: `GPS coordinates: ${lat}, ${lng}`,
        });
        setIsGettingLocation(false);
      },
      (error) => {
        let errorMessage = "Unable to retrieve your current location.";
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location access denied. Please enable location permissions for this site.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable. Please try again.";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out. Please try again.";
            break;
        }
        
        toast({
          title: "Location Error",
          description: errorMessage,
          variant: "destructive",
        });
        
        console.error("Geolocation error:", error);
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    );
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
  };

  const onSubmit = (data: CreateObservationFormData) => {
    createObservationMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="modal-add-observation">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            {editingObservation ? "Edit Observation" : "Add New Observation"}
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

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Area Information */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Area Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="area"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Area/Location *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Room 101, Basement, Exterior Wall"
                          {...field}
                          data-testid="input-area"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="homogeneousArea"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Homogeneous Area ID</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., HA-001"
                          {...field}
                          data-testid="input-homogeneous-area"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Material Information */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Material Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="materialType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Material Type *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-material-type">
                            <SelectValue placeholder="Select material type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ceiling-tiles">Ceiling Tiles</SelectItem>
                          <SelectItem value="floor-tiles">Floor Tiles</SelectItem>
                          <SelectItem value="pipe-insulation">Pipe Insulation</SelectItem>
                          <SelectItem value="duct-insulation">Duct Insulation</SelectItem>
                          <SelectItem value="boiler-insulation">Boiler Insulation</SelectItem>
                          <SelectItem value="drywall">Drywall/Joint Compound</SelectItem>
                          <SelectItem value="paint">Paint/Coatings</SelectItem>
                          <SelectItem value="roofing">Roofing Material</SelectItem>
                          <SelectItem value="siding">Siding Material</SelectItem>
                          <SelectItem value="window-glazing">Window Glazing</SelectItem>
                          <SelectItem value="plaster">Plaster</SelectItem>
                          <SelectItem value="masonry">Masonry/Mortar</SelectItem>
                          <SelectItem value="vinyl-tiles">Vinyl Floor Tiles</SelectItem>
                          <SelectItem value="carpet-mastic">Carpet Mastic</SelectItem>
                          <SelectItem value="electrical-materials">Electrical Materials</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="condition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Material Condition *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-condition">
                            <SelectValue placeholder="Select condition" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="excellent">Excellent</SelectItem>
                          <SelectItem value="good">Good</SelectItem>
                          <SelectItem value="fair">Fair</SelectItem>
                          <SelectItem value="poor">Poor</SelectItem>
                          <SelectItem value="severely-damaged">Severely Damaged</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimated Quantity</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., 500 sq ft, 20 linear ft"
                          {...field}
                          data-testid="input-quantity"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="riskLevel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Risk Level</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-risk-level">
                            <SelectValue placeholder="Select risk level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="low">Low Risk</SelectItem>
                          <SelectItem value="medium">Medium Risk</SelectItem>
                          <SelectItem value="high">High Risk</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Sample Collection */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Sample Collection</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <FormField
                    control={form.control}
                    name="sampleCollected"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 mb-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            data-testid="checkbox-sample-collected"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Sample collected from this area</FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                  <div className="space-y-3">
                    <FormField
                      control={form.control}
                      name="sampleId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Sample ID</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., AS-2024-001"
                              {...field}
                              data-testid="input-sample-id"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="collectionMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Collection Method</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-collection-method">
                                <SelectValue placeholder="Select method" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="bulk">Bulk Sample</SelectItem>
                              <SelectItem value="scrape">Scrape Sample</SelectItem>
                              <SelectItem value="core">Core Sample</SelectItem>
                              <SelectItem value="air">Air Sample</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
                <FormField
                  control={form.control}
                  name="sampleNotes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sample Location Notes</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe exact sample collection location..."
                          rows={4}
                          {...field}
                          data-testid="textarea-sample-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Lab Results */}
            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
              <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Lab Results</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Asbestos Results */}
                <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-800 space-y-3">
                  <h5 className="font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600 pb-2">Asbestos Analysis</h5>
                  <FormField
                    control={form.control}
                    name="asbestosType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Asbestos Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-asbestos-type">
                              <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none-detected">None Detected</SelectItem>
                            <SelectItem value="chrysotile">Chrysotile (White)</SelectItem>
                            <SelectItem value="amosite">Amosite (Brown)</SelectItem>
                            <SelectItem value="crocidolite">Crocidolite (Blue)</SelectItem>
                            <SelectItem value="tremolite">Tremolite</SelectItem>
                            <SelectItem value="actinolite">Actinolite</SelectItem>
                            <SelectItem value="anthophyllite">Anthophyllite</SelectItem>
                            <SelectItem value="mixed">Mixed Types</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {form.watch("asbestosType") && form.watch("asbestosType") !== "none-detected" && (
                    <FormField
                      control={form.control}
                      name="asbestosPercentage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Percentage (%)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              max="100"
                              placeholder="0.00"
                              {...field}
                              data-testid="input-asbestos-percentage"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                </div>

                {/* Lead Results */}
                <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-800 space-y-3">
                  <h5 className="font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600 pb-2">Lead Analysis</h5>
                  <FormField
                    control={form.control}
                    name="leadResultMgKg"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Result (mg/kg)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            placeholder="0.0"
                            {...field}
                            data-testid="input-lead-mg-kg"
                            onChange={(e) => {
                              field.onChange(e);
                              // Auto-calculate percentage
                              const mgKg = parseFloat(e.target.value);
                              if (!isNaN(mgKg)) {
                                // The percentage will be calculated on the server
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {form.watch("leadResultMgKg") && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <strong>% by weight:</strong> {((parseFloat(form.watch("leadResultMgKg") || "0")) / 10000).toFixed(6)}%
                    </div>
                  )}
                </div>

                {/* Cadmium Results */}
                <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-800 space-y-3">
                  <h5 className="font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600 pb-2">Cadmium Analysis</h5>
                  <FormField
                    control={form.control}
                    name="cadmiumResultMgKg"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Result (mg/kg)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.1"
                            min="0"
                            placeholder="0.0"
                            {...field}
                            data-testid="input-cadmium-mg-kg"
                            onChange={(e) => {
                              field.onChange(e);
                              // Auto-calculate percentage
                              const mgKg = parseFloat(e.target.value);
                              if (!isNaN(mgKg)) {
                                // The percentage will be calculated on the server
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  {form.watch("cadmiumResultMgKg") && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <strong>% by weight:</strong> {((parseFloat(form.watch("cadmiumResultMgKg") || "0")) / 10000).toFixed(6)}%
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Photos and Documentation */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Photos and Documentation</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <FormLabel>Upload Photos</FormLabel>
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-primary dark:hover:border-primary transition-colors bg-white dark:bg-gray-700">
                    <CloudUpload className="text-gray-400 dark:text-gray-500 text-3xl mb-2 mx-auto" />
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">Drag and drop photos here, or click to select</p>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                      id="photo-upload"
                      data-testid="input-photos"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById('photo-upload')?.click()}
                      data-testid="button-choose-files"
                    >
                      Choose Files
                    </Button>
                    {selectedFiles.length > 0 && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                        {selectedFiles.length} file(s) selected
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <FormLabel>GPS Coordinates</FormLabel>
                  <div className="space-y-2">
                    <FormField
                      control={form.control}
                      name="latitude"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              placeholder="Latitude"
                              {...field}
                              data-testid="input-latitude"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="longitude"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              placeholder="Longitude"
                              {...field}
                              data-testid="input-longitude"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={getCurrentLocation}
                      disabled={isGettingLocation}
                      className="w-full"
                      data-testid="button-get-location"
                    >
                      <MapPin className="mr-2 h-4 w-4" />
                      {isGettingLocation ? "Getting Location..." : "Get Current Location"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Observation Notes</h4>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="Add detailed notes about this observation, including any hazards, recommendations, or specific concerns..."
                        rows={4}
                        {...field}
                        data-testid="textarea-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                disabled={createObservationMutation.isPending}
                className="bg-primary hover:bg-blue-700"
                data-testid="button-submit"
              >
                {createObservationMutation.isPending ? "Saving..." : "Save Observation"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
