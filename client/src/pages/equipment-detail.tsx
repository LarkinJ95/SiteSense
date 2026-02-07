import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, CalendarClock, ClipboardList, Edit, Link2, MapPin, Plus, Printer, ShieldCheck, Trash2, User as UserIcon, Wrench } from "lucide-react";

const METHOD_STANDARD_OPTIONS = [
  "Primary Standard (DryCal/Defender)",
  "NIST-Traceable Primary Standard",
  "Bubble Meter (Field Verification)",
  "Manufacturer Service",
  "ISO/IEC 17025 Lab",
] as const;

type EquipmentRow = {
  equipmentId: string;
  organizationId: string;
  category: string;
  manufacturer?: string | null;
  model?: string | null;
  serialNumber: string;
  assetTag?: string | null;
  status: string;
  assignedToUserId?: string | null;
  location?: string | null;
  calibrationIntervalDays?: number | null;
  lastCalibrationDate?: string | null;
  calibrationDueDate?: string | null;
  active: boolean;
  createdAt?: number | null;
  updatedAt?: number | null;
};

type CalEvent = {
  calEventId: string;
  equipmentId: string;
  calDate: string;
  calType: string;
  performedBy?: string | null;
  methodStandard?: string | null;
  targetFlowLpm?: string | null;
  asFoundFlowLpm?: string | null;
  asLeftFlowLpm?: string | null;
  tolerance?: string | null;
  toleranceUnit?: string | null;
  passFail?: string | null;
  certificateNumber?: string | null;
  certificateFileUrl?: string | null;
  notes?: string | null;
  createdAt?: number | null;
};

type UsageRow = {
  usageId: string;
  equipmentId: string;
  jobId?: string | null;
  usedFrom?: number | null;
  usedTo?: number | null;
  context?: string | null;
  sampleRunId?: string | null;
  createdAt?: number | null;
};

type NoteRow = {
  noteId: string;
  equipmentId: string;
  createdAt?: number | null;
  createdByUserId: string;
  noteText: string;
  noteType?: string | null;
  visibility?: string | null;
};

type OrgUser = {
  userId: string;
  email?: string | null;
  name: string;
  status?: string | null;
  role?: string | null;
};

type AirJobRow = {
  id: string;
  jobName?: string | null;
  jobNumber?: string | null;
  siteName?: string | null;
  startDate?: number | null;
};

const daysUntil = (ymd?: string | null) => {
  if (!ymd) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const dueUtc = Date.UTC(year, month - 1, day);
  const today = new Date();
  const todayUtc = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.ceil((dueUtc - todayUtc) / (24 * 60 * 60 * 1000));
};

const statusBadge = (status: string) => {
  const s = (status || "").toLowerCase();
  if (s === "in_service") return <Badge className="bg-green-100 text-green-800">In Service</Badge>;
  if (s === "out_for_cal") return <Badge className="bg-yellow-100 text-yellow-800">Out for Cal</Badge>;
  if (s === "repair") return <Badge className="bg-orange-100 text-orange-800">Repair</Badge>;
  if (s === "retired") return <Badge className="bg-gray-100 text-gray-800">Retired</Badge>;
  if (s === "lost") return <Badge className="bg-red-100 text-red-800">Lost</Badge>;
  return <Badge variant="secondary">{status || "Unknown"}</Badge>;
};

const toDateTimeLocal = (ms?: number | null) => {
  if (!ms) return "";
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
};

export default function EquipmentDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: equipment, isLoading } = useQuery<EquipmentRow>({
    queryKey: [`/api/equipment/${id}`],
  });

  const { data: orgUsers = [] } = useQuery<OrgUser[]>({
    queryKey: ["/api/inspectors"],
  });

  const { data: airJobs = [] } = useQuery<AirJobRow[]>({
    queryKey: ["/api/air-monitoring-jobs"],
  });

  const { data: calEvents = [] } = useQuery<CalEvent[]>({
    queryKey: [`/api/equipment/${id}/calibration-events`],
    enabled: Boolean(id),
  });

  const { data: usage = [] } = useQuery<UsageRow[]>({
    queryKey: [`/api/equipment/${id}/usage`],
    enabled: Boolean(id),
  });

  const { data: notes = [] } = useQuery<NoteRow[]>({
    queryKey: [`/api/equipment/${id}/notes`],
    enabled: Boolean(id),
  });

  const [edit, setEdit] = useState({
    category: "",
    manufacturer: "",
    model: "",
    serialNumber: "",
    assetTag: "",
    status: "in_service",
    assignedToUserId: "",
    location: "",
    calibrationIntervalDays: "",
    lastCalibrationDate: "",
  });

  const [calOpen, setCalOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [usageOpen, setUsageOpen] = useState(false);

  const [calForm, setCalForm] = useState({
    calDate: "",
    calType: "annual",
    performedBy: "",
    methodStandard: "",
    targetFlowLpm: "",
    asFoundFlowLpm: "",
    asLeftFlowLpm: "",
    tolerance: "",
    toleranceUnit: "percent",
    passFail: "unknown",
    certificateNumber: "",
    certificateFileUrl: "",
    notes: "",
  });

  const [noteForm, setNoteForm] = useState({
    noteText: "",
    noteType: "general",
    visibility: "org",
  });

  const [usageForm, setUsageForm] = useState({
    jobId: "",
    usedFrom: "",
    usedTo: "",
    context: "Air Sampling",
    sampleRunId: "",
  });

  const airJobLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const j of airJobs || []) {
      const id = (j as any)?.id;
      if (!id) continue;
      const num = ((j as any)?.jobNumber || "").toString().trim();
      const name = ((j as any)?.jobName || "").toString().trim();
      const label = num && name ? `${num} - ${name}` : num || name || String(id);
      map.set(String(id), label);
    }
    return map;
  }, [airJobs]);

  const [editingCal, setEditingCal] = useState<CalEvent | null>(null);
  const [editCalOpen, setEditCalOpen] = useState(false);
  const [editCalReason, setEditCalReason] = useState("");
  const [editCalForm, setEditCalForm] = useState({ ...calForm });
  const [deletingCal, setDeletingCal] = useState<CalEvent | null>(null);
  const [deleteCalOpen, setDeleteCalOpen] = useState(false);
  const [deleteCalReason, setDeleteCalReason] = useState("");

  const [editingUsage, setEditingUsage] = useState<UsageRow | null>(null);
  const [editUsageOpen, setEditUsageOpen] = useState(false);
  const [editUsageReason, setEditUsageReason] = useState("");
  const [editUsageForm, setEditUsageForm] = useState({ ...usageForm });
  const [deletingUsage, setDeletingUsage] = useState<UsageRow | null>(null);
  const [deleteUsageOpen, setDeleteUsageOpen] = useState(false);
  const [deleteUsageReason, setDeleteUsageReason] = useState("");

  useEffect(() => {
    if (!equipment) return;
    setEdit({
      category: equipment.category || "",
      manufacturer: equipment.manufacturer || "",
      model: equipment.model || "",
      serialNumber: equipment.serialNumber || "",
      assetTag: equipment.assetTag || "",
      status: equipment.status || "in_service",
      assignedToUserId: equipment.assignedToUserId || "",
      location: equipment.location || "",
      calibrationIntervalDays: equipment.calibrationIntervalDays ? String(equipment.calibrationIntervalDays) : "",
      lastCalibrationDate: equipment.lastCalibrationDate || "",
    });
  }, [equipment]);

  const dueDays = daysUntil(equipment?.calibrationDueDate || null);

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("Missing equipment id");
      const payload: any = {
        category: edit.category,
        manufacturer: edit.manufacturer || null,
        model: edit.model || null,
        serialNumber: edit.serialNumber.trim(),
        assetTag: edit.assetTag || null,
        status: edit.status,
        assignedToUserId: edit.assignedToUserId || null,
        location: edit.location || null,
        calibrationIntervalDays: edit.calibrationIntervalDays ? Number(edit.calibrationIntervalDays) : null,
        lastCalibrationDate: edit.lastCalibrationDate || null,
      };
      const res = await apiRequest("PUT", `/api/equipment/${id}`, payload);
      return (await res.json()) as EquipmentRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/equipment/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
      toast({ title: "Saved", description: "Equipment updated." });
    },
    onError: (error: any) => {
      toast({ title: "Save failed", description: error?.message || "Unable to update equipment.", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("Missing equipment id");
      await apiRequest("DELETE", `/api/equipment/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
      setLocation("/equipment");
    },
    onError: (error: any) => {
      toast({ title: "Delete failed", description: error?.message || "Unable to retire equipment.", variant: "destructive" });
    },
  });

  const addCalMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("Missing equipment id");
      const payload: any = {
        calDate: calForm.calDate,
        calType: calForm.calType,
        performedBy: calForm.performedBy || null,
        methodStandard: calForm.methodStandard || null,
        targetFlowLpm: calForm.targetFlowLpm || undefined,
        asFoundFlowLpm: calForm.asFoundFlowLpm || undefined,
        asLeftFlowLpm: calForm.asLeftFlowLpm || undefined,
        tolerance: calForm.tolerance || undefined,
        toleranceUnit: calForm.toleranceUnit || undefined,
        passFail: calForm.passFail,
        certificateNumber: calForm.certificateNumber || null,
        certificateFileUrl: calForm.certificateFileUrl || null,
        notes: calForm.notes || null,
      };
      const res = await apiRequest("POST", `/api/equipment/${id}/calibration-events`, payload);
      return (await res.json()) as CalEvent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/equipment/${id}/calibration-events`] });
      queryClient.invalidateQueries({ queryKey: [`/api/equipment/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
      setCalOpen(false);
      setCalForm({
        calDate: "",
        calType: "annual",
        performedBy: "",
        methodStandard: "",
        targetFlowLpm: "",
        asFoundFlowLpm: "",
        asLeftFlowLpm: "",
        tolerance: "",
        toleranceUnit: "percent",
        passFail: "unknown",
        certificateNumber: "",
        certificateFileUrl: "",
        notes: "",
      });
      toast({ title: "Added", description: "Calibration event saved." });
    },
    onError: (error: any) => {
      toast({ title: "Failed", description: error?.message || "Unable to save calibration event.", variant: "destructive" });
    },
  });

  const addNoteMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("Missing equipment id");
      const payload: any = {
        noteText: noteForm.noteText,
        noteType: noteForm.noteType || null,
        visibility: noteForm.visibility,
      };
      const res = await apiRequest("POST", `/api/equipment/${id}/notes`, payload);
      return (await res.json()) as NoteRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/equipment/${id}/notes`] });
      setNoteOpen(false);
      setNoteForm({ noteText: "", noteType: "general", visibility: "org" });
    },
    onError: (error: any) => {
      toast({ title: "Failed", description: error?.message || "Unable to add note.", variant: "destructive" });
    },
  });

  const addUsageMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("Missing equipment id");
      const payload: any = {
        jobId: usageForm.jobId || null,
        usedFrom: usageForm.usedFrom || null,
        usedTo: usageForm.usedTo || null,
        context: usageForm.context || null,
        sampleRunId: usageForm.sampleRunId || null,
      };
      const res = await apiRequest("POST", `/api/equipment/${id}/usage`, payload);
      return (await res.json()) as UsageRow;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/equipment/${id}/usage`] });
      setUsageOpen(false);
      setUsageForm({ jobId: "", usedFrom: "", usedTo: "", context: "Air Sampling", sampleRunId: "" });
    },
    onError: (error: any) => {
      toast({ title: "Failed", description: error?.message || "Unable to add usage record.", variant: "destructive" });
    },
  });

  const updateCalMutation = useMutation({
    mutationFn: async () => {
      if (!editingCal) throw new Error("No calibration selected");
      const reason = editCalReason.trim();
      if (!reason) throw new Error("Reason is required");
      const payload: any = {
        reason,
        calDate: editCalForm.calDate,
        calType: editCalForm.calType,
        performedBy: editCalForm.performedBy || null,
        methodStandard: editCalForm.methodStandard || null,
        targetFlowLpm: editCalForm.targetFlowLpm || null,
        asFoundFlowLpm: editCalForm.asFoundFlowLpm || null,
        asLeftFlowLpm: editCalForm.asLeftFlowLpm || null,
        tolerance: editCalForm.tolerance || null,
        toleranceUnit: editCalForm.toleranceUnit,
        passFail: editCalForm.passFail,
        certificateNumber: editCalForm.certificateNumber || null,
        certificateFileUrl: editCalForm.certificateFileUrl || null,
        notes: editCalForm.notes || null,
      };
      const res = await apiRequest("PUT", `/api/equipment-calibration-events/${editingCal.calEventId}`, payload);
      return (await res.json()) as CalEvent;
    },
    onSuccess: () => {
      if (!id) return;
      queryClient.invalidateQueries({ queryKey: [`/api/equipment/${id}/calibration-events`] });
      queryClient.invalidateQueries({ queryKey: [`/api/equipment/${id}/notes`] });
      queryClient.invalidateQueries({ queryKey: [`/api/equipment/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
      setEditCalOpen(false);
      setEditingCal(null);
      setEditCalReason("");
      toast({ title: "Saved", description: "Calibration record updated." });
    },
    onError: (error: any) => {
      toast({ title: "Failed", description: error?.message || "Unable to update calibration record.", variant: "destructive" });
    },
  });

  const deleteCalMutation = useMutation({
    mutationFn: async () => {
      if (!deletingCal) throw new Error("No calibration selected");
      const reason = deleteCalReason.trim();
      if (!reason) throw new Error("Reason is required");
      await apiRequest("DELETE", `/api/equipment-calibration-events/${deletingCal.calEventId}`, { reason });
    },
    onSuccess: () => {
      if (!id) return;
      queryClient.invalidateQueries({ queryKey: [`/api/equipment/${id}/calibration-events`] });
      queryClient.invalidateQueries({ queryKey: [`/api/equipment/${id}/notes`] });
      queryClient.invalidateQueries({ queryKey: [`/api/equipment/${id}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
      setDeleteCalOpen(false);
      setDeletingCal(null);
      setDeleteCalReason("");
      toast({ title: "Deleted", description: "Calibration record deleted." });
    },
    onError: (error: any) => {
      toast({ title: "Failed", description: error?.message || "Unable to delete calibration record.", variant: "destructive" });
    },
  });

  const updateUsageMutation = useMutation({
    mutationFn: async () => {
      if (!editingUsage) throw new Error("No usage record selected");
      const reason = editUsageReason.trim();
      if (!reason) throw new Error("Reason is required");
      const payload: any = {
        reason,
        jobId: editUsageForm.jobId || null,
        usedFrom: editUsageForm.usedFrom || null,
        usedTo: editUsageForm.usedTo || null,
        context: editUsageForm.context || null,
        sampleRunId: editUsageForm.sampleRunId || null,
      };
      const res = await apiRequest("PUT", `/api/equipment-usage/${editingUsage.usageId}`, payload);
      return (await res.json()) as UsageRow;
    },
    onSuccess: () => {
      if (!id) return;
      queryClient.invalidateQueries({ queryKey: [`/api/equipment/${id}/usage`] });
      queryClient.invalidateQueries({ queryKey: [`/api/equipment/${id}/notes`] });
      setEditUsageOpen(false);
      setEditingUsage(null);
      setEditUsageReason("");
      toast({ title: "Saved", description: "Usage record updated." });
    },
    onError: (error: any) => {
      toast({ title: "Failed", description: error?.message || "Unable to update usage record.", variant: "destructive" });
    },
  });

  const deleteUsageMutation = useMutation({
    mutationFn: async () => {
      if (!deletingUsage) throw new Error("No usage record selected");
      const reason = deleteUsageReason.trim();
      if (!reason) throw new Error("Reason is required");
      await apiRequest("DELETE", `/api/equipment-usage/${deletingUsage.usageId}`, { reason });
    },
    onSuccess: () => {
      if (!id) return;
      queryClient.invalidateQueries({ queryKey: [`/api/equipment/${id}/usage`] });
      queryClient.invalidateQueries({ queryKey: [`/api/equipment/${id}/notes`] });
      setDeleteUsageOpen(false);
      setDeletingUsage(null);
      setDeleteUsageReason("");
      toast({ title: "Deleted", description: "Usage record deleted." });
    },
    onError: (error: any) => {
      toast({ title: "Failed", description: error?.message || "Unable to delete usage record.", variant: "destructive" });
    },
  });

  const assignedName = useMemo(() => {
    const user = orgUsers.find((u) => u.userId === equipment?.assignedToUserId);
    return user ? (user.name || user.email || user.userId) : equipment?.assignedToUserId || "";
  }, [orgUsers, equipment?.assignedToUserId]);

  const driftRows = useMemo(() => {
    const list = Array.isArray(calEvents) ? calEvents : [];
    return list.map((e) => {
      const target = e.targetFlowLpm ? Number(e.targetFlowLpm) : NaN;
      const found = e.asFoundFlowLpm ? Number(e.asFoundFlowLpm) : NaN;
      const drift = Number.isFinite(target) && Number.isFinite(found) ? (found - target) : null;
      return { ...e, drift };
    });
  }, [calEvents]);

  if (isLoading || !equipment) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => setLocation("/equipment")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <div className="text-2xl font-bold flex items-center gap-2">
              <Wrench className="h-6 w-6" />
              {equipment.manufacturer || "Equipment"} {equipment.model || ""}
            </div>
            <div className="text-sm text-gray-600">
              SN <span className="font-mono">{equipment.serialNumber}</span>
              {equipment.assetTag ? <> · Asset <span className="font-mono">{equipment.assetTag}</span></> : null}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => window.open(`/equipment/${id}/report?print=1`, "_blank")}
          >
            <Printer className="h-4 w-4 mr-2" />
            Print Report
          </Button>
          <Dialog open={calOpen} onOpenChange={setCalOpen}>
            <DialogTrigger asChild>
              <Button variant="secondary">
                <Plus className="h-4 w-4 mr-2" />
                Add Calibration
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Add Calibration Event</DialogTitle>
                <DialogDescription>Records are append-only and keep traceability.</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={calForm.calDate} onChange={(e) => setCalForm({ ...calForm, calDate: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={calForm.calType} onValueChange={(value) => setCalForm({ ...calForm, calType: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="annual">Annual</SelectItem>
                      <SelectItem value="verification">Verification</SelectItem>
                      <SelectItem value="as_found">As-Found</SelectItem>
                      <SelectItem value="as_left">As-Left</SelectItem>
                      <SelectItem value="repair">Repair</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Pass/Fail</Label>
                  <Select value={calForm.passFail} onValueChange={(value) => setCalForm({ ...calForm, passFail: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unknown">Unknown</SelectItem>
                      <SelectItem value="pass">Pass</SelectItem>
                      <SelectItem value="fail">Fail</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Performed By</Label>
                  <Input value={calForm.performedBy} onChange={(e) => setCalForm({ ...calForm, performedBy: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Method/Standard</Label>
                  <Select
                    value={calForm.methodStandard}
                    onValueChange={(value) => setCalForm({ ...calForm, methodStandard: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a standard" />
                    </SelectTrigger>
                    <SelectContent>
                      {METHOD_STANDARD_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Target Flow (LPM)</Label>
                  <Input value={calForm.targetFlowLpm} onChange={(e) => setCalForm({ ...calForm, targetFlowLpm: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>As-Found (LPM)</Label>
                  <Input value={calForm.asFoundFlowLpm} onChange={(e) => setCalForm({ ...calForm, asFoundFlowLpm: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>As-Left (LPM)</Label>
                  <Input value={calForm.asLeftFlowLpm} onChange={(e) => setCalForm({ ...calForm, asLeftFlowLpm: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Tolerance</Label>
                  <div className="flex gap-2">
                    <Input className="flex-1" value={calForm.tolerance} onChange={(e) => setCalForm({ ...calForm, tolerance: e.target.value })} />
                    <Select value={calForm.toleranceUnit} onValueChange={(value) => setCalForm({ ...calForm, toleranceUnit: value })}>
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percent">%</SelectItem>
                        <SelectItem value="lpm">LPM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Certificate #</Label>
                  <Input value={calForm.certificateNumber} onChange={(e) => setCalForm({ ...calForm, certificateNumber: e.target.value })} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Certificate File URL</Label>
                  <Input value={calForm.certificateFileUrl} onChange={(e) => setCalForm({ ...calForm, certificateFileUrl: e.target.value })} />
                </div>
                <div className="space-y-2 md:col-span-3">
                  <Label>Notes</Label>
                  <Textarea value={calForm.notes} onChange={(e) => setCalForm({ ...calForm, notes: e.target.value })} />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <Button
                  onClick={() => addCalMutation.mutate()}
                  disabled={!calForm.calDate || addCalMutation.isPending}
                >
                  <ShieldCheck className="h-4 w-4 mr-2" />
                  Save Calibration
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={noteOpen} onOpenChange={setNoteOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Note
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-xl">
              <DialogHeader>
                <DialogTitle>Add Note</DialogTitle>
                <DialogDescription>Notes are append-only and never overwrite.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Note</Label>
                  <Textarea value={noteForm.noteText} onChange={(e) => setNoteForm({ ...noteForm, noteText: e.target.value })} />
                </div>
	                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
	                  <div className="space-y-2">
	                    <Label>Type</Label>
	                    <Select value={noteForm.noteType} onValueChange={(value) => setNoteForm({ ...noteForm, noteType: value })}>
	                      <SelectTrigger><SelectValue /></SelectTrigger>
	                      <SelectContent>
	                        <SelectItem value="general">General</SelectItem>
	                        <SelectItem value="maintenance">Maintenance</SelectItem>
	                        <SelectItem value="calibration">Calibration</SelectItem>
	                        <SelectItem value="usage">Usage</SelectItem>
	                        <SelectItem value="audit">Audit</SelectItem>
	                        <SelectItem value="issue">Issue</SelectItem>
	                        <SelectItem value="other">Other</SelectItem>
	                      </SelectContent>
	                    </Select>
	                  </div>
	                  <div className="space-y-2">
	                    <Label>Visibility</Label>
	                    <Select value={noteForm.visibility} onValueChange={(value) => setNoteForm({ ...noteForm, visibility: value })}>
	                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="org">Org</SelectItem>
                        <SelectItem value="private">Private</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="pt-2 flex justify-end">
                <Button onClick={() => addNoteMutation.mutate()} disabled={!noteForm.noteText.trim() || addNoteMutation.isPending}>
                  Add Note
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={usageOpen} onOpenChange={setUsageOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Link2 className="h-4 w-4 mr-2" />
                Link Usage
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Link Equipment Usage</DialogTitle>
                <DialogDescription>Records job usage history for traceability.</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label>Job</Label>
                  <Select value={usageForm.jobId} onValueChange={(value) => setUsageForm({ ...usageForm, jobId: value })}>
                    <SelectTrigger><SelectValue placeholder="Select a job" /></SelectTrigger>
                    <SelectContent>
                      {airJobs.map((job) => (
                        <SelectItem key={job.id} value={job.id}>
                          {(job.jobNumber || job.id).toString()} {job.siteName ? `· ${job.siteName}` : ""} {job.jobName ? `· ${job.jobName}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Used From</Label>
                  <Input type="datetime-local" value={usageForm.usedFrom} onChange={(e) => setUsageForm({ ...usageForm, usedFrom: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Used To</Label>
                  <Input type="datetime-local" value={usageForm.usedTo} onChange={(e) => setUsageForm({ ...usageForm, usedTo: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Context</Label>
                  <Input value={usageForm.context} onChange={(e) => setUsageForm({ ...usageForm, context: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Sample Run ID (optional)</Label>
                  <Input value={usageForm.sampleRunId} onChange={(e) => setUsageForm({ ...usageForm, sampleRunId: e.target.value })} />
                </div>
              </div>
              <div className="pt-2 flex justify-end">
                <Button onClick={() => addUsageMutation.mutate()} disabled={!usageForm.jobId || addUsageMutation.isPending}>
                  Save Usage
                </Button>
              </div>
            </DialogContent>
	          </Dialog>
	        </div>
	      </div>

        <Dialog open={editCalOpen} onOpenChange={setEditCalOpen}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Edit Calibration Event</DialogTitle>
              <DialogDescription>Edits require a reason and will be recorded to the Notes audit trail.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Reason</Label>
                <Textarea value={editCalReason} onChange={(e) => setEditCalReason(e.target.value)} placeholder="Why are you editing this record?" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={editCalForm.calDate} onChange={(e) => setEditCalForm({ ...editCalForm, calDate: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={editCalForm.calType} onValueChange={(value) => setEditCalForm({ ...editCalForm, calType: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="annual">Annual</SelectItem>
                      <SelectItem value="verification">Verification</SelectItem>
                      <SelectItem value="as_found">As-Found</SelectItem>
                      <SelectItem value="as_left">As-Left</SelectItem>
                      <SelectItem value="repair">Repair</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Pass/Fail</Label>
                  <Select value={editCalForm.passFail} onValueChange={(value) => setEditCalForm({ ...editCalForm, passFail: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unknown">Unknown</SelectItem>
                      <SelectItem value="pass">Pass</SelectItem>
                      <SelectItem value="fail">Fail</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Performed By</Label>
                  <Input value={editCalForm.performedBy} onChange={(e) => setEditCalForm({ ...editCalForm, performedBy: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Method/Standard</Label>
                  <Select value={editCalForm.methodStandard} onValueChange={(value) => setEditCalForm({ ...editCalForm, methodStandard: value })}>
                    <SelectTrigger><SelectValue placeholder="Select a standard" /></SelectTrigger>
                    <SelectContent>
                      {METHOD_STANDARD_OPTIONS.map((opt) => (
                        <SelectItem key={opt} value={opt}>
                          {opt}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Target Flow (LPM)</Label>
                  <Input value={editCalForm.targetFlowLpm} onChange={(e) => setEditCalForm({ ...editCalForm, targetFlowLpm: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>As-Found (LPM)</Label>
                  <Input value={editCalForm.asFoundFlowLpm} onChange={(e) => setEditCalForm({ ...editCalForm, asFoundFlowLpm: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>As-Left (LPM)</Label>
                  <Input value={editCalForm.asLeftFlowLpm} onChange={(e) => setEditCalForm({ ...editCalForm, asLeftFlowLpm: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Tolerance</Label>
                  <div className="flex gap-2">
                    <Input className="flex-1" value={editCalForm.tolerance} onChange={(e) => setEditCalForm({ ...editCalForm, tolerance: e.target.value })} />
                    <Select value={editCalForm.toleranceUnit} onValueChange={(value) => setEditCalForm({ ...editCalForm, toleranceUnit: value })}>
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percent">%</SelectItem>
                        <SelectItem value="lpm">LPM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Certificate #</Label>
                  <Input value={editCalForm.certificateNumber} onChange={(e) => setEditCalForm({ ...editCalForm, certificateNumber: e.target.value })} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Certificate File URL</Label>
                  <Input value={editCalForm.certificateFileUrl} onChange={(e) => setEditCalForm({ ...editCalForm, certificateFileUrl: e.target.value })} />
                </div>
                <div className="space-y-2 md:col-span-3">
                  <Label>Notes</Label>
                  <Textarea value={editCalForm.notes} onChange={(e) => setEditCalForm({ ...editCalForm, notes: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditCalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => updateCalMutation.mutate()} disabled={!editCalReason.trim() || !editCalForm.calDate || updateCalMutation.isPending}>
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={deleteCalOpen} onOpenChange={setDeleteCalOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Delete Calibration Event</DialogTitle>
              <DialogDescription>Deletion requires a reason and will be recorded to the Notes audit trail.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea value={deleteCalReason} onChange={(e) => setDeleteCalReason(e.target.value)} placeholder="Why are you deleting this record?" />
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteCalOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => deleteCalMutation.mutate()} disabled={!deleteCalReason.trim() || deleteCalMutation.isPending}>
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={editUsageOpen} onOpenChange={setEditUsageOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Usage Record</DialogTitle>
              <DialogDescription>Edits require a reason and will be recorded to the Notes audit trail.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Reason</Label>
                <Textarea value={editUsageReason} onChange={(e) => setEditUsageReason(e.target.value)} placeholder="Why are you editing this record?" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label>Job</Label>
                  <Select value={editUsageForm.jobId} onValueChange={(value) => setEditUsageForm({ ...editUsageForm, jobId: value === "__none__" ? "" : value })}>
                    <SelectTrigger><SelectValue placeholder="Select a job" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">No Job</SelectItem>
                      {airJobs.map((job) => (
                        <SelectItem key={job.id} value={job.id}>
                          {(job.jobNumber || job.id).toString()} {job.siteName ? `· ${job.siteName}` : ""} {job.jobName ? `· ${job.jobName}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Used From</Label>
                  <Input type="datetime-local" value={editUsageForm.usedFrom} onChange={(e) => setEditUsageForm({ ...editUsageForm, usedFrom: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Used To</Label>
                  <Input type="datetime-local" value={editUsageForm.usedTo} onChange={(e) => setEditUsageForm({ ...editUsageForm, usedTo: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Context</Label>
                  <Input value={editUsageForm.context} onChange={(e) => setEditUsageForm({ ...editUsageForm, context: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Sample Run ID</Label>
                  <Input value={editUsageForm.sampleRunId} onChange={(e) => setEditUsageForm({ ...editUsageForm, sampleRunId: e.target.value })} />
                </div>
              </div>
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditUsageOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => updateUsageMutation.mutate()} disabled={!editUsageReason.trim() || updateUsageMutation.isPending}>
                Save Changes
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={deleteUsageOpen} onOpenChange={setDeleteUsageOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Delete Usage Record</DialogTitle>
              <DialogDescription>Deletion requires a reason and will be recorded to the Notes audit trail.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea value={deleteUsageReason} onChange={(e) => setDeleteUsageReason(e.target.value)} placeholder="Why are you deleting this record?" />
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteUsageOpen(false)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => deleteUsageMutation.mutate()} disabled={!deleteUsageReason.trim() || deleteUsageMutation.isPending}>
                Delete
              </Button>
            </div>
          </DialogContent>
        </Dialog>

	      <Card>
	        <CardContent className="p-4">
	          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <div className="text-xs text-gray-500">Status</div>
              <div>{statusBadge(equipment.status)}</div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-gray-500">Assigned To</div>
              <div className="flex items-center gap-2">
                <UserIcon className="h-4 w-4 text-gray-500" />
                <span className="text-sm">{assignedName || "—"}</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-gray-500">Location</div>
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-gray-500" />
                <span className="text-sm">{equipment.location || "—"}</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-xs text-gray-500">Calibration Due</div>
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-gray-500" />
                <span className="text-sm">{equipment.calibrationDueDate || "N/A"}</span>
                {typeof dueDays === "number" && (
                  <Badge variant={dueDays < 0 ? "destructive" : dueDays < 30 ? "secondary" : "outline"}>
                    {dueDays < 0 ? `${Math.abs(dueDays)}d overdue` : `${dueDays}d`}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="usage">Jobs / Usage</TabsTrigger>
          <TabsTrigger value="cal">Calibration History</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Core Fields
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Manufacturer</Label>
                  <Input value={edit.manufacturer} onChange={(e) => setEdit({ ...edit, manufacturer: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Model</Label>
                  <Input value={edit.model} onChange={(e) => setEdit({ ...edit, model: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Serial Number</Label>
                  <Input value={edit.serialNumber} onChange={(e) => setEdit({ ...edit, serialNumber: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Asset Tag</Label>
                  <Input value={edit.assetTag} onChange={(e) => setEdit({ ...edit, assetTag: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={edit.status} onValueChange={(value) => setEdit({ ...edit, status: value })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="in_service">In Service</SelectItem>
                      <SelectItem value="out_for_cal">Out for Cal</SelectItem>
                      <SelectItem value="repair">Repair</SelectItem>
                      <SelectItem value="retired">Retired</SelectItem>
                      <SelectItem value="lost">Lost</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
	                  <Label>Assigned To</Label>
	                  <Select value={edit.assignedToUserId || ""} onValueChange={(value) => setEdit({ ...edit, assignedToUserId: value === "__none__" ? "" : value })}>
	                    <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
	                    <SelectContent>
	                      <SelectItem value="__none__">Unassigned</SelectItem>
	                      {orgUsers.map((u) => (
	                        <SelectItem key={u.userId} value={u.userId}>
	                          {u.name || u.email || u.userId} {u.email ? `(${u.email})` : ""}
	                        </SelectItem>
	                      ))}
	                    </SelectContent>
	                  </Select>
	                </div>
                <div className="space-y-2">
                  <Label>Location</Label>
                  <Input value={edit.location} onChange={(e) => setEdit({ ...edit, location: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Calibration Interval (days)</Label>
                  <Input type="number" value={edit.calibrationIntervalDays} onChange={(e) => setEdit({ ...edit, calibrationIntervalDays: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Last Calibration Date</Label>
                  <Input type="date" value={edit.lastCalibrationDate} onChange={(e) => setEdit({ ...edit, lastCalibrationDate: e.target.value })} />
                </div>
              </div>
              <div className="pt-4 flex justify-end gap-2">
                <Button variant="destructive" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Retire (Soft Delete)
                </Button>
                <Button onClick={() => updateMutation.mutate()} disabled={!edit.serialNumber.trim() || updateMutation.isPending}>
                  Save
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Usage History</CardTitle>
            </CardHeader>
            <CardContent>
              {usage.length === 0 ? (
                <div className="py-8 text-center text-gray-600">No usage linked yet.</div>
              ) : (
	                <Table>
	                  <TableHeader>
	                    <TableRow>
	                      <TableHead>Job</TableHead>
	                      <TableHead>Used From</TableHead>
	                      <TableHead>Used To</TableHead>
	                      <TableHead>Context</TableHead>
	                      <TableHead>Sample Run</TableHead>
	                      <TableHead className="text-right">Actions</TableHead>
	                    </TableRow>
	                  </TableHeader>
	                  <TableBody>
	                    {usage.map((u) => (
	                      <TableRow key={u.usageId}>
	                        <TableCell className="text-sm">
	                          {u.jobId ? airJobLabelById.get(String(u.jobId)) || u.jobId : "—"}
	                        </TableCell>
	                        <TableCell>{u.usedFrom ? new Date(u.usedFrom).toLocaleString() : "—"}</TableCell>
	                        <TableCell>{u.usedTo ? new Date(u.usedTo).toLocaleString() : "—"}</TableCell>
	                        <TableCell>{u.context || "—"}</TableCell>
	                        <TableCell>{u.sampleRunId || "—"}</TableCell>
	                        <TableCell className="text-right">
	                          <div className="flex justify-end gap-2">
	                            <Button
	                              variant="ghost"
	                              size="sm"
	                              onClick={() => {
	                                setEditingUsage(u);
	                                setEditUsageForm({
	                                  jobId: u.jobId ? String(u.jobId) : "",
	                                  usedFrom: u.usedFrom ? toDateTimeLocal(u.usedFrom) : "",
	                                  usedTo: u.usedTo ? toDateTimeLocal(u.usedTo) : "",
	                                  context: u.context || "",
	                                  sampleRunId: u.sampleRunId || "",
	                                });
	                                setEditUsageReason("");
	                                setEditUsageOpen(true);
	                              }}
	                            >
	                              <Edit className="h-4 w-4" />
	                            </Button>
	                            <Button
	                              variant="ghost"
	                              size="sm"
	                              onClick={() => {
	                                setDeletingUsage(u);
	                                setDeleteUsageReason("");
	                                setDeleteUsageOpen(true);
	                              }}
	                            >
	                              <Trash2 className="h-4 w-4" />
	                            </Button>
	                          </div>
	                        </TableCell>
	                      </TableRow>
	                    ))}
	                  </TableBody>
	                </Table>
	              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cal" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Calibration History</CardTitle>
            </CardHeader>
            <CardContent>
              {driftRows.length === 0 ? (
                <div className="py-8 text-center text-gray-600">No calibration events yet.</div>
              ) : (
	                <Table>
	                  <TableHeader>
	                    <TableRow>
	                      <TableHead>Date</TableHead>
	                      <TableHead>Type</TableHead>
	                      <TableHead>Target</TableHead>
	                      <TableHead>As-Found</TableHead>
	                      <TableHead>As-Left</TableHead>
	                      <TableHead>Drift</TableHead>
	                      <TableHead>Pass/Fail</TableHead>
	                      <TableHead>Certificate</TableHead>
	                      <TableHead className="text-right">Actions</TableHead>
	                    </TableRow>
	                  </TableHeader>
	                  <TableBody>
	                    {driftRows.map((e) => (
	                      <TableRow key={e.calEventId}>
	                        <TableCell>{e.calDate}</TableCell>
	                        <TableCell>{e.calType}</TableCell>
	                        <TableCell>{e.targetFlowLpm || "—"}</TableCell>
	                        <TableCell>{e.asFoundFlowLpm || "—"}</TableCell>
	                        <TableCell>{e.asLeftFlowLpm || "—"}</TableCell>
	                        <TableCell>{typeof (e as any).drift === "number" ? (e as any).drift.toFixed(3) : "—"}</TableCell>
	                        <TableCell>{e.passFail || "—"}</TableCell>
	                        <TableCell>
	                          {e.certificateFileUrl ? (
	                            <a className="text-primary underline" href={e.certificateFileUrl} target="_blank" rel="noreferrer">
	                              {e.certificateNumber || "Open"}
	                            </a>
	                          ) : (
	                            e.certificateNumber || "—"
	                          )}
	                        </TableCell>
	                        <TableCell className="text-right">
	                          <div className="flex justify-end gap-2">
	                            <Button
	                              variant="ghost"
	                              size="sm"
	                              onClick={() => {
	                                setEditingCal(e as any);
	                                setEditCalForm({
	                                  calDate: (e as any).calDate || "",
	                                  calType: (e as any).calType || "annual",
	                                  performedBy: (e as any).performedBy || "",
	                                  methodStandard: (e as any).methodStandard || "",
	                                  targetFlowLpm: (e as any).targetFlowLpm || "",
	                                  asFoundFlowLpm: (e as any).asFoundFlowLpm || "",
	                                  asLeftFlowLpm: (e as any).asLeftFlowLpm || "",
	                                  tolerance: (e as any).tolerance || "",
	                                  toleranceUnit: (e as any).toleranceUnit || "percent",
	                                  passFail: (e as any).passFail || "unknown",
	                                  certificateNumber: (e as any).certificateNumber || "",
	                                  certificateFileUrl: (e as any).certificateFileUrl || "",
	                                  notes: (e as any).notes || "",
	                                });
	                                setEditCalReason("");
	                                setEditCalOpen(true);
	                              }}
	                            >
	                              <Edit className="h-4 w-4" />
	                            </Button>
	                            <Button
	                              variant="ghost"
	                              size="sm"
	                              onClick={() => {
	                                setDeletingCal(e as any);
	                                setDeleteCalReason("");
	                                setDeleteCalOpen(true);
	                              }}
	                            >
	                              <Trash2 className="h-4 w-4" />
	                            </Button>
	                          </div>
	                        </TableCell>
	                      </TableRow>
	                    ))}
	                  </TableBody>
	                </Table>
	              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Notes</CardTitle>
            </CardHeader>
            <CardContent>
              {notes.length === 0 ? (
                <div className="py-8 text-center text-gray-600">No notes yet.</div>
              ) : (
                <div className="space-y-3">
                  {notes.map((n) => (
                    <div key={n.noteId} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">{n.noteType || "note"}</div>
                        <div className="text-xs text-gray-500">
                          {n.createdAt ? new Date(n.createdAt).toLocaleString() : ""} · {n.createdByUserId.slice(0, 8)}
                        </div>
                      </div>
                      <div className="mt-2 text-sm whitespace-pre-wrap">{n.noteText}</div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
