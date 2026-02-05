import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Search, Plus, MapPin, Calendar, User, Edit, FileText, Filter, Download, Trash2, X, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { CreateSurveyModal } from "@/components/create-survey-modal";
import { EditSurveyModal } from "@/components/edit-survey-modal";
import type { Survey } from "@shared/schema";

export default function Surveys() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editSurvey, setEditSurvey] = useState<Survey | null>(null);
  const [selectedSurveys, setSelectedSurveys] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date } | undefined>();
  const [sortBy, setSortBy] = useState<string>("date-desc");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: surveys = [], isLoading } = useQuery<Survey[]>({
    queryKey: ["/api/surveys"],
  });

  // Bulk operations mutation
  const bulkActionMutation = useMutation({
    mutationFn: async ({ action, surveyIds }: { action: string; surveyIds: string[] }) => {
      return await apiRequest("POST", "/api/surveys/bulk", { action, surveyIds });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/surveys"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      
      if (variables.action === "delete") {
        toast({
          title: "Surveys Deleted",
          description: `Successfully deleted ${variables.surveyIds.length} surveys.`,
        });
      } else if (variables.action === "download") {
        toast({
          title: "Reports Generated",
          description: `Successfully generated ${variables.surveyIds.length} reports.`,
        });
      }
      setSelectedSurveys([]);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to perform bulk action",
        variant: "destructive",
      });
    },
  });

  const handleBulkDownload = () => {
    bulkActionMutation.mutate({ action: "download", surveyIds: selectedSurveys });
  };

  const handleBulkDelete = () => {
    if (confirm(`Are you sure you want to delete ${selectedSurveys.length} surveys? This action cannot be undone.`)) {
      bulkActionMutation.mutate({ action: "delete", surveyIds: selectedSurveys });
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedSurveys(filteredSurveys.map(survey => survey.id));
    } else {
      setSelectedSurveys([]);
    }
  };

  const handleSelectSurvey = (surveyId: string, checked: boolean) => {
    if (checked) {
      setSelectedSurveys([...selectedSurveys, surveyId]);
    } else {
      setSelectedSurveys(selectedSurveys.filter(id => id !== surveyId));
    }
  };

  const filteredSurveys = useMemo(() => {
    let filtered = surveys.filter((survey) =>
      survey.siteName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      survey.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      survey.inspector.toLowerCase().includes(searchQuery.toLowerCase()) ||
      survey.surveyType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      survey.jobNumber?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(survey => survey.status === statusFilter);
    }

    // Apply type filter  
    if (typeFilter !== "all") {
      filtered = filtered.filter(survey => survey.surveyType === typeFilter);
    }

    // Apply date range filter
    if (dateRange?.from) {
      filtered = filtered.filter(survey => new Date(survey.surveyDate) >= dateRange.from!);
    }
    if (dateRange?.to) {
      filtered = filtered.filter(survey => new Date(survey.surveyDate) <= dateRange.to!);
    }

    // Apply sorting
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case "name-asc":
          return a.siteName.localeCompare(b.siteName);
        case "name-desc":
          return b.siteName.localeCompare(a.siteName);
        case "date-asc":
          return new Date(a.surveyDate).getTime() - new Date(b.surveyDate).getTime();
        case "date-desc":
          return new Date(b.surveyDate).getTime() - new Date(a.surveyDate).getTime();
        case "status":
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });
  }, [surveys, searchQuery, statusFilter, typeFilter, dateRange, sortBy]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "report-sent":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200";
      case "report-completed":
        return "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200";
      case "samples-sent-to-lab":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
      case "in-progress":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
      case "scheduled":
        return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200";
      case "draft":
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
      case "on-hold":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "archived":
        return "bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Surveys</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-3 bg-gray-200 rounded"></div>
                  <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100" data-testid="surveys-title">All Surveys</h1>
        <Button onClick={() => setShowCreateModal(true)} data-testid="button-create-survey">
          <Plus className="h-4 w-4 mr-2" />
          New Survey
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex items-center space-x-2 flex-1">
          <Search className="h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search surveys by site name, address, job number, inspector, or type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1"
            data-testid="input-search-surveys"
          />
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            data-testid="button-toggle-filters"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]" data-testid="select-sort-by">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">Latest First</SelectItem>
              <SelectItem value="date-asc">Oldest First</SelectItem>
              <SelectItem value="name-asc">Name A-Z</SelectItem>
              <SelectItem value="name-desc">Name Z-A</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>

          {selectedSurveys.length > 0 && (
            <>
              <Button
                variant="outline"
                onClick={handleBulkDownload}
                disabled={bulkActionMutation.isPending}
                data-testid="button-bulk-download"
              >
                <Download className="h-4 w-4 mr-2" />
                Download ({selectedSurveys.length})
              </Button>
              <Button
                variant="outline"
                onClick={handleBulkDelete}
                disabled={bulkActionMutation.isPending}
                className="text-red-600 hover:text-red-700"
                data-testid="button-bulk-delete"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete ({selectedSurveys.length})
              </Button>
            </>
          )}
        </div>
      </div>

      {showFilters && (
        <Card className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger data-testid="select-status-filter">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="samples-sent-to-lab">Samples Sent to Lab</SelectItem>
                  <SelectItem value="report-completed">Report Completed</SelectItem>
                  <SelectItem value="report-sent">Report Sent</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="on-hold">On Hold</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Survey Type</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger data-testid="select-type-filter">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="asbestos">Asbestos</SelectItem>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="cadmium">Cadmium</SelectItem>
                  <SelectItem value="asbestos-lead">Asbestos + Lead</SelectItem>
                  <SelectItem value="asbestos-cadmium">Asbestos + Cadmium</SelectItem>
                  <SelectItem value="lead-cadmium">Lead + Cadmium</SelectItem>
                  <SelectItem value="asbestos-lead-cadmium">Asbestos + Lead + Cadmium</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Date Range</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                    data-testid="button-date-range"
                  >
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {dateRange?.from ? (
                      dateRange?.to ? (
                        `${format(dateRange.from, "MMM dd")} - ${format(dateRange.to, "MMM dd")}`
                      ) : (
                        format(dateRange.from, "MMM dd, yyyy")
                      )
                    ) : (
                      "Pick a date range"
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    initialFocus
                    mode="range"
                    defaultMonth={dateRange?.from}
                    selected={dateRange}
                    onSelect={(range) => setDateRange(range)}
                    numberOfMonths={2}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setStatusFilter("all");
                  setTypeFilter("all");
                  setDateRange(undefined);
                  setSearchQuery("");
                }}
                data-testid="button-clear-filters"
              >
                <X className="h-4 w-4 mr-2" />
                Clear Filters
              </Button>
            </div>
          </div>
        </Card>
      )}

      {filteredSurveys.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-gray-500 dark:text-gray-400">
              {searchQuery ? "No surveys found matching your search." : "No surveys created yet."}
            </div>
            {!searchQuery && (
              <Button 
                onClick={() => setShowCreateModal(true)} 
                className="mt-4"
                data-testid="button-create-first-survey"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Survey
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredSurveys.length > 1 && (
            <div className="flex items-center space-x-2 mb-4">
              <Checkbox
                checked={selectedSurveys.length === filteredSurveys.length}
                onCheckedChange={handleSelectAll}
                data-testid="checkbox-select-all"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Select all ({filteredSurveys.length} surveys)
              </span>
              {selectedSurveys.length > 0 && (
                <span className="text-sm text-blue-600 dark:text-blue-400">
                  {selectedSurveys.length} selected
                </span>
              )}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredSurveys.map((survey) => (
              <Card key={survey.id} className="hover:shadow-md transition-shadow relative" data-testid={`card-survey-${survey.id}`}>
                {filteredSurveys.length > 1 && (
                  <div className="absolute top-3 left-3 z-10">
                    <Checkbox
                      checked={selectedSurveys.includes(survey.id)}
                      onCheckedChange={(checked) => handleSelectSurvey(survey.id, checked as boolean)}
                      onClick={(e) => e.stopPropagation()}
                      data-testid={`checkbox-select-${survey.id}`}
                    />
                  </div>
                )}
                
                <Link href={`/surveys/${survey.id}`} className="block">
                  <CardHeader className={filteredSurveys.length > 1 ? "pl-10" : ""}>
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg truncate pr-2">{survey.siteName}</CardTitle>
                      <Badge className={getStatusColor(survey.status)} data-testid={`status-${survey.status}`}>
                        {survey.status.split('-').map(word => 
                          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                        ).join(' ')}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 capitalize">{survey.surveyType}</div>
                  </CardHeader>
                  {survey.sitePhotoUrl && (
                    <div className="px-6 pb-4">
                      <img 
                        src={survey.sitePhotoUrl} 
                        alt={`Site photo for ${survey.siteName}`} 
                        className="w-full h-32 object-cover rounded-md"
                      />
                    </div>
                  )}
                  <CardContent className="space-y-2">
                    {survey.address && (
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span className="truncate">{survey.address}</span>
                      </div>
                    )}
                    {survey.jobNumber && (
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <FileText className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span className="truncate">Job #{survey.jobNumber}</span>
                      </div>
                    )}
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                      <User className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span className="truncate">{survey.inspector}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                      <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span>{new Date(survey.surveyDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-end pt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setEditSurvey(survey);
                        }}
                        className="h-8 w-8 p-0"
                        data-testid={`button-edit-${survey.id}`}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>
        </div>
      )}

      <CreateSurveyModal 
        open={showCreateModal} 
        onOpenChange={setShowCreateModal}
      />
      
      <EditSurveyModal 
        survey={editSurvey}
        open={!!editSurvey} 
        onOpenChange={(open) => !open && setEditSurvey(null)}
      />
    </div>
  );
}