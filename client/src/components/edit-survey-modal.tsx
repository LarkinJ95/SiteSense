import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { type Survey } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

// Edit survey schema - only the fields we want to allow editing
const editSurveySchema = z.object({
  siteName: z.string().min(1, "Site name is required"),
  address: z.string().optional(),
  surveyType: z.string().min(1, "Survey type is required"),
  inspector: z.string().min(1, "Inspector name is required"),
  surveyDate: z.date(),
  status: z.string().min(1, "Status is required"),
  notes: z.string().optional(),
  jobNumber: z.string().optional(),
});

type EditSurveyFormData = z.infer<typeof editSurveySchema>;

interface EditSurveyModalProps {
  survey: Survey | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const surveyTypes = [
  { value: "asbestos", label: "Asbestos" },
  { value: "lead", label: "Lead Paint" },
  { value: "asbestos-lead", label: "Asbestos + Lead" },
  { value: "asbestos-lead-cadmium", label: "Asbestos + Lead + Cadmium" },
  { value: "environmental", label: "Environmental" },
  { value: "structural", label: "Structural" },
  { value: "mold", label: "Mold" },
  { value: "other", label: "Other" }
];

const statusOptions = [
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Scheduled" },
  { value: "in-progress", label: "In Progress" },
  { value: "samples-sent-to-lab", label: "Samples Sent to Lab" },
  { value: "report-completed", label: "Report Completed" },
  { value: "report-sent", label: "Report Sent" },
  { value: "completed", label: "Completed" },
  { value: "on-hold", label: "On Hold" },
  { value: "archived", label: "Archived" }
];

export function EditSurveyModal({ survey, open, onOpenChange }: EditSurveyModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const form = useForm<EditSurveyFormData>({
    resolver: zodResolver(editSurveySchema),
    defaultValues: {
      siteName: "",
      address: "",
      surveyType: "asbestos",
      inspector: "",
      surveyDate: new Date(),
      status: "draft",
      notes: "",
      jobNumber: ""
    },
  });

  // Reset form when survey changes
  useEffect(() => {
    if (survey) {
      form.reset({
        siteName: survey.siteName,
        address: survey.address || "",
        surveyType: survey.surveyType,
        inspector: survey.inspector,
        surveyDate: new Date(survey.surveyDate),
        status: survey.status,
        notes: survey.notes || "",
        jobNumber: survey.jobNumber || ""
      });
    }
  }, [survey, form]);

  const editSurveyMutation = useMutation({
    mutationFn: async (data: EditSurveyFormData) => {
      const response = await fetch(`/api/surveys/${survey?.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        throw new Error("Failed to update survey");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/surveys"] });
      queryClient.invalidateQueries({ queryKey: [`/api/surveys/${survey?.id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({
        title: "Survey Updated",
        description: "The survey details have been updated successfully.",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update survey",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EditSurveyFormData) => {
    editSurveyMutation.mutate(data);
  };

  if (!survey) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto" data-testid="modal-edit-survey">
        <DialogHeader>
          <DialogTitle data-testid="title-edit-survey">Edit Survey Details</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="siteName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Site Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter site name"
                        {...field}
                        data-testid="input-edit-site-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="jobNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Number</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter job number"
                        {...field}
                        data-testid="input-edit-job-number"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter site address"
                      className="resize-none"
                      {...field}
                      data-testid="textarea-edit-address"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="surveyType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Survey Type *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-survey-type">
                          <SelectValue placeholder="Select survey type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {surveyTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-status">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statusOptions.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="inspector"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inspector Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter inspector name"
                        {...field}
                        data-testid="input-edit-inspector"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="surveyDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Survey Date *</FormLabel>
                    <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            data-testid="button-edit-survey-date"
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                            field.onChange(date);
                            setIsCalendarOpen(false);
                          }}
                          disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes or comments"
                      className="resize-none"
                      rows={3}
                      {...field}
                      data-testid="textarea-edit-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="sm:w-auto"
                data-testid="button-cancel-edit"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={editSurveyMutation.isPending}
                className="sm:w-auto"
                data-testid="button-save-survey"
              >
                {editSurveyMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}