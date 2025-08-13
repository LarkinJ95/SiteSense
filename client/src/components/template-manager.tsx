import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Copy, 
  FileText, 
  Star,
  Users,
  Clock,
  Settings
} from "lucide-react";

interface SurveyTemplate {
  id: string;
  name: string;
  description?: string;
  surveyType: string;
  category: string;
  version: string;
  estimatedDuration?: number;
  requiredCertifications?: string[];
  safetyRequirements?: string[];
  equipmentRequired?: string[];
  usageCount: number;
  isPublic: boolean;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
}

export function TemplateManager() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SurveyTemplate | null>(null);
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    surveyType: "",
    category: "general",
    estimatedDuration: "",
    requiredCertifications: "",
    safetyRequirements: "",
    equipmentRequired: "",
  });

  const { data: templates = [], isLoading } = useQuery<SurveyTemplate[]>({
    queryKey: ["/api/survey-templates", { category: categoryFilter }],
  });

  const createTemplateMutation = useMutation({
    mutationFn: async (templateData: any) => {
      return await apiRequest("POST", "/api/survey-templates", {
        ...templateData,
        requiredCertifications: templateData.requiredCertifications ? 
          templateData.requiredCertifications.split(',').map((s: string) => s.trim()) : [],
        safetyRequirements: templateData.safetyRequirements ? 
          templateData.safetyRequirements.split(',').map((s: string) => s.trim()) : [],
        equipmentRequired: templateData.equipmentRequired ? 
          templateData.equipmentRequired.split(',').map((s: string) => s.trim()) : [],
        estimatedDuration: templateData.estimatedDuration ? parseInt(templateData.estimatedDuration) : undefined,
        createdBy: "current-user", // Would come from auth context
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/survey-templates"] });
      setShowCreateDialog(false);
      resetForm();
      toast({
        title: "Template Created",
        description: "Survey template has been created successfully.",
      });
    },
  });

  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      return await apiRequest("PATCH", `/api/survey-templates/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/survey-templates"] });
      setEditingTemplate(null);
      toast({
        title: "Template Updated",
        description: "Survey template has been updated successfully.",
      });
    },
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/survey-templates/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/survey-templates"] });
      toast({
        title: "Template Deleted",
        description: "Survey template has been deleted successfully.",
      });
    },
  });

  const duplicateTemplateMutation = useMutation({
    mutationFn: async (template: SurveyTemplate) => {
      return await apiRequest("POST", "/api/survey-templates", {
        ...template,
        id: undefined,
        name: `${template.name} (Copy)`,
        version: "1.0",
        usageCount: 0,
        createdBy: "current-user",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/survey-templates"] });
      toast({
        title: "Template Duplicated",
        description: "Template has been duplicated successfully.",
      });
    },
  });

  const resetForm = () => {
    setNewTemplate({
      name: "",
      description: "",
      surveyType: "",
      category: "general",
      estimatedDuration: "",
      requiredCertifications: "",
      safetyRequirements: "",
      equipmentRequired: "",
    });
  };

  const handleCreateTemplate = () => {
    createTemplateMutation.mutate(newTemplate);
  };

  const handleEditTemplate = (template: SurveyTemplate) => {
    setEditingTemplate(template);
    setNewTemplate({
      name: template.name,
      description: template.description || "",
      surveyType: template.surveyType,
      category: template.category,
      estimatedDuration: template.estimatedDuration?.toString() || "",
      requiredCertifications: template.requiredCertifications?.join(', ') || "",
      safetyRequirements: template.safetyRequirements?.join(', ') || "",
      equipmentRequired: template.equipmentRequired?.join(', ') || "",
    });
  };

  const handleUpdateTemplate = () => {
    if (!editingTemplate) return;
    
    updateTemplateMutation.mutate({
      id: editingTemplate.id,
      ...newTemplate,
      requiredCertifications: newTemplate.requiredCertifications ? 
        newTemplate.requiredCertifications.split(',').map(s => s.trim()) : [],
      safetyRequirements: newTemplate.safetyRequirements ? 
        newTemplate.safetyRequirements.split(',').map(s => s.trim()) : [],
      equipmentRequired: newTemplate.equipmentRequired ? 
        newTemplate.equipmentRequired.split(',').map(s => s.trim()) : [],
      estimatedDuration: newTemplate.estimatedDuration ? parseInt(newTemplate.estimatedDuration) : undefined,
    });
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

  const filteredTemplates = templates.filter(template => 
    categoryFilter === "all" || template.category === categoryFilter
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            Template Management
            <Badge variant="outline">{filteredTemplates.length} templates</Badge>
          </div>
          <Dialog open={showCreateDialog || !!editingTemplate} onOpenChange={(open) => {
            if (!open) {
              setShowCreateDialog(false);
              setEditingTemplate(null);
              resetForm();
            }
          }}>
            <DialogTrigger asChild>
              <Button onClick={() => setShowCreateDialog(true)} data-testid="button-create-template">
                <Plus className="h-4 w-4 mr-2" />
                New Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingTemplate ? 'Edit Template' : 'Create New Template'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Template Name *</label>
                    <Input
                      placeholder="e.g., Standard Asbestos Survey"
                      value={newTemplate.name}
                      onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                      data-testid="input-template-name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Survey Type *</label>
                    <Select value={newTemplate.surveyType} onValueChange={(value) => setNewTemplate({ ...newTemplate, surveyType: value })}>
                      <SelectTrigger data-testid="select-template-survey-type">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Asbestos">Asbestos</SelectItem>
                        <SelectItem value="Lead Paint">Lead Paint</SelectItem>
                        <SelectItem value="Asbestos + Lead">Asbestos + Lead</SelectItem>
                        <SelectItem value="Asbestos + Lead + Cadmium">Asbestos + Lead + Cadmium</SelectItem>
                        <SelectItem value="Environmental">Environmental</SelectItem>
                        <SelectItem value="Safety Inspection">Safety Inspection</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Description</label>
                  <Textarea
                    placeholder="Describe when and how to use this template..."
                    value={newTemplate.description}
                    onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                    rows={3}
                    data-testid="textarea-template-description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Category</label>
                    <Select value={newTemplate.category} onValueChange={(value) => setNewTemplate({ ...newTemplate, category: value })}>
                      <SelectTrigger data-testid="select-template-category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="asbestos">Asbestos</SelectItem>
                        <SelectItem value="lead">Lead Paint</SelectItem>
                        <SelectItem value="environmental">Environmental</SelectItem>
                        <SelectItem value="safety">Safety</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-1 block">Estimated Duration (hours)</label>
                    <Input
                      type="number"
                      placeholder="e.g., 4"
                      value={newTemplate.estimatedDuration}
                      onChange={(e) => setNewTemplate({ ...newTemplate, estimatedDuration: e.target.value })}
                      data-testid="input-template-duration"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Required Certifications</label>
                  <Input
                    placeholder="e.g., Asbestos Inspector, Lead Inspector (comma-separated)"
                    value={newTemplate.requiredCertifications}
                    onChange={(e) => setNewTemplate({ ...newTemplate, requiredCertifications: e.target.value })}
                    data-testid="input-template-certifications"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Safety Requirements</label>
                  <Input
                    placeholder="e.g., Respirator, Tyvek suit, Safety glasses (comma-separated)"
                    value={newTemplate.safetyRequirements}
                    onChange={(e) => setNewTemplate({ ...newTemplate, safetyRequirements: e.target.value })}
                    data-testid="input-template-safety"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Required Equipment</label>
                  <Input
                    placeholder="e.g., Sample containers, Labels, Camera (comma-separated)"
                    value={newTemplate.equipmentRequired}
                    onChange={(e) => setNewTemplate({ ...newTemplate, equipmentRequired: e.target.value })}
                    data-testid="input-template-equipment"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setShowCreateDialog(false);
                      setEditingTemplate(null);
                      resetForm();
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={editingTemplate ? handleUpdateTemplate : handleCreateTemplate}
                    disabled={!newTemplate.name || !newTemplate.surveyType}
                    className="flex-1"
                  >
                    {editingTemplate ? 'Update' : 'Create'} Template
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="mb-4">
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by category" />
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

        {/* Template List */}
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
        ) : filteredTemplates.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((template) => (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-sm line-clamp-2">{template.name}</CardTitle>
                    <Badge className={getCategoryColor(template.category)}>
                      {template.category}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600">{template.surveyType}</p>
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
                      <span className="flex items-center gap-1 text-gray-500">
                        <Users className="h-3 w-3" />
                        {template.usageCount} uses
                      </span>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs">
                      <span>v{template.version}</span>
                      <span className={`px-2 py-1 rounded-full ${template.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                        {template.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-1 mt-3">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditTemplate(template)}
                      data-testid={`button-edit-template-${template.id}`}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => duplicateTemplateMutation.mutate(template)}
                      data-testid={`button-duplicate-template-${template.id}`}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteTemplateMutation.mutate(template.id)}
                      data-testid={`button-delete-template-${template.id}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <FileText className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No templates found</p>
            <p className="text-sm">Create your first survey template to get started</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}