import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CreateSurveyModal } from "@/components/create-survey-modal";
import { OfflineIndicator } from "@/components/offline-indicator";
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
  FileDown
} from "lucide-react";

export default function Dashboard() {
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery<SurveyStats>({
    queryKey: ["/api/stats"],
  });

  const { data: surveys = [], isLoading: surveysLoading } = useQuery<Survey[]>({
    queryKey: ["/api/surveys"],
  });

  const recentSurveys = surveys.slice(0, 3);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-success text-white" data-testid={`status-${status}`}>Completed</Badge>;
      case "in-progress":
        return <Badge className="bg-warning text-white" data-testid={`status-${status}`}>In Progress</Badge>;
      case "draft":
        return <Badge variant="secondary" data-testid={`status-${status}`}>Draft</Badge>;
      default:
        return <Badge variant="outline" data-testid={`status-${status}`}>{status}</Badge>;
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
                            <Button variant="ghost" size="sm" data-testid={`button-view-${survey.id}`}>
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button variant="ghost" size="sm" data-testid={`button-report-${survey.id}`}>
                            <FileDown className="h-4 w-4" />
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

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-primary bg-opacity-10 rounded-lg mb-4">
              <PlusCircle className="text-primary text-xl" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Start New Survey</h3>
            <p className="text-gray-600 mb-4">Create a new site survey with our guided workflow.</p>
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="w-full bg-primary hover:bg-blue-700"
              data-testid="button-start-new-survey"
            >
              Get Started
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-success bg-opacity-10 rounded-lg mb-4">
              <FileText className="text-success text-xl" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Generate Reports</h3>
            <p className="text-gray-600 mb-4">Create comprehensive reports from your survey data.</p>
            <Button 
              className="w-full bg-success hover:bg-green-700"
              data-testid="button-view-reports"
            >
              View Reports
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center w-12 h-12 bg-warning bg-opacity-10 rounded-lg mb-4">
              <Search className="text-warning text-xl" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Search History</h3>
            <p className="text-gray-600 mb-4">Find and review past surveys and observations.</p>
            <Button 
              className="w-full bg-warning hover:bg-orange-600"
              data-testid="button-search-history"
            >
              Search
            </Button>
          </CardContent>
        </Card>
      </div>

      <CreateSurveyModal 
        open={showCreateModal} 
        onOpenChange={setShowCreateModal}
      />
    </div>
  );
}
