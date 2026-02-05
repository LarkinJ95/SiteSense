import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  FileText, 
  Search, 
  Clock, 
  Shield, 
  CheckCircle,
  Star,
  Users,
  Calendar,
  ClipboardList
} from "lucide-react";

interface SurveyTemplate {
  id: string;
  name: string;
  description?: string;
  surveyType: string;
  category: string;
  version: string;
  estimatedDuration?: number; // in hours
  requiredCertifications?: string[];
  safetyRequirements?: string[];
  equipmentRequired?: string[];
  usageCount: number;
  lastUsed?: string;
  tags?: string[];
  isPublic: boolean;
  createdBy: string;
}

interface TemplateSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (template: SurveyTemplate) => void;
  surveyType?: string;
}

export function TemplateSelector({ open, onOpenChange, onSelectTemplate, surveyType }: TemplateSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedTemplate, setSelectedTemplate] = useState<SurveyTemplate | null>(null);

  const { data: templates = [], isLoading } = useQuery<SurveyTemplate[]>({
    queryKey: ["/api/survey-templates", { surveyType, category: categoryFilter, search: searchQuery }],
    enabled: open,
  });

  const filteredTemplates = templates.filter(template => {
    if (surveyType && template.surveyType !== surveyType) return false;
    if (categoryFilter !== "all" && template.category !== categoryFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return template.name.toLowerCase().includes(query) ||
             template.description?.toLowerCase().includes(query) ||
             template.tags?.some(tag => tag.toLowerCase().includes(query));
    }
    return true;
  });

  const popularTemplates = filteredTemplates
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 3);

  const recentTemplates = filteredTemplates
    .filter(t => t.lastUsed)
    .sort((a, b) => new Date(b.lastUsed!).getTime() - new Date(a.lastUsed!).getTime())
    .slice(0, 3);

  const handleSelectTemplate = (template: SurveyTemplate) => {
    setSelectedTemplate(template);
  };

  const handleConfirmSelection = () => {
    if (selectedTemplate) {
      onSelectTemplate(selectedTemplate);
      onOpenChange(false);
      setSelectedTemplate(null);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'asbestos':
        return <Shield className="h-4 w-4" />;
      case 'environmental':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'asbestos':
        return 'bg-red-100 text-red-800';
      case 'lead':
        return 'bg-orange-100 text-orange-800';
      case 'environmental':
        return 'bg-green-100 text-green-800';
      case 'safety':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Select Survey Template</DialogTitle>
        </DialogHeader>
        
        <div className="flex flex-col h-full">
          {/* Search and Filters */}
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-template-search"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="asbestos">Asbestos</SelectItem>
                <SelectItem value="lead">Lead Paint</SelectItem>
                <SelectItem value="environmental">Environmental</SelectItem>
                <SelectItem value="safety">Safety</SelectItem>
                <SelectItem value="general">General</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="h-3 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-6">
                {/* Popular Templates */}
                {popularTemplates.length > 0 && (
                  <div>
                    <h3 className="flex items-center gap-2 text-lg font-semibold mb-3">
                      <Star className="h-5 w-5 text-yellow-500" />
                      Most Popular
                    </h3>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {popularTemplates.map((template) => (
                        <Card 
                          key={template.id}
                          className={`cursor-pointer transition-all hover:shadow-md ${
                            selectedTemplate?.id === template.id ? 'ring-2 ring-blue-500' : ''
                          }`}
                          onClick={() => handleSelectTemplate(template)}
                          data-testid={`template-card-${template.id}`}
                        >
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between">
                              <CardTitle className="text-sm line-clamp-2">{template.name}</CardTitle>
                              <Badge className={getCategoryColor(template.category)}>
                                {getCategoryIcon(template.category)}
                                {template.category}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            {template.description && (
                              <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                                {template.description}
                              </p>
                            )}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="flex items-center gap-1 text-gray-500">
                                  <Clock className="h-3 w-3" />
                                  {template.estimatedDuration}h est.
                                </span>
                                <span className="flex items-center gap-1 text-gray-500">
                                  <Users className="h-3 w-3" />
                                  {template.usageCount} uses
                                </span>
                              </div>
                              {template.tags && template.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {template.tags.slice(0, 3).map((tag) => (
                                    <Badge key={tag} variant="outline" className="text-xs px-1 py-0">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Templates */}
                {recentTemplates.length > 0 && (
                  <div>
                    <h3 className="flex items-center gap-2 text-lg font-semibold mb-3">
                      <Calendar className="h-5 w-5 text-blue-500" />
                      Recently Used
                    </h3>
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {recentTemplates.map((template) => (
                        <Card 
                          key={`recent-${template.id}`}
                          className={`cursor-pointer transition-all hover:shadow-md ${
                            selectedTemplate?.id === template.id ? 'ring-2 ring-blue-500' : ''
                          }`}
                          onClick={() => handleSelectTemplate(template)}
                          data-testid={`recent-template-card-${template.id}`}
                        >
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between">
                              <CardTitle className="text-sm line-clamp-2">{template.name}</CardTitle>
                              <Badge className={getCategoryColor(template.category)}>
                                {getCategoryIcon(template.category)}
                                {template.category}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            {template.description && (
                              <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                                {template.description}
                              </p>
                            )}
                            <div className="flex items-center justify-between text-xs text-gray-500">
                              <span>Last used: {new Date(template.lastUsed!).toLocaleDateString()}</span>
                              <span>{template.estimatedDuration}h est.</span>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* All Templates */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">
                    All Templates ({filteredTemplates.length})
                  </h3>
                  {filteredTemplates.length > 0 ? (
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {filteredTemplates.map((template) => (
                        <Card 
                          key={`all-${template.id}`}
                          className={`cursor-pointer transition-all hover:shadow-md ${
                            selectedTemplate?.id === template.id ? 'ring-2 ring-blue-500' : ''
                          }`}
                          onClick={() => handleSelectTemplate(template)}
                          data-testid={`all-template-card-${template.id}`}
                        >
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between">
                              <CardTitle className="text-sm line-clamp-2">{template.name}</CardTitle>
                              <Badge className={getCategoryColor(template.category)}>
                                {getCategoryIcon(template.category)}
                                {template.category}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            {template.description && (
                              <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                                {template.description}
                              </p>
                            )}
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="flex items-center gap-1 text-gray-500">
                                  <Clock className="h-3 w-3" />
                                  {template.estimatedDuration || 'N/A'}h
                                </span>
                                <span>v{template.version}</span>
                              </div>
                              {template.requiredCertifications && template.requiredCertifications.length > 0 && (
                                <div className="flex items-center gap-1 text-xs text-orange-600">
                                  <Shield className="h-3 w-3" />
                                  Certifications required
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                      <p>No templates found</p>
                      <p className="text-sm">Try adjusting your search or filters</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-sm text-gray-500">
              {selectedTemplate && (
                <span>Selected: {selectedTemplate.name}</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-template"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleConfirmSelection}
                disabled={!selectedTemplate}
                data-testid="button-use-template"
              >
                Use Template
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}