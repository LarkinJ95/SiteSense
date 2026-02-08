import { useMemo, useState } from "react";
import { useParams, useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Download, FileText, Plus } from "lucide-react";

type InspectionDetailResponse = {
  inspection: any;
  building: any;
  client: any;
};

type InventoryItem = {
  itemId: string;
  externalItemId?: string | null;
  material?: string | null;
  location?: string | null;
  category?: string | null;
  acmStatus?: string | null;
  condition?: string | null;
  quantity?: any;
  uom?: string | null;
  status?: string | null;
  active?: boolean;
};

type ChangeRow = {
  changeId: string;
  itemId?: string | null;
  fieldName: string;
  oldValue?: string | null;
  newValue?: string | null;
  reason?: string | null;
  createdAt?: any;
  createdByUserId?: string | null;
};

type SampleRow = {
  sampleId: string;
  sampleType: string;
  itemId?: string | null;
  sampleNumber?: string | null;
  collectedAt?: any;
  material?: string | null;
  location?: string | null;
  lab?: string | null;
  tat?: string | null;
  coc?: string | null;
  result?: string | null;
  resultUnit?: string | null;
  notes?: string | null;
};

type DocRow = {
  documentId: string;
  docType?: string | null;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt?: any;
  url?: string | null;
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

export default function InspectionDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data, isLoading } = useQuery<InspectionDetailResponse>({
    queryKey: id ? [`/api/asbestos/inspections/${id}`] : ["__skip__inspection__"],
    enabled: !!id,
  });

  const inspection = data?.inspection;
  const building = data?.building;
  const client = data?.client;

  const { data: inventory = [] } = useQuery<InventoryItem[]>({
    queryKey: building?.buildingId ? [`/api/asbestos/buildings/${building.buildingId}/inventory`] : ["__skip__inventory__"],
    enabled: !!building?.buildingId,
  });

  const { data: changes = [] } = useQuery<ChangeRow[]>({
    queryKey: id ? [`/api/asbestos/inspections/${id}/changes`] : ["__skip__changes__"],
    enabled: !!id,
  });

  const { data: samples = [] } = useQuery<SampleRow[]>({
    queryKey: id ? [`/api/asbestos/inspections/${id}/samples`] : ["__skip__samples__"],
    enabled: !!id,
  });

  const { data: documents = [] } = useQuery<DocRow[]>({
    queryKey: id ? [`/api/asbestos/inspections/${id}/documents`] : ["__skip__docs__"],
    enabled: !!id,
  });

  const itemLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const i of inventory || []) {
      const label = [i.externalItemId, i.material, i.location].filter(Boolean).join(" · ");
      map.set(i.itemId, label || i.itemId);
    }
    return map;
  }, [inventory]);

  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editReason, setEditReason] = useState("");
  const [editPatch, setEditPatch] = useState({ condition: "", status: "", quantity: "", uom: "", acmStatus: "" });

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
      if (!building?.buildingId) throw new Error("Missing building");
      const res = await apiRequest("POST", `/api/asbestos/buildings/${building.buildingId}/inventory`, {
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
      if (!building?.buildingId) return;
      queryClient.invalidateQueries({ queryKey: [`/api/asbestos/buildings/${building.buildingId}/inventory`] });
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

  const updateItemMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("Missing inspection id");
      if (!editItem) throw new Error("No item selected");
      const reason = editReason.trim();
      if (!reason) throw new Error("Reason is required");
      const patch: any = {
        condition: editPatch.condition.trim() || null,
        status: editPatch.status.trim() || null,
        quantity: editPatch.quantity.trim() || null,
        uom: editPatch.uom.trim() || null,
        acmStatus: editPatch.acmStatus.trim() || null,
      };
      const res = await apiRequest("PUT", `/api/asbestos/inventory-items/${editItem.itemId}`, {
        inspectionId: id,
        reason,
        patch,
      });
      return await res.json();
    },
    onSuccess: () => {
      if (!building?.buildingId || !id) return;
      queryClient.invalidateQueries({ queryKey: [`/api/asbestos/buildings/${building.buildingId}/inventory`] });
      queryClient.invalidateQueries({ queryKey: [`/api/asbestos/inspections/${id}/changes`] });
      setEditOpen(false);
      setEditItem(null);
      setEditReason("");
      toast({ title: "Saved", description: "Inventory update recorded." });
    },
    onError: (err: any) => toast({ title: "Failed", description: err?.message || "Unable to update inventory.", variant: "destructive" }),
  });

  const [sampleOpen, setSampleOpen] = useState(false);
  const [sampleForm, setSampleForm] = useState({
    sampleType: "acm",
    itemId: "",
    sampleNumber: "",
    collectedAt: "",
    material: "",
    location: "",
    lab: "",
    tat: "",
    coc: "",
    result: "",
    resultUnit: "",
    notes: "",
  });

  const addSampleMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("Missing inspection id");
      const payload: any = {
        sampleType: sampleForm.sampleType,
        itemId: sampleForm.itemId || null,
        sampleNumber: sampleForm.sampleNumber.trim() || null,
        collectedAt: sampleForm.collectedAt || null,
        material: sampleForm.material.trim() || null,
        location: sampleForm.location.trim() || null,
        lab: sampleForm.lab.trim() || null,
        tat: sampleForm.tat.trim() || null,
        coc: sampleForm.coc.trim() || null,
        result: sampleForm.result.trim() || null,
        resultUnit: sampleForm.resultUnit.trim() || null,
        notes: sampleForm.notes.trim() || null,
      };
      const res = await apiRequest("POST", `/api/asbestos/inspections/${id}/samples`, payload);
      return await res.json();
    },
    onSuccess: () => {
      if (!id) return;
      queryClient.invalidateQueries({ queryKey: [`/api/asbestos/inspections/${id}/samples`] });
      setSampleOpen(false);
      setSampleForm({
        sampleType: "acm",
        itemId: "",
        sampleNumber: "",
        collectedAt: "",
        material: "",
        location: "",
        lab: "",
        tat: "",
        coc: "",
        result: "",
        resultUnit: "",
        notes: "",
      });
      toast({ title: "Saved", description: "Sample added." });
    },
    onError: (err: any) => toast({ title: "Failed", description: err?.message || "Unable to add sample.", variant: "destructive" }),
  });

  const [docOpen, setDocOpen] = useState(false);
  const [docType, setDocType] = useState("General");
  const [docFile, setDocFile] = useState<File | null>(null);

  const uploadDocMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("Missing inspection id");
      if (!docFile) throw new Error("Choose a file");
      const form = new FormData();
      form.append("document", docFile);
      form.append("docType", docType);
      const res = await fetch(`/api/asbestos/inspections/${id}/documents`, { method: "POST", body: form, credentials: "include" });
      if (!res.ok) throw new Error(await res.text());
      return await res.json();
    },
    onSuccess: () => {
      if (!id) return;
      queryClient.invalidateQueries({ queryKey: [`/api/asbestos/inspections/${id}/documents`] });
      setDocOpen(false);
      setDocFile(null);
      toast({ title: "Uploaded" });
    },
    onError: (err: any) => toast({ title: "Failed", description: err?.message || "Unable to upload document.", variant: "destructive" }),
  });

  if (isLoading || !inspection) return null;

  const title = `${client?.name || "Client"} · ${building?.name || "Building"}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" onClick={() => setLocation("/inspections")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <div className="text-2xl font-bold">{title}</div>
            <div className="text-sm text-muted-foreground">
              Inspection ID <span className="font-mono">{inspection.inspectionId}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => window.open(`/inspections/${inspection.inspectionId}/report`, "_blank")}>
            <FileText className="h-4 w-4 mr-2" />
            View Report
          </Button>
          <Button variant="outline" onClick={() => window.open(`/api/asbestos/inspections/${inspection.inspectionId}/export`, "_blank")}>
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Inspection Summary</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">Inspection Date</div>
            <div className="font-medium">{fmtDate(inspection.inspectionDate)}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Status</div>
            <div className="font-medium">{(inspection.status || "draft").toString()}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Next Due</div>
            <div className="font-medium">{fmtDate(inspection.nextDueDate)}</div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="inventory" className="space-y-4">
        <TabsList>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="samples">Samples</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="changes">Audit Trail</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Building Inventory</CardTitle>
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
                      <DialogDescription>Creates a building inventory item that can be inspected and sampled.</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Item ID (external)</Label>
                        <Input value={addItemForm.externalItemId} onChange={(e) => setAddItemForm({ ...addItemForm, externalItemId: e.target.value })} />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Material</Label>
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
                        <Label>ACM/PACM</Label>
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
                      <Button onClick={() => addItemMutation.mutate()} disabled={addItemMutation.isPending}>
                        Save Item
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>

                <Button variant="outline" onClick={() => window.open(`/api/asbestos/buildings/${building.buildingId}/inventory/export`, "_blank")}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Inventory
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {inventory.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">No inventory items yet.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>ACM/PACM</TableHead>
                      <TableHead>Condition</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventory.map((i) => (
                      <TableRow key={i.itemId}>
                        <TableCell className="font-mono text-xs">{i.externalItemId || i.itemId}</TableCell>
                        <TableCell>{i.material || "—"}</TableCell>
                        <TableCell>{i.location || "—"}</TableCell>
                        <TableCell>{i.acmStatus || "—"}</TableCell>
                        <TableCell>{i.condition || "—"}</TableCell>
                        <TableCell>{i.status || "—"}</TableCell>
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

        <TabsContent value="samples" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle>Sample Logs</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => window.open(`/api/asbestos/inspections/${inspection.inspectionId}/samples/export?separateSheets=1`, "_blank")}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export Samples
                </Button>
                <Dialog open={sampleOpen} onOpenChange={setSampleOpen}>
                  <DialogTrigger asChild>
                    <Button variant="secondary">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Sample
                    </Button>
                  </DialogTrigger>
                <DialogContent className="max-w-3xl">
                  <DialogHeader>
                    <DialogTitle>Add Sample</DialogTitle>
                    <DialogDescription>Log ACM or Paint/Metals samples and link to inventory where applicable.</DialogDescription>
                  </DialogHeader>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Select value={sampleForm.sampleType} onValueChange={(v) => setSampleForm({ ...sampleForm, sampleType: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="acm">ACM</SelectItem>
                          <SelectItem value="paint_metals">Paint/Metals</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Inventory Item (optional)</Label>
                      <Select value={sampleForm.itemId} onValueChange={(v) => setSampleForm({ ...sampleForm, itemId: v === "__none__" ? "" : v })}>
                        <SelectTrigger><SelectValue placeholder="Select an item" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">None</SelectItem>
                          {inventory.map((i) => (
                            <SelectItem key={i.itemId} value={i.itemId}>
                              {itemLabelById.get(i.itemId) || i.itemId}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Sample #</Label>
                      <Input value={sampleForm.sampleNumber} onChange={(e) => setSampleForm({ ...sampleForm, sampleNumber: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Collected At</Label>
                      <Input type="datetime-local" value={sampleForm.collectedAt} onChange={(e) => setSampleForm({ ...sampleForm, collectedAt: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Material</Label>
                      <Input value={sampleForm.material} onChange={(e) => setSampleForm({ ...sampleForm, material: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Input value={sampleForm.location} onChange={(e) => setSampleForm({ ...sampleForm, location: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Lab</Label>
                      <Input value={sampleForm.lab} onChange={(e) => setSampleForm({ ...sampleForm, lab: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>TAT</Label>
                      <Input value={sampleForm.tat} onChange={(e) => setSampleForm({ ...sampleForm, tat: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>CoC</Label>
                      <Input value={sampleForm.coc} onChange={(e) => setSampleForm({ ...sampleForm, coc: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Result</Label>
                      <Input value={sampleForm.result} onChange={(e) => setSampleForm({ ...sampleForm, result: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <Label>Units</Label>
                      <Input value={sampleForm.resultUnit} onChange={(e) => setSampleForm({ ...sampleForm, resultUnit: e.target.value })} />
                    </div>
                    <div className="space-y-2 md:col-span-3">
                      <Label>Notes</Label>
                      <Textarea value={sampleForm.notes} onChange={(e) => setSampleForm({ ...sampleForm, notes: e.target.value })} />
                    </div>
                  </div>
                  <div className="pt-2 flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setSampleOpen(false)}>Cancel</Button>
                    <Button onClick={() => addSampleMutation.mutate()} disabled={addSampleMutation.isPending}>Save Sample</Button>
                  </div>
                </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {samples.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">No samples logged yet.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Sample #</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Collected</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Result</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {samples.map((s) => (
                      <TableRow key={s.sampleId}>
                        <TableCell>{s.sampleType}</TableCell>
                        <TableCell>{s.sampleNumber || "—"}</TableCell>
                        <TableCell>{s.itemId ? itemLabelById.get(s.itemId) || s.itemId : "—"}</TableCell>
                        <TableCell>{fmtDateTime(s.collectedAt)}</TableCell>
                        <TableCell>{s.location || "—"}</TableCell>
                        <TableCell>
                          {(s.result || "").toString()} {s.resultUnit || ""}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
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
                    <Plus className="h-4 w-4 mr-2" />
                    Upload
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-xl">
                  <DialogHeader>
                    <DialogTitle>Upload Document</DialogTitle>
                    <DialogDescription>Files are stored under the inspection and linked in the report.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <Input value={docType} onChange={(e) => setDocType(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label>File</Label>
                      <Input type="file" onChange={(e) => setDocFile(e.target.files?.[0] || null)} />
                    </div>
                  </div>
                  <div className="pt-2 flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setDocOpen(false)}>Cancel</Button>
                    <Button onClick={() => uploadDocMutation.mutate()} disabled={!docFile || uploadDocMutation.isPending}>Upload</Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {documents.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">No documents uploaded.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Uploaded</TableHead>
                      <TableHead>Link</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {documents.map((d) => (
                      <TableRow key={d.documentId}>
                        <TableCell>{d.docType || "—"}</TableCell>
                        <TableCell>{d.originalName}</TableCell>
                        <TableCell>{fmtDateTime(d.uploadedAt)}</TableCell>
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

        <TabsContent value="changes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Audit Trail</CardTitle>
            </CardHeader>
            <CardContent>
              {changes.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">No inventory updates recorded for this inspection.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>When</TableHead>
                      <TableHead>Item</TableHead>
                      <TableHead>Field</TableHead>
                      <TableHead>Old</TableHead>
                      <TableHead>New</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {changes.map((ch) => (
                      <TableRow key={ch.changeId}>
                        <TableCell>{fmtDateTime(ch.createdAt)}</TableCell>
                        <TableCell className="font-mono text-xs">{ch.itemId || "—"}</TableCell>
                        <TableCell>{ch.fieldName}</TableCell>
                        <TableCell>{ch.oldValue ?? "—"}</TableCell>
                        <TableCell>{ch.newValue ?? "—"}</TableCell>
                        <TableCell>{ch.reason ?? "—"}</TableCell>
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
            <DialogDescription>Edits require a reason and are saved to this inspection’s audit trail.</DialogDescription>
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
