import { useEffect, useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AsbestosSample, AsbestosSamplePhoto } from "@shared/schema";
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
import { CloudUpload, MapPin, X } from "lucide-react";

const asbestosLayerSchema = z.object({
  layerNumber: z.number().int().min(1).optional(),
  materialType: z.string().optional(),
  asbestosType: z.string().optional(),
  asbestosPercent: z.string().optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
});

const asbestosSampleSchema = z.object({
  functionalArea: z.string().min(1, "Functional Area is required"),
  homogeneousArea: z.string().min(1, "Homogeneous Area is required"),
  sampleNumber: z.string().optional(),
  materialType: z.string().min(1, "Material type is required"),
  sampleDescription: z.string().optional(),
  sampleLocation: z.string().optional(),
  estimatedQuantity: z.string().optional(),
  quantityUnit: z.string().optional(),
  condition: z.string().optional(),
  collectionMethod: z.string().optional(),
  asbestosType: z.string().optional(),
  asbestosPercent: z.string().optional(),
  results: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  notes: z.string().optional(),
  layers: z.array(asbestosLayerSchema).optional(),
});

type AsbestosSampleFormData = z.infer<typeof asbestosSampleSchema>;

interface AddAsbestosSampleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  surveyId: string;
  functionalAreas: string[];
  homogeneousAreas: Array<{ id: string; haId?: string | null; title: string; description?: string | null }>;
  editingSample?: AsbestosSample | null;
}

export function AddAsbestosSampleModal({
  open,
  onOpenChange,
  surveyId,
  functionalAreas,
  homogeneousAreas,
  editingSample,
}: AddAsbestosSampleModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const form = useForm<AsbestosSampleFormData>({
    resolver: zodResolver(asbestosSampleSchema),
    defaultValues: {
      functionalArea: "",
      homogeneousArea: "",
      sampleNumber: "",
      materialType: "",
      sampleDescription: "",
      sampleLocation: "",
      estimatedQuantity: "",
      quantityUnit: "sqft",
      condition: "",
      collectionMethod: "",
      asbestosType: "",
      asbestosPercent: "",
      results: "",
      latitude: "",
      longitude: "",
      notes: "",
      layers: [],
    },
  });

  const { fields: layerFields, append: appendLayer, remove: removeLayer } = useFieldArray({
    control: form.control,
    name: "layers",
  });

  const { data: photoLibrary = [] } = useQuery<AsbestosSamplePhoto[]>({
    queryKey: ["/api/asbestos-samples", editingSample?.id, "photos"],
    enabled: !!editingSample?.id,
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/asbestos-samples/${editingSample?.id}/photos`);
      return response.json();
    },
  });

  const { data: sampleLayers = [] } = useQuery({
    queryKey: ["/api/asbestos-samples", editingSample?.id, "layers"],
    enabled: !!editingSample?.id,
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/asbestos-samples/${editingSample?.id}/layers`);
      return response.json();
    },
  });

  useEffect(() => {
    if (editingSample) {
      form.reset({
        functionalArea: editingSample.functionalArea,
        homogeneousArea: editingSample.homogeneousArea,
        sampleNumber: editingSample.sampleNumber,
        materialType: editingSample.materialType,
        sampleDescription: editingSample.sampleDescription || "",
        sampleLocation: editingSample.sampleLocation || "",
        estimatedQuantity: editingSample.estimatedQuantity || "",
        quantityUnit: editingSample.quantityUnit || "sqft",
        condition: editingSample.condition || "",
        collectionMethod: editingSample.collectionMethod || "",
        asbestosType: editingSample.asbestosType || "",
        asbestosPercent: editingSample.asbestosPercent || "",
        results: editingSample.results || "",
        latitude: editingSample.latitude || "",
        longitude: editingSample.longitude || "",
        notes: editingSample.notes || "",
        layers: (sampleLayers || []).map((layer: any) => ({
          layerNumber: layer.layerNumber,
          materialType: layer.materialType || "",
          asbestosType: layer.asbestosType || "",
          asbestosPercent: layer.asbestosPercent || "",
          description: layer.description || "",
          notes: layer.notes || "",
        })),
      });
    } else {
      form.reset({
        functionalArea: "",
        homogeneousArea: "",
        sampleNumber: "",
        materialType: "",
        sampleDescription: "",
        sampleLocation: "",
        estimatedQuantity: "",
        quantityUnit: "sqft",
        condition: "",
        collectionMethod: "",
        asbestosType: "",
        asbestosPercent: "",
        results: "",
        latitude: "",
        longitude: "",
        notes: "",
        layers: [],
      });
    }
    setSelectedFiles([]);
  }, [editingSample, form, open, sampleLayers]);

  const deletePhotoMutation = useMutation({
    mutationFn: async (photoId: string) => {
      await apiRequest("DELETE", `/api/asbestos-samples/photos/${photoId}`);
    },
    onSuccess: () => {
      if (editingSample?.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/asbestos-samples", editingSample.id, "photos"] });
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

  const createSampleMutation = useMutation({
    mutationFn: async (data: AsbestosSampleFormData) => {
      const response = await apiRequest("POST", `/api/surveys/${surveyId}/asbestos-samples`, data);
      return response.json();
    },
    onSuccess: async (sample: AsbestosSample) => {
      if (selectedFiles.length) {
        const formData = new FormData();
        selectedFiles.forEach((file) => formData.append("photos", file));
        await apiRequest("POST", `/api/asbestos-samples/${sample.id}/photos`, formData);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/surveys", surveyId, "asbestos-samples"] });
      onOpenChange(false);
      toast({ title: "Asbestos sample saved" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save asbestos sample",
        variant: "destructive",
      });
    },
  });

  const updateSampleMutation = useMutation({
    mutationFn: async (data: AsbestosSampleFormData) => {
      if (!editingSample?.id) throw new Error("Missing sample id");
      const response = await apiRequest("PUT", `/api/asbestos-samples/${editingSample.id}`, data);
      return response.json();
    },
    onSuccess: async (sample: AsbestosSample) => {
      if (selectedFiles.length) {
        const formData = new FormData();
        selectedFiles.forEach((file) => formData.append("photos", file));
        await apiRequest("POST", `/api/asbestos-samples/${sample.id}/photos`, formData);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/surveys", surveyId, "asbestos-samples"] });
      queryClient.invalidateQueries({ queryKey: ["/api/asbestos-samples", sample.id, "photos"] });
      onOpenChange(false);
      toast({ title: "Asbestos sample updated" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update asbestos sample",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
  };

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "Geolocation not available", variant: "destructive" });
      return;
    }
    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        form.setValue("latitude", position.coords.latitude.toFixed(6));
        form.setValue("longitude", position.coords.longitude.toFixed(6));
        setIsGettingLocation(false);
      },
      () => {
        toast({ title: "Failed to get location", variant: "destructive" });
        setIsGettingLocation(false);
      }
    );
  };

  const onSubmit = (data: AsbestosSampleFormData) => {
    const normalizedLayers = (data.layers || []).map((layer, index) => ({
      ...layer,
      layerNumber: index + 1,
      materialType: layer.materialType || data.materialType,
    }));
    const payload = { ...data, layers: normalizedLayers };
    if (editingSample) {
      updateSampleMutation.mutate(payload);
    } else {
      createSampleMutation.mutate(payload);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            {editingSample ? "Edit Asbestos Sample" : "Add Asbestos Sample"}
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Sample Details</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="functionalArea"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Functional Area *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select functional area" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {functionalAreas.map((area) => (
                            <SelectItem key={area} value={area}>
                              {area}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="homogeneousArea"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Homogeneous Area *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select homogeneous area" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {homogeneousAreas.map((area) => {
                            const value = area.haId || area.title;
                            const label = `${value}${area.description ? ` - ${area.description}` : ""}`;
                            return (
                              <SelectItem key={area.id} value={value}>
                                {label}
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sampleNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sample Number (auto)</FormLabel>
                      <FormControl>
                        <Input placeholder="Auto-generated on save" readOnly {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="materialType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Material Type *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select material type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ceiling-tiles">Ceiling Tiles</SelectItem>
                          <SelectItem value="floor-tiles-9x9">9&quot;x9&quot; Floor Tiles</SelectItem>
                          <SelectItem value="floor-tiles-12x12">12&quot;x12&quot; Floor Tiles</SelectItem>
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
                          <SelectItem value="mastic-glue">Mastic/Glue</SelectItem>
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
                  name="sampleDescription"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Sample Description</FormLabel>
                      <FormControl>
                        <Input placeholder="Describe the sample" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sampleLocation"
                  render={({ field }) => (
                    <FormItem className="md:col-span-2">
                      <FormLabel>Sample Location</FormLabel>
                      <FormControl>
                        <Input placeholder="Exact sample location" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="estimatedQuantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estimated Quantity</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., 120" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="quantityUnit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="sqft">SqFt</SelectItem>
                          <SelectItem value="lf">LF</SelectItem>
                          <SelectItem value="qty">Qty</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="condition"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Condition</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
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
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="collectionMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Collection Method</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select method" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="bulk">Bulk</SelectItem>
                          <SelectItem value="scrape">Scrape</SelectItem>
                          <SelectItem value="core">Core</SelectItem>
                          <SelectItem value="wipe">Wipe</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Lab Results</h4>
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-200">Layers</h5>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => appendLayer({ materialType: form.getValues("materialType") || "" })}
                  >
                    Add Layer
                  </Button>
                </div>
                {layerFields.length === 0 ? (
                  <p className="text-sm text-gray-500">No layers added. Add layers if this sample includes multiple materials.</p>
                ) : (
                  <div className="space-y-3">
                    {layerFields.map((field, index) => (
                      <div key={field.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-900">
                        <div className="flex items-center justify-between mb-3">
                          <div className="text-sm font-medium text-gray-700 dark:text-gray-200">Layer {index + 1}</div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeLayer(index)}
                          >
                            Remove
                          </Button>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name={`layers.${index}.materialType`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Layer Material</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ""}>
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select material type" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="ceiling-tiles">Ceiling Tiles</SelectItem>
                                    <SelectItem value="floor-tiles-9x9">9&quot;x9&quot; Floor Tiles</SelectItem>
                                    <SelectItem value="floor-tiles-12x12">12&quot;x12&quot; Floor Tiles</SelectItem>
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
                                    <SelectItem value="mastic-glue">Mastic/Glue</SelectItem>
                                    <SelectItem value="electrical-materials">Electrical Materials</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`layers.${index}.asbestosType`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Asbestos Type</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ""}>
                                  <FormControl>
                                    <SelectTrigger>
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
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`layers.${index}.asbestosPercent`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Percent (%)</FormLabel>
                                <FormControl>
                                  <Input type="number" step="0.01" min="0" max="100" placeholder="0.00" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`layers.${index}.description`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Layer Description</FormLabel>
                                <FormControl>
                                  <Input placeholder="Describe this layer" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={form.control}
                            name={`layers.${index}.notes`}
                            render={({ field }) => (
                              <FormItem className="md:col-span-2">
                                <FormLabel>Layer Notes</FormLabel>
                                <FormControl>
                                  <Textarea rows={2} placeholder="Layer notes" {...field} />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="asbestosType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Asbestos Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
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
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="asbestosPercent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Percent (%)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" max="100" placeholder="0.00" {...field} />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="results"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Results Notes</FormLabel>
                    <FormControl>
                      <Textarea rows={3} placeholder="Lab results or notes" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="mt-4">
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea rows={4} placeholder="Additional notes" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Photos & GPS</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <FormLabel>Upload Photos</FormLabel>
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center bg-white dark:bg-gray-700">
                    <CloudUpload className="text-gray-400 dark:text-gray-500 text-2xl mb-2 mx-auto" />
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                      id="asbestos-photo-upload"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById("asbestos-photo-upload")?.click()}
                    >
                      Choose Files
                    </Button>
                    {selectedFiles.length > 0 && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                        {selectedFiles.length} file(s) selected
                      </p>
                    )}
                  </div>
                  {photoLibrary.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <FormLabel>Previous Uploads</FormLabel>
                      <div className="flex flex-wrap gap-2">
                        {photoLibrary.map((photo) => (
                          <div key={photo.id} className="relative">
                            <img
                              src={photo.url}
                              alt={photo.filename || "Sample photo"}
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
                            <Input placeholder="Latitude" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="longitude"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder="Longitude" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={getCurrentLocation}
                      disabled={isGettingLocation}
                      className="w-full"
                    >
                      <MapPin className="mr-2 h-4 w-4" />
                      {isGettingLocation ? "Getting Location..." : "Get Current Location"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createSampleMutation.isPending || updateSampleMutation.isPending}>
                {editingSample ? "Save Changes" : "Save Sample"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
