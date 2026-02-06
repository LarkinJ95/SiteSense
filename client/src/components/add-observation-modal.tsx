import { useState, useEffect } from "react";
import type { Observation } from "@shared/schema";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { CreateObservationFormData } from "@/lib/types";
import { X, CloudUpload, MapPin } from "lucide-react";

const createObservationSchema = z.object({
  area: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().optional()
  ),
  homogeneousArea: z.string().optional(),
  materialType: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().optional()
  ),
  condition: z.string().optional(),
  quantity: z.string().optional(),
  quantityUnit: z.string().optional(),
  quantityOtherUnit: z.string().optional(),
  riskLevel: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  notes: z.string().optional(),
});

interface AddObservationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  surveyId: string;
  editingObservation?: Observation | null;
  homogeneousAreas?: string[];
  functionalAreas?: string[];
}

export function AddObservationModal({
  open,
  onOpenChange,
  surveyId,
  editingObservation,
  homogeneousAreas = [],
  functionalAreas = [],
}: AddObservationModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const parseStoredQuantity = (storedQuantity?: string | null) => {
    if (!storedQuantity) return { value: "", unit: "sqft", otherUnit: "" };
    const trimmed = storedQuantity.trim();
    const match = trimmed.match(/^(-?\d+(?:\.\d+)?)(?:\s+(.*))?$/);
    if (!match) return { value: trimmed, unit: "sqft", otherUnit: "" };
    const value = match[1] ?? "";
    const rawUnit = (match[2] ?? "").trim();
    if (!rawUnit) return { value, unit: "sqft", otherUnit: "" };
    if (/^(sq\s*ft|sqft|sf)$/i.test(rawUnit)) return { value, unit: "sqft", otherUnit: "" };
    if (/^(lf|linear\s*ft|linear\s*feet)$/i.test(rawUnit)) return { value, unit: "lf", otherUnit: "" };
    if (/^qty$/i.test(rawUnit)) return { value, unit: "qty", otherUnit: "" };
    return { value, unit: "other", otherUnit: rawUnit };
  };

  const buildStoredQuantity = (value?: string, unit?: string, otherUnit?: string) => {
    const trimmedValue = value?.trim();
    if (!trimmedValue) return undefined;
    let unitLabel = "";
    if (unit === "sqft") unitLabel = "SqFt";
    if (unit === "lf") unitLabel = "LF";
    if (unit === "qty") unitLabel = "Qty";
    if (unit === "other") unitLabel = otherUnit?.trim() || "";
    return `${trimmedValue}${unitLabel ? ` ${unitLabel}` : ""}`;
  };

  const form = useForm<CreateObservationFormData>({
    resolver: zodResolver(createObservationSchema),
    defaultValues: {
      area: "",
      homogeneousArea: "",
      materialType: "",
      condition: "",
      quantity: "",
      quantityUnit: "sqft",
      quantityOtherUnit: "",
      riskLevel: "",
      latitude: "",
      longitude: "",
      notes: "",
    },
  });

  // Reset form when editing observation changes
  useEffect(() => {
    if (editingObservation) {
      const parsedQuantity = parseStoredQuantity(editingObservation.quantity);
      form.reset({
        area: editingObservation.area,
        homogeneousArea: editingObservation.homogeneousArea || "",
        materialType: editingObservation.materialType,
        condition: editingObservation.condition,
        quantity: parsedQuantity.value,
        quantityUnit: parsedQuantity.unit,
        quantityOtherUnit: parsedQuantity.otherUnit,
        riskLevel: editingObservation.riskLevel || "",
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
        quantityUnit: "sqft",
        quantityOtherUnit: "",
        riskLevel: "",
        latitude: "",
        longitude: "",
        notes: "",
      });
    }
  }, [editingObservation, form]);

  const createObservationMutation = useMutation({
    mutationFn: async (data: CreateObservationFormData) => {
      const { quantityUnit, quantityOtherUnit, quantity, ...rest } = data;
      const observationData = {
        ...rest,
        surveyId,
        quantity: buildStoredQuantity(quantity, quantityUnit, quantityOtherUnit),
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

  const { data: photoLibrary = [] } = useQuery<any[]>({
    queryKey: ["/api/observations", editingObservation?.id, "photos"],
    enabled: !!editingObservation?.id,
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/observations/${editingObservation?.id}/photos`);
      return response.json();
    },
  });

  const deletePhotoMutation = useMutation({
    mutationFn: async (photoId: string) => {
      await apiRequest("DELETE", `/api/photos/${photoId}`);
    },
    onSuccess: () => {
      if (editingObservation?.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/observations", editingObservation.id, "photos"] });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete photo",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreateObservationFormData) => {
    const normalizedArea = data.area?.trim() || "Unspecified";
    const normalizedMaterialType = data.materialType?.trim() || "other";
    createObservationMutation.mutate({
      ...data,
      area: normalizedArea,
      materialType: normalizedMaterialType,
    });
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
                      <FormLabel>Functional Area</FormLabel>
                      <FormControl>
                        <>
                          <Input
                            placeholder="e.g., Room 101, Basement, Exterior Wall"
                            list="functional-areas-list"
                            {...field}
                            data-testid="input-area"
                          />
                          <datalist id="functional-areas-list">
                            {functionalAreas.map((area) => (
                              <option key={area} value={area} />
                            ))}
                          </datalist>
                        </>
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
                      <FormLabel>Homogeneous Area</FormLabel>
                      <FormControl>
                        <>
                          <Input
                            placeholder="e.g., HA-001"
                            list="homogeneous-areas-list"
                            {...field}
                            data-testid="input-homogeneous-area"
                          />
                          <datalist id="homogeneous-areas-list">
                            {homogeneousAreas.map((area) => (
                              <option key={area} value={area} />
                            ))}
                          </datalist>
                        </>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                  {selectedFiles.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <FormLabel>Selected Photos</FormLabel>
                      <div className="flex flex-wrap gap-2">
                        {selectedFiles.map((file) => (
                          <img
                            key={`${file.name}-${file.size}`}
                            src={URL.createObjectURL(file)}
                            alt={file.name}
                            className="h-16 w-16 object-cover rounded border"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                  {photoLibrary.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <FormLabel>Uploaded Photos</FormLabel>
                      <div className="flex flex-wrap gap-2">
                        {photoLibrary.map((photo) => (
                          <div key={photo.id} className="relative">
                            <img
                              src={`/uploads/${photo.filename}`}
                              alt={photo.originalName || photo.filename}
                              className="h-16 w-16 object-cover rounded border"
                            />
                            <button
                              type="button"
                              onClick={() => deletePhotoMutation.mutate(photo.id)}
                              className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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
