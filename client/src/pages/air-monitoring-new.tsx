import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, MapPin, Calendar, Users, FileText, Wind, CloudSun } from "lucide-react";
import { CreateAirJobModal } from "@/components/create-air-job-modal";
import { CreatePersonnelModal } from "@/components/create-personnel-modal";
import { DailyWeatherLog } from "@/components/daily-weather-log";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { AirSample, PersonnelProfile, AirMonitoringJob } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function AirMonitoringPage() {
  const { toast } = useToast();
  const [showCreateJobModal, setShowCreateJobModal] = useState(false);
  const [showCreatePersonnelModal, setShowCreatePersonnelModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState<AirMonitoringJob | null>(null);
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
              <CardContent onClick={() => setSelectedJob(job)}>
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
                    onClick={() => setSelectedJob(job)}
                  >
                    View Details & Samples
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
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

      {/* Job Details Modal/Panel would go here */}
      {selectedJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold">{selectedJob.jobName}</h2>
                  <p className="text-gray-600 dark:text-gray-400">Job #{selectedJob.jobNumber}</p>
                </div>
                <Button variant="outline" onClick={() => setSelectedJob(null)}>
                  Close
                </Button>
              </div>
              
              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="samples">Air Samples</TabsTrigger>
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
                
                <TabsContent value="samples">
                  <p className="text-center py-8 text-gray-500">Air samples functionality will be added here</p>
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
    </div>
  );
}