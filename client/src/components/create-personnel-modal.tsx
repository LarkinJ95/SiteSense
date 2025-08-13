import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const createPersonnelSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  employeeId: z.string().optional(),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
  company: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional(),
  certifications: z.array(z.string()).optional(),
  medicalClearance: z.boolean().optional().default(false),
  lastMedicalDate: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});

type CreatePersonnelFormData = z.infer<typeof createPersonnelSchema>;

interface CreatePersonnelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreatePersonnelModal({ open, onOpenChange }: CreatePersonnelModalProps) {
  const { toast } = useToast();
  const [certificationInput, setCertificationInput] = useState("");

  const form = useForm<CreatePersonnelFormData>({
    resolver: zodResolver(createPersonnelSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      employeeId: "",
      jobTitle: "",
      department: "",
      company: "",
      email: "",
      phone: "",
      certifications: [],
      medicalClearance: false,
      lastMedicalDate: "",
      notes: "",
      isActive: true,
    },
  });

  const createPersonnelMutation = useMutation({
    mutationFn: (data: CreatePersonnelFormData) => apiRequest("/api/personnel", "POST", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/personnel"] });
      toast({
        title: "Success",
        description: "Personnel profile created successfully",
      });
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create personnel profile",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CreatePersonnelFormData) => {
    createPersonnelMutation.mutate(data);
  };

  const addCertification = () => {
    if (certificationInput.trim()) {
      const currentCertifications = form.getValues("certifications") || [];
      const newCertifications = [...currentCertifications, certificationInput.trim()];
      form.setValue("certifications", newCertifications);
      setCertificationInput("");
    }
  };

  const removeCertification = (index: number) => {
    const currentCertifications = form.getValues("certifications") || [];
    const newCertifications = currentCertifications.filter((_, i) => i !== index);
    form.setValue("certifications", newCertifications);
  };

  const watchedCertifications = form.watch("certifications") || [];

  useEffect(() => {
    if (!open) {
      form.reset();
      setCertificationInput("");
    }
  }, [open, form]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Personnel Profile</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter first name" {...field} data-testid="input-first-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter last name" {...field} data-testid="input-last-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="employeeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee ID</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., EMP-001" {...field} data-testid="input-employee-id" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="jobTitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Title</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Environmental Technician" {...field} data-testid="input-job-title" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Environmental Services" {...field} data-testid="input-department" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="company"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., ABC Environmental" {...field} data-testid="input-company" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="person@company.com" type="email" {...field} data-testid="input-email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input placeholder="(555) 123-4567" {...field} data-testid="input-phone" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="certification-input">Certifications</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="certification-input"
                    placeholder="e.g., OSHA 10-Hour, Asbestos Inspector"
                    value={certificationInput}
                    onChange={(e) => setCertificationInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCertification())}
                    data-testid="input-certification"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={addCertification}
                    data-testid="button-add-certification"
                  >
                    Add
                  </Button>
                </div>
                {watchedCertifications.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {watchedCertifications.map((cert, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => removeCertification(index)}
                        data-testid={`badge-certification-${index}`}
                      >
                        {cert} ×
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="medicalClearance"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="checkbox-medical-clearance"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>
                          Medical Clearance
                        </FormLabel>
                      </div>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastMedicalDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Medical Exam Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-medical-date" />
                      </FormControl>
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
                        placeholder="Additional notes about this person..." 
                        rows={4} 
                        {...field} 
                        data-testid="textarea-notes"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="checkbox-is-active"
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        Active Employee
                      </FormLabel>
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={createPersonnelMutation.isPending}
                data-testid="button-create-personnel"
              >
                {createPersonnelMutation.isPending ? "Creating..." : "Create Personnel Profile"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}