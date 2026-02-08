import { useMemo, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Download, FileText, Plus, Upload } from "lucide-react";

type HubResponse = {
  building: any;
  client: any;
  lastInspection: any | null;
  lastInspectionMs: number | null;
  nextDueMs: number | null;
  overdue: boolean;
  missingInventoryBaseline: boolean;
  inventoryCount: number;
};

const fmtDate = (value: any) => {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
};

const fmtDateTime = (value: any) => {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
};

export default function BuildingHub() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: hub, isLoading } = useQuery<HubResponse>({
    queryKey: id ? [`/api/asbestos/buildings/${id}/hub`] : ["__skip__hub__"],
    enabled: !!id,
  });

  const building = hub?.building;
  const client = hub?.client;

  const { data: inventory = [] } = useQuery<any[]>({
    queryKey: id ? [`/api/asbestos/buildings/${id}/inventory`] : ["__skip__inv__"],
    enabled: !!id,
  });

  const { data: inspections = [] } = useQuery<any[]>({
    queryKey: id ? [`/api/asbestos/buildings/${id}/inspections`] : ["__skip__ins__"],
    enabled: !!id,
  });

  const { data: acmSamples = [] } = useQuery<any[]>({
    queryKey: id ? [`/api/asbestos/buildings/${id}/samples?type=acm`] : ["__skip__acm__"],
    enabled: !!id,
  });

  const { data: pmSamples = [] } = useQuery<any[]>({
    queryKey: id ? [`/api/asbestos/buildings/${id}/samples?type=paint_metals`] : ["__skip__pm__"],
    enabled: !!id,
  });

  const { data: documents = [] } = useQuery<any[]>({
    queryKey: id ? [`/api/asbestos/buildings/${id}/documents`] : ["__skip__bdocs__"],
    enabled: !!id,
  });

  const { data: projects = [] } = useQuery<any[]>({
    queryKey: id ? [`/api/asbestos/buildings/${id}/abatement-projects`] : ["__skip__proj__"],
    enabled: !!id,
  });

  const { data: budget } = useQuery<any>({
    queryKey: id ? [`/api/asbestos/buildings/${id}/budget`] : ["__skip__budget__"],
    enabled: !!id,
  });

  const { data: budgetChanges = [] } = useQuery<any[]>({
    queryKey: budget?.budgetId ? [`/api/asbestos/budgets/${budget.budgetId}/changes`] : ["__skip__budget_changes__"],
    enabled: !!budget?.budgetId,
  });

  const [invFilters, setInvFilters] = useState({ q: "", status: "", category: "", acmStatus: "", condition: "" });
  const filteredInventory = useMemo(() => {
    const q = invFilters.q.trim().toLowerCase();
    return (inventory || []).filter((i: any) => {
      if (invFilters.status && String(i.status || "") !== invFilters.status) return false;
      if (invFilters.category && String(i.category || "") !== invFilters.category) return false;
      if (invFilters.acmStatus && String(i.acmStatus || "") !== invFilters.acmStatus) return false;
      if (invFilters.condition && String(i.condition || "") !== invFilters.condition) return false;
      if (!q) return true;
      const hay = `${i.externalItemId || ""} ${i.material || ""} ${i.location || ""} ${i.category || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [inventory, invFilters]);

  const [addItemOpen, setAddItemOpen] = useState(false);
  const [addItemForm, setAddItemForm] = useState({
    externalItemId: "",
    material: "",
    location: "",
    category: "",
    acmStatus: "",
    condition: "",
    quantity: "",
    uom: "",
    status: "",
  });

  const addItemMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("Missing buildingId");
      const res = await apiRequest("POST", `/api/asbestos/buildings/${id}/inventory`, {
        externalItemId: addItemForm.externalItemId.trim() || null,
        material: addItemForm.material.trim() || null,
        location: addItemForm.location.trim() || null,
        category: addItemForm.category.trim() || null,
        acmStatus: addItemForm.acmStatus.trim() || null,
        condition: addItemForm.condition.trim() || null,
        quantity: addItemForm.quantity.trim() || null,
        uom: addItemForm.uom.trim() || null,
        status: addItemForm.status.trim() || null,
        active: true,
      });
      return await res.json();
    },
    onSuccess: () => {
      if (!id) return;
      queryClient.invalidateQueries({ queryKey: [`/api/asbestos/buildings/${id}/inventory`] });
      setAddItemOpen(false);
      setAddItemForm({
        externalItemId: "",
        material: "",
        location: "",
        category: "",
        acmStatus: "",
        condition: "",
        quantity: "",
        uom: "",
        status: "",
      });
      toast({ title: "Saved", description: "Inventory item added." });
    },
    onError: (err: any) => toast({ title: "Failed", description: err?.message || "Unable to add item.", variant: "destructive" }),
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [editReason, setEditReason] = useState("");
  const [editPatch, setEditPatch] = useState({ condition: "", status: "", quantity: "", uom: "", acmStatus: "" });

  const updateItemMutation = useMutation({
    mutationFn: async () => {
      if (!editItem) throw new Error("No item selected");
      const reason = editReason.trim();
      if (!reason) throw new Error("Reason is required");
      const res = await apiRequest("PUT", `/api/asbestos/inventory-items/${editItem.itemId}`, {
        reason,
        patch: {
          condition: editPatch.condition.trim() || null,
          status: editPatch.status.trim() || null,
          quantity: editPatch.quantity.trim() || null,
          uom: editPatch.uom.trim() || null,
          acmStatus: editPatch.acmStatus.trim() || null,
        },
      });
      return await res.json();
    },
    onSuccess: () => {
      if (!id) return;
      queryClient.invalidateQueries({ queryKey: [`/api/asbestos/buildings/${id}/inventory`] });
      queryClient.invalidateQueries({ queryKey: [`/api/asbestos/buildings/${id}/inventory/changes`] });
      setEditOpen(false);
      setEditItem(null);
      setEditReason("");
      toast({ title: "Saved", description: "Inventory item updated." });
    },
    onError: (err: any) => toast({ title: "Failed", description: err?.message || "Unable to update item.", variant: "destructive" }),
  });

  const [docOpen, setDocOpen] = useState(false);
  const [docType, setDocType] = useState("Other");
  const [docTags, setDocTags] = useState("");
  const [docFile, setDocFile] = useState<File | null>(null);

  const uploadDocMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("Missing buildingId");
      if (!docFile) throw new Error("Choose a file");
      const form = new FormData();
      form.append("document", docFile);
      form.append("docType", docType);
      form.append("tags", docTags);
      const res = await fetch(`/api/asbestos/buildings/${id}/documents`, { method: "POST", body: form, credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return await res.json();
    },
    onSuccess: () => {
      if (!id) return;
      queryClient.invalidateQueries({ queryKey: [`/api/asbestos/buildings/${id}/documents`] });
      setDocOpen(false);
      setDocFile(null);
      toast({ title: "Uploaded" });
    },
    onError: (err: any) => toast({ title: "Failed", description: err?.message || "Unable to upload document.", variant: "destructive" }),
  });

  const [projOpen, setProjOpen] = useState(false);
  const [projForm, setProjForm] = useState({ projectName: "", status: "planned", startDate: "", endDate: "", scopeSummary: "" });
  const createProjectMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("Missing buildingId");
      const res = await apiRequest("POST", `/api/asbestos/buildings/${id}/abatement-projects`, {
        projectName: projForm.projectName.trim(),
        status: projForm.status,
        startDate: projForm.startDate || null,
        endDate: projForm.endDate || null,
        scopeSummary: projForm.scopeSummary.trim() || null,
      });
      return await res.json();
    },
    onSuccess: () => {
      if (!id) return;
      queryClient.invalidateQueries({ queryKey: [`/api/asbestos/buildings/${id}/abatement-projects`] });
      setProjOpen(false);
      setProjForm({ projectName: "", status: "planned", startDate: "", endDate: "", scopeSummary: "" });
      toast({ title: "Project created" });
    },
    onError: (err: any) => toast({ title: "Failed", description: err?.message || "Unable to create project.", variant: "destructive" }),
  });

  const [budgetReason, setBudgetReason] = useState("");
  const [budgetForm, setBudgetForm] = useState({ estimated: "", approved: "", committed: "", actual: "" });
  const saveBudgetMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("Missing buildingId");
      const reason = budgetReason.trim();
      if (!reason) throw new Error("Reason is required");
      const res = await apiRequest("PUT", `/api/asbestos/buildings/${id}/budget`, {
        reason,
        estimated: budgetForm.estimated.trim() || null,
        approved: budgetForm.approved.trim() || null,
        committed: budgetForm.committed.trim() || null,
        actual: budgetForm.actual.trim() || null,
      });
      return await res.json();
    },
    onSuccess: (saved: any) => {
      if (!id) return;
      queryClient.invalidateQueries({ queryKey: [`/api/asbestos/buildings/${id}/budget`] });
      if (saved?.budgetId) queryClient.invalidateQueries({ queryKey: [`/api/asbestos/budgets/${saved.budgetId}/changes`] });
      setBudgetReason("");
      toast({ title: "Saved", description: "Budget updated." });
    },
    onError: (err: any) => toast({ title: "Failed", description: err?.message || "Unable to save budget.", variant: "destructive" }),
  });

  const headerBadges = useMemo(() => {
    const badges: Array<{ label: string; tone: "danger" | "warn" | "info" }> = [];
    if (hub?.overdue) badges.push({ label: "Overdue Inspection", tone: "danger" });
    if (hub?.missingInventoryBaseline) badges.push({ label: "Missing Inventory Baseline", tone: "warn" });
    return badges;
  }, [hub?.overdue, hub?.missingInventoryBaseline]);

  if (isLoading || !hub) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" onClick={() => setLocation("/buildings")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <div className="text-2xl font-bold">{building?.name || "Building"}</div>
            <div className="text-sm text-muted-foreground">
              {client?.name ? (
                <Link className="text-primary underline" href={`/clients?focus=${encodeURIComponent(client.id || "")}`}>
                  {client.name}
                </Link>
              ) : (
                "—"
              )}
              {building?.address ? ` · ${building.address}` : ""}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {headerBadges.map((b) => (
                <span
                  key={b.label}
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    b.tone === "danger" ? "bg-red-100 text-red-700" : b.tone === "warn" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {b.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="text-muted-foreground">Last Inspection</div>
          <div className="font-medium">{hub.lastInspectionMs ? fmtDate(hub.lastInspectionMs) : "—"}</div>
          <div className="text-muted-foreground">Next Due</div>
          <div className={`font-medium ${hub.overdue ? "text-red-600" : ""}`}>{hub.nextDueMs ? fmtDate(hub.nextDueMs) : "—"}</div>
        </div>
      </div>

      <Tabs defaultValue="inventory" className="space-y-4">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="inspections">Inspection History</TabsTrigger>
          <TabsTrigger value="acm">ACM Sample History</TabsTrigger>
          <TabsTrigger value="paint">Paint/Metals Sample History</TabsTrigger>
          <TabsTrigger value="abatement">Abatement Projects</TabsTrigger>
          <TabsTrigger value="budgets">Budgets</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle>Inventory</CardTitle>
              <div className="flex items-center gap-2">
                <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
                  <DialogTrigger asChild>
                    <Button variant="secondary">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Item
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl">
                    <DialogHeader>
                      <DialogTitle>Add Inventory Item</DialogTitle>
                      <DialogDescription>Creates a new item in the building inventory baseline.</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Item ID (external)</Label>
                        <Input value={addItemForm.externalItemId} onChange={(e) => setAddItemForm({ ...addItemForm, externalItemId: e.target.value })} />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Material / Description</Label>
                        <Input value={addItemForm.material} onChange={(e) => setAddItemForm({ ...addItemForm, material: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Location</Label>
                        <Input value={addItemForm.location} onChange={(e) => setAddItemForm({ ...addItemForm, location: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Category</Label>
                        <Input value={addItemForm.category} onChange={(e) => setAddItemForm({ ...addItemForm, category: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>ACM/PACM/Suspect</Label>
                        <Input value={addItemForm.acmStatus} onChange={(e) => setAddItemForm({ ...addItemForm, acmStatus: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Condition</Label>
                        <Input value={addItemForm.condition} onChange={(e) => setAddItemForm({ ...addItemForm, condition: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Status</Label>
                        <Input value={addItemForm.status} onChange={(e) => setAddItemForm({ ...addItemForm, status: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Quantity</Label>
                        <Input value={addItemForm.quantity} onChange={(e) => setAddItemForm({ ...addItemForm, quantity: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>UOM</Label>
                        <Input value={addItemForm.uom} onChange={(e) => setAddItemForm({ ...addItemForm, uom: e.target.value })} />
                      </div>
                    </div>
                    <div className="pt-2 flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setAddItemOpen(false)}>Cancel</Button>
                      <Button onClick={() => addItemMutation.mutate()} disabled={addItemMutation.isPending}>Save</Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button variant="outline" onClick={() => window.open(`/api/asbestos/buildings/${id}/inventory/export`, "_blank")}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                <Input placeholder="Search" value={invFilters.q} onChange={(e) => setInvFilters({ ...invFilters, q: e.target.value })} />
                <Input placeholder="Status" value={invFilters.status} onChange={(e) => setInvFilters({ ...invFilters, status: e.target.value })} />
                <Input placeholder="Category" value={invFilters.category} onChange={(e) => setInvFilters({ ...invFilters, category: e.target.value })} />
                <Input placeholder="ACM/PACM" value={invFilters.acmStatus} onChange={(e) => setInvFilters({ ...invFilters, acmStatus: e.target.value })} />
                <Input placeholder="Condition" value={invFilters.condition} onChange={(e) => setInvFilters({ ...invFilters, condition: e.target.value })} />
              </div>

              {filteredInventory.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">No records.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item ID</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>ACM/PACM</TableHead>
                      <TableHead>Condition</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Inspected</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInventory.map((i: any) => (
                      <TableRow key={i.itemId}>
                        <TableCell className="font-mono text-xs">{i.externalItemId || i.itemId}</TableCell>
                        <TableCell>{i.material || "—"}</TableCell>
                        <TableCell>{i.location || "—"}</TableCell>
                        <TableCell>{i.category || "—"}</TableCell>
                        <TableCell>{i.acmStatus || "—"}</TableCell>
                        <TableCell>{i.condition || "—"}</TableCell>
                        <TableCell>{i.status || "—"}</TableCell>
                        <TableCell>{fmtDate(i.lastInspectedAt)}</TableCell>
                        <TableCell>{fmtDate(i.lastUpdatedAt || i.updatedAt)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditItem(i);
                              setEditPatch({
                                condition: i.condition || "",
                                status: i.status || "",
                                quantity: i.quantity ? String(i.quantity) : "",
                                uom: i.uom || "",
                                acmStatus: i.acmStatus || "",
                              });
                              setEditReason("");
                              setEditOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inspections" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Inspection History</CardTitle>
              <Button variant="secondary" asChild>
                <Link href="/inspections">New Inspection</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {inspections.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">No records.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Recurrence</TableHead>
                      <TableHead>Next Due</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inspections.map((ins: any) => (
                      <TableRow key={ins.inspectionId}>
                        <TableCell>{fmtDate(ins.inspectionDate)}</TableCell>
                        <TableCell>{ins.status}</TableCell>
                        <TableCell>{ins.recurrenceYears ? `${ins.recurrenceYears} years` : "—"}</TableCell>
                        <TableCell>{fmtDate(ins.nextDueDate)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => setLocation(`/inspections/${ins.inspectionId}`)}>
                              Open
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => window.open(`/inspections/${ins.inspectionId}/report?print=1`, "_blank")}>
                              <FileText className="h-4 w-4 mr-2" />
                              Report
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => window.open(`/api/asbestos/inspections/${ins.inspectionId}/export`, "_blank")}>
                              <Download className="h-4 w-4 mr-2" />
                              Excel
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

        <TabsContent value="acm" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>ACM Sample History</CardTitle>
              <Button variant="outline" onClick={() => window.open(`/api/asbestos/buildings/${id}/samples/export?type=acm`, "_blank")}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              {acmSamples.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">No records.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Collected</TableHead>
                      <TableHead>Collector</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Inspection</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {acmSamples.map((s: any) => (
                      <TableRow key={s.sampleId}>
                        <TableCell>{fmtDateTime(s.collectedAt)}</TableCell>
                        <TableCell>{s.collector || "—"}</TableCell>
                        <TableCell>{s.location || "—"}</TableCell>
                        <TableCell>{s.material || "—"}</TableCell>
                        <TableCell>{(s.result || "").toString()} {s.resultUnit || ""}</TableCell>
                        <TableCell className="font-mono text-xs">{s.item?.externalItemId || s.itemId || "—"}</TableCell>
                        <TableCell>
                          {s.inspection?.inspectionId ? (
                            <Link className="text-primary underline" href={`/inspections/${s.inspection.inspectionId}`}>
                              {fmtDate(s.inspection.inspectionDate)}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="paint" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Paint/Metals Sample History</CardTitle>
              <Button variant="outline" onClick={() => window.open(`/api/asbestos/buildings/${id}/samples/export?type=paint_metals`, "_blank")}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              {pmSamples.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">No records.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Collected</TableHead>
                      <TableHead>Collector</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Substrate</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Inspection</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pmSamples.map((s: any) => (
                      <TableRow key={s.sampleId}>
                        <TableCell>{fmtDateTime(s.collectedAt)}</TableCell>
                        <TableCell>{s.collector || "—"}</TableCell>
                        <TableCell>{s.location || "—"}</TableCell>
                        <TableCell>{s.material || "—"}</TableCell>
                        <TableCell>{(s.result || "").toString()} {s.resultUnit || ""}</TableCell>
                        <TableCell className="font-mono text-xs">{s.item?.externalItemId || s.itemId || "—"}</TableCell>
                        <TableCell>
                          {s.inspection?.inspectionId ? (
                            <Link className="text-primary underline" href={`/inspections/${s.inspection.inspectionId}`}>
                              {fmtDate(s.inspection.inspectionDate)}
                            </Link>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="abatement" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Abatement Projects</CardTitle>
              <Dialog open={projOpen} onOpenChange={setProjOpen}>
                <DialogTrigger asChild>
                  <Button variant="secondary">
                    <Plus className="h-4 w-4 mr-2" />
                    New Project
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create Abatement Project</DialogTitle>
                    <DialogDescription>Tracks abatement work at this building.</DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <Label>Project Name</Label>
                      <Input value={projForm.projectName} onChange={(e) => setProjForm({ ...projForm, projectName: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Input value={projForm.status} onChange={(e) => setProjForm({ ...projForm, status: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input type="date" value={projForm.startDate} onChange={(e) => setProjForm({ ...projForm, startDate: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Input type="date" value={projForm.endDate} onChange={(e) => setProjForm({ ...projForm, endDate: e.target.value })} />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Scope Summary</Label>
                      <Textarea value={projForm.scopeSummary} onChange={(e) => setProjForm({ ...projForm, scopeSummary: e.target.value })} />
                    </div>
                  </div>
                  <div className="pt-2 flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setProjOpen(false)}>Cancel</Button>
                    <Button onClick={() => createProjectMutation.mutate()} disabled={!projForm.projectName.trim() || createProjectMutation.isPending}>
                      Create
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {projects.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">No records.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Linked Items</TableHead>
                      <TableHead>Scope</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects.map((p: any) => (
                      <TableRow key={p.projectId}>
                        <TableCell className="font-medium">{p.projectName}</TableCell>
                        <TableCell>{p.status}</TableCell>
                        <TableCell>{fmtDate(p.startDate)}{p.endDate ? ` - ${fmtDate(p.endDate)}` : ""}</TableCell>
                        <TableCell>{p.linkedItemsCount ?? 0}</TableCell>
                        <TableCell>{p.scopeSummary || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="budgets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Budgets</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label>Estimated</Label>
                  <Input value={budgetForm.estimated} onChange={(e) => setBudgetForm({ ...budgetForm, estimated: e.target.value })} placeholder={budget?.estimated ?? ""} />
                </div>
                <div className="space-y-1">
                  <Label>Approved</Label>
                  <Input value={budgetForm.approved} onChange={(e) => setBudgetForm({ ...budgetForm, approved: e.target.value })} placeholder={budget?.approved ?? ""} />
                </div>
                <div className="space-y-1">
                  <Label>Committed</Label>
                  <Input value={budgetForm.committed} onChange={(e) => setBudgetForm({ ...budgetForm, committed: e.target.value })} placeholder={budget?.committed ?? ""} />
                </div>
                <div className="space-y-1">
                  <Label>Actual</Label>
                  <Input value={budgetForm.actual} onChange={(e) => setBudgetForm({ ...budgetForm, actual: e.target.value })} placeholder={budget?.actual ?? ""} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Reason (required)</Label>
                <Textarea value={budgetReason} onChange={(e) => setBudgetReason(e.target.value)} placeholder="Why are you changing the budget?" />
              </div>
              <div className="flex justify-end">
                <Button onClick={() => saveBudgetMutation.mutate()} disabled={!budgetReason.trim() || saveBudgetMutation.isPending}>
                  Save Budget
                </Button>
              </div>
              <div>
                <div className="text-sm font-medium mb-2">Change History</div>
                {budgetChanges.length === 0 ? (
                  <div className="text-sm text-muted-foreground">No records.</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>When</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Changes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {budgetChanges.map((ch: any) => (
                        <TableRow key={ch.changeId}>
                          <TableCell>{fmtDateTime(ch.createdAt)}</TableCell>
                          <TableCell className="font-mono text-xs">{ch.createdByUserId || "—"}</TableCell>
                          <TableCell>{ch.reason || "—"}</TableCell>
                          <TableCell className="text-xs whitespace-pre-wrap">{Array.isArray(ch.changes) ? JSON.stringify(ch.changes) : String(ch.changes || "")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Documents</CardTitle>
              <Dialog open={docOpen} onOpenChange={setDocOpen}>
                <DialogTrigger asChild>
                  <Button variant="secondary">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-xl">
                  <DialogHeader>
                    <DialogTitle>Upload Document</DialogTitle>
                    <DialogDescription>Stores a building-level document with tags.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Input value={docType} onChange={(e) => setDocType(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>Tags (comma separated)</Label>
                      <Input value={docTags} onChange={(e) => setDocTags(e.target.value)} placeholder="Inspection, Lab Result, Photo" />
                    </div>
                    <div className="space-y-2">
                      <Label>File</Label>
                      <Input type="file" onChange={(e) => setDocFile(e.target.files?.[0] || null)} />
                    </div>
                  </div>
                  <div className="pt-2 flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setDocOpen(false)}>Cancel</Button>
                    <Button onClick={() => uploadDocMutation.mutate()} disabled={!docFile || uploadDocMutation.isPending}>
                      Upload
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">No records.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Uploaded</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead>Link</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((d: any) => (
                      <TableRow key={d.documentId}>
                        <TableCell>{d.docType || "—"}</TableCell>
                        <TableCell>{d.originalName}</TableCell>
                        <TableCell>{fmtDateTime(d.uploadedAt)}</TableCell>
                        <TableCell>{Array.isArray(d.tags) ? d.tags.join(", ") : ""}</TableCell>
                        <TableCell>
                          {d.url ? (
                            <a className="text-primary underline" href={d.url} target="_blank" rel="noreferrer">
                              Open
                            </a>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Inventory Item</DialogTitle>
            <DialogDescription>Edits require a reason and are saved to the building audit trail.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea value={editReason} onChange={(e) => setEditReason(e.target.value)} placeholder="Why is this change needed?" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>ACM/PACM</Label>
                <Input value={editPatch.acmStatus} onChange={(e) => setEditPatch({ ...editPatch, acmStatus: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Condition</Label>
                <Input value={editPatch.condition} onChange={(e) => setEditPatch({ ...editPatch, condition: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Input value={editPatch.status} onChange={(e) => setEditPatch({ ...editPatch, status: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input value={editPatch.quantity} onChange={(e) => setEditPatch({ ...editPatch, quantity: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>UOM</Label>
                <Input value={editPatch.uom} onChange={(e) => setEditPatch({ ...editPatch, uom: e.target.value })} />
              </div>
            </div>
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={() => updateItemMutation.mutate()} disabled={!editReason.trim() || updateItemMutation.isPending}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

