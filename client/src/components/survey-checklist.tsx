import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  CheckSquare, 
  Square, 
  AlertCircle, 
  Camera, 
  FileText, 
  Clock,
  CheckCircle,
  XCircle,
  Upload
} from "lucide-react";

interface ChecklistItem {
  id: string;
  text: string;
  description?: string;
  itemType: 'checkbox' | 'text_input' | 'number_input' | 'file_upload' | 'photo';
  isRequired: boolean;
  order: number;
  validationRules?: string;
  defaultValue?: string;
  options?: string[];
}

interface ChecklistTemplate {
  id: string;
  name: string;
  description?: string;
  category: 'pre-survey' | 'during-survey' | 'post-survey' | 'safety' | 'equipment';
  isRequired: boolean;
  order: number;
  items: ChecklistItem[];
}

interface ChecklistResponse {
  itemId: string;
  response: string;
  isCompleted: boolean;
  completedBy?: string;
  completedAt?: string;
  notes?: string;
  attachments?: string[];
}

interface SurveyChecklistProps {
  surveyId: string;
  templateId?: string;
  readOnly?: boolean;
}

export function SurveyChecklist({ surveyId, templateId, readOnly = false }: SurveyChecklistProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [responses, setResponses] = useState<Record<string, ChecklistResponse>>({});
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    'pre-survey': true,
    'safety': true,
  });

  const { data: checklists = [], isLoading: checklistsLoading } = useQuery<ChecklistTemplate[]>({
    queryKey: ["/api/survey-checklists", surveyId, templateId],
    enabled: !!surveyId,
  });

  const { data: existingResponses = [], isLoading: responsesLoading } = useQuery<ChecklistResponse[]>({
    queryKey: ["/api/checklist-responses", surveyId],
    enabled: !!surveyId,
  });

  const saveResponseMutation = useMutation({
    mutationFn: async (responseData: ChecklistResponse) => {
      return await apiRequest("POST", `/api/checklist-responses/${surveyId}`, responseData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/checklist-responses", surveyId] });
    },
  });

  const uploadFileMutation = useMutation({
    mutationFn: async ({ file, itemId }: { file: File; itemId: string }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("itemId", itemId);
      return await apiRequest("POST", `/api/checklist-attachments/${surveyId}`, formData);
    },
    onSuccess: (data: any, variables) => {
      const { itemId } = variables;
      setResponses(prev => ({
        ...prev,
        [itemId]: {
          ...prev[itemId],
          attachments: [...(prev[itemId]?.attachments || []), data.filename || data.name],
        }
      }));
      toast({
        title: "File Uploaded",
        description: "File has been uploaded successfully.",
      });
    },
  });

  useEffect(() => {
    // Load existing responses into state
    const responseMap: Record<string, ChecklistResponse> = {};
    existingResponses.forEach(response => {
      responseMap[response.itemId] = response;
    });
    setResponses(responseMap);
  }, [existingResponses]);

  const handleResponseChange = (itemId: string, value: string, isCompleted: boolean = false) => {
    const newResponse: ChecklistResponse = {
      itemId,
      response: value,
      isCompleted: isCompleted || value.length > 0,
      completedBy: 'current-user', // Would come from auth context
      completedAt: new Date().toISOString(),
    };

    setResponses(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], ...newResponse }
    }));

    // Auto-save after a short delay
    setTimeout(() => {
      if (!readOnly) {
        saveResponseMutation.mutate(newResponse);
      }
    }, 500);
  };

  const handleCheckboxChange = (itemId: string, checked: boolean) => {
    handleResponseChange(itemId, checked ? 'true' : 'false', checked);
  };

  const handleFileUpload = (itemId: string, files: FileList) => {
    Array.from(files).forEach(file => {
      uploadFileMutation.mutate({ file, itemId });
    });
  };

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const getCompletionStats = () => {
    const totalItems = checklists.reduce((sum, checklist) => sum + checklist.items.length, 0);
    const completedItems = Object.values(responses).filter(r => r.isCompleted).length;
    const requiredItems = checklists.reduce((sum, checklist) => 
      sum + checklist.items.filter(item => item.isRequired).length, 0
    );
    const completedRequired = checklists.reduce((sum, checklist) => 
      sum + checklist.items.filter(item => 
        item.isRequired && responses[item.id]?.isCompleted
      ).length, 0
    );

    return {
      totalItems,
      completedItems,
      requiredItems,
      completedRequired,
      overallProgress: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
      requiredProgress: requiredItems > 0 ? Math.round((completedRequired / requiredItems) * 100) : 0,
    };
  };

  const renderChecklistItem = (item: ChecklistItem) => {
    const response = responses[item.id];
    const isCompleted = response?.isCompleted || false;

    return (
      <div 
        key={item.id} 
        className={`p-3 border rounded-lg ${isCompleted ? 'bg-green-50 border-green-200' : 'bg-white'}`}
      >
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            {item.itemType === 'checkbox' ? (
              <Checkbox
                checked={response?.response === 'true'}
                onCheckedChange={(checked) => handleCheckboxChange(item.id, !!checked)}
                disabled={readOnly}
                data-testid={`checklist-item-${item.id}`}
              />
            ) : (
              <div className="w-4 h-4 rounded border border-gray-300 flex items-center justify-center">
                {isCompleted ? (
                  <CheckCircle className="w-3 h-3 text-green-600" />
                ) : (
                  <Square className="w-3 h-3 text-gray-400" />
                )}
              </div>
            )}
          </div>
          
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <p className={`text-sm font-medium ${isCompleted ? 'text-green-900' : 'text-gray-900'}`}>
                  {item.text}
                  {item.isRequired && <span className="text-red-500 ml-1">*</span>}
                </p>
                {item.description && (
                  <p className="text-xs text-gray-600 mt-1">{item.description}</p>
                )}
              </div>
              {item.isRequired && (
                <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700">
                  Required
                </Badge>
              )}
            </div>

            {/* Input Fields */}
            {item.itemType === 'text_input' && (
              <Input
                placeholder="Enter response..."
                value={response?.response || ''}
                onChange={(e) => handleResponseChange(item.id, e.target.value)}
                disabled={readOnly}
                className="text-sm"
                data-testid={`text-input-${item.id}`}
              />
            )}

            {item.itemType === 'number_input' && (
              <Input
                type="number"
                placeholder="Enter number..."
                value={response?.response || ''}
                onChange={(e) => handleResponseChange(item.id, e.target.value)}
                disabled={readOnly}
                className="text-sm"
                data-testid={`number-input-${item.id}`}
              />
            )}

            {item.itemType === 'file_upload' && (
              <div className="space-y-2">
                {!readOnly && (
                  <input
                    type="file"
                    multiple
                    onChange={(e) => e.target.files && handleFileUpload(item.id, e.target.files)}
                    className="text-sm"
                    data-testid={`file-input-${item.id}`}
                  />
                )}
                {response?.attachments && response.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {response.attachments.map((filename, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        <FileText className="w-3 h-3 mr-1" />
                        {filename}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            {item.itemType === 'photo' && (
              <div className="space-y-2">
                {!readOnly && (
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => e.target.files && handleFileUpload(item.id, e.target.files)}
                    className="text-sm"
                    data-testid={`photo-input-${item.id}`}
                  />
                )}
                {response?.attachments && response.attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {response.attachments.map((filename, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        <Camera className="w-3 h-3 mr-1" />
                        Photo {index + 1}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Notes Section */}
            {response?.isCompleted && (
              <div className="pt-2 border-t border-gray-200">
                <Textarea
                  placeholder="Add notes (optional)..."
                  value={response?.notes || ''}
                  onChange={(e) => setResponses(prev => ({
                    ...prev,
                    [item.id]: { ...prev[item.id], notes: e.target.value }
                  }))}
                  disabled={readOnly}
                  className="text-xs"
                  rows={2}
                  data-testid={`notes-${item.id}`}
                />
                {response?.completedBy && response?.completedAt && (
                  <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                    <CheckCircle className="w-3 h-3" />
                    Completed by {response.completedBy} on {new Date(response.completedAt).toLocaleString()}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (checklistsLoading || responsesLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Survey Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (checklists.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Survey Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-gray-500">
            <CheckSquare className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p>No checklist items available</p>
            <p className="text-sm">This survey doesn't have a checklist template</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const stats = getCompletionStats();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            Survey Checklist
            <Badge variant="outline">{stats.completedItems}/{stats.totalItems} items</Badge>
          </div>
          <div className="text-sm text-gray-500">
            {stats.overallProgress}% complete
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Progress Overview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span>Overall Progress</span>
              <span>{stats.overallProgress}%</span>
            </div>
            <Progress value={stats.overallProgress} className="h-2" />
            
            {stats.requiredItems > 0 && (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1">
                    <AlertCircle className="h-3 w-3 text-orange-500" />
                    Required Items
                  </span>
                  <span>{stats.completedRequired}/{stats.requiredItems}</span>
                </div>
                <Progress value={stats.requiredProgress} className="h-2" />
              </>
            )}
          </div>

          {/* Checklist Categories */}
          {checklists.map((checklist) => (
            <div key={checklist.id} className="space-y-3">
              <div 
                className="flex items-center justify-between cursor-pointer"
                onClick={() => toggleCategory(checklist.category)}
              >
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-900">{checklist.name}</h3>
                  {checklist.isRequired && (
                    <Badge variant="outline" className="text-xs bg-orange-50 text-orange-700">
                      Required
                    </Badge>
                  )}
                  <Badge variant="secondary" className="text-xs">
                    {checklist.items.filter(item => responses[item.id]?.isCompleted).length}/
                    {checklist.items.length}
                  </Badge>
                </div>
                <Button variant="ghost" size="sm">
                  {expandedCategories[checklist.category] ? '−' : '+'}
                </Button>
              </div>
              
              {checklist.description && (
                <p className="text-sm text-gray-600">{checklist.description}</p>
              )}

              {expandedCategories[checklist.category] && (
                <div className="space-y-2">
                  {checklist.items.map(renderChecklistItem)}
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}