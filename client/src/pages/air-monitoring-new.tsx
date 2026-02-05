import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, MapPin, Calendar, Users, FileText, Wind, CloudSun, Clock, Beaker, Trash2, Edit, Download, Settings } from "lucide-react";
import { CreateAirJobModal } from "@/components/create-air-job-modal";
import { CreatePersonnelModal } from "@/components/create-personnel-modal";
import { DailyWeatherLog } from "@/components/daily-weather-log";
import { apiRequest } from "@/lib/queryClient";
import { AirSample, PersonnelProfile, AirMonitoringJob, FieldToolsEquipment, insertAirSampleSchema, type InsertAirSample } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Air sample form schema
const airSampleFormSchema = insertAirSampleSchema.extend({
  sampleDate: z.string(),
  startTime: z.string(),
  endTime: z.string().optional(),
  customSampleType: z.string().optional(),
  customAnalyte: z.string().optional(),
  // Extend for form handling
  result: z.string().optional(),
  resultUnit: z.string().optional(),
  uncertainty: z.string().optional(),
  regulatoryLimit: z.string().optional(),
  labReportDate: z.string().optional(),
});

type AirSampleFormData = z.infer<typeof airSampleFormSchema>;

const editJobSchema = z.object({
  jobName: z.string().min(1),
  jobNumber: z.string().min(1),
  siteName: z.string().min(1),
  address: z.string().min(1),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  clientName: z.string().optional(),
  projectManager: z.string().optional(),
  status: z.string().optional(),
  workDescription: z.string().optional(),
  startDate: z.string().min(1),
  endDate: z.string().optional(),
});

type EditJobFormData = z.infer<typeof editJobSchema>;

// Analyte to analysis method mapping
const analyteMethodMap: Record<string, string> = {
  'asbestos': 'PCM (NIOSH 7400)',
  'lead': 'ICP-AES (NIOSH 7300)',
  'cadmium': 'ICP-AES (NIOSH 7300)',
  'hexavalent_chromium': 'IC (NIOSH 7605)',
  'silica': 'XRD (NIOSH 7500)',
  'heavy_metals': 'ICP-AES (NIOSH 7300)',
  'benzene': 'GC-MS (NIOSH 1501)',
  'toluene': 'GC-FID (NIOSH 1500)',
  'other': ''
};

export default function AirMonitoringPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { id: jobId } = useParams();
  const [, setLocation] = useLocation();
  const [showCreateJobModal, setShowCreateJobModal] = useState(false);
  const [showCreatePersonnelModal, setShowCreatePersonnelModal] = useState(false);
  const [editingSample, setEditingSample] = useState<AirSample | null>(null);
  const [editingJob, setEditingJob] = useState<AirMonitoringJob | null>(null);
  const [selectedJob, setSelectedJob] = useState<AirMonitoringJob | null>(null);
  const [jobDetailsTab, setJobDetailsTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Fetch air monitoring jobs
  const { data: airJobs = [], isLoading: jobsLoading } = useQuery<AirMonitoringJob[]>({
    queryKey: ["/api/air-monitoring-jobs"],
  });

  // Fetch personnel for reference
  const { data: personnel = [] } = useQuery<PersonnelProfile[]>({
    queryKey: ["/api/personnel"],
  });

  const { data: equipmentList = [] } = useQuery<FieldToolsEquipment[]>({
    queryKey: ["/api/field-tools/equipment"],
  });

  // Fetch air samples for selected job
  const { data: airSamples = [] } = useQuery<AirSample[]>({
    queryKey: ["/api/air-samples"],
    enabled: !!selectedJob,
  });

  const editJobForm = useForm<EditJobFormData>({
    resolver: zodResolver(editJobSchema),
    defaultValues: {
      jobName: "",
      jobNumber: "",
      siteName: "",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      clientName: "",
      projectManager: "",
      status: "planning",
      workDescription: "",
      startDate: "",
      endDate: "",
    },
  });

  useEffect(() => {
    if (!editingJob) return;
    editJobForm.reset({
      jobName: editingJob.jobName,
      jobNumber: editingJob.jobNumber,
      siteName: editingJob.siteName,
      address: editingJob.address,
      city: editingJob.city || "",
      state: editingJob.state || "",
      zipCode: editingJob.zipCode || "",
      clientName: editingJob.clientName || "",
      projectManager: editingJob.projectManager || "",
      status: editingJob.status || "planning",
      workDescription: editingJob.workDescription || "",
      startDate: editingJob.startDate ? new Date(editingJob.startDate).toISOString().slice(0, 10) : "",
      endDate: editingJob.endDate ? new Date(editingJob.endDate).toISOString().slice(0, 10) : "",
    });
  }, [editingJob, editJobForm]);

  // Filter samples for the selected job
  const jobSamples = useMemo(() => 
    selectedJob ? airSamples.filter(sample => sample.jobId === selectedJob.id) : [],
    [airSamples, selectedJob]
  );

  // Air sample mutations
  const createSampleMutation = useMutation({
    mutationFn: async ({ data, file }: { data: InsertAirSample; file?: File | null }) => {
      const response = await fetch('/api/air-samples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create sample');
      const created = await response.json();
      if (file && created?.id) {
        const formData = new FormData();
        formData.append("labReport", file);
        await apiRequest("POST", `/api/air-samples/${created.id}/lab-report`, formData);
      }
      return created;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/air-samples'] });
      setJobDetailsTab("samples");
      toast({ description: "Air sample created successfully" });
    },
    onError: (error: any) => {
      toast({ 
        variant: "destructive", 
        description: error.message || "Failed to create air sample" 
      });
    }
  });

  const updateSampleMutation = useMutation({
    mutationFn: async ({ id, data, file }: { id: string; data: InsertAirSample; file?: File | null }) => {
      const response = await fetch(`/api/air-samples/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update sample');
      const updated = await response.json();
      if (file) {
        const formData = new FormData();
        formData.append("labReport", file);
        await apiRequest("POST", `/api/air-samples/${id}/lab-report`, formData);
      }
      return updated;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/air-samples'] });
      setEditingSample(null);
      toast({ description: "Air sample updated successfully" });
    },
    onError: (error: any) => {
      toast({ 
        variant: "destructive", 
        description: error.message || "Failed to update air sample" 
      });
    }
  });

  const deleteSampleMutation = useMutation({
    mutationFn: async (sampleId: string) => {
      const response = await fetch(`/api/air-samples/${sampleId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete sample');
      return response.ok;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/air-samples'] });
      toast({ description: "Air sample deleted successfully" });
    },
    onError: (error: any) => {
      toast({ 
        variant: "destructive", 
        description: error.message || "Failed to delete air sample" 
      });
    }
  });

  const updateJobMutation = useMutation({
    mutationFn: async (data: EditJobFormData) => {
      if (!editingJob) {
        throw new Error("No job selected");
      }
      const payload = {
        ...data,
        startDate: data.startDate ? new Date(`${data.startDate}T00:00:00`).toISOString() : undefined,
        endDate: data.endDate ? new Date(`${data.endDate}T00:00:00`).toISOString() : null,
      };
      const response = await apiRequest("PUT", `/api/air-monitoring-jobs/${editingJob.id}`, payload);
      return response.json();
    },
    onSuccess: (job) => {
      queryClient.invalidateQueries({ queryKey: ["/api/air-monitoring-jobs"] });
      setSelectedJob(job);
      setEditingJob(null);
      toast({ description: "Job updated successfully" });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        description: error.message || "Failed to update job",
      });
    },
  });

  const generateReportMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const response = await fetch(`/api/air-monitoring-jobs/${jobId}/report`, {
        method: 'GET',
      });
      if (!response.ok) throw new Error('Failed to generate report');
      return response.text();
    },
    onSuccess: (htmlContent, jobId) => {
      const job = airJobs.find(j => j.id === jobId);
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `${job?.jobNumber || jobId}_Air_Monitoring_Report.html`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast({ description: "Report downloaded successfully" });
    },
    onError: (error: any) => {
      toast({ 
        variant: "destructive", 
        description: error.message || "Failed to generate report" 
      });
    }
  });

  // Filter jobs based on search and status
  const filteredJobs = airJobs.filter((job) => {
    const matchesSearch = 
      job.jobName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.jobNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.siteName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (job.clientName && job.clientName.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesStatus = statusFilter === "all" || job.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  useEffect(() => {
    if (selectedJob) {
      setJobDetailsTab("overview");
    }
  }, [selectedJob]);

  useEffect(() => {
    if (!jobId) {
      setSelectedJob(null);
      return;
    }
    const job = airJobs.find((item) => item.id === jobId) || null;
    setSelectedJob(job);
  }, [jobId, airJobs]);

  const showJobOverview = !jobId;

  const getStatusColor = (status: string) => {
    switch (status) {
      case "planning": return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "setup": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "sampling": return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
      case "complete": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "lab-analysis": return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "reporting": return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200";
      case "closed": return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (jobsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Air Monitoring</h1>
        </div>
        <div className="text-center py-12">Loading air monitoring jobs...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {showJobOverview && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100" data-testid="page-title">
                Air Monitoring
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage air sampling jobs and track environmental monitoring activities
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => setShowCreatePersonnelModal(true)} variant="outline" data-testid="button-add-personnel">
                <Users className="mr-2 h-4 w-4" />
                Add Personnel
              </Button>
              <Button onClick={() => setShowCreateJobModal(true)} data-testid="button-create-job">
                <Plus className="mr-2 h-4 w-4" />
                New Air Job
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <FileText className="h-8 w-8 text-blue-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Jobs</p>
                    <p className="text-2xl font-bold">{airJobs.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Wind className="h-8 w-8 text-green-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Jobs</p>
                    <p className="text-2xl font-bold">
                      {airJobs.filter(job => ['setup', 'sampling'].includes(job.status)).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Calendar className="h-8 w-8 text-orange-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">This Week</p>
                    <p className="text-2xl font-bold">
                      {airJobs.filter(job => {
                        const jobDate = new Date(job.startDate);
                        const weekAgo = new Date();
                        weekAgo.setDate(weekAgo.getDate() - 7);
                        return jobDate >= weekAgo;
                      }).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-purple-600" />
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Personnel</p>
                    <p className="text-2xl font-bold">{personnel.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by job name, number, site, or client..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="search-input"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]" data-testid="status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="setup">Setup</SelectItem>
                <SelectItem value="sampling">Sampling</SelectItem>
                <SelectItem value="complete">Complete</SelectItem>
                <SelectItem value="lab-analysis">Lab Analysis</SelectItem>
                <SelectItem value="reporting">Reporting</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Jobs Grid */}
          {filteredJobs.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Wind className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                  {airJobs.length === 0 ? "No Air Monitoring Jobs" : "No Jobs Match Your Search"}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {airJobs.length === 0 
                    ? "Start by creating your first air monitoring job to track environmental sampling activities."
                    : "Try adjusting your search terms or filters to find the jobs you're looking for."
                  }
                </p>
                {airJobs.length === 0 && (
                  <Button onClick={() => setShowCreateJobModal(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create First Job
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredJobs.map((job) => (
                <Card key={job.id} className="hover:shadow-md transition-shadow cursor-pointer" data-testid={`job-card-${job.id}`}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{job.jobName}</CardTitle>
                        <CardDescription className="mt-1">
                          Job #{job.jobNumber} • {job.siteName}
                        </CardDescription>
                      </div>
                      <Badge className={getStatusColor(job.status)}>
                        {job.status.replace('-', ' ')}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent onClick={() => setLocation(`/air-monitoring/${job.id}`)}>
                    <div className="space-y-3">
                      {job.clientName && (
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                          <Users className="h-4 w-4 mr-2" />
                          {job.clientName}
                        </div>
                      )}
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <MapPin className="h-4 w-4 mr-2" />
                        {job.city && job.state ? `${job.city}, ${job.state}` : 'Location TBD'}
                      </div>
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <Calendar className="h-4 w-4 mr-2" />
                        {formatDate(job.startDate)}
                        {job.endDate && ` - ${formatDate(job.endDate)}`}
                      </div>
                      {job.weatherConditions && (
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                          <Wind className="h-4 w-4 mr-2" />
                          {job.weatherConditions}
                        </div>
                      )}
                      {job.projectManager && (
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          PM: {job.projectManager}
                        </div>
                      )}
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => setLocation(`/air-monitoring/${job.id}`)}
                      >
                        View Details & Samples
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <CreateAirJobModal 
        open={showCreateJobModal} 
        onOpenChange={setShowCreateJobModal}
      />
      <CreatePersonnelModal 
        open={showCreatePersonnelModal} 
        onOpenChange={setShowCreatePersonnelModal}
      />

      {/* Job Details */}
      {selectedJob && (
        <div
          className={
            jobId
              ? "w-full"
              : "fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
          }
        >
          <div
            className={
              jobId
                ? "bg-white dark:bg-gray-800 rounded-lg w-full"
                : "bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
            }
          >
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold">{selectedJob.jobName}</h2>
                  <p className="text-gray-600 dark:text-gray-400">Job #{selectedJob.jobNumber}</p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => generateReportMutation.mutate(selectedJob.id)}
                    disabled={generateReportMutation.isPending}
                    data-testid="button-generate-report"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {generateReportMutation.isPending ? 'Generating...' : 'Generate Report'}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setEditingJob(selectedJob)}
                    data-testid="button-edit-job"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Edit Job
                  </Button>
                  {jobId ? (
                    <Button variant="outline" onClick={() => setLocation("/air-monitoring")}>
                      Back to Air Jobs
                    </Button>
                  ) : (
                    <Button variant="outline" onClick={() => setSelectedJob(null)}>
                      Close
                    </Button>
                  )}
                </div>
              </div>
              
              <Tabs value={jobDetailsTab} onValueChange={setJobDetailsTab} className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="samples">Air Samples</TabsTrigger>
                  <TabsTrigger value="add-sample">Add Sample</TabsTrigger>
                  <TabsTrigger value="weather">
                    <CloudSun className="mr-2 h-4 w-4" />
                    Weather Logs
                  </TabsTrigger>
                  <TabsTrigger value="conditions">Conditions</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold">Site Information</h4>
                      <p>{selectedJob.siteName}</p>
                      <p>{selectedJob.address}</p>
                      {selectedJob.city && selectedJob.state && (
                        <p>{selectedJob.city}, {selectedJob.state} {selectedJob.zipCode}</p>
                      )}
                    </div>
                    <div>
                      <h4 className="font-semibold">Job Details</h4>
                      {selectedJob.clientName && <p>Client: {selectedJob.clientName}</p>}
                      {selectedJob.projectManager && <p>PM: {selectedJob.projectManager}</p>}
                      <p>Status: <Badge className={getStatusColor(selectedJob.status)}>{selectedJob.status}</Badge></p>
                    </div>
                  </div>
                  {selectedJob.workDescription && (
                    <div>
                      <h4 className="font-semibold">Work Description</h4>
                      <p className="text-gray-600 dark:text-gray-400">{selectedJob.workDescription}</p>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="samples" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold">Air Samples ({jobSamples.length})</h4>
                    <Button size="sm" onClick={() => setJobDetailsTab("add-sample")}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Sample
                    </Button>
                  </div>
                  
                  {jobSamples.length === 0 ? (
                    <div className="text-center py-8">
                      <Beaker className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                        No Air Samples
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        Start by adding air samples for this monitoring job.
                      </p>
                      <Button onClick={() => setJobDetailsTab("add-sample")}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add First Sample
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {jobSamples.map((sample) => (
                        <Card key={sample.id} className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">{sample.sampleType}</Badge>
                                <Badge variant="outline">{sample.analyte}</Badge>
                                <Badge className={sample.status === 'collected' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                                  {sample.status}
                                </Badge>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                                <div>
                                  <p className="font-medium">Location</p>
                                  <p className="text-gray-600 dark:text-gray-400">{sample.location || 'Not specified'}</p>
                                </div>
                                <div>
                                  <p className="font-medium">Collected By</p>
                                  <p className="text-gray-600 dark:text-gray-400">{sample.collectedBy}</p>
                                </div>
                                {sample.monitorWornBy && sample.monitorWornBy !== 'N/A' && (
                                  <div>
                                    <p className="font-medium">Monitor Worn By</p>
                                    <p className="text-gray-600 dark:text-gray-400">{sample.monitorWornBy}</p>
                                  </div>
                                )}
                                <div>
                                  <p className="font-medium">Duration</p>
                                  <p className="text-gray-600 dark:text-gray-400">{sample.samplingDuration || 0} minutes</p>
                                </div>
                                <div>
                                  <p className="font-medium">Flow Rate</p>
                                  <p className="text-gray-600 dark:text-gray-400">{sample.flowRate || 0} L/min</p>
                                </div>
                              </div>
                              {sample.fieldNotes && (
                                <div>
                                  <p className="font-medium text-sm">Notes</p>
                                  <p className="text-sm text-gray-600 dark:text-gray-400">{sample.fieldNotes}</p>
                                </div>
                              )}
                              <div className="flex items-center text-sm text-gray-500">
                                <Clock className="h-4 w-4 mr-1" />
                                {new Date(sample.startTime).toLocaleString()}
                                {sample.endTime && ` - ${new Date(sample.endTime).toLocaleString()}`}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setEditingSample(sample)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteSampleMutation.mutate(sample.id)}
                                disabled={deleteSampleMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="add-sample" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold">Add Air Sample</h4>
                  </div>
                  <Card className="p-4">
                    <AirSampleForm 
                      jobId={selectedJob.id}
                      personnel={personnel}
                      equipmentList={equipmentList}
                      onSuccess={() => setJobDetailsTab("samples")}
                      onSubmit={(data, file) => createSampleMutation.mutate({ data, file })}
                      isLoading={createSampleMutation.isPending}
                    />
                  </Card>
                </TabsContent>
                
                <TabsContent value="weather">
                  <DailyWeatherLog jobId={selectedJob.id} />
                </TabsContent>
                
                <TabsContent value="conditions" className="space-y-4">
                  {selectedJob.weatherConditions && (
                    <div>
                      <h4 className="font-semibold">Weather Conditions</h4>
                      <p>{selectedJob.weatherConditions}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    {selectedJob.temperature && (
                      <div>
                        <h5 className="font-medium">Temperature</h5>
                        <p>{selectedJob.temperature}°C</p>
                      </div>
                    )}
                    {selectedJob.humidity && (
                      <div>
                        <h5 className="font-medium">Humidity</h5>
                        <p>{selectedJob.humidity}%</p>
                      </div>
                    )}
                    {selectedJob.barometricPressure && (
                      <div>
                        <h5 className="font-medium">Pressure</h5>
                        <p>{selectedJob.barometricPressure} kPa</p>
                      </div>
                    )}
                    {selectedJob.windSpeed && (
                      <div>
                        <h5 className="font-medium">Wind Speed</h5>
                        <p>{selectedJob.windSpeed} m/s {selectedJob.windDirection}</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>
      )}

      {editingJob && (
        <Dialog open={!!editingJob} onOpenChange={() => setEditingJob(null)}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Air Monitoring Job</DialogTitle>
            </DialogHeader>
            <Form {...editJobForm}>
              <form
                onSubmit={editJobForm.handleSubmit((data) => updateJobMutation.mutate(data))}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={editJobForm.control}
                    name="jobName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editJobForm.control}
                    name="jobNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Job Number</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editJobForm.control}
                    name="siteName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Site Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editJobForm.control}
                    name="address"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editJobForm.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editJobForm.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editJobForm.control}
                    name="zipCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Zip Code</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editJobForm.control}
                    name="clientName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Client</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editJobForm.control}
                    name="projectManager"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Project Manager</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editJobForm.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Status</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="planning">Planning</SelectItem>
                            <SelectItem value="setup">Setup</SelectItem>
                            <SelectItem value="sampling">Sampling</SelectItem>
                            <SelectItem value="complete">Complete</SelectItem>
                            <SelectItem value="lab-analysis">Lab Analysis</SelectItem>
                            <SelectItem value="reporting">Reporting</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editJobForm.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={editJobForm.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>End Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={editJobForm.control}
                  name="workDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Work Description</FormLabel>
                      <FormControl>
                        <Textarea {...field} value={field.value || ""} rows={3} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setEditingJob(null)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={updateJobMutation.isPending}>
                    {updateJobMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Sample Modal */}
      {editingSample && (
        <Dialog open={!!editingSample} onOpenChange={() => setEditingSample(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Air Sample</DialogTitle>
            </DialogHeader>
            <AirSampleForm 
              jobId={editingSample.jobId}
              personnel={personnel}
              equipmentList={equipmentList}
              onSuccess={() => setEditingSample(null)}
              onSubmit={(data, file) => updateSampleMutation.mutate({ id: editingSample.id, data, file })}
              isLoading={updateSampleMutation.isPending}
              initialData={editingSample}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Air Sample Form Component
interface AirSampleFormProps {
  jobId: string;
  personnel: PersonnelProfile[];
  equipmentList: FieldToolsEquipment[];
  onSuccess: () => void;
  onSubmit: (data: InsertAirSample, file?: File | null) => void;
  isLoading: boolean;
  initialData?: AirSample;
}

function AirSampleForm({ jobId, personnel, equipmentList, onSuccess, onSubmit, isLoading, initialData }: AirSampleFormProps) {
  const [personnelQuery, setPersonnelQuery] = useState("");
  const [lastUnitDefault, setLastUnitDefault] = useState<string>("");
  const [labReportFile, setLabReportFile] = useState<File | null>(null);

  const form = useForm<AirSampleFormData>({
    resolver: zodResolver(airSampleFormSchema),
    defaultValues: {
      jobId,
      sampleType: initialData?.sampleType || 'area',
      customSampleType: initialData?.customSampleType || '',
      analyte: initialData?.analyte || 'asbestos',
      customAnalyte: initialData?.customAnalyte || '',
      pumpId: initialData?.pumpId || '',
      location: initialData?.location || '',
      collectedBy: initialData?.collectedBy || 'N/A',
      monitorWornBy: initialData?.monitorWornBy || '',
      sampleDate: initialData?.startTime ? new Date(initialData.startTime).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      startTime: initialData?.startTime ? new Date(initialData.startTime).toISOString().slice(11, 16) : '',
      endTime: initialData?.endTime ? new Date(initialData.endTime).toISOString().slice(11, 16) : '',
      flowRate: initialData?.flowRate?.toString() || '',
      samplingDuration: initialData?.samplingDuration || undefined,
      analysisMethod: initialData?.analysisMethod || '',
      fieldNotes: initialData?.fieldNotes || '',
      status: initialData?.status || 'collecting',
      
      // Lab Results defaults
      result: initialData?.result?.toString() || '',
      resultUnit: initialData?.resultUnit || '',
      uncertainty: initialData?.uncertainty?.toString() || '',
      exceedsLimit: initialData?.exceedsLimit || false,
      regulatoryLimit: initialData?.regulatoryLimit?.toString() || '',
      limitType: initialData?.limitType || '',
      
      // Results posting defaults
      labReportDate: initialData?.labReportDate ? new Date(initialData.labReportDate).toISOString().slice(0, 10) : '',
      reportNotes: initialData?.reportNotes || '',
    },
  });

  const filteredPersonnel = personnel.filter((person) => {
    const needle = personnelQuery.trim().toLowerCase();
    if (!needle) return true;
    const fullName = `${person.firstName} ${person.lastName}`.toLowerCase();
    const accreditation = person.stateAccreditationNumber?.toLowerCase() || "";
    return fullName.includes(needle) || accreditation.includes(needle);
  });

  const handleSubmit = (data: AirSampleFormData) => {
    const startDateTime = data.sampleDate && data.startTime
      ? new Date(`${data.sampleDate}T${data.startTime}`)
      : undefined;
    const endDateTime = data.sampleDate && data.endTime
      ? new Date(`${data.sampleDate}T${data.endTime}`)
      : undefined;
    const submitData: InsertAirSample = {
      ...data,
      startTime: startDateTime || new Date(),
      endTime: endDateTime || undefined,
      flowRate: data.flowRate ? parseFloat(data.flowRate as string) : undefined,
      result: data.result ? parseFloat(data.result) : undefined,
      uncertainty: data.uncertainty ? parseFloat(data.uncertainty) : undefined,
      regulatoryLimit: data.regulatoryLimit ? parseFloat(data.regulatoryLimit) : undefined,
      labReportDate: data.labReportDate ? new Date(data.labReportDate) : undefined,
    };
    if (!submitData.collectedBy) {
      submitData.collectedBy = "N/A";
    }
    if (submitData.sampleType !== "other") {
      submitData.customSampleType = undefined;
    }
    if (submitData.analyte !== "other") {
      submitData.customAnalyte = undefined;
    }
    if (submitData.pumpId === "") {
      submitData.pumpId = undefined;
    }
    onSubmit(submitData, labReportFile);
  };

  const getDefaultUnitForAnalyte = (analyte: string) => {
    switch (analyte) {
      case "asbestos":
        return "f/cc";
      case "lead":
      case "cadmium":
      case "hexavalent_chromium":
      case "heavy_metals":
        return "ug/m3";
      case "silica":
        return "mg/m3";
      case "benzene":
      case "toluene":
        return "ppm";
      default:
        return "";
    }
  };

  // Auto-fill analysis method when analyte changes
  const handleAnalyteChange = (value: string) => {
    form.setValue('analyte', value);
    if (analyteMethodMap[value]) {
      form.setValue('analysisMethod', analyteMethodMap[value]);
    }
    const nextUnit = getDefaultUnitForAnalyte(value);
    const currentUnit = form.getValues("resultUnit") || "";
    if (!currentUnit || currentUnit === lastUnitDefault) {
      form.setValue("resultUnit", nextUnit);
    }
    setLastUnitDefault(nextUnit);
  };

  const startTimeValue = form.watch("startTime");
  const endTimeValue = form.watch("endTime");
  const sampleDateValue = form.watch("sampleDate");

  useEffect(() => {
    if (!sampleDateValue || !startTimeValue || !endTimeValue) return;
    const start = new Date(`${sampleDateValue}T${startTimeValue}`);
    const end = new Date(`${sampleDateValue}T${endTimeValue}`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return;
    const diffMs = end.getTime() - start.getTime();
    if (diffMs < 0) return;
    const minutes = Math.round(diffMs / 60000);
    form.setValue("samplingDuration", minutes);
  }, [sampleDateValue, startTimeValue, endTimeValue, form]);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="max-h-[70vh] overflow-y-auto pr-2 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="sampleType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sample Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="area">Area</SelectItem>
                    <SelectItem value="blank">Blank</SelectItem>
                    <SelectItem value="personal">Personal</SelectItem>
                    <SelectItem value="excursion">Excursion</SelectItem>
                    <SelectItem value="clearance">Clearance</SelectItem>
                    <SelectItem value="other">Other (Custom)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="analyte"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Analyte</FormLabel>
                <Select onValueChange={handleAnalyteChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
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
        </div>

        {form.watch("analyte") === "other" && (
          <FormField
            control={form.control}
            name="customAnalyte"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Custom Analyte</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ''} placeholder="Enter analyte name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {form.watch("sampleType") === "other" && (
          <FormField
            control={form.control}
            name="customSampleType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Custom Sample Type</FormLabel>
                <FormControl>
                  <Input {...field} value={field.value || ''} placeholder="Enter custom sample type" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Location</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ''} placeholder="e.g., Basement Boiler Room - Worker Breathing Zone" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="monitorWornBy"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Monitor Worn By</FormLabel>
                <Input
                  placeholder="Search personnel..."
                  value={personnelQuery}
                  onChange={(e) => setPersonnelQuery(e.target.value)}
                  className="mb-2"
                />
                <Select onValueChange={field.onChange} value={field.value || ''}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select person wearing monitor" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="N/A">Not applicable (area/background sample)</SelectItem>
                    {filteredPersonnel.map((person) => (
                      <SelectItem key={person.id} value={`${person.firstName} ${person.lastName}`}>
                        {person.firstName} {person.lastName} - {person.stateAccreditationNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="sampleDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Sample Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Time</FormLabel>
                <FormControl>
                  <Input type="time" {...field} value={field.value || ''} />
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
                  <Input type="time" {...field} value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="flowRate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Flow Rate (L/min)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    step="0.1" 
                    placeholder="2.0"
                    {...field}
                    value={field.value || ''}
                  />
                </FormControl>
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
                <Select onValueChange={field.onChange} value={field.value || ""}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select pump from equipment list" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {equipmentList.map((equipment) => (
                      <SelectItem key={equipment.id} value={equipment.id}>
                        {equipment.name}{equipment.serialNumber ? ` (${equipment.serialNumber})` : ""}
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
            name="samplingDuration"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Run Time (minutes)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder="480"
                    value={field.value?.toString() || ''}
                    readOnly
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="analysisMethod"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Analysis Method</FormLabel>
              <FormControl>
                <Input 
                  {...field} 
                  value={field.value || ''} 
                  placeholder="e.g., PCM (NIOSH 7400)"
                  className="bg-gray-50 dark:bg-gray-900"
                />
              </FormControl>
              <FormMessage />
              <p className="text-xs text-gray-500">Auto-filled based on analyte selection</p>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="fieldNotes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea 
                  {...field} 
                  value={field.value || ''}
                  placeholder="Describe the sample, location, and any observations..."
                  rows={3}
                />
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
              <FormLabel>Status</FormLabel>
              <Select onValueChange={field.onChange} value={field.value || ''}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="collecting">Collecting</SelectItem>
                  <SelectItem value="collected">Collected</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="analyzing">Analyzing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Lab Results Section */}
        <div className="pt-6 border-t">
          <h4 className="text-lg font-medium mb-4 text-gray-900 dark:text-gray-100">Lab Results</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="result"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Result</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      value={field.value || ''}
                      type="number"
                      step="0.001"
                      placeholder="0.015"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="resultUnit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Unit</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      value={field.value || ''}
                      placeholder="f/cc, mg/m³, ppm"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="uncertainty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Uncertainty (±)</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      value={field.value || ''}
                      type="number"
                      step="0.001"
                      placeholder="0.002"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="regulatoryLimit"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Regulatory Limit</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      value={field.value || ''}
                      type="number"
                      step="0.001"
                      placeholder="0.1"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="limitType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Limit Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select limit type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="PEL">PEL (Permissible Exposure Limit)</SelectItem>
                      <SelectItem value="TLV">TLV (Threshold Limit Value)</SelectItem>
                      <SelectItem value="REL">REL (Recommended Exposure Limit)</SelectItem>
                      <SelectItem value="STEL">STEL (Short Term Exposure Limit)</SelectItem>
                      <SelectItem value="TWA">TWA (Time Weighted Average)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="exceedsLimit"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel>Exceeds Regulatory Limit</FormLabel>
                    <div className="text-sm text-gray-500">
                      Mark if result exceeds regulatory limits
                    </div>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          {/* Results Posting Section */}
          <div className="mt-6 pt-6 border-t">
            <h5 className="text-md font-medium mb-4 text-gray-900 dark:text-gray-100">Results Posting</h5>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="labReportDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lab Report Date</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        value={field.value || ''}
                        type="date"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

            </div>

            <FormField
              control={form.control}
              name="reportNotes"
              render={({ field }) => (
                <FormItem className="mt-4">
                  <FormLabel>Report Notes</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      value={field.value || ''}
                      placeholder="Additional notes about the lab results or analysis..."
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="mt-4">
              <FormLabel>Lab Report Upload</FormLabel>
              <Input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                onChange={(e) => setLabReportFile(e.target.files?.[0] || null)}
              />
              <p className="text-xs text-gray-500 mt-1">Attach a lab report file (optional).</p>
            </div>
          </div>
        </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <Button type="button" variant="outline" onClick={onSuccess}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Sample"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
