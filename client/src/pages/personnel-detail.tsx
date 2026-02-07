import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Plus, Save, Trash2, Users } from "lucide-react";

type Person = {
  personId: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  company?: string | null;
  tradeRole?: string | null;
  employeeId?: string | null;
  email?: string | null;
  phone?: string | null;
  respiratorClearanceDate?: string | null;
  fitTestDate?: string | null;
  medicalSurveillanceDate?: string | null;
  active: boolean;
  createdAt?: number | null;
  updatedAt?: number | null;
};

type Assignment = any;

type ExposureResponse = {
  records: any[];
  summary: Array<{
    analyte: string;
    count: number;
    maxTwa: number | null;
    avgTwa: number | null;
    exceedances: number;
    nearMisses: number;
  }>;
};

type AirJobRow = { id: string; jobNumber?: string | null; jobName?: string | null; siteName?: string | null; clientName?: string | null; startDate?: number | null };

const fmtDate = (ms?: number | null) => {
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString();
};

export default function PersonnelDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: person, isLoading } = useQuery<Person>({
    queryKey: [`/api/personnel/${id}`],
  });

  const { data: assignments = [] } = useQuery<Assignment[]>({
    queryKey: [`/api/personnel/${id}/assignments`],
  });

  const [range, setRange] = useState<"12mo" | "ytd" | "all">("12mo");
  const { data: exposures } = useQuery<ExposureResponse>({
    queryKey: [`/api/personnel/${id}/exposures?range=${range}`],
    enabled: Boolean(id),
    queryFn: async () => (await apiRequest("GET", `/api/personnel/${id}/exposures?range=${range}`)).json(),
  });

  const { data: jobs = [] } = useQuery<AirJobRow[]>({
    queryKey: ["/api/air-monitoring-jobs"],
  });

  const [edit, setEdit] = useState({
    firstName: "",
    lastName: "",
    company: "",
    tradeRole: "",
    employeeId: "",
    email: "",
    phone: "",
    respiratorClearanceDate: "",
    fitTestDate: "",
    medicalSurveillanceDate: "",
    active: true,
  });

  useEffect(() => {
    if (!person) return;
    setEdit({
      firstName: person.firstName || "",
      lastName: person.lastName || "",
      company: person.company || "",
      tradeRole: person.tradeRole || "",
      employeeId: person.employeeId || "",
      email: person.email || "",
      phone: person.phone || "",
      respiratorClearanceDate: person.respiratorClearanceDate || "",
      fitTestDate: person.fitTestDate || "",
      medicalSurveillanceDate: person.medicalSurveillanceDate || "",
      active: Boolean(person.active),
    });
  }, [person]);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        firstName: edit.firstName.trim(),
        lastName: edit.lastName.trim(),
        company: edit.company || null,
        tradeRole: edit.tradeRole || null,
        employeeId: edit.employeeId || null,
        email: edit.email || null,
        phone: edit.phone || null,
        respiratorClearanceDate: edit.respiratorClearanceDate || null,
        fitTestDate: edit.fitTestDate || null,
        medicalSurveillanceDate: edit.medicalSurveillanceDate || null,
        active: edit.active,
      };
      const res = await apiRequest("PUT", `/api/personnel/${id}`, payload);
      return (await res.json()) as Person;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/personnel/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/personnel"] });
      toast({ title: "Saved", description: "Personnel updated." });
    },
    onError: (error: any) => {
      toast({ title: "Failed", description: error?.message || "Unable to save changes.", variant: "destructive" });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/personnel/${id}/deactivate`, {});
      return (await res.json()) as Person;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/personnel/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/personnel"] });
    },
    onError: (error: any) => {
      toast({ title: "Failed", description: error?.message || "Unable to deactivate.", variant: "destructive" });
    },
  });

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({
    jobId: "",
    shiftDate: "",
    roleOnJob: "",
    supervisorName: "",
    notes: "",
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        jobId: assignForm.jobId,
        shiftDate: assignForm.shiftDate || null,
        roleOnJob: assignForm.roleOnJob || null,
        supervisorName: assignForm.supervisorName || null,
        notes: assignForm.notes || null,
      };
      const res = await apiRequest("POST", `/api/personnel/${id}/assignments`, payload);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/personnel/${id}/assignments`] });
      setAssignOpen(false);
      setAssignForm({ jobId: "", shiftDate: "", roleOnJob: "", supervisorName: "", notes: "" });
    },
    onError: (error: any) => {
      toast({ title: "Failed", description: error?.message || "Unable to add assignment.", variant: "destructive" });
    },
  });

  const exposureRows = exposures?.records || [];
  const exposureSummary = exposures?.summary || [];

  const recordsByAnalyte = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of exposureRows) {
      const a = (r.analyte || "unknown").toString();
      map[a] = (map[a] || 0) + 1;
    }
    return map;
  }, [exposureRows]);

  if (isLoading || !person) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => setLocation("/personnel")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <div className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6" />
              {person.lastName}, {person.firstName}
              {!person.active ? <Badge variant="secondary">Inactive</Badge> : null}
            </div>
            <div className="text-sm text-gray-600">
              {person.company ? person.company : "—"}{person.tradeRole ? ` · ${person.tradeRole}` : ""}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => updateMutation.mutate()} disabled={!edit.firstName.trim() || !edit.lastName.trim() || updateMutation.isPending}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
          <Button variant="destructive" onClick={() => deactivateMutation.mutate()} disabled={deactivateMutation.isPending}>
            <Trash2 className="h-4 w-4 mr-2" />
            Deactivate
          </Button>
        </div>
      </div>

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="jobs">Job History</TabsTrigger>
          <TabsTrigger value="summary">Exposure Summary</TabsTrigger>
          <TabsTrigger value="records">Exposure Records</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>First Name</Label>
                  <Input value={edit.firstName} onChange={(e) => setEdit({ ...edit, firstName: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Last Name</Label>
                  <Input value={edit.lastName} onChange={(e) => setEdit({ ...edit, lastName: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Company</Label>
                  <Input value={edit.company} onChange={(e) => setEdit({ ...edit, company: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Trade/Role</Label>
                  <Input value={edit.tradeRole} onChange={(e) => setEdit({ ...edit, tradeRole: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Employee ID</Label>
                  <Input value={edit.employeeId} onChange={(e) => setEdit({ ...edit, employeeId: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Respirator Clearance</Label>
                  <Input type="date" value={edit.respiratorClearanceDate} onChange={(e) => setEdit({ ...edit, respiratorClearanceDate: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Fit Test</Label>
                  <Input type="date" value={edit.fitTestDate} onChange={(e) => setEdit({ ...edit, fitTestDate: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Medical Surveillance</Label>
                  <Input type="date" value={edit.medicalSurveillanceDate} onChange={(e) => setEdit({ ...edit, medicalSurveillanceDate: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={edit.active ? "active" : "inactive"} onValueChange={(v) => setEdit({ ...edit, active: v === "active" })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="pt-4 text-xs text-gray-500">
                person_id: <span className="font-mono">{person.personId}</span> · created: {fmtDate(person.createdAt || null)} · updated: {fmtDate(person.updatedAt || null)}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="jobs" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Job Assignments</CardTitle>
              <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
                <DialogTrigger asChild>
                  <Button variant="secondary">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Assignment
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Add Assignment</DialogTitle>
                    <DialogDescription>Links a person to an air monitoring job/shift.</DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <Label>Job</Label>
                      <Select value={assignForm.jobId} onValueChange={(v) => setAssignForm({ ...assignForm, jobId: v })}>
                        <SelectTrigger><SelectValue placeholder="Select job" /></SelectTrigger>
                        <SelectContent>
                          {jobs.map((j) => (
                            <SelectItem key={j.id} value={j.id}>
                              {(j.jobNumber || j.id).toString()} {j.siteName ? `· ${j.siteName}` : ""} {j.jobName ? `· ${j.jobName}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Shift Date</Label>
                      <Input type="date" value={assignForm.shiftDate} onChange={(e) => setAssignForm({ ...assignForm, shiftDate: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Role on Job</Label>
                      <Input value={assignForm.roleOnJob} onChange={(e) => setAssignForm({ ...assignForm, roleOnJob: e.target.value })} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Supervisor (optional)</Label>
                      <Input value={assignForm.supervisorName} onChange={(e) => setAssignForm({ ...assignForm, supervisorName: e.target.value })} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Notes</Label>
                      <Textarea value={assignForm.notes} onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })} />
                    </div>
                  </div>
                  <div className="pt-2 flex justify-end">
                    <Button onClick={() => assignMutation.mutate()} disabled={!assignForm.jobId || assignMutation.isPending}>
                      Add
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {assignments.length === 0 ? (
                <div className="py-8 text-center text-gray-600">No assignments.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Job</TableHead>
                      <TableHead>Shift</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead># Samples</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments.map((a: any) => (
                      <TableRow key={a.assignmentId}>
                        <TableCell>
                          <div className="font-medium">{a.job?.jobNumber || a.jobId}</div>
                          <div className="text-xs text-gray-500">{a.job?.siteName || ""}</div>
                        </TableCell>
                        <TableCell>{a.shiftDate || (a.dateFrom ? fmtDate(a.dateFrom) : "—")}</TableCell>
                        <TableCell>{a.roleOnJob || "—"}</TableCell>
                        <TableCell>{a.jobId && recordsByAnalyte ? "—" : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Exposure Summary</CardTitle>
              <Select value={range} onValueChange={(v: any) => setRange(v)}>
                <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="12mo">Last 12 months</SelectItem>
                  <SelectItem value="ytd">YTD</SelectItem>
                  <SelectItem value="all">All time</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              {exposureSummary.length === 0 ? (
                <div className="py-8 text-center text-gray-600">No exposure records.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Analyte</TableHead>
                      <TableHead>Count</TableHead>
                      <TableHead>Max 8-hr TWA</TableHead>
                      <TableHead>Avg 8-hr TWA</TableHead>
                      <TableHead>Exceed</TableHead>
                      <TableHead>Near Miss</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exposureSummary.map((row) => (
                      <TableRow key={row.analyte}>
                        <TableCell className="font-medium">{row.analyte}</TableCell>
                        <TableCell>{row.count}</TableCell>
                        <TableCell>{row.maxTwa === null ? "—" : row.maxTwa.toFixed(4)}</TableCell>
                        <TableCell>{row.avgTwa === null ? "—" : row.avgTwa.toFixed(4)}</TableCell>
                        <TableCell>{row.exceedances}</TableCell>
                        <TableCell>{row.nearMisses}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              <div className="pt-3 text-xs text-gray-500">
                8-hr TWA is computed as `concentration * (duration_minutes / 480)`. Exceedance/near-miss flags only appear if exposure limits are configured for the org/profile.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="records" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Exposure Records</CardTitle>
            </CardHeader>
            <CardContent>
              {exposureRows.length === 0 ? (
                <div className="py-8 text-center text-gray-600">No records.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Analyte</TableHead>
                      <TableHead>Duration (min)</TableHead>
                      <TableHead>Conc</TableHead>
                      <TableHead>8-hr TWA</TableHead>
                      <TableHead>Flags</TableHead>
                      <TableHead>Source</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {exposureRows.map((r: any) => (
                      <TableRow key={r.exposureId}>
                        <TableCell>{r.date ? fmtDate(r.date) : "—"}</TableCell>
                        <TableCell>{r.analyte}</TableCell>
                        <TableCell>{r.durationMinutes ?? "—"}</TableCell>
                        <TableCell>{r.concentration ?? "—"} {r.units || ""}</TableCell>
                        <TableCell>{r.twa8hr ?? "—"}</TableCell>
                        <TableCell>
                          {r.exceedanceFlag ? <Badge variant="destructive">Exceed</Badge> : r.nearMissFlag ? <Badge variant="secondary">Near</Badge> : <Badge variant="outline">OK</Badge>}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{r.airSampleId || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

