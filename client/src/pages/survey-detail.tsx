import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { AddObservationModal } from "@/components/add-observation-modal";
import { EditSurveyModal } from "@/components/edit-survey-modal";
import { ObservationMap } from "@/components/observation-map";
import { SurveyChecklist } from "@/components/survey-checklist";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import * as XLSX from 'xlsx';
import type { Survey, Observation, ObservationPhoto } from "@shared/schema";
import { 
  FileText, 
  Plus, 
  Search, 
  Camera, 
  TestTubeDiagonal, 
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
  const [editSurvey, setEditSurvey] = useState<Survey | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: survey, isLoading: surveyLoading } = useQuery<Survey>({
    queryKey: ["/api/surveys", id],
    enabled: !!id,
  });

  const { data: observations = [], isLoading: observationsLoading } = useQuery<Observation[]>({
    queryKey: ["/api/surveys", id, "observations"],
    enabled: !!id,
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

  const exportToExcel = () => {
    const worksheetData = [
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

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Observations');

    // Auto-size columns
    const columnWidths = worksheetData[0].map((_, colIndex) => {
      const maxLength = Math.max(
        ...worksheetData.map(row => (row[colIndex] ? row[colIndex].toString().length : 0))
      );
      return { wch: Math.min(maxLength + 2, 50) };
    });
    worksheet['!cols'] = columnWidths;

    XLSX.writeFile(workbook, `${survey?.siteName || 'survey'}_observations.xlsx`);
    
    toast({
      title: "Excel Export Complete",
      description: "Observations have been exported to Excel successfully.",
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
            <div className="mt-4 md:mt-0 flex flex-wrap gap-2">
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
              <Button 
                onClick={() => setShowAddModal(true)}
                className="bg-success hover:bg-green-700"
                data-testid="button-add-observation"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Observation
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
              <Button 
                onClick={() => setShowAddModal(true)}
                className="bg-success hover:bg-green-700"
                data-testid="button-add-observation-header"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Observation
              </Button>
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
                        <div className="flex items-center">
                          <TestTubeDiagonal className="mr-1 h-4 w-4" />
                          <span 
                            className={observation.sampleCollected ? "text-success" : "text-gray-500"}
                            data-testid={`text-sample-status-${observation.id}`}
                          >
                            {observation.sampleCollected ? "Sample collected" : "No sample"}
                          </span>
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
      />
      
      <EditSurveyModal 
        survey={editSurvey}
        open={!!editSurvey} 
        onOpenChange={(open) => !open && setEditSurvey(null)}
      />
    </div>
  );
}
