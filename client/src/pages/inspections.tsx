import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { authClient } from "@/lib/auth";
import { Plus } from "lucide-react";

type ClientRow = {
  id: string;
  name: string;
  contactEmail?: string;
  contactPhone?: string | null;
  address?: string | null;
};

type BuildingRow = {
  buildingId: string;
  clientId: string;
  name: string;
  address?: string | null;
  notes?: string | null;
};

type InspectionRow = {
  inspectionId: string;
  clientId: string;
  buildingId: string;
  inspectionDate: any;
  status: string;
  recurrenceYears?: number | null;
  nextDueDate?: any;
  clientName?: string;
  buildingName?: string;
  overdue?: boolean;
};

const fmtDate = (value: any) => {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
};

const statusLabel = (value?: string | null) => {
  const s = (value || "").toString().trim();
  if (s === "in_progress") return "In Progress";
  if (s === "final") return "Final";
  return "Draft";
};

export default function Inspections() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: session } = authClient.useSession();

  const { data: inspections = [], isLoading } = useQuery<InspectionRow[]>({
    queryKey: ["/api/asbestos/inspections"],
  });

  const { data: clients = [] } = useQuery<ClientRow[]>({
    queryKey: ["/api/asbestos/clients"],
  });

  const [open, setOpen] = useState(false);
  const [creatingClient, setCreatingClient] = useState(false);
  const [creatingBuilding, setCreatingBuilding] = useState(false);

  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedBuildingId, setSelectedBuildingId] = useState("");
  const [inspectionDate, setInspectionDate] = useState("");
  const [status, setStatus] = useState<"draft" | "in_progress" | "final">("draft");
  const [recurrenceYears, setRecurrenceYears] = useState("3");
  const [notes, setNotes] = useState("");

  const [newClient, setNewClient] = useState({ name: "", contactEmail: "", contactPhone: "", address: "" });
  const [newBuilding, setNewBuilding] = useState({ name: "", address: "", notes: "" });

  const { data: buildings = [] } = useQuery<BuildingRow[]>({
    queryKey: selectedClientId ? [`/api/asbestos/clients/${selectedClientId}/buildings`] : ["__skip__buildings__"],
    enabled: !!selectedClientId && !creatingClient,
  });

  const canCreateInspection = Boolean(selectedBuildingId && inspectionDate);

  const createClientMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/asbestos/clients", {
        name: newClient.name.trim(),
        contactEmail: newClient.contactEmail.trim(),
        contactPhone: newClient.contactPhone.trim() || null,
        address: newClient.address.trim() || null,
      });
      return (await res.json()) as ClientRow;
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["/api/asbestos/clients"] });
      setCreatingClient(false);
      setSelectedClientId(created.id);
      toast({ title: "Client created" });
    },
    onError: (err: any) => toast({ title: "Failed", description: err?.message || "Unable to create client.", variant: "destructive" }),
  });

  const createBuildingMutation = useMutation({
    mutationFn: async () => {
      if (!selectedClientId) throw new Error("Select a client first");
      const res = await apiRequest("POST", `/api/asbestos/clients/${selectedClientId}/buildings`, {
        clientId: selectedClientId,
        name: newBuilding.name.trim(),
        address: newBuilding.address.trim() || null,
        notes: newBuilding.notes.trim() || null,
      });
      return (await res.json()) as BuildingRow;
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: [`/api/asbestos/clients/${selectedClientId}/buildings`] });
      setCreatingBuilding(false);
      setSelectedBuildingId(created.buildingId);
      toast({ title: "Building created" });
    },
    onError: (err: any) => toast({ title: "Failed", description: err?.message || "Unable to create building.", variant: "destructive" }),
  });

  const createInspectionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedBuildingId) throw new Error("Building is required");
      if (!inspectionDate) throw new Error("Inspection date is required");
      const years = recurrenceYears.trim() ? Number(recurrenceYears) : undefined;
      const inspectors = session?.user?.id ? [session.user.id] : [];
      const res = await apiRequest("POST", `/api/asbestos/buildings/${selectedBuildingId}/inspections`, {
        inspectionDate,
        inspectors,
        status,
        recurrenceYears: Number.isFinite(years as any) ? years : undefined,
        notes: notes.trim() || null,
      });
      return (await res.json()) as InspectionRow;
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["/api/asbestos/inspections"] });
      setOpen(false);
      toast({ title: "Inspection created" });
      setLocation(`/inspections/${created.inspectionId}`);
    },
    onError: (err: any) => toast({ title: "Failed", description: err?.message || "Unable to create inspection.", variant: "destructive" }),
  });

  const rows = useMemo(() => inspections || [], [inspections]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Asbestos Inspections</h1>
          <p className="text-sm text-muted-foreground">Client → Building → Inspections, with HTML reports and Excel exports.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Inspection
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Create Asbestos Inspection</DialogTitle>
              <DialogDescription>Select client/building (or create inline), set recurrence, then save.</DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Client</Label>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setCreatingClient((v) => !v)}>
                    {creatingClient ? "Use Existing" : "New Client"}
                  </Button>
                </div>
                {creatingClient ? (
                  <div className="space-y-2 rounded-md border p-3">
                    <div className="space-y-1">
                      <Label>Name</Label>
                      <Input value={newClient.name} onChange={(e) => setNewClient({ ...newClient, name: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Contact Email</Label>
                      <Input value={newClient.contactEmail} onChange={(e) => setNewClient({ ...newClient, contactEmail: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label>Phone</Label>
                        <Input value={newClient.contactPhone} onChange={(e) => setNewClient({ ...newClient, contactPhone: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <Label>Address</Label>
                        <Input value={newClient.address} onChange={(e) => setNewClient({ ...newClient, address: e.target.value })} />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        onClick={() => createClientMutation.mutate()}
                        disabled={!newClient.name.trim() || !newClient.contactEmail.trim() || createClientMutation.isPending}
                      >
                        Create Client
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Select
                    value={selectedClientId}
                    onValueChange={(value) => {
                      setSelectedClientId(value);
                      setSelectedBuildingId("");
                      setCreatingBuilding(false);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Building</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={!selectedClientId || creatingClient}
                    onClick={() => setCreatingBuilding((v) => !v)}
                  >
                    {creatingBuilding ? "Use Existing" : "New Building"}
                  </Button>
                </div>
                {creatingBuilding ? (
                  <div className="space-y-2 rounded-md border p-3">
                    <div className="space-y-1">
                      <Label>Name</Label>
                      <Input value={newBuilding.name} onChange={(e) => setNewBuilding({ ...newBuilding, name: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Address</Label>
                      <Input value={newBuilding.address} onChange={(e) => setNewBuilding({ ...newBuilding, address: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label>Notes</Label>
                      <Textarea value={newBuilding.notes} onChange={(e) => setNewBuilding({ ...newBuilding, notes: e.target.value })} />
                    </div>
                    <div className="flex justify-end">
                      <Button
                        type="button"
                        onClick={() => createBuildingMutation.mutate()}
                        disabled={!newBuilding.name.trim() || createBuildingMutation.isPending}
                      >
                        Create Building
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Select value={selectedBuildingId} onValueChange={setSelectedBuildingId} disabled={!selectedClientId || creatingClient}>
                    <SelectTrigger>
                      <SelectValue placeholder={!selectedClientId ? "Select a client first" : "Select a building"} />
                    </SelectTrigger>
                    <SelectContent>
                      {buildings.map((b) => (
                        <SelectItem key={b.buildingId} value={b.buildingId}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label>Inspection Date</Label>
                <Input type="date" value={inspectionDate} onChange={(e) => setInspectionDate(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as any)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="final">Final</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Recurrence (years)</Label>
                <Select value={recurrenceYears} onValueChange={setRecurrenceYears}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1</SelectItem>
                    <SelectItem value="2">2</SelectItem>
                    <SelectItem value="3">3</SelectItem>
                    <SelectItem value="4">4</SelectItem>
                    <SelectItem value="5">5</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Notes</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={() => createInspectionMutation.mutate()} disabled={!canCreateInspection || createInspectionMutation.isPending}>
                Create Inspection
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Inspections</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading…</div>
          ) : rows.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No inspections yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Building</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Next Due</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.inspectionId} className="hover:bg-muted/50">
                    <TableCell>
                      <Link href={`/inspections/${r.inspectionId}`} className="text-primary underline">
                        {fmtDate(r.inspectionDate)}
                      </Link>
                    </TableCell>
                    <TableCell>{r.clientName || "—"}</TableCell>
                    <TableCell>{r.buildingName || "—"}</TableCell>
                    <TableCell>{statusLabel(r.status)}</TableCell>
                    <TableCell className={r.overdue ? "text-red-600 font-medium" : ""}>{fmtDate(r.nextDueDate)}</TableCell>
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

