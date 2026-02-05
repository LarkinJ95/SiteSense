import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateSurveyModal } from "@/components/create-survey-modal";
import { EditSurveyModal } from "@/components/edit-survey-modal";
import { OfflineIndicator } from "@/components/offline-indicator";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import type { Survey, SurveyStats } from "@/lib/types";
import { 
  ClipboardCheck, 
  AlertTriangle, 
  TestTubeDiagonal, 
  MapPin, 
  Download, 
  Plus, 
  PlusCircle, 
  FileText, 
  Search,
  Building,
  Home,
  Warehouse,
  Eye,
  FileDown,
  Edit,
  TrendingUp,
  BarChart3,
  PieChart as PieChartIcon
} from "lucide-react";
import { format, subDays, parseISO } from "date-fns";

export default function Dashboard() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editSurvey, setEditSurvey] = useState<Survey | null>(null);
  const { toast } = useToast();

  // Generate report mutation
  const generateReportMutation = useMutation({
    mutationFn: async (surveyId: string) => {
      const response = await fetch(`/api/surveys/${surveyId}/report`);
      if (!response.ok) {
        throw new Error("Failed to generate report");
      }
      const htmlContent = await response.text();
      return { htmlContent, surveyId };
    },
    onSuccess: ({ htmlContent, surveyId }) => {
      // Find the survey name for the filename
      const survey = surveys.find(s => s.id === surveyId);
      const filename = `${survey?.siteName || 'survey'}_report.html`;
      
      // Create blob and trigger download
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
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

  const { data: stats, isLoading: statsLoading } = useQuery<SurveyStats>({
    queryKey: ["/api/stats"],
  });

  const { data: surveys = [], isLoading: surveysLoading } = useQuery<Survey[]>({
    queryKey: ["/api/surveys"],
  });

  const recentSurveys = surveys.slice(0, 3);

  // Analytics data processing
  const analyticsData = useMemo(() => {
    if (!surveys.length) return null;

    // Status distribution for pie chart
    const statusCounts = surveys.reduce((acc, survey) => {
      acc[survey.status] = (acc[survey.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const statusData = Object.entries(statusCounts).map(([status, count]) => ({
      name: status.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' '),
      value: count,
      percentage: ((count / surveys.length) * 100).toFixed(1)
    }));

    // Survey type distribution
    const typeData = surveys.reduce((acc, survey) => {
      acc[survey.surveyType] = (acc[survey.surveyType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const surveyTypeData = Object.entries(typeData).map(([type, count]) => ({
      name: type,
      count,
      percentage: ((count / surveys.length) * 100).toFixed(1)
    }));

    // Monthly completion trend (last 6 months)
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const date = subDays(new Date(), i * 30);
      const monthSurveys = surveys.filter(s => {
        const surveyDate = parseISO(s.surveyDate);
        return surveyDate.getMonth() === date.getMonth() && 
               surveyDate.getFullYear() === date.getFullYear();
      });
      
      monthlyData.push({
        month: format(date, 'MMM yyyy'),
        completed: monthSurveys.filter(s => s.status === 'completed').length,
        total: monthSurveys.length,
        inProgress: monthSurveys.filter(s => s.status === 'in-progress').length
      });
    }

    return {
      statusData,
      surveyTypeData,
      monthlyData,
      completionRate: ((statusCounts.completed || 0) / surveys.length * 100).toFixed(1),
      avgCompletionTime: '7.2', // This could be calculated from actual data
    };
  }, [surveys]);

  const COLORS = {
    completed: '#22c55e',
    'in-progress': '#3b82f6', 
    'samples-sent-to-lab': '#f59e0b',
    'report-completed': '#8b5cf6',
    'report-sent': '#06b6d4',
    draft: '#6b7280',
    scheduled: '#f97316',
    'on-hold': '#eab308',
    archived: '#64748b'
  };

  const getStatusBadge = (status: string) => {
    const formatStatus = (status: string) => {
      return status.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ');
    };

    switch (status.toLowerCase()) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" data-testid={`status-${status}`}>Completed</Badge>;
      case "report-sent":
        return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200" data-testid={`status-${status}`}>Report Sent</Badge>;
      case "report-completed":
        return <Badge className="bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200" data-testid={`status-${status}`}>Report Completed</Badge>;
      case "samples-sent-to-lab":
        return <Badge className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200" data-testid={`status-${status}`}>Samples Sent to Lab</Badge>;
      case "in-progress":
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" data-testid={`status-${status}`}>In Progress</Badge>;
      case "scheduled":
        return <Badge className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200" data-testid={`status-${status}`}>Scheduled</Badge>;
      case "draft":
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200" data-testid={`status-${status}`}>Draft</Badge>;
      case "on-hold":
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" data-testid={`status-${status}`}>On Hold</Badge>;
      case "archived":
        return <Badge className="bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200" data-testid={`status-${status}`}>Archived</Badge>;
      default:
        return <Badge variant="outline" data-testid={`status-${status}`}>{formatStatus(status)}</Badge>;
    }
  };

  const getSiteIcon = (surveyType: string) => {
    switch (surveyType) {
      case "asbestos":
        return <Building className="text-gray-600 dark:text-gray-400" />;
      case "lead":
        return <Home className="text-gray-600 dark:text-gray-400" />;
      default:
        return <Warehouse className="text-gray-600 dark:text-gray-400" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100" data-testid="title-dashboard">
            Dashboard
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400" data-testid="text-welcome">
            Welcome back! Here's an overview of your recent survey activity.
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center space-x-3">
          <OfflineIndicator />
          <Button variant="outline" data-testid="button-export">
            <Download className="mr-2 h-4 w-4" />
            Export Data
          </Button>
          <Button 
            onClick={() => setShowCreateModal(true)}
            className="bg-primary hover:bg-blue-700"
            data-testid="button-new-survey"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Survey
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ClipboardCheck className="text-primary text-2xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Surveys</p>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100" data-testid="stat-total-surveys">
                    {stats?.totalSurveys || 0}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertTriangle className="text-warning text-2xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Reviews</p>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100" data-testid="stat-pending-reviews">
                    {stats?.pendingReviews || 0}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <TestTubeDiagonal className="text-success text-2xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Samples Collected</p>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100" data-testid="stat-samples-collected">
                    {stats?.samplesCollected || 0}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <MapPin className="text-secondary text-2xl" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Sites</p>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <p className="text-2xl font-bold text-gray-900 dark:text-gray-100" data-testid="stat-active-sites">
                    {stats?.activeSites || 0}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Charts */}
      {analyticsData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {/* Status Distribution Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChartIcon className="h-5 w-5" />
                Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={analyticsData.statusData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percentage }) => `${name} (${percentage}%)`}
                  >
                    {analyticsData.statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[entry.name.toLowerCase().replace(/\s+/g, '-')] || '#8884d8'} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Survey Types Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Survey Types
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={analyticsData.surveyTypeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Completion Trend Line Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Monthly Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={analyticsData.monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="completed" stroke="#22c55e" name="Completed" />
                  <Line type="monotone" dataKey="inProgress" stroke="#3b82f6" name="In Progress" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Surveys */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle data-testid="title-recent-surveys">Recent Surveys</CardTitle>
            <Link href="/surveys" className="text-primary text-sm font-medium hover:text-blue-700">
              View All
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {surveysLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-[200px]" />
                    <Skeleton className="h-4 w-[100px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : recentSurveys.length === 0 ? (
            <div className="text-center py-8">
              <ClipboardCheck className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No surveys yet</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Get started by creating your first survey.</p>
              <div className="mt-6">
                <Button onClick={() => setShowCreateModal(true)} data-testid="button-create-first-survey">
                  <Plus className="mr-2 h-4 w-4" />
                  New Survey
                </Button>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Site
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Survey Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Inspector
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {recentSurveys.map((survey) => (
                    <tr key={survey.id} className="hover:bg-gray-50 dark:hover:bg-gray-800" data-testid={`row-survey-${survey.id}`}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                              {getSiteIcon(survey.surveyType)}
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-gray-100" data-testid={`text-site-name-${survey.id}`}>
                              {survey.siteName}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400" data-testid={`text-address-${survey.id}`}>
                              {survey.address || "No address"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100" data-testid={`text-survey-type-${survey.id}`}>
                        {survey.surveyType}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100" data-testid={`text-inspector-${survey.id}`}>
                        {survey.inspector}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400" data-testid={`text-date-${survey.id}`}>
                        {new Date(survey.surveyDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(survey.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Link href={`/surveys/${survey.id}`}>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              data-testid={`button-view-${survey.id}`}
                              className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => generateReportMutation.mutate(survey.id)}
                            disabled={generateReportMutation.isPending}
                            data-testid={`button-report-${survey.id}`}
                            className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 disabled:opacity-50"
                          >
                            <FileDown className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setEditSurvey(survey)}
                            data-testid={`button-edit-${survey.id}`}
                            className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>



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
