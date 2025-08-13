import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Plus, Filter, Download, Search, Calendar, User, AlertTriangle, CheckCircle, Clock, Play, Pause, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { AirSample, PersonnelProfile, AirMonitoringJob } from "@shared/schema";

export default function AirMonitoringPage() {
  const [showCreateJobModal, setShowCreateJobModal] = useState(false);
  const [showCreateSampleModal, setShowCreateSampleModal] = useState(false);
  const [showCreatePersonnelModal, setShowCreatePersonnelModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [analyteFilter, setAnalyteFilter] = useState<string>("all");
  const [sampleTypeFilter, setSampleTypeFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<string>("samples");

  // Fetch air samples
  const { data: airSamples = [], isLoading: samplesLoading } = useQuery<AirSample[]>({
    queryKey: ["/api/air-samples"],
  });

  // Fetch personnel profiles
  const { data: personnel = [], isLoading: personnelLoading } = useQuery<PersonnelProfile[]>({
    queryKey: ["/api/personnel"],
  });

  // Filter samples
  const filteredSamples = useMemo(() => {
    return airSamples.filter((sample: AirSample) => {
      const matchesSearch = searchQuery === "" || 
        sample.location?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sample.area?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        sample.collectedBy?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || sample.status === statusFilter;
      const matchesAnalyte = analyteFilter === "all" || sample.analyte === analyteFilter;
      const matchesSampleType = sampleTypeFilter === "all" || sample.sampleType === sampleTypeFilter;
      
      return matchesSearch && matchesStatus && matchesAnalyte && matchesSampleType;
    });
  }, [airSamples, searchQuery, statusFilter, analyteFilter, sampleTypeFilter]);

  // Filter personnel
  const filteredPersonnel = useMemo(() => {
    return personnel.filter((person: PersonnelProfile) => {
      const matchesSearch = searchQuery === "" || 
        `${person.firstName} ${person.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        person.employeeId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        person.department?.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchesSearch;
    });
  }, [personnel, searchQuery]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'collecting':
        return <Play className="h-4 w-4" />;
      case 'collected':
        return <Pause className="h-4 w-4" />;
      case 'shipped':
        return <Clock className="h-4 w-4" />;
      case 'analyzing':
        return <AlertTriangle className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <X className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'collecting':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      case 'collected':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'shipped':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
      case 'analyzing':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300';
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const formatAnalyte = (analyte: string, customAnalyte?: string) => {
    if (analyte === 'other' && customAnalyte) {
      return customAnalyte;
    }
    return analyte.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Air Monitoring</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Track air sampling for various analytes and manage personnel profiles
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={() => setShowCreatePersonnelModal(true)}
            variant="outline"
            data-testid="button-create-personnel"
          >
            <User className="h-4 w-4 mr-2" />
            Add Personnel
          </Button>
          <Button 
            onClick={() => setShowCreateSampleModal(true)}
            data-testid="button-create-air-sample"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Air Sample
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="samples">Air Samples ({filteredSamples.length})</TabsTrigger>
          <TabsTrigger value="personnel">Personnel ({filteredPersonnel.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="samples" className="space-y-4">
          {/* Filters for samples */}
          <Card>
            <CardContent className="mobile-spacing">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                    <Input
                      placeholder="Search by location, area, or collector..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                      data-testid="input-search-samples"
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-40" data-testid="select-status-filter">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="collecting">Collecting</SelectItem>
                      <SelectItem value="collected">Collected</SelectItem>
                      <SelectItem value="shipped">Shipped</SelectItem>
                      <SelectItem value="analyzing">Analyzing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={analyteFilter} onValueChange={setAnalyteFilter}>
                    <SelectTrigger className="w-full sm:w-40" data-testid="select-analyte-filter">
                      <SelectValue placeholder="Analyte" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Analytes</SelectItem>
                      <SelectItem value="asbestos">Asbestos</SelectItem>
                      <SelectItem value="lead">Lead</SelectItem>
                      <SelectItem value="cadmium">Cadmium</SelectItem>
                      <SelectItem value="hexavalent_chromium">Hex Chrome</SelectItem>
                      <SelectItem value="silica">Silica</SelectItem>
                      <SelectItem value="heavy_metals">Heavy Metals</SelectItem>
                      <SelectItem value="benzene">Benzene</SelectItem>
                      <SelectItem value="toluene">Toluene</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={sampleTypeFilter} onValueChange={setSampleTypeFilter}>
                    <SelectTrigger className="w-full sm:w-40" data-testid="select-sample-type-filter">
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="personal">Personal</SelectItem>
                      <SelectItem value="area">Area</SelectItem>
                      <SelectItem value="background">Background</SelectItem>
                      <SelectItem value="outdoor">Outdoor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Air samples grid */}
          {samplesLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-gray-300 rounded w-3/4 mb-4"></div>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                      <div className="h-3 bg-gray-300 rounded w-3/4"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredSamples.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <div className="text-gray-500 dark:text-gray-400">
                  {searchQuery || statusFilter !== "all" || analyteFilter !== "all" || sampleTypeFilter !== "all" 
                    ? "No air samples found matching your filters." 
                    : "No air samples created yet."}
                </div>
                {!searchQuery && statusFilter === "all" && analyteFilter === "all" && sampleTypeFilter === "all" && (
                  <Button 
                    onClick={() => setShowCreateSampleModal(true)} 
                    className="mt-4"
                    data-testid="button-create-first-sample"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Air Sample
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredSamples.map((sample: AirSample) => (
                <Card key={sample.id} className="touch-card" data-testid={`card-sample-${sample.id}`}>
                  <CardContent className="mobile-spacing">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold responsive-text truncate">
                          {formatAnalyte(sample.analyte, sample.customAnalyte)}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                          {sample.location || sample.area}
                        </p>
                      </div>
                      <Badge className={`${getStatusColor(sample.status)} flex items-center gap-1`}>
                        {getStatusIcon(sample.status)}
                        <span className="capitalize">{sample.status}</span>
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <Badge variant="outline" className="text-xs">
                          {sample.sampleType.toUpperCase()}
                        </Badge>
                        <span className="ml-2">
                          {sample.startTime && new Date(sample.startTime).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <User className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span className="truncate">{sample.collectedBy}</span>
                      </div>
                      
                      {sample.samplingDuration && (
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                          <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
                          <span>{sample.samplingDuration} minutes</span>
                        </div>
                      )}

                      {sample.result && (
                        <div className="flex items-center text-sm font-medium">
                          <span className={sample.exceedsLimit ? 'text-red-600' : 'text-green-600'}>
                            {sample.result} {sample.resultUnit}
                          </span>
                          {sample.exceedsLimit && (
                            <AlertTriangle className="h-4 w-4 ml-2 text-red-600" />
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="personnel" className="space-y-4">
          {/* Personnel grid */}
          {personnelLoading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 bg-gray-300 rounded w-3/4 mb-4"></div>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-300 rounded w-1/2"></div>
                      <div className="h-3 bg-gray-300 rounded w-3/4"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredPersonnel.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <div className="text-gray-500 dark:text-gray-400">
                  {searchQuery ? "No personnel found matching your search." : "No personnel profiles created yet."}
                </div>
                {!searchQuery && (
                  <Button 
                    onClick={() => setShowCreatePersonnelModal(true)} 
                    className="mt-4"
                    data-testid="button-create-first-personnel"
                  >
                    <User className="h-4 w-4 mr-2" />
                    Add Your First Personnel Profile
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredPersonnel.map((person: PersonnelProfile) => (
                <Card key={person.id} className="touch-card" data-testid={`card-personnel-${person.id}`}>
                  <CardContent className="mobile-spacing">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-semibold responsive-text">
                          {person.firstName} {person.lastName}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {person.jobTitle}
                        </p>
                      </div>
                      <Badge variant={person.medicalClearance ? "default" : "secondary"}>
                        {person.medicalClearance ? "Cleared" : "Pending"}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      {person.employeeId && (
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          ID: {person.employeeId}
                        </div>
                      )}
                      
                      {person.department && (
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {person.department}
                        </div>
                      )}
                      
                      {person.certifications && person.certifications.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {person.certifications.slice(0, 2).map((cert, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {cert}
                            </Badge>
                          ))}
                          {person.certifications.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{person.certifications.length - 2} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* TODO: Add Create Air Sample Modal */}
      {/* TODO: Add Create Personnel Modal */}
    </div>
  );
}