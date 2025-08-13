import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Play, 
  Pause, 
  CheckCircle, 
  Clock, 
  User, 
  Calendar,
  ArrowRight,
  AlertCircle,
  MoreHorizontal
} from "lucide-react";

interface WorkflowStep {
  id: string;
  stepNumber: number;
  name: string;
  description?: string;
  status: 'pending' | 'in-progress' | 'completed' | 'skipped';
  assignedTo?: string;
  estimatedDuration?: number;
  actualDuration?: number;
  startDate?: string;
  completedDate?: string;
}

interface WorkflowInstance {
  id: string;
  surveyId: string;
  status: 'active' | 'completed' | 'cancelled' | 'paused';
  currentStep: number;
  progress: number;
  assignedTo?: string;
  startDate: string;
  dueDate?: string;
  completedDate?: string;
  steps?: WorkflowStep[];
}

interface WorkflowManagerProps {
  surveyId: string;
}

export function WorkflowManager({ surveyId }: WorkflowManagerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedAssignee, setSelectedAssignee] = useState<string>("");

  const { data: workflow, isLoading } = useQuery<WorkflowInstance>({
    queryKey: ["/api/workflows", surveyId],
    enabled: !!surveyId,
  });

  const updateWorkflowMutation = useMutation({
    mutationFn: async ({ action, stepId, data }: any) => {
      return await apiRequest("POST", `/api/workflows/${workflow?.id}/${action}`, {
        stepId,
        ...data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workflows", surveyId] });
      toast({
        title: "Workflow Updated",
        description: "Workflow status has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update workflow",
        variant: "destructive",
      });
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'in-progress':
        return <Play className="h-4 w-4 text-blue-600" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-gray-400" />;
      default:
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      case 'paused':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleStepAction = (stepId: string, action: string) => {
    updateWorkflowMutation.mutate({
      action,
      stepId,
      data: { assignedTo: selectedAssignee }
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!workflow) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Workflow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-gray-500">
            <Clock className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p>No workflow configured for this survey</p>
            <Button 
              className="mt-3" 
              size="sm" 
              onClick={() => updateWorkflowMutation.mutate({ action: 'create', data: {} })}
              data-testid="button-create-workflow"
            >
              Create Workflow
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            Workflow Progress
            <Badge className={getStatusColor(workflow.status)}>
              {workflow.status.charAt(0).toUpperCase() + workflow.status.slice(1)}
            </Badge>
          </div>
          <div className="text-sm text-gray-500">
            {workflow.progress}% Complete
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress value={workflow.progress} className="w-full" />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Started: {new Date(workflow.startDate).toLocaleDateString()}</span>
              {workflow.dueDate && (
                <span>Due: {new Date(workflow.dueDate).toLocaleDateString()}</span>
              )}
            </div>
          </div>

          {/* Assignment */}
          <div className="flex items-center gap-4">
            <Select value={selectedAssignee} onValueChange={setSelectedAssignee}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Assign to..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="john">John Inspector</SelectItem>
                <SelectItem value="sarah">Sarah Johnson</SelectItem>
                <SelectItem value="mike">Mike Chen</SelectItem>
              </SelectContent>
            </Select>
            {workflow.assignedTo && (
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <User className="h-4 w-4" />
                Currently: {workflow.assignedTo}
              </div>
            )}
          </div>

          {/* Workflow Steps */}
          {workflow.steps && workflow.steps.length > 0 && (
            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Steps</h4>
              {workflow.steps.map((step, index) => (
                <div 
                  key={step.id} 
                  className={`flex items-center gap-4 p-3 rounded-lg border ${
                    step.status === 'in-progress' ? 'bg-blue-50 border-blue-200' : 
                    step.status === 'completed' ? 'bg-green-50 border-green-200' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex-shrink-0">
                    {getStatusIcon(step.status)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        {step.stepNumber}. {step.name}
                      </span>
                      <Badge variant="outline" className={getStatusColor(step.status)}>
                        {step.status.replace('-', ' ')}
                      </Badge>
                    </div>
                    {step.description && (
                      <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                      {step.estimatedDuration && (
                        <span>Est: {step.estimatedDuration}min</span>
                      )}
                      {step.actualDuration && (
                        <span>Actual: {step.actualDuration}min</span>
                      )}
                      {step.assignedTo && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {step.assignedTo}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex-shrink-0 flex gap-2">
                    {step.status === 'pending' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStepAction(step.id, 'start')}
                        data-testid={`button-start-step-${step.id}`}
                      >
                        <Play className="h-3 w-3" />
                      </Button>
                    )}
                    {step.status === 'in-progress' && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleStepAction(step.id, 'pause')}
                          data-testid={`button-pause-step-${step.id}`}
                        >
                          <Pause className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleStepAction(step.id, 'complete')}
                          data-testid={`button-complete-step-${step.id}`}
                        >
                          <CheckCircle className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Workflow Actions */}
          <div className="flex gap-2 pt-4 border-t">
            {workflow.status === 'active' && (
              <Button
                variant="outline"
                onClick={() => updateWorkflowMutation.mutate({ action: 'pause', data: {} })}
                data-testid="button-pause-workflow"
              >
                <Pause className="h-4 w-4 mr-2" />
                Pause Workflow
              </Button>
            )}
            {workflow.status === 'paused' && (
              <Button
                onClick={() => updateWorkflowMutation.mutate({ action: 'resume', data: {} })}
                data-testid="button-resume-workflow"
              >
                <Play className="h-4 w-4 mr-2" />
                Resume Workflow
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => updateWorkflowMutation.mutate({ action: 'reset', data: {} })}
              data-testid="button-reset-workflow"
            >
              Reset Workflow
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}