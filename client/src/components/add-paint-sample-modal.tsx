import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PaintSample, PaintSamplePhoto } from "@shared/schema";
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

const paintSampleSchema = z.object({
  functionalArea: z.string().min(1, "Functional Area is required"),
  sampleNumber: z.string().min(1, "Sample number is required"),
  sampleDescription: z.string().optional(),
  sampleLocation: z.string().optional(),
  substrate: z.string().optional(),
  substrateOther: z.string().optional(),
  collectionMethod: z.string().optional(),
  leadResultMgKg: z.string().optional(),
  cadmiumResultMgKg: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
  notes: z.string().optional(),
});

type PaintSampleFormData = z.infer<typeof paintSampleSchema>;

interface AddPaintSampleModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  surveyId: string;
  functionalAreas: string[];
  editingSample?: PaintSample | null;
}

export function AddPaintSampleModal({
  open,
  onOpenChange,
  surveyId,
  functionalAreas,
  editingSample,
}: AddPaintSampleModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const form = useForm<PaintSampleFormData>({
    resolver: zodResolver(paintSampleSchema),
    defaultValues: {
      functionalArea: "",
      sampleNumber: "",
      sampleDescription: "",
      sampleLocation: "",
      substrate: "",
      substrateOther: "",
      collectionMethod: "",
      leadResultMgKg: "",
      cadmiumResultMgKg: "",
      latitude: "",
      longitude: "",
      notes: "",
    },
  });

  useEffect(() => {
    if (editingSample) {
      form.reset({
        functionalArea: editingSample.functionalArea,
        sampleNumber: editingSample.sampleNumber,
        sampleDescription: editingSample.sampleDescription || "",
        sampleLocation: editingSample.sampleLocation || "",
        substrate: editingSample.substrate || "",
        substrateOther: editingSample.substrateOther || "",
        collectionMethod: editingSample.collectionMethod || "",
        leadResultMgKg: editingSample.leadResultMgKg || "",
        cadmiumResultMgKg: editingSample.cadmiumResultMgKg || "",
        latitude: editingSample.latitude || "",
        longitude: editingSample.longitude || "",
        notes: editingSample.notes || "",
      });
    } else {
      form.reset({
        functionalArea: "",
        sampleNumber: "",
        sampleDescription: "",
        sampleLocation: "",
        substrate: "",
        substrateOther: "",
        collectionMethod: "",
        leadResultMgKg: "",
        cadmiumResultMgKg: "",
        latitude: "",
        longitude: "",
        notes: "",
      });
    }
    setSelectedFiles([]);
  }, [editingSample, form, open]);

  const { data: photoLibrary = [] } = useQuery<PaintSamplePhoto[]>({
    queryKey: ["/api/paint-samples", editingSample?.id, "photos"],
    enabled: !!editingSample?.id,
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/paint-samples/${editingSample?.id}/photos`);
      return response.json();
    },
  });

  const deletePhotoMutation = useMutation({
    mutationFn: async (photoId: string) => {
      await apiRequest("DELETE", `/api/paint-samples/photos/${photoId}`);
    },
    onSuccess: () => {
      if (editingSample?.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/paint-samples", editingSample.id, "photos"] });
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
    mutationFn: async (data: PaintSampleFormData) => {
      const response = await apiRequest("POST", `/api/surveys/${surveyId}/paint-samples`, data);
      return response.json();
    },
    onSuccess: async (sample: PaintSample) => {
      if (selectedFiles.length) {
        const formData = new FormData();
        selectedFiles.forEach((file) => formData.append("photos", file));
        await apiRequest("POST", `/api/paint-samples/${sample.id}/photos`, formData);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/surveys", surveyId, "paint-samples"] });
      onOpenChange(false);
      toast({ title: "Paint sample saved" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save paint sample",
        variant: "destructive",
      });
    },
  });

  const updateSampleMutation = useMutation({
    mutationFn: async (data: PaintSampleFormData) => {
      if (!editingSample?.id) throw new Error("Missing sample id");
      const response = await apiRequest("PUT", `/api/paint-samples/${editingSample.id}`, data);
      return response.json();
    },
    onSuccess: async (sample: PaintSample) => {
      if (selectedFiles.length) {
        const formData = new FormData();
        selectedFiles.forEach((file) => formData.append("photos", file));
        await apiRequest("POST", `/api/paint-samples/${sample.id}/photos`, formData);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/surveys", surveyId, "paint-samples"] });
      queryClient.invalidateQueries({ queryKey: ["/api/paint-samples", sample.id, "photos"] });
      onOpenChange(false);
      toast({ title: "Paint sample updated" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update paint sample",
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

  const onSubmit = (data: PaintSampleFormData) => {
    if (editingSample) {
      updateSampleMutation.mutate(data);
    } else {
      createSampleMutation.mutate(data);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            {editingSample ? "Edit Paint Sample" : "Add Paint Sample"}
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
                  name="sampleNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Sample Number *</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., PS-101" {...field} />
                      </FormControl>
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
                  name="substrate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Substrate</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select substrate" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="wood">Wood</SelectItem>
                          <SelectItem value="metal">Metal</SelectItem>
                          <SelectItem value="concrete">Concrete</SelectItem>
                          <SelectItem value="block">Block</SelectItem>
                          <SelectItem value="brick">Brick</SelectItem>
                          <SelectItem value="other">Other (Fill In)</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormItem>
                  )}
                />
                {form.watch("substrate") === "other" && (
                  <FormField
                    control={form.control}
                    name="substrateOther"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Other Substrate</FormLabel>
                        <FormControl>
                          <Input placeholder="Specify substrate" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                )}
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
                <FormField
                  control={form.control}
                  name="leadResultMgKg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lead Result (mg/kg)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" min="0" placeholder="0.0" {...field} />
                      </FormControl>
                      {field.value && (
                        <div className="text-xs text-gray-500">
                          % by weight: {(parseFloat(field.value || "0") / 10000).toFixed(6)}%
                        </div>
                      )}
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="cadmiumResultMgKg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cadmium Result (mg/kg)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" min="0" placeholder="0.0" {...field} />
                      </FormControl>
                      {field.value && (
                        <div className="text-xs text-gray-500">
                          % by weight: {(parseFloat(field.value || "0") / 10000).toFixed(6)}%
                        </div>
                      )}
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
              <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Notes</h4>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
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
                      id="paint-photo-upload"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => document.getElementById("paint-photo-upload")?.click()}
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
