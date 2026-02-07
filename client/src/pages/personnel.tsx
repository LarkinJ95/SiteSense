import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Search, Users, AlertTriangle, CheckCircle, Clock } from "lucide-react";

type PersonnelRow = {
  personId: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  company?: string | null;
  tradeRole?: string | null;
  employeeId?: string | null;
  email?: string | null;
  phone?: string | null;
  active: boolean;
  createdAt?: number | null;
  updatedAt?: number | null;
  stats?: {
    lastJobDate?: number | null;
    jobCount: number;
    sampleCount: number;
    lastExposureFlag?: "exceedance" | "near_miss" | null;
  };
};

const fmtDate = (ms?: number | null) => {
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString();
};

const flagBadge = (flag?: string | null) => {
  if (flag === "exceedance") {
    return (
      <Badge className="bg-red-100 text-red-800">
        <AlertTriangle className="h-3 w-3 mr-1" />
        Exceedance
      </Badge>
    );
  }
  if (flag === "near_miss") {
    return (
      <Badge className="bg-yellow-100 text-yellow-800">
        <Clock className="h-3 w-3 mr-1" />
        Near Miss
      </Badge>
    );
  }
  return (
    <Badge className="bg-green-100 text-green-800">
      <CheckCircle className="h-3 w-3 mr-1" />
      OK
    </Badge>
  );
};

export default function Personnel() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [includeInactive, setIncludeInactive] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["/api/user/profile"],
  });
  const defaultCompany =
    profile && typeof profile === "object" && typeof (profile as any).organization === "string"
      ? String((profile as any).organization || "")
      : "";

  const { data: rows = [], isLoading } = useQuery<PersonnelRow[]>({
    queryKey: ["/api/personnel", includeInactive ? "includeInactive=1" : "", search ? `search=${encodeURIComponent(search)}` : ""]
      .filter(Boolean)
      .join("?")
      .split("?"),
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (includeInactive) qs.set("includeInactive", "1");
      if (search.trim()) qs.set("search", search.trim());
      const url = qs.toString() ? `/api/personnel?${qs.toString()}` : "/api/personnel";
      const res = await apiRequest("GET", url);
      return (await res.json()) as PersonnelRow[];
    },
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
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
    isInspector: false,
    notes: "",
  });

  // If company is blank, default to the signed-in user's org label (still editable).
  // Only applies when opening the dialog so we don't override user input.
  useEffect(() => {
    if (!createOpen) return;
    if (form.company.trim()) return;
    if (!defaultCompany.trim()) return;
    setForm((prev) => ({ ...prev, company: defaultCompany }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createOpen, defaultCompany]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        company: form.company || null,
        tradeRole: form.tradeRole || null,
        employeeId: form.employeeId || null,
        email: form.email || null,
        phone: form.phone || null,
        respiratorClearanceDate: form.respiratorClearanceDate || null,
        fitTestDate: form.fitTestDate || null,
        medicalSurveillanceDate: form.medicalSurveillanceDate || null,
        active: form.active,
        isInspector: form.isInspector,
      };
      const res = await apiRequest("POST", "/api/personnel", payload);
      return (await res.json()) as PersonnelRow;
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["/api/personnel"] });
      setCreateOpen(false);
      setForm({
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
        isInspector: false,
        notes: "",
      });
      setLocation(`/personnel/${created.personId}`);
    },
    onError: (error: any) => {
      toast({ title: "Failed", description: error?.message || "Unable to create personnel.", variant: "destructive" });
    },
  });

  const sorted = useMemo(() => {
    const list = Array.isArray(rows) ? rows.slice() : [];
    list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    return list;
  }, [rows]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Personnel</h1>
          <p className="text-gray-600 mt-2">Workers across air monitoring jobs, with exposure history and auditability.</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Person
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Add Personnel</DialogTitle>
              <DialogDescription>Creates a single profile used across all jobs in the organization.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Company</Label>
                <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Trade/Role</Label>
                <Input value={form.tradeRole} onChange={(e) => setForm({ ...form, tradeRole: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Employee ID</Label>
                <Input value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Respirator Clearance</Label>
                <Input type="date" value={form.respiratorClearanceDate} onChange={(e) => setForm({ ...form, respiratorClearanceDate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Fit Test</Label>
                <Input type="date" value={form.fitTestDate} onChange={(e) => setForm({ ...form, fitTestDate: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Medical Surveillance</Label>
                <Input type="date" value={form.medicalSurveillanceDate} onChange={(e) => setForm({ ...form, medicalSurveillanceDate: e.target.value })} />
              </div>
              <div className="space-y-2 md:col-span-3">
                <Label>Status</Label>
                <Select value={form.active ? "active" : "inactive"} onValueChange={(v) => setForm({ ...form, active: v === "active" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="is-inspector"
                    checked={form.isInspector}
                    onCheckedChange={(v) => setForm({ ...form, isInspector: Boolean(v) })}
                  />
                  <Label htmlFor="is-inspector">Is an inspector</Label>
                </div>
              </div>
              <div className="space-y-2 md:col-span-3">
                <Label>Notes (optional)</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <div className="pt-2 flex justify-end">
              <Button onClick={() => createMutation.mutate()} disabled={!form.firstName.trim() || !form.lastName.trim() || createMutation.isPending}>
                Create
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Personnel Directory
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                className="pl-10"
                placeholder="Search name, company, role, employee ID, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="w-full md:w-56">
              <Select value={includeInactive ? "all" : "active"} onValueChange={(v) => setIncludeInactive(v === "all")}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active Only</SelectItem>
                  <SelectItem value="all">Include Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-gray-600">Loading...</div>
          ) : sorted.length === 0 ? (
            <div className="py-8 text-center text-gray-600">No personnel records.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Company / Role</TableHead>
                  <TableHead>Last Job</TableHead>
                  <TableHead># Jobs</TableHead>
                  <TableHead># Samples</TableHead>
                  <TableHead>Last Flag</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((p) => (
                  <TableRow key={p.personId} className="cursor-pointer" onClick={() => setLocation(`/personnel/${p.personId}`)}>
                    <TableCell>
                      <div className="font-medium">{p.lastName}, {p.firstName}</div>
                      <div className="text-xs text-gray-500">{p.employeeId ? `Employee: ${p.employeeId}` : ""}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{p.company || "—"}</div>
                      <div className="text-xs text-gray-500">{p.tradeRole || "—"}</div>
                    </TableCell>
                    <TableCell>{fmtDate(p.stats?.lastJobDate || null)}</TableCell>
                    <TableCell>{p.stats?.jobCount ?? 0}</TableCell>
                    <TableCell>{p.stats?.sampleCount ?? 0}</TableCell>
                    <TableCell>{flagBadge(p.stats?.lastExposureFlag || null)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
