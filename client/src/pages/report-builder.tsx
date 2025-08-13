import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  FileText, 
  Plus, 
  Settings, 
  Eye, 
  Download, 
  Share,
  BarChart3,
  Image,
  MapPin,
  Palette,
  Save,
  Copy,
  Trash2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ReportTemplate {
  id: string;
  name: string;
  description?: string;
  templateType: 'survey' | 'air_monitoring' | 'compliance' | 'custom';
  sections: string[];
  fields: string[];
  filters?: string;
  layout: 'standard' | 'detailed' | 'summary';
  includeCharts: boolean;
  includePhotos: boolean;
  includeMaps: boolean;
  headerText?: string;
  footerText?: string;
  logoUrl?: string;
  createdBy: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function ReportBuilder() {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ReportTemplate | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [newTemplate, setNewTemplate] = useState({
    name: "",
    description: "",
    templateType: "survey" as const,
    sections: [] as string[],
    fields: [] as string[],
    layout: "standard" as const,
    includeCharts: false,
    includePhotos: true,
    includeMaps: false,
    headerText: "",
    footerText: "",
    isPublic: false,
  });

  // Fetch report templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ["/api/report-templates"],
    queryFn: () => apiRequest("GET", "/api/report-templates"),
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: async (templateData: typeof newTemplate) => {
      return await apiRequest("POST", "/api/report-templates", templateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/report-templates"] });
      toast({
        title: "Template Created",
        description: "Report template has been created successfully.",
      });
      setIsCreateModalOpen(false);
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create report template.",
        variant: "destructive",
      });
    },
  });

  // Generate report mutation
  const generateReportMutation = useMutation({
    mutationFn: async ({ templateId, surveyIds }: { templateId: string; surveyIds: string[] }) => {
      return await apiRequest("POST", `/api/report-templates/${templateId}/generate`, { surveyIds });
    },
    onSuccess: (data) => {
      toast({
        title: "Report Generated",
        description: "Your report has been generated and is ready for download.",
      });
      // Download the report
      window.open(data.downloadUrl, '_blank');
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate report.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setNewTemplate({
      name: "",
      description: "",
      templateType: "survey",
      sections: [],
      fields: [],
      layout: "standard",
      includeCharts: false,
      includePhotos: true,
      includeMaps: false,
      headerText: "",
      footerText: "",
      isPublic: false,
    });
  };

  const availableSections = [
    "Executive Summary",
    "Survey Overview",
    "Methodology",
    "Findings",
    "Observations",
    "Photos",
    "Lab Results",
    "Risk Assessment",
    "Recommendations",
    "Appendices",
    "Chain of Custody",
    "Compliance Status"
  ];

  const availableFields = [
    "Site Name",
    "Address",
    "Survey Date",
    "Inspector",
    "Client Name",
    "Job Number",
    "Weather Conditions",
    "Equipment Used",
    "Sample IDs",
    "Material Types",
    "Risk Levels",
    "Asbestos Results",
    "Lead Results",
    "GPS Coordinates"
  ];

  const toggleSection = (section: string) => {
    setNewTemplate(prev => ({
      ...prev,
      sections: prev.sections.includes(section)
        ? prev.sections.filter(s => s !== section)
        : [...prev.sections, section]
    }));
  };

  const toggleField = (field: string) => {
    setNewTemplate(prev => ({
      ...prev,
      fields: prev.fields.includes(field)
        ? prev.fields.filter(f => f !== field)
        : [...prev.fields, field]
    }));
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-64">Loading report templates...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Custom Report Builder</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Create and manage custom report templates for surveys and assessments
          </p>
        </div>
        <Button 
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700"
          data-testid="button-create-template"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Template
        </Button>
      </div>

      <Tabs defaultValue="templates" className="space-y-6">
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="generated">Generated Reports</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates?.map((template: ReportTemplate) => (
              <Card key={template.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <Badge className={
                      template.templateType === 'survey' ? 'bg-blue-100 text-blue-800' :
                      template.templateType === 'air_monitoring' ? 'bg-green-100 text-green-800' :
                      template.templateType === 'compliance' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }>
                      {template.templateType.replace('_', ' ')}
                    </Badge>
                  </div>
                  <CardDescription>{template.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Sections: {template.sections.length}</span>
                      <span>Fields: {template.fields.length}</span>
                    </div>
                    <div className="flex gap-2">
                      {template.includeCharts && (
                        <Badge variant="outline" className="text-xs">
                          <BarChart3 className="h-3 w-3 mr-1" />
                          Charts
                        </Badge>
                      )}
                      {template.includePhotos && (
                        <Badge variant="outline" className="text-xs">
                          <Image className="h-3 w-3 mr-1" />
                          Photos
                        </Badge>
                      )}
                      {template.includeMaps && (
                        <Badge variant="outline" className="text-xs">
                          <MapPin className="h-3 w-3 mr-1" />
                          Maps
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSelectedTemplate(template);
                          setPreviewMode(true);
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Preview
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => generateReportMutation.mutate({ 
                          templateId: template.id, 
                          surveyIds: [] // Will be populated from survey selection
                        })}
                        disabled={generateReportMutation.isPending}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Generate
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="generated" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Generated Reports</CardTitle>
              <CardDescription>
                View and download previously generated reports
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No generated reports yet</p>
                <p className="text-sm">Generated reports will appear here</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Report Builder Settings</CardTitle>
              <CardDescription>
                Configure default settings for report generation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="default-logo">Default Logo URL</Label>
                  <Input id="default-logo" placeholder="https://..." />
                </div>
                <div>
                  <Label htmlFor="company-name">Company Name</Label>
                  <Input id="company-name" placeholder="Your Company" />
                </div>
                <div>
                  <Label htmlFor="default-header">Default Header Text</Label>
                  <Input id="default-header" placeholder="Environmental Assessment Report" />
                </div>
                <div>
                  <Label htmlFor="default-footer">Default Footer Text</Label>
                  <Input id="default-footer" placeholder="© 2025 Your Company. All rights reserved." />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Template Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Report Template</DialogTitle>
            <DialogDescription>
              Design a custom report template for your surveys and assessments
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="template-name">Template Name</Label>
                <Input 
                  id="template-name"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  placeholder="Monthly Assessment Report"
                  data-testid="input-template-name"
                />
              </div>
              <div>
                <Label htmlFor="template-type">Template Type</Label>
                <Select value={newTemplate.templateType} onValueChange={(value) => setNewTemplate({ ...newTemplate, templateType: value as any })}>
                  <SelectTrigger data-testid="select-template-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="survey">Survey Report</SelectItem>
                    <SelectItem value="air_monitoring">Air Monitoring</SelectItem>
                    <SelectItem value="compliance">Compliance Report</SelectItem>
                    <SelectItem value="custom">Custom Report</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="template-description">Description</Label>
              <Textarea 
                id="template-description"
                value={newTemplate.description}
                onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                placeholder="Brief description of this report template..."
                data-testid="textarea-template-description"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label className="text-base font-medium mb-3 block">Report Sections</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                  {availableSections.map(section => (
                    <div key={section} className="flex items-center space-x-2">
                      <Switch
                        checked={newTemplate.sections.includes(section)}
                        onCheckedChange={() => toggleSection(section)}
                        data-testid={`switch-section-${section.toLowerCase().replace(' ', '-')}`}
                      />
                      <Label className="text-sm">{section}</Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-base font-medium mb-3 block">Data Fields</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                  {availableFields.map(field => (
                    <div key={field} className="flex items-center space-x-2">
                      <Switch
                        checked={newTemplate.fields.includes(field)}
                        onCheckedChange={() => toggleField(field)}
                        data-testid={`switch-field-${field.toLowerCase().replace(' ', '-')}`}
                      />
                      <Label className="text-sm">{field}</Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="layout">Layout Style</Label>
                <Select value={newTemplate.layout} onValueChange={(value) => setNewTemplate({ ...newTemplate, layout: value as any })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard</SelectItem>
                    <SelectItem value="detailed">Detailed</SelectItem>
                    <SelectItem value="summary">Summary</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2 pt-6">
                <Switch
                  checked={newTemplate.includeCharts}
                  onCheckedChange={(checked) => setNewTemplate({ ...newTemplate, includeCharts: checked })}
                />
                <Label>Include Charts</Label>
              </div>
              
              <div className="flex items-center space-x-2 pt-6">
                <Switch
                  checked={newTemplate.includePhotos}
                  onCheckedChange={(checked) => setNewTemplate({ ...newTemplate, includePhotos: checked })}
                />
                <Label>Include Photos</Label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="header-text">Header Text</Label>
                <Input 
                  id="header-text"
                  value={newTemplate.headerText}
                  onChange={(e) => setNewTemplate({ ...newTemplate, headerText: e.target.value })}
                  placeholder="Report header text..."
                />
              </div>
              <div>
                <Label htmlFor="footer-text">Footer Text</Label>
                <Input 
                  id="footer-text"
                  value={newTemplate.footerText}
                  onChange={(e) => setNewTemplate({ ...newTemplate, footerText: e.target.value })}
                  placeholder="Report footer text..."
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                checked={newTemplate.isPublic}
                onCheckedChange={(checked) => setNewTemplate({ ...newTemplate, isPublic: checked })}
              />
              <Label>Make this template public (visible to all users)</Label>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => createTemplateMutation.mutate(newTemplate)}
                disabled={createTemplateMutation.isPending || !newTemplate.name}
                data-testid="button-save-template"
              >
                <Save className="h-4 w-4 mr-2" />
                {createTemplateMutation.isPending ? "Creating..." : "Create Template"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}