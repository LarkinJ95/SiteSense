import { useState } from "react";
import { useQuery, useQueries, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AddObservationModal } from "@/components/add-observation-modal";
import { AddAsbestosSampleModal } from "@/components/add-asbestos-sample-modal";
import { AddPaintSampleModal } from "@/components/add-paint-sample-modal";
import { EditSurveyModal } from "@/components/edit-survey-modal";
import { ObservationMap } from "@/components/observation-map";
import { SurveyChecklist } from "@/components/survey-checklist";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import * as XLSX from 'xlsx';
import type { Survey, Observation, ObservationPhoto, AsbestosSample, PaintSample, AsbestosSampleLayer } from "@shared/schema";
import { 
  FileText, 
  Plus, 
  Search, 
  Camera, 
  MapPin, 
  Edit, 
  Trash2,
  AlertTriangle,
  FileDown,
  Download,
  Loader2,
  CheckSquare
} from "lucide-react";

export default function SurveyDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingObservation, setEditingObservation] = useState<Observation | null>(null);
  const [showAsbestosModal, setShowAsbestosModal] = useState(false);
  const [editingAsbestosSample, setEditingAsbestosSample] = useState<AsbestosSample | null>(null);
  const [showPaintModal, setShowPaintModal] = useState(false);
  const [editingPaintSample, setEditingPaintSample] = useState<PaintSample | null>(null);
  const [editSurvey, setEditSurvey] = useState<Survey | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [homogeneousAreaForm, setHomogeneousAreaForm] = useState({
    description: "",
  });
  const [functionalAreaForm, setFunctionalAreaForm] = useState({
    title: "",
    description: "",
    length: "",
    width: "",
    height: "",
    wallCount: "",
    doorCount: "",
    windowCount: "",
    photo: null as File | null,
  });
  const [editingFunctionalAreaId, setEditingFunctionalAreaId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const calcSqft = () => {
    const length = Number(functionalAreaForm.length);
    const width = Number(functionalAreaForm.width);
    if (!Number.isFinite(length) || !Number.isFinite(width)) return "";
    return (length * width).toFixed(2);
  };

  const calcWallSqft = () => {
    const width = Number(functionalAreaForm.width);
    const height = Number(functionalAreaForm.height);
    const walls = Number(functionalAreaForm.wallCount);
    if (!Number.isFinite(width) || !Number.isFinite(height) || !Number.isFinite(walls)) return "";
    return (width * height * walls).toFixed(2);
  };

  const { data: survey, isLoading: surveyLoading } = useQuery<Survey>({
    queryKey: ["/api/surveys", id],
    enabled: !!id,
  });

  const { data: observations = [], isLoading: observationsLoading } = useQuery<Observation[]>({
    queryKey: ["/api/surveys", id, "observations"],
    enabled: !!id,
  });

  const { data: asbestosSamples = [] } = useQuery<AsbestosSample[]>({
    queryKey: ["/api/surveys", id, "asbestos-samples"],
    enabled: !!id,
  });

  const asbestosLayerQueries = useQueries({
    queries: asbestosSamples.map((sample) => ({
      queryKey: ["/api/asbestos-samples", sample.id, "layers"],
      enabled: !!sample.id,
      queryFn: async () => {
        const response = await apiRequest("GET", `/api/asbestos-samples/${sample.id}/layers`);
        return response.json();
      },
    })),
  });

  const asbestosLayersBySampleId = asbestosSamples.reduce((acc, sample, index) => {
    const data = asbestosLayerQueries[index]?.data as AsbestosSampleLayer[] | undefined;
    acc[sample.id] = data || [];
    return acc;
  }, {} as Record<string, AsbestosSampleLayer[]>);

  const { data: paintSamples = [] } = useQuery<PaintSample[]>({
    queryKey: ["/api/surveys", id, "paint-samples"],
    enabled: !!id,
  });

  const { data: homogeneousAreas = [] } = useQuery<any[]>({
    queryKey: ["/api/surveys", id, "homogeneous-areas"],
    enabled: !!id,
  });

  const { data: functionalAreas = [] } = useQuery<any[]>({
    queryKey: ["/api/surveys", id, "functional-areas"],
    enabled: !!id,
  });

  const materialTypeLabels: Record<string, string> = {
    "ceiling-tiles": "Ceiling Tiles",
    "floor-tiles-9x9": '9"x9" Floor Tiles',
    "floor-tiles-12x12": '12"x12" Floor Tiles',
    "pipe-insulation": "Pipe Insulation",
    "duct-insulation": "Duct Insulation",
    "boiler-insulation": "Boiler Insulation",
    "drywall": "Drywall/Joint Compound",
    "paint": "Paint/Coatings",
    "roofing": "Roofing Material",
    "siding": "Siding Material",
    "window-glazing": "Window Glazing",
    "plaster": "Plaster",
    "masonry": "Masonry/Mortar",
    "vinyl-tiles": "Vinyl Floor Tiles",
    "carpet-mastic": "Carpet Mastic",
    "electrical-materials": "Electrical Materials",
    "other": "Other",
  };

  const formatMaterialType = (value?: string | null) => {
    if (!value) return "—";
    return (
      materialTypeLabels[value] ||
      value
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")
    );
  };

  const formatLabel = (value?: string | null) => {
    if (!value) return "—";
    return value
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  };

  const createHomogeneousAreaMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/surveys/${id}/homogeneous-areas`, {
        description: homogeneousAreaForm.description || undefined,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/surveys", id, "homogeneous-areas"] });
      setHomogeneousAreaForm({ description: "" });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add homogeneous area",
        variant: "destructive",
      });
    },
  });

  const deleteHomogeneousAreaMutation = useMutation({
    mutationFn: async (areaId: string) => {
      await apiRequest("DELETE", `/api/surveys/${id}/homogeneous-areas/${areaId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/surveys", id, "homogeneous-areas"] });
    },
  });

  const createFunctionalAreaMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: functionalAreaForm.title,
        description: functionalAreaForm.description || undefined,
        length: functionalAreaForm.length ? Number(functionalAreaForm.length) : undefined,
        width: functionalAreaForm.width ? Number(functionalAreaForm.width) : undefined,
        height: functionalAreaForm.height ? Number(functionalAreaForm.height) : undefined,
        wallCount: functionalAreaForm.wallCount ? Number(functionalAreaForm.wallCount) : undefined,
        doorCount: functionalAreaForm.doorCount ? Number(functionalAreaForm.doorCount) : undefined,
        windowCount: functionalAreaForm.windowCount ? Number(functionalAreaForm.windowCount) : undefined,
      };
      const response = await apiRequest("POST", `/api/surveys/${id}/functional-areas`, payload);
      return response.json();
    },
    onSuccess: async (area) => {
      if (functionalAreaForm.photo) {
        const formData = new FormData();
        formData.append("photo", functionalAreaForm.photo);
        await apiRequest("POST", `/api/surveys/${id}/functional-areas/${area.id}/photo`, formData);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/surveys", id, "functional-areas"] });
      setFunctionalAreaForm({
        title: "",
        description: "",
        length: "",
        width: "",
        height: "",
        wallCount: "",
        doorCount: "",
        windowCount: "",
        photo: null,
      });
      setEditingFunctionalAreaId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add functional area",
        variant: "destructive",
      });
    },
  });

  const updateFunctionalAreaMutation = useMutation({
    mutationFn: async () => {
      if (!editingFunctionalAreaId) {
        throw new Error("No functional area selected");
      }
      const payload = {
        title: functionalAreaForm.title,
        description: functionalAreaForm.description || undefined,
        length: functionalAreaForm.length ? Number(functionalAreaForm.length) : undefined,
        width: functionalAreaForm.width ? Number(functionalAreaForm.width) : undefined,
        height: functionalAreaForm.height ? Number(functionalAreaForm.height) : undefined,
        wallCount: functionalAreaForm.wallCount ? Number(functionalAreaForm.wallCount) : undefined,
        doorCount: functionalAreaForm.doorCount ? Number(functionalAreaForm.doorCount) : undefined,
        windowCount: functionalAreaForm.windowCount ? Number(functionalAreaForm.windowCount) : undefined,
      };
      const response = await apiRequest("PUT", `/api/surveys/${id}/functional-areas/${editingFunctionalAreaId}`, payload);
      return response.json();
    },
    onSuccess: async (area) => {
      if (functionalAreaForm.photo) {
        const formData = new FormData();
        formData.append("photo", functionalAreaForm.photo);
        await apiRequest("POST", `/api/surveys/${id}/functional-areas/${area.id}/photo`, formData);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/surveys", id, "functional-areas"] });
      setFunctionalAreaForm({
        title: "",
        description: "",
        length: "",
        width: "",
        height: "",
        wallCount: "",
        doorCount: "",
        windowCount: "",
        photo: null,
      });
      setEditingFunctionalAreaId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update functional area",
        variant: "destructive",
      });
    },
  });

  const deleteFunctionalAreaMutation = useMutation({
    mutationFn: async (areaId: string) => {
      await apiRequest("DELETE", `/api/surveys/${id}/functional-areas/${areaId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/surveys", id, "functional-areas"] });
    },
  });

  const deleteObservationMutation = useMutation({
    mutationFn: async (observationId: string) => {
      await apiRequest("DELETE", `/api/observations/${observationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/surveys", id, "observations"] });
      toast({
        title: "Observation Deleted",
        description: "The observation has been removed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete observation",
        variant: "destructive",
      });
    },
  });

  const deleteAsbestosSampleMutation = useMutation({
    mutationFn: async (sampleId: string) => {
      await apiRequest("DELETE", `/api/asbestos-samples/${sampleId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/surveys", id, "asbestos-samples"] });
      toast({
        title: "Asbestos Sample Deleted",
        description: "The asbestos sample has been removed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete asbestos sample",
        variant: "destructive",
      });
    },
  });

  const deletePaintSampleMutation = useMutation({
    mutationFn: async (sampleId: string) => {
      await apiRequest("DELETE", `/api/paint-samples/${sampleId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/surveys", id, "paint-samples"] });
      toast({
        title: "Paint Sample Deleted",
        description: "The paint sample has been removed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete paint sample",
        variant: "destructive",
      });
    },
  });

  const generateReportMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("GET", `/api/surveys/${id}/report`);
      const htmlContent = await response.text(); // Convert response to text
      return htmlContent;
    },
    onSuccess: (htmlContent) => {
      // Create a blob URL and trigger download
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${survey?.siteName || 'survey'}_report.html`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Report Generated",
        description: "The survey report has been downloaded successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate report",
        variant: "destructive",
      });
    },
  });

  const filteredObservations = observations.filter(observation =>
    observation.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
    observation.materialType.toLowerCase().includes(searchQuery.toLowerCase()) ||
    observation.notes?.toLowerCase().includes(searchQuery.toLowerCase())
  );


  const getRiskBadge = (riskLevel: string | null) => {
    switch (riskLevel) {
      case "high":
        return <Badge className="bg-danger text-white">High Risk</Badge>;
      case "medium":
        return <Badge className="bg-warning text-white">Medium Risk</Badge>;
      case "low":
        return <Badge className="bg-success text-white">Low Risk</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const handleDeleteObservation = (observationId: string) => {
    if (confirm("Are you sure you want to delete this observation?")) {
      deleteObservationMutation.mutate(observationId);
    }
  };

  const handleDeleteAsbestosSample = (sampleId: string) => {
    if (confirm("Are you sure you want to delete this asbestos sample?")) {
      deleteAsbestosSampleMutation.mutate(sampleId);
    }
  };

  const handleDeletePaintSample = (sampleId: string) => {
    if (confirm("Are you sure you want to delete this paint sample?")) {
      deletePaintSampleMutation.mutate(sampleId);
    }
  };

  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();
    const addSheet = (name: string, rows: Array<Array<string | number>>) => {
      const worksheet = XLSX.utils.aoa_to_sheet(rows);
      const columnWidths = rows[0].map((_, colIndex) => {
        const maxLength = Math.max(
          ...rows.map(row => (row[colIndex] ? row[colIndex].toString().length : 0))
        );
        return { wch: Math.min(maxLength + 2, 50) };
      });
      worksheet["!cols"] = columnWidths;
      XLSX.utils.book_append_sheet(workbook, worksheet, name);
    };

    addSheet("Functional Areas", [
      ["FA", "Description", "Length", "Width", "Height", "Wall Count", "Door Count", "Window Count", "Floor SqFt", "Wall SqFt"],
      ...functionalAreas.map((area: any) => [
        area.title,
        area.description || "",
        area.length ?? "",
        area.width ?? "",
        area.height ?? "",
        area.wallCount ?? "",
        area.doorCount ?? "",
        area.windowCount ?? "",
        area.floorSqft ?? "",
        area.wallSqft ?? "",
      ]),
    ]);

    addSheet("Homogeneous Areas", [
      ["HA", "Description", "Sample Count", "Total Qty"],
      ...homogeneousAreas.map((area: any) => [
        area.haId || area.title,
        area.description || "",
        area.sampleCount || 0,
        area.totalQuantity || 0,
      ]),
    ]);

    addSheet("Asbestos Samples", [
      ["Sample #", "FA", "HA", "Material Type", "Description", "Location", "Est Qty", "Unit", "Condition", "Collection Method", "Asbestos Type", "Asbestos %", "Results", "Notes"],
      ...asbestosSamples.map((sample) => [
        sample.sampleNumber,
        sample.functionalArea,
        sample.homogeneousArea,
        sample.materialType,
        sample.sampleDescription || "",
        sample.sampleLocation || "",
        sample.estimatedQuantity || "",
        sample.quantityUnit || "",
        sample.condition || "",
        sample.collectionMethod || "",
        sample.asbestosType || "",
        sample.asbestosPercent || "",
        sample.results || "",
        sample.notes || "",
      ]),
    ]);

    addSheet("Paint Samples", [
      ["Sample #", "FA", "Substrate", "Description", "Location", "Collection Method", "Lead (mg/kg)", "Cadmium (mg/kg)", "Latitude", "Longitude", "Notes"],
      ...paintSamples.map((sample) => [
        sample.sampleNumber,
        sample.functionalArea,
        sample.substrate === "other" ? (sample.substrateOther || "Other") : (sample.substrate || ""),
        sample.sampleDescription || "",
        sample.sampleLocation || "",
        sample.collectionMethod || "",
        sample.leadResultMgKg || "",
        sample.cadmiumResultMgKg || "",
        sample.latitude || "",
        sample.longitude || "",
        sample.notes || "",
      ]),
    ]);

    addSheet("Observations", [
      ["Area/Location", "Material Type", "Condition", "Quantity", "Risk Level", "Sample Collected", "Sample ID", "GPS Latitude", "GPS Longitude", "Notes"],
      ...observations.map(obs => [
        obs.area,
        obs.materialType,
        obs.condition,
        obs.quantity || "",
        obs.riskLevel || "",
        obs.sampleCollected ? "Yes" : "No",
        obs.sampleId || "",
        obs.latitude || "",
        obs.longitude || "",
        obs.notes || "",
      ]),
    ]);

    XLSX.writeFile(workbook, `${survey?.siteName || "survey"}_export.xlsx`);
    
    toast({
      title: "Excel Export Complete",
      description: "Survey data has been exported to Excel successfully.",
    });
  };

  const exportToCSV = () => {
    const csvData = [
      ['Area/Location', 'Material Type', 'Condition', 'Quantity', 'Risk Level', 'Sample Collected', 'Sample ID', 'GPS Latitude', 'GPS Longitude', 'Notes'],
      ...observations.map(obs => [
        obs.area,
        obs.materialType,
        obs.condition,
        obs.quantity || '',
        obs.riskLevel || '',
        obs.sampleCollected ? 'Yes' : 'No',
        obs.sampleId || '',
        obs.latitude || '',
        obs.longitude || '',
        obs.notes || ''
      ])
    ];

    const csvContent = csvData.map(row => 
      row.map(field => `"${field.toString().replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${survey?.siteName || 'survey'}_observations.csv`;
    link.click();
    
    toast({
      title: "CSV Export Complete",
      description: "Observations have been exported to CSV successfully.",
    });
  };

  if (!id) {
    setLocation("/");
    return null;
  }

  if (surveyLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!survey) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Survey Not Found</h2>
        <p className="mt-2 text-gray-600 dark:text-gray-400">The requested survey could not be found.</p>
        <Button onClick={() => setLocation("/")} className="mt-4">
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const surveyProgress = {
    observations: observations.length,
    samples: observations.filter(obs => obs.sampleCollected).length,
    hazards: observations.filter(obs => obs.riskLevel === "high").length,
    photos: 0, // This would need to be calculated from photos
  };

  return (
    <div className="space-y-6">
      {/* Survey Header */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100" data-testid="text-site-name">
                {survey.siteName}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1" data-testid="text-address">
                {survey.address || "No address provided"}
              </p>
              {survey.jobNumber && (
                <p className="text-gray-600 dark:text-gray-400 font-medium mt-1" data-testid="text-job-number">
                  Job #{survey.jobNumber}
                </p>
              )}
              <div className="flex items-center space-x-4 mt-3">
                <Badge className="bg-primary text-white" data-testid="badge-survey-type">
                  {survey.surveyType}
                </Badge>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Inspector: <span className="font-medium" data-testid="text-inspector">{survey.inspector}</span>
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  Date: <span className="font-medium" data-testid="text-date">
                    {new Date(survey.surveyDate).toLocaleDateString()}
                  </span>
                </span>
              </div>
              {survey.sitePhotoUrl && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Site Photo</h4>
                  <img 
                    src={survey.sitePhotoUrl} 
                    alt={`Site photo for ${survey.siteName}`} 
                    className="w-full max-w-md h-48 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                  />
                </div>
              )}
            </div>
            <div className="mt-4 md:mt-0 flex flex-wrap gap-2 md:pl-6">
              <Button
                variant="outline"
                size="sm"
                onClick={exportToExcel}
                data-testid="button-export-excel"
              >
                <Download className="mr-2 h-4 w-4" />
                Export Excel
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={exportToCSV}
                data-testid="button-export-csv"
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setEditSurvey(survey)}
                data-testid="button-edit-survey"
              >
                <Edit className="mr-2 h-4 w-4" />
                Edit Survey
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => generateReportMutation.mutate()}
                disabled={generateReportMutation.isPending}
                data-testid="button-generate-report"
              >
                <FileText className="mr-2 h-4 w-4" />
                {generateReportMutation.isPending ? "Generating..." : "Generate Report"}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    className="bg-success hover:bg-green-700"
                    data-testid="button-add-observation-menu"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Observation
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShowAddModal(true)}>
                    Add Observation
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowAsbestosModal(true)}>
                    Add Asbestos Sample
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowPaintModal(true)}>
                    Add Paint Sample
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button 
                onClick={() => setShowAsbestosModal(true)}
                className="bg-success hover:bg-green-700"
                data-testid="button-add-asbestos-sample-top"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Asbestos Sample
              </Button>
              <Button 
                onClick={() => setShowPaintModal(true)}
                className="bg-success hover:bg-green-700"
                data-testid="button-add-paint-sample-top"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Paint Sample
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Survey Progress */}
      <Card>
        <CardHeader>
          <CardTitle data-testid="title-survey-progress">Survey Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary" data-testid="stat-observations">
                {surveyProgress.observations}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Observations</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-success" data-testid="stat-samples">
                {surveyProgress.samples}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Samples Collected</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-warning" data-testid="stat-hazards">
                {surveyProgress.hazards}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Hazards Identified</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100" data-testid="stat-photos">
                {surveyProgress.photos}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Photos Taken</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Functional Areas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-4">
              <Input
                placeholder="Functional area title"
                value={functionalAreaForm.title}
                onChange={(e) => setFunctionalAreaForm(prev => ({ ...prev, title: e.target.value }))}
                data-testid="input-functional-area-title"
              />
              <Input
                placeholder="Description"
                value={functionalAreaForm.description}
                onChange={(e) => setFunctionalAreaForm(prev => ({ ...prev, description: e.target.value }))}
                data-testid="input-functional-area-description"
              />
              <Input
                placeholder="Length"
                type="number"
                value={functionalAreaForm.length}
                onChange={(e) => setFunctionalAreaForm(prev => ({ ...prev, length: e.target.value }))}
                data-testid="input-functional-area-length"
              />
              <Input
                placeholder="Width"
                type="number"
                value={functionalAreaForm.width}
                onChange={(e) => setFunctionalAreaForm(prev => ({ ...prev, width: e.target.value }))}
                data-testid="input-functional-area-width"
              />
              <Input
                placeholder="Height"
                type="number"
                value={functionalAreaForm.height}
                onChange={(e) => setFunctionalAreaForm(prev => ({ ...prev, height: e.target.value }))}
                data-testid="input-functional-area-height"
              />
              <Input
                placeholder="# Walls"
                type="number"
                step="1"
                min="0"
                value={functionalAreaForm.wallCount}
                onChange={(e) => setFunctionalAreaForm(prev => ({ ...prev, wallCount: e.target.value }))}
                data-testid="input-functional-area-walls"
              />
              <Input
                placeholder="# Doors"
                type="number"
                step="1"
                min="0"
                value={functionalAreaForm.doorCount}
                onChange={(e) => setFunctionalAreaForm(prev => ({ ...prev, doorCount: e.target.value }))}
                data-testid="input-functional-area-doors"
              />
              <Input
                placeholder="# Windows"
                type="number"
                step="1"
                min="0"
                value={functionalAreaForm.windowCount}
                onChange={(e) => setFunctionalAreaForm(prev => ({ ...prev, windowCount: e.target.value }))}
                data-testid="input-functional-area-windows"
              />
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setFunctionalAreaForm(prev => ({ ...prev, photo: e.target.files?.[0] || null }))}
                data-testid="input-functional-area-photo"
              />
              <div className="text-sm text-gray-600">
                SqFt (L x W): <strong>{calcSqft() || "-"}</strong>
              </div>
              <div className="text-sm text-gray-600">
                Wall SqFt (W x H x Walls): <strong>{calcWallSqft() || "-"}</strong>
              </div>
              <Button
                onClick={() => {
                  if (editingFunctionalAreaId) {
                    updateFunctionalAreaMutation.mutate();
                  } else {
                    createFunctionalAreaMutation.mutate();
                  }
                }}
                disabled={
                  !functionalAreaForm.title ||
                  createFunctionalAreaMutation.isPending ||
                  updateFunctionalAreaMutation.isPending
                }
                data-testid="button-add-functional-area"
              >
                {editingFunctionalAreaId ? "Save Changes" : "Add"}
              </Button>
              {editingFunctionalAreaId && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingFunctionalAreaId(null);
                    setFunctionalAreaForm({
                      title: "",
                      description: "",
                      length: "",
                      width: "",
                      height: "",
                      wallCount: "",
                      doorCount: "",
                      windowCount: "",
                      photo: null,
                    });
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
            {functionalAreas.length === 0 ? (
              <div className="text-sm text-gray-500">No functional areas defined yet.</div>
            ) : (
              <div className="space-y-2">
                {functionalAreas.map((area: any) => (
                  <div key={area.id} className="flex items-center justify-between border rounded-lg px-3 py-2">
                    <div>
                      <div className="text-sm font-medium">{area.title}</div>
                      {area.description && (
                        <div className="text-xs text-gray-500">{area.description}</div>
                      )}
                      <div className="text-xs text-gray-500">
                        {area.length ? `L: ${area.length}` : ""} {area.width ? ` W: ${area.width}` : ""} {area.height ? ` H: ${area.height}` : ""}
                        {area.wallCount ? ` • Walls: ${area.wallCount}` : ""}
                        {area.doorCount ? ` • Doors: ${area.doorCount}` : ""}
                        {area.windowCount ? ` • Windows: ${area.windowCount}` : ""}
                        {area.sqft ? ` • SqFt: ${area.sqft}` : ""}
                        {area.wallSqft ? ` • Wall SqFt: ${area.wallSqft}` : ""}
                      </div>
                      {area.photoUrl && (
                        <div className="mt-2">
                          <img src={area.photoUrl} alt={area.title} className="h-16 w-24 object-cover rounded" />
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingFunctionalAreaId(area.id);
                          setFunctionalAreaForm({
                            title: area.title || "",
                            description: area.description || "",
                            length: area.length ? String(area.length) : "",
                            width: area.width ? String(area.width) : "",
                            height: area.height ? String(area.height) : "",
                            wallCount: area.wallCount ? String(area.wallCount) : "",
                            doorCount: area.doorCount ? String(area.doorCount) : "",
                            windowCount: area.windowCount ? String(area.windowCount) : "",
                            photo: null,
                          });
                        }}
                        data-testid={`button-edit-functional-${area.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteFunctionalAreaMutation.mutate(area.id)}
                        data-testid={`button-delete-functional-${area.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Homogeneous Areas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-2 mb-4">
              <Input
                placeholder="HA Description (optional)"
                value={homogeneousAreaForm.description}
                onChange={(e) => setHomogeneousAreaForm({ description: e.target.value })}
                data-testid="input-homogeneous-area-description"
              />
              <Button
                onClick={() => createHomogeneousAreaMutation.mutate()}
                disabled={createHomogeneousAreaMutation.isPending}
                data-testid="button-add-homogeneous-area"
              >
                Add Homogeneous Area
              </Button>
            </div>
            {homogeneousAreas.length === 0 ? (
              <div className="text-sm text-gray-500">No homogeneous areas defined yet.</div>
            ) : (
              <div className="space-y-2">
                {homogeneousAreas.map((area: any) => (
                  <div key={area.id} className="flex items-center justify-between border rounded-lg px-3 py-2">
                    <div>
                      <div className="text-sm font-medium">{area.haId || area.title}</div>
                      {area.description && (
                        <div className="text-xs text-gray-500">{area.description}</div>
                      )}
                      <div className="text-xs text-gray-500">
                        Samples: {area.sampleCount || 0} · Total Qty: {area.totalQuantity || 0}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteHomogeneousAreaMutation.mutate(area.id)}
                      data-testid={`button-delete-homogeneous-${area.id}`}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Asbestos Samples */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle data-testid="title-asbestos-samples">Asbestos Samples</CardTitle>
            <Button
              onClick={() => setShowAsbestosModal(true)}
              className="bg-success hover:bg-green-700"
              data-testid="button-add-asbestos-sample"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Asbestos Sample
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {asbestosSamples.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-500">
              No asbestos samples yet.
            </div>
          ) : (
            <div className="space-y-3">
              {asbestosSamples.map((sample) => (
                <div
                  key={sample.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-sm transition-shadow"
                >
                  {(() => {
                    const layers = asbestosLayersBySampleId[sample.id] || [];
                    const layerSummary = layers.length
                      ? layers
                          .map((layer) => {
                            const material = formatMaterialType(layer.materialType || sample.materialType);
                            const type = formatLabel(layer.asbestosType);
                            const percent = layer.asbestosPercent ? `${layer.asbestosPercent}%` : "—";
                            return `L${layer.layerNumber}: ${material} · ${type} · ${percent}`;
                          })
                          .join(" | ")
                      : "—";
                    return (
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="text-sm text-gray-500">Sample</div>
                          <div className="text-lg font-medium text-gray-900 dark:text-gray-100">
                            {sample.sampleNumber}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            FA: {sample.functionalArea} · HA: {sample.homogeneousArea}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Material: {formatMaterialType(sample.materialType)} · Condition: {sample.condition || "—"}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Est Qty: {sample.estimatedQuantity || "—"} {sample.quantityUnit || ""}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Layers: {layers.length || 0}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            Layer Summary: {layerSummary}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingAsbestosSample(sample)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteAsbestosSample(sample.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Paint Samples */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle data-testid="title-paint-samples">Paint Samples</CardTitle>
            <Button
              onClick={() => setShowPaintModal(true)}
              className="bg-success hover:bg-green-700"
              data-testid="button-add-paint-sample"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Paint Sample
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {paintSamples.length === 0 ? (
            <div className="text-center py-8 text-sm text-gray-500">
              No paint samples yet.
            </div>
          ) : (
            <div className="space-y-3">
              {paintSamples.map((sample) => (
                <div
                  key={sample.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-sm transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="text-sm text-gray-500">Sample</div>
                      <div className="text-lg font-medium text-gray-900 dark:text-gray-100">
                        {sample.sampleNumber}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        FA: {sample.functionalArea}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Lead: {sample.leadResultMgKg || "—"} · Cadmium: {sample.cadmiumResultMgKg || "—"}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingPaintSample(sample)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeletePaintSample(sample.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Observations List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle data-testid="title-observations">Observations</CardTitle>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Input
                  placeholder="Search observations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2"
                  data-testid="input-search-observations"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="text-gray-400 h-4 w-4" />
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {observationsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
          ) : filteredObservations.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">
                {searchQuery ? "No observations found" : "No observations yet"}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {searchQuery 
                  ? "Try adjusting your search terms." 
                  : "Start by adding your first observation to this survey."
                }
              </p>
              {!searchQuery && (
                <div className="mt-6">
                  <Button onClick={() => setShowAddModal(true)} data-testid="button-add-first-observation">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Observation
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredObservations.map((observation) => (
                <div 
                  key={observation.id} 
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-sm transition-shadow"
                  data-testid={`card-observation-${observation.id}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100" data-testid={`text-area-${observation.id}`}>
                          {observation.area}
                        </h4>
                        {observation.riskLevel && getRiskBadge(observation.riskLevel)}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                        <div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Material:</span>
                          <span className="text-sm text-gray-900 dark:text-gray-100 ml-1" data-testid={`text-material-${observation.id}`}>
                            {observation.materialType}
                          </span>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Condition:</span>
                          <span className="text-sm text-gray-900 dark:text-gray-100 ml-1" data-testid={`text-condition-${observation.id}`}>
                            {observation.condition}
                          </span>
                        </div>
                        <div>
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Quantity:</span>
                          <span className="text-sm text-gray-900 dark:text-gray-100 ml-1" data-testid={`text-quantity-${observation.id}`}>
                            {observation.quantity || "Not specified"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center">
                          <Camera className="mr-1 h-4 w-4" />
                          <span data-testid={`text-photos-${observation.id}`}>0 photos</span>
                        </div>
                        {observation.latitude && observation.longitude && (
                          <div className="flex items-center">
                            <MapPin className="mr-1 h-4 w-4" />
                            <span data-testid={`text-gps-${observation.id}`}>
                              GPS: {observation.latitude}, {observation.longitude}
                            </span>
                          </div>
                        )}
                      </div>
                      {observation.notes && (
                        <div className="mt-3">
                          <p className="text-sm text-gray-700 dark:text-gray-300" data-testid={`text-notes-${observation.id}`}>
                            {observation.notes}
                          </p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setEditingObservation(observation)}
                        data-testid={`button-edit-${observation.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleDeleteObservation(observation.id)}
                        data-testid={`button-delete-${observation.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* GPS Map Visualization */}
      <ObservationMap observations={observations} />

      <AddObservationModal 
        open={showAddModal || !!editingObservation} 
        onOpenChange={(open) => {
          setShowAddModal(open);
          if (!open) setEditingObservation(null);
        }}
        surveyId={survey.id}
        editingObservation={editingObservation}
        homogeneousAreas={homogeneousAreas.map((area: any) => area.title)}
        functionalAreas={functionalAreas.map((area: any) => area.title)}
      />

      <AddAsbestosSampleModal
        open={showAsbestosModal || !!editingAsbestosSample}
        onOpenChange={(open) => {
          setShowAsbestosModal(open);
          if (!open) setEditingAsbestosSample(null);
        }}
        surveyId={survey.id}
        editingSample={editingAsbestosSample}
        homogeneousAreas={homogeneousAreas}
        functionalAreas={functionalAreas.map((area: any) => area.title)}
      />

      <AddPaintSampleModal
        open={showPaintModal || !!editingPaintSample}
        onOpenChange={(open) => {
          setShowPaintModal(open);
          if (!open) setEditingPaintSample(null);
        }}
        surveyId={survey.id}
        editingSample={editingPaintSample}
        functionalAreas={functionalAreas.map((area: any) => area.title)}
      />
      
      <EditSurveyModal 
        survey={editSurvey}
        open={!!editSurvey} 
        onOpenChange={(open) => !open && setEditSurvey(null)}
      />
    </div>
  );
}
