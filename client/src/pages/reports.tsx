import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, FileText, Calendar, BarChart3, TrendingUp } from "lucide-react";
import type { Survey } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function Reports() {
  const { toast } = useToast();
  const { data: surveys = [], isLoading } = useQuery<Survey[]>({
    queryKey: ["/api/surveys"],
  });

  const completedSurveys = surveys.filter(s => s.status === "completed");
  const inProgressSurveys = surveys.filter(s => s.status === "in-progress");
  
  const surveyTypeStats = surveys.reduce((acc, survey) => {
    acc[survey.surveyType] = (acc[survey.surveyType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const recentReports = completedSurveys
    .sort((a, b) => new Date(b.updatedAt || '').getTime() - new Date(a.updatedAt || '').getTime())
    .slice(0, 5);

  const handleViewReport = async (survey: Survey) => {
    try {
      const response = await apiRequest("GET", `/api/surveys/${survey.id}/report`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (error: any) {
      toast({
        title: "Report Error",
        description: error?.message || "Unable to open report.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadReport = async (survey: Survey) => {
    try {
      const response = await apiRequest("GET", `/api/surveys/${survey.id}/report`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName = survey.siteName ? survey.siteName.replace(/[^a-z0-9-_]+/gi, "_") : "survey";
      a.download = `${safeName}_report.html`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error: any) {
      toast({
        title: "Download Error",
        description: error?.message || "Unable to download report.",
        variant: "destructive",
      });
    }
  };

  const handleExportAll = async () => {
    try {
      const response = await apiRequest("POST", "/api/admin/export-all");
      const data = await response.json();
      toast({
        title: "Export Started",
        description: data?.message || "Export initiated.",
      });
    } catch (error: any) {
      toast({
        title: "Export Error",
        description: error?.message || "Unable to export reports.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Reports</h1>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-8 bg-gray-200 rounded"></div>
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
        <h1 className="text-3xl font-bold" data-testid="reports-title">Reports & Analytics</h1>
        <Button data-testid="button-export-all" onClick={handleExportAll}>
          <Download className="h-4 w-4 mr-2" />
          Export All Reports
        </Button>
      </div>

      {/* Summary Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Surveys</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-total-surveys">{surveys.length}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600" data-testid="stat-completed">{completedSurveys.length}</div>
            <p className="text-xs text-muted-foreground">Ready for review</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">In Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600" data-testid="stat-in-progress">{inProgressSurveys.length}</div>
            <p className="text-xs text-muted-foreground">Active work</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Survey Types</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="stat-survey-types">{Object.keys(surveyTypeStats).length}</div>
            <p className="text-xs text-muted-foreground">Different types</p>
          </CardContent>
        </Card>
      </div>

      {/* Survey Type Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Survey Type Distribution</CardTitle>
          <CardDescription>Breakdown of surveys by type</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(surveyTypeStats).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="capitalize">{type}</Badge>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="text-sm font-medium">{count} surveys</div>
                  <div className="text-xs text-muted-foreground">
                    ({((count / surveys.length) * 100).toFixed(1)}%)
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Completed Reports</CardTitle>
          <CardDescription>Latest surveys ready for review and export</CardDescription>
        </CardHeader>
        <CardContent>
          {recentReports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No completed reports available yet.
            </div>
          ) : (
            <div className="space-y-4">
              {recentReports.map((survey) => (
                <div key={survey.id} className="flex items-center justify-between p-4 border rounded-lg" data-testid={`report-${survey.id}`}>
                  <div className="space-y-1">
                    <div className="font-medium">{survey.siteName}</div>
                    <div className="text-sm text-muted-foreground">
                      {survey.surveyType} • {survey.inspector}
                    </div>
                    <div className="flex items-center text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3 mr-1" />
                      Completed {new Date(survey.updatedAt || '').toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      data-testid={`button-view-${survey.id}`}
                      onClick={() => handleViewReport(survey)}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      data-testid={`button-download-${survey.id}`}
                      onClick={() => handleDownloadReport(survey)}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
