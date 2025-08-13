import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, MapPin, Calendar, User, Edit, FileText } from "lucide-react";
import { CreateSurveyModal } from "@/components/create-survey-modal";
import { EditSurveyModal } from "@/components/edit-survey-modal";
import type { Survey } from "@shared/schema";

export default function Surveys() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editSurvey, setEditSurvey] = useState<Survey | null>(null);

  const { data: surveys = [], isLoading } = useQuery<Survey[]>({
    queryKey: ["/api/surveys"],
  });

  const filteredSurveys = surveys.filter((survey) =>
    survey.siteName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    survey.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    survey.inspector.toLowerCase().includes(searchQuery.toLowerCase()) ||
    survey.surveyType.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

      <div className="flex items-center space-x-2">
        <Search className="h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search surveys by site name, address, job number, inspector, or type..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
          data-testid="input-search-surveys"
        />
      </div>

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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredSurveys.map((survey) => (
            <Link key={survey.id} href={`/surveys/${survey.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer" data-testid={`card-survey-${survey.id}`}>
                <CardHeader>
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
              </Card>
            </Link>
          ))}
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