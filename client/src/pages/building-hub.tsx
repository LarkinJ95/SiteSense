import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, ArrowUpDown, ChevronDown, ChevronUp, Download, FileText, Plus, Upload } from "lucide-react";

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

const INV_CATEGORY_OPTIONS = ["TSI", "Surfacing", "Misc", "Other"] as const;
const INV_CONDITION_OPTIONS = ["Good", "Fair", "Poor", "Damaged", "Unknown"] as const;
const INV_STATUS_OPTIONS = ["Existing", "Removed"] as const;
const INV_UOM_OPTIONS = ["SqFt", "LF", "Qty", "Other"] as const;
// UI: "Sample # / PACM" only. Keep "Suspect" in the known list to preserve legacy rows.
const INV_ACM_KIND_KNOWN = ["Sample #", "PACM", "Suspect", "None"] as const;
const INV_ACM_KIND_OPTIONS = ["Sample #", "PACM", "None"] as const;

export default function BuildingHub() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: inspectors = [] } = useQuery<any[]>({
    queryKey: ["/api/inspectors"],
    enabled: true,
  });
  const { data: me } = useQuery<any>({
    queryKey: ["/api/me"],
    enabled: true,
  });

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

  const latestSampleNumberByItemId = useMemo(() => {
    const map = new Map<string, { collectedAt: number; value: string }>();
    const all = ([] as any[]).concat(acmSamples || [], pmSamples || []);
    for (const s of all) {
      const itemId = String(s?.itemId || "").trim();
      if (!itemId) continue;
      const collectedAt = s?.collectedAt ? new Date(s.collectedAt).getTime() : 0;
      const value = String(s?.sampleNumber || s?.sampleId || "").trim();
      if (!value) continue;
      const prev = map.get(itemId);
      if (!prev || collectedAt >= prev.collectedAt) {
        map.set(itemId, { collectedAt, value });
      }
    }
    return new Map(Array.from(map.entries()).map(([k, v]) => [k, v.value]));
  }, [acmSamples, pmSamples]);

  const { data: documents = [] } = useQuery<any[]>({
    queryKey: id ? [`/api/asbestos/buildings/${id}/documents`] : ["__skip__bdocs__"],
    enabled: !!id,
  });

  const { data: abatementLogs = [] } = useQuery<any[]>({
    queryKey: id ? [`/api/asbestos/buildings/${id}/abatement-logs`] : ["__skip__abatement_logs__"],
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
  const [invSort, setInvSort] = useState<{ key: string; dir: "asc" | "desc" }>({ key: "", dir: "asc" });

  const itemLabelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const i of inventory as any[]) {
      const itemId = String(i?.itemId || "").trim();
      if (!itemId) continue;
      const ext = String(i?.externalItemId || "").trim();
      const material = String(i?.material || "").trim();
      const loc = String(i?.location || "").trim();
      const label = `${ext || itemId}${material ? ` · ${material}` : ""}${loc ? ` (${loc})` : ""}`.trim();
      map.set(itemId, label || itemId);
    }
    return map;
  }, [inventory]);

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

  const sortedInventory = useMemo(() => {
    const key = invSort.key;
    if (!key) return filteredInventory;
    const dir = invSort.dir === "asc" ? 1 : -1;
    const dateValue = (v: any) => {
      if (!v) return 0;
      const d = new Date(v);
      return Number.isNaN(d.getTime()) ? 0 : d.getTime();
    };
    const strValue = (v: any) => String(v ?? "").trim().toLowerCase();
    const numValue = (v: any) => {
      if (v === null || v === undefined || v === "") return Number.NEGATIVE_INFINITY;
      const n = typeof v === "number" ? v : Number(v);
      return Number.isFinite(n) ? n : Number.NEGATIVE_INFINITY;
    };
    const get = (i: any) => {
      switch (key) {
        case "item":
          return strValue(i.externalItemId || i.itemId);
        case "material":
          return strValue(i.material);
        case "location":
          return strValue(i.location);
        case "category":
          return strValue(i.category);
        case "acmStatus":
          return strValue(i.acmStatus);
        case "condition":
          return strValue(i.condition);
        case "status":
          return strValue(i.status);
        case "lastInspectedAt":
          return dateValue(i.lastInspectedAt);
        case "updatedAt":
          return dateValue(i.lastUpdatedAt || i.updatedAt);
        case "quantity":
          return numValue(i.quantity);
        default:
          return strValue((i as any)[key]);
      }
    };

    return [...filteredInventory].sort((a: any, b: any) => {
      const av = get(a);
      const bv = get(b);
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [filteredInventory, invSort]);

  const toggleInvSort = (key: string) => {
    setInvSort((prev) => {
      if (prev.key !== key) return { key, dir: "asc" };
      return { key, dir: prev.dir === "asc" ? "desc" : "asc" };
    });
  };

  const SortIcon = ({ k }: { k: string }) => {
    if (invSort.key !== k) return <ArrowUpDown className="h-3.5 w-3.5 opacity-60" />;
    return invSort.dir === "asc" ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />;
  };

  const [addItemOpen, setAddItemOpen] = useState(false);
  const [addItemForm, setAddItemForm] = useState({
    externalItemId: "",
    material: "",
    location: "",
    category: "",
    acmKind: "None",
    acmSampleNumber: "",
    condition: "Unknown",
    quantity: "",
    uomKind: "" as string,
    uomOther: "",
    status: "Existing",
    notes: "",
  });

  const addItemMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("Missing buildingId");
      const acmStatusRaw =
        addItemForm.acmKind === "Sample #"
          ? addItemForm.acmSampleNumber.trim()
          : addItemForm.acmKind === "None"
            ? ""
            : addItemForm.acmKind;
      const uomRaw =
        addItemForm.uomKind === "Other"
          ? addItemForm.uomOther.trim()
          : addItemForm.uomKind.trim();
      const res = await apiRequest("POST", `/api/asbestos/buildings/${id}/inventory`, {
        externalItemId: addItemForm.externalItemId.trim() || null,
        material: addItemForm.material.trim() || null,
        location: addItemForm.location.trim() || null,
        category: addItemForm.category.trim() || null,
        acmStatus: acmStatusRaw || null,
        condition: addItemForm.condition.trim() || null,
        quantity: addItemForm.quantity.trim() || null,
        uom: uomRaw || null,
        status: addItemForm.status.trim() || null,
        notes: addItemForm.notes.trim() || null,
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
        acmKind: "None",
        acmSampleNumber: "",
        condition: "Unknown",
        quantity: "",
        uomKind: "",
        uomOther: "",
        status: "Existing",
        notes: "",
      });
      toast({ title: "Saved", description: "Inventory item added." });
    },
    onError: (err: any) => toast({ title: "Failed", description: err?.message || "Unable to add item.", variant: "destructive" }),
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [editReason, setEditReason] = useState("");
  const [editPatch, setEditPatch] = useState({
    externalItemId: "",
    material: "",
    location: "",
    category: "",
    condition: "Unknown",
    status: "Existing",
    quantity: "",
    uomKind: "" as string,
    uomOther: "",
    acmKind: "None",
    acmSampleNumber: "",
    notes: "",
  });

  const updateItemMutation = useMutation({
    mutationFn: async () => {
      if (!editItem) throw new Error("No item selected");
      const reason = editReason.trim();
      if (!reason) throw new Error("Reason is required");
      const acmStatusRaw =
        editPatch.acmKind === "Sample #"
          ? editPatch.acmSampleNumber.trim()
          : editPatch.acmKind === "None"
            ? ""
            : editPatch.acmKind;
      const uomRaw =
        editPatch.uomKind === "Other"
          ? editPatch.uomOther.trim()
          : editPatch.uomKind.trim();
      const res = await apiRequest("PUT", `/api/asbestos/inventory-items/${editItem.itemId}`, {
        reason,
        patch: {
          externalItemId: editPatch.externalItemId.trim() || null,
          material: editPatch.material.trim() || null,
          location: editPatch.location.trim() || null,
          category: editPatch.category.trim() || null,
          condition: editPatch.condition.trim() || null,
          status: editPatch.status.trim() || null,
          quantity: editPatch.quantity.trim() || null,
          uom: uomRaw || null,
          acmStatus: acmStatusRaw || null,
          notes: editPatch.notes.trim() || null,
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

  const [logOpen, setLogOpen] = useState(false);
  const [logForm, setLogForm] = useState({
    itemId: "",
    associatedItemNumber: "",
    associatedSampleNumber: "",
    materialDescription: "",
    location: "",
    abatementDate: "",
    contractor: "",
    methodKind: "" as "" | "Encapsulation" | "Enclosure" | "Removal" | "Other",
    methodOther: "",
    wasteShipmentId: "",
    disposalSite: "",
    clearanceDate: "",
    clearanceResult: "",
    cost: "",
    notes: "",
  });
  const [logDocs, setLogDocs] = useState<Array<{ id: string; file: File; docType: string }>>([]);

  const createLogMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("Missing buildingId");
      const method =
        logForm.methodKind === "Other" ? logForm.methodOther.trim() : logForm.methodKind;
      const payload: any = {
        itemId: logForm.itemId || null,
        associatedItemNumber: logForm.associatedItemNumber.trim() || null,
        associatedSampleNumber: logForm.associatedSampleNumber.trim() || null,
        materialDescription: logForm.materialDescription.trim() || null,
        location: logForm.location.trim() || null,
        abatementDate: logForm.abatementDate || null,
        contractor: logForm.contractor.trim() || null,
        method: method || null,
        wasteShipmentId: logForm.wasteShipmentId.trim() || null,
        disposalSite: logForm.disposalSite.trim() || null,
        clearanceDate: logForm.clearanceDate || null,
        clearanceResult: logForm.clearanceResult.trim() || null,
        cost: logForm.cost.trim() || null,
        notes: logForm.notes.trim() || null,
      };
      const res = await apiRequest("POST", `/api/asbestos/buildings/${id}/abatement-logs`, payload);
      const created = await res.json();

      // Optional: upload any attached docs and link them to this log entry.
      for (const d of logDocs) {
        const form = new FormData();
        form.append("document", d.file);
        form.append("docType", d.docType || "Abatement");
        form.append("tags", "abatement,repair-log");
        form.append("linkedEntityType", "abatement_repair_log");
        form.append("linkedEntityId", String(created?.logId || ""));
        const up = await fetch(`/api/asbestos/buildings/${id}/documents`, {
          method: "POST",
          body: form,
          credentials: "include",
        });
        if (!up.ok) throw new Error(await up.text());
      }

      return created;
    },
    onSuccess: () => {
      if (!id) return;
      queryClient.invalidateQueries({ queryKey: [`/api/asbestos/buildings/${id}/abatement-logs`] });
      queryClient.invalidateQueries({ queryKey: [`/api/asbestos/buildings/${id}/documents`] });
      setLogOpen(false);
      setLogForm({
        itemId: "",
        associatedItemNumber: "",
        associatedSampleNumber: "",
        materialDescription: "",
        location: "",
        abatementDate: "",
        contractor: "",
        methodKind: "",
        methodOther: "",
        wasteShipmentId: "",
        disposalSite: "",
        clearanceDate: "",
        clearanceResult: "",
        cost: "",
        notes: "",
      });
      setLogDocs([]);
      toast({ title: "Saved", description: "Log entry added." });
    },
    onError: (err: any) => toast({ title: "Failed", description: err?.message || "Unable to add log entry.", variant: "destructive" }),
  });

  const [sampleOpen, setSampleOpen] = useState(false);
  const [sampleType, setSampleType] = useState<"acm" | "paint_metals">("acm");
  const [sampleInspectionId, setSampleInspectionId] = useState("");
  const [sampleForm, setSampleForm] = useState({
    itemId: "",
    samplerUserId: "",
    sampleNumber: "",
    collectedAt: "",
    materialKind: "Drywall joint compound",
    materialOther: "",
    material: "",
    description: "",
    location: "",
    analyte: "Lead (Pb)",
    asbestosType: "Chrysotile",
    asbestosPercent: "",
    lab: "",
    coc: "",
    result: "",
    resultUnit: "",
    notes: "",
  });
  const [samplePhotos, setSamplePhotos] = useState<Array<{ id: string; file: File }>>([]);

  useEffect(() => {
    if (!sampleOpen) return;
    const myId = me && typeof me === "object" ? String(me.id || "") : "";
    if (!myId) return;
    setSampleForm((prev) => (prev.samplerUserId ? prev : { ...prev, samplerUserId: myId }));
  }, [sampleOpen, me]);

  const addBuildingSampleMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("Missing buildingId");
      const isPaintMetals = sampleType === "paint_metals";
      const isAcm = sampleType === "acm";
      const normalizedResultUnit = isPaintMetals ? "mg/kg" : sampleForm.resultUnit.trim();
      const resolvedMaterial =
        isAcm && sampleForm.materialKind === "Other"
          ? sampleForm.materialOther.trim()
          : isAcm
            ? sampleForm.materialKind.trim()
            : sampleForm.material.trim();
      const payload: any = {
        sampleType,
        // Paint/Metals samples shouldn't be tied to inspections/items in this workflow.
        inspectionId: isPaintMetals ? null : (sampleInspectionId || null),
        itemId: isPaintMetals ? null : (sampleForm.itemId || null),
        samplerUserId: sampleForm.samplerUserId || null,
        sampleNumber: sampleForm.sampleNumber.trim() || null,
        collectedAt: sampleForm.collectedAt || null,
        material: resolvedMaterial || null,
        description: sampleForm.description.trim() || null,
        location: sampleForm.location.trim() || null,
        analyte: isPaintMetals ? sampleForm.analyte.trim() || null : null,
        asbestosType: isAcm ? (sampleForm.asbestosType.trim() || null) : null,
        asbestosPercent: isAcm ? (sampleForm.asbestosPercent.trim() || null) : null,
        lab: sampleForm.lab.trim() || null,
        coc: null,
        result: isAcm ? null : (sampleForm.result.trim() || null),
        resultUnit: isAcm ? null : (normalizedResultUnit || null),
        notes: sampleForm.notes.trim() || null,
      };
      const res = await apiRequest("POST", `/api/asbestos/buildings/${id}/samples`, payload);
      const created = await res.json();

      // Optional: upload photos as building documents linked to the created sample.
      for (const p of samplePhotos) {
        const form = new FormData();
        form.append("document", p.file);
        form.append("docType", "Sample Photo");
        form.append("tags", isPaintMetals ? "sample-photo,paint-metals" : "sample-photo,acm");
        form.append("linkedEntityType", "asbestos_building_sample");
        form.append("linkedEntityId", String(created?.sampleId || ""));
        const up = await fetch(`/api/asbestos/buildings/${id}/documents`, {
          method: "POST",
          body: form,
          credentials: "include",
        });
        if (!up.ok) throw new Error(await up.text());
      }

      return created;
    },
    onSuccess: () => {
      if (!id) return;
      queryClient.invalidateQueries({ queryKey: [`/api/asbestos/buildings/${id}/samples?type=${sampleType}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/asbestos/buildings/${id}/documents`] });
      setSampleOpen(false);
      setSampleInspectionId("");
      setSampleForm({
        itemId: "",
        samplerUserId: "",
        sampleNumber: "",
        collectedAt: "",
        materialKind: "Drywall joint compound",
        materialOther: "",
        material: "",
        description: "",
        location: "",
        analyte: "Lead (Pb)",
        asbestosType: "Chrysotile",
        asbestosPercent: "",
        lab: "",
        coc: "",
        result: "",
        resultUnit: "",
        notes: "",
      });
      setSamplePhotos([]);
      toast({ title: "Saved", description: "Sample added." });
    },
    onError: (err: any) => toast({ title: "Failed", description: err?.message || "Unable to add sample.", variant: "destructive" }),
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
          <TabsTrigger value="abatement">Abatement/Repair Log</TabsTrigger>
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
	                      <Select value={addItemForm.category || ""} onValueChange={(v) => setAddItemForm({ ...addItemForm, category: v === "__none__" ? "" : v })}>
	                        <SelectTrigger>
	                          <SelectValue placeholder="Select category" />
	                        </SelectTrigger>
	                        <SelectContent>
	                          <SelectItem value="__none__">—</SelectItem>
	                          {INV_CATEGORY_OPTIONS.map((o) => (
	                            <SelectItem key={o} value={o}>
	                              {o}
	                            </SelectItem>
	                          ))}
	                        </SelectContent>
	                      </Select>
	                    </div>
	                    <div className="space-y-2">
	                      <Label>Sample # / PACM</Label>
	                      <Select value={addItemForm.acmKind} onValueChange={(v) => setAddItemForm({ ...addItemForm, acmKind: v as any })}>
	                        <SelectTrigger>
	                          <SelectValue />
	                        </SelectTrigger>
	                        <SelectContent>
	                          {INV_ACM_KIND_OPTIONS.map((o) => (
	                            <SelectItem key={o} value={o}>
	                              {o}
	                            </SelectItem>
	                          ))}
	                        </SelectContent>
	                      </Select>
	                      {addItemForm.acmKind === "Sample #" ? (
	                        <Input
	                          placeholder="Enter sample number"
	                          value={addItemForm.acmSampleNumber}
	                          onChange={(e) => setAddItemForm({ ...addItemForm, acmSampleNumber: e.target.value })}
	                        />
	                      ) : null}
	                    </div>
	                    <div className="space-y-2">
	                      <Label>Condition</Label>
	                      <Select value={addItemForm.condition} onValueChange={(v) => setAddItemForm({ ...addItemForm, condition: v })}>
	                        <SelectTrigger>
	                          <SelectValue />
	                        </SelectTrigger>
	                        <SelectContent>
	                          {INV_CONDITION_OPTIONS.map((o) => (
	                            <SelectItem key={o} value={o}>
	                              {o}
	                            </SelectItem>
	                          ))}
	                        </SelectContent>
	                      </Select>
	                    </div>
	                    <div className="space-y-2">
	                      <Label>Status</Label>
	                      <Select value={addItemForm.status} onValueChange={(v) => setAddItemForm({ ...addItemForm, status: v })}>
	                        <SelectTrigger>
	                          <SelectValue />
	                        </SelectTrigger>
	                        <SelectContent>
	                          {INV_STATUS_OPTIONS.map((o) => (
	                            <SelectItem key={o} value={o}>
	                              {o}
	                            </SelectItem>
	                          ))}
	                        </SelectContent>
	                      </Select>
	                    </div>
	                    <div className="space-y-2">
	                      <Label>Quantity</Label>
	                      <Input value={addItemForm.quantity} onChange={(e) => setAddItemForm({ ...addItemForm, quantity: e.target.value })} />
	                    </div>
	                    <div className="space-y-2">
	                      <Label>UOM</Label>
	                      <Select value={addItemForm.uomKind || ""} onValueChange={(v) => setAddItemForm({ ...addItemForm, uomKind: v === "__none__" ? "" : v })}>
	                        <SelectTrigger>
	                          <SelectValue placeholder="Select UOM" />
	                        </SelectTrigger>
	                        <SelectContent>
	                          <SelectItem value="__none__">—</SelectItem>
	                          {INV_UOM_OPTIONS.map((o) => (
	                            <SelectItem key={o} value={o}>
	                              {o}
	                            </SelectItem>
	                          ))}
	                        </SelectContent>
	                      </Select>
	                      {addItemForm.uomKind === "Other" ? (
	                        <Input
	                          placeholder="Enter UOM"
	                          value={addItemForm.uomOther}
	                          onChange={(e) => setAddItemForm({ ...addItemForm, uomOther: e.target.value })}
	                        />
	                      ) : null}
	                    </div>
	                    <div className="space-y-2 md:col-span-3">
	                      <Label>Notes</Label>
	                      <Textarea value={addItemForm.notes} onChange={(e) => setAddItemForm({ ...addItemForm, notes: e.target.value })} />
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

	              {sortedInventory.length === 0 ? (
	                <div className="py-8 text-center text-muted-foreground">No records.</div>
	              ) : (
	                <Table>
	                  <TableHeader>
	                    <TableRow>
	                      <TableHead>
	                        <button type="button" className="inline-flex items-center gap-1" onClick={() => toggleInvSort("item")}>
	                          Item ID <SortIcon k="item" />
	                        </button>
	                      </TableHead>
	                      <TableHead>
	                        <button type="button" className="inline-flex items-center gap-1" onClick={() => toggleInvSort("material")}>
	                          Material <SortIcon k="material" />
	                        </button>
	                      </TableHead>
	                      <TableHead>
	                        <button type="button" className="inline-flex items-center gap-1" onClick={() => toggleInvSort("location")}>
	                          Location <SortIcon k="location" />
	                        </button>
	                      </TableHead>
	                      <TableHead>
	                        <button type="button" className="inline-flex items-center gap-1" onClick={() => toggleInvSort("category")}>
	                          Category <SortIcon k="category" />
	                        </button>
	                      </TableHead>
	                      <TableHead>
	                        <button type="button" className="inline-flex items-center gap-1" onClick={() => toggleInvSort("acmStatus")}>
	                          Sample #/PACM <SortIcon k="acmStatus" />
	                        </button>
	                      </TableHead>
	                      <TableHead>
	                        <button type="button" className="inline-flex items-center gap-1" onClick={() => toggleInvSort("condition")}>
	                          Condition <SortIcon k="condition" />
	                        </button>
	                      </TableHead>
	                      <TableHead>
	                        <button type="button" className="inline-flex items-center gap-1" onClick={() => toggleInvSort("status")}>
	                          Status <SortIcon k="status" />
	                        </button>
	                      </TableHead>
	                      <TableHead>
	                        <button type="button" className="inline-flex items-center gap-1" onClick={() => toggleInvSort("lastInspectedAt")}>
	                          Last Inspected <SortIcon k="lastInspectedAt" />
	                        </button>
	                      </TableHead>
	                      <TableHead>
	                        <button type="button" className="inline-flex items-center gap-1" onClick={() => toggleInvSort("updatedAt")}>
	                          Updated <SortIcon k="updatedAt" />
	                        </button>
	                      </TableHead>
	                      <TableHead className="text-right">Actions</TableHead>
	                    </TableRow>
	                  </TableHeader>
	                  <TableBody>
	                    {sortedInventory.map((i: any) => (
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
		                              const raw = String(i.acmStatus || "").trim();
		                              const known = INV_ACM_KIND_KNOWN.includes(raw as any);
		                              const acmKind = raw ? (known ? raw : "Sample #") : "None";
		                              const acmSampleNumber = raw && !known ? raw : "";
	                              const uRaw = String(i.uom || "").trim();
	                              const uKnown = INV_UOM_OPTIONS.includes(uRaw as any);
	                              const uomKind = uRaw ? (uKnown ? uRaw : "Other") : "";
	                              const uomOther = uRaw && !uKnown ? uRaw : "";
		                              setEditItem(i);
		                              setEditPatch({
		                                externalItemId: i.externalItemId || "",
		                                material: i.material || "",
		                                location: i.location || "",
		                                category: i.category || "",
		                                condition: i.condition || "Unknown",
		                                status: i.status || "Existing",
		                                quantity: i.quantity ? String(i.quantity) : "",
		                                uomKind,
		                                uomOther,
		                                acmKind,
		                                acmSampleNumber,
		                                notes: i.notes || "",
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
	              <div className="flex items-center gap-2">
	                <Button
	                  variant="secondary"
	                  onClick={() => {
	                    setSampleType("acm");
	                    setSampleOpen(true);
	                  }}
	                >
	                  <Plus className="h-4 w-4 mr-2" />
	                  Add Sample
	                </Button>
	                <Button variant="outline" onClick={() => window.open(`/api/asbestos/buildings/${id}/samples/export?type=acm`, "_blank")}>
	                  <Download className="h-4 w-4 mr-2" />
	                  Export
	                </Button>
	              </div>
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
                      <TableHead>Asbestos Type</TableHead>
                      <TableHead>Asbestos %</TableHead>
                      <TableHead>Description</TableHead>
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
                        <TableCell>{s.asbestosType || "—"}</TableCell>
                        <TableCell>
                          {s.asbestosPercent !== null && s.asbestosPercent !== undefined && String(s.asbestosPercent).trim() !== ""
                            ? `${s.asbestosPercent}%`
                            : (s.result ? `${s.result}%` : "—")}
                        </TableCell>
                        <TableCell>{s.description || "—"}</TableCell>
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
	              <div className="flex items-center gap-2">
	                <Button
	                  variant="secondary"
	                  onClick={() => {
	                    setSampleType("paint_metals");
	                    setSampleOpen(true);
	                  }}
	                >
	                  <Plus className="h-4 w-4 mr-2" />
	                  Add Sample
	                </Button>
	                <Button variant="outline" onClick={() => window.open(`/api/asbestos/buildings/${id}/samples/export?type=paint_metals`, "_blank")}>
	                  <Download className="h-4 w-4 mr-2" />
	                  Export
	                </Button>
	              </div>
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
                      <TableHead>Analyte</TableHead>
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
                        <TableCell>{s.analyte || "—"}</TableCell>
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
              <CardTitle>Abatement/Repair Log</CardTitle>
              <Dialog
                open={logOpen}
                onOpenChange={(open) => {
                  setLogOpen(open);
                  if (!open) {
                    setLogDocs([]);
                  }
                }}
              >
                <DialogTrigger asChild>
                  <Button variant="secondary">
                    <Plus className="h-4 w-4 mr-2" />
                    New Log Entry
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl w-[calc(100vw-2rem)] sm:w-full p-0 overflow-hidden flex flex-col gap-0">
                  <div className="p-6 pb-4">
                    <DialogHeader>
                      <DialogTitle>Create Log Entry</DialogTitle>
                      <DialogDescription>Tracks abatement/repair work at this building.</DialogDescription>
                    </DialogHeader>
                  </div>

                  <div className="px-6 pb-6 overflow-y-auto min-h-0 flex-1">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <Label>Associated Inventory Item (optional)</Label>
                      <Select
                        value={logForm.itemId || "__none__"}
                        onValueChange={(v) => {
                          const nextId = v === "__none__" ? "" : v;
                          const found = (inventory as any[]).find((it: any) => String(it?.itemId) === String(nextId));
                          const ext = found ? String(found.externalItemId || "").trim() : "";
                          const material = found ? String(found.material || "").trim() : "";
                          const loc = found ? String(found.location || "").trim() : "";
                          const sampleNo = nextId ? (latestSampleNumberByItemId.get(String(nextId)) || "") : "";
                          setLogForm((prev) => ({
                            ...prev,
                            itemId: nextId,
                            // Auto-populate on selection, but remain editable afterwards.
                            associatedItemNumber: nextId ? (ext || prev.associatedItemNumber) : prev.associatedItemNumber,
                            associatedSampleNumber: nextId ? (sampleNo || prev.associatedSampleNumber) : prev.associatedSampleNumber,
                            materialDescription: nextId ? (material || prev.materialDescription) : prev.materialDescription,
                            location: nextId ? (loc || prev.location) : prev.location,
                          }));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="None" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">None</SelectItem>
                            {(inventory as any[]).map((i: any) => (
                              <SelectItem key={i.itemId} value={i.itemId}>
                                {itemLabelById.get(i.itemId) || i.itemId}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Associated Item #</Label>
                        <Input value={logForm.associatedItemNumber} onChange={(e) => setLogForm({ ...logForm, associatedItemNumber: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Associated Sample #</Label>
                        <Input value={logForm.associatedSampleNumber} onChange={(e) => setLogForm({ ...logForm, associatedSampleNumber: e.target.value })} />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Material Description</Label>
                        <Input value={logForm.materialDescription} onChange={(e) => setLogForm({ ...logForm, materialDescription: e.target.value })} />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Location</Label>
                        <Input value={logForm.location} onChange={(e) => setLogForm({ ...logForm, location: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Abatement Date</Label>
                        <Input type="date" value={logForm.abatementDate} onChange={(e) => setLogForm({ ...logForm, abatementDate: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Contractor</Label>
                        <Input value={logForm.contractor} onChange={(e) => setLogForm({ ...logForm, contractor: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Method</Label>
                        <Select value={logForm.methodKind || "__none__"} onValueChange={(v) => setLogForm({ ...logForm, methodKind: v === "__none__" ? "" : (v as any) })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">—</SelectItem>
                            <SelectItem value="Encapsulation">Encapsulation</SelectItem>
                            <SelectItem value="Enclosure">Enclosure</SelectItem>
                            <SelectItem value="Removal">Removal</SelectItem>
                            <SelectItem value="Other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        {logForm.methodKind === "Other" ? (
                          <Input
                            placeholder="Fill in method"
                            value={logForm.methodOther}
                            onChange={(e) => setLogForm({ ...logForm, methodOther: e.target.value })}
                          />
                        ) : null}
                      </div>
                      <div className="space-y-2">
                        <Label>Waste Shipment ID</Label>
                        <Input value={logForm.wasteShipmentId} onChange={(e) => setLogForm({ ...logForm, wasteShipmentId: e.target.value })} />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <Label>Disposal Site</Label>
                        <Input value={logForm.disposalSite} onChange={(e) => setLogForm({ ...logForm, disposalSite: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Clearance Date</Label>
                        <Input type="date" value={logForm.clearanceDate} onChange={(e) => setLogForm({ ...logForm, clearanceDate: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Clearance Result</Label>
                        <Input value={logForm.clearanceResult} onChange={(e) => setLogForm({ ...logForm, clearanceResult: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Cost</Label>
                        <Input value={logForm.cost} onChange={(e) => setLogForm({ ...logForm, cost: e.target.value })} placeholder="e.g., 2500" />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                      <Label>Notes</Label>
                      <Textarea value={logForm.notes} onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })} />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label>Documents (Manifests, Removal Forms, etc.)</Label>
                      <div className="flex flex-col gap-2">
                        <input
                          type="file"
                          multiple
                          onChange={(e) => {
                            const files = Array.from(e.target.files || []);
                            if (!files.length) return;
                            setLogDocs((prev) => [
                              ...prev,
                              ...files.map((file) => ({
                                id: crypto.randomUUID(),
                                file,
                                docType: "Manifest",
                              })),
                            ]);
                            e.currentTarget.value = "";
                          }}
                        />
                        {logDocs.length ? (
                          <div className="border rounded-md p-3 space-y-2">
                            {logDocs.map((d) => (
                              <div key={d.id} className="flex flex-col md:flex-row md:items-center gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="text-sm font-medium truncate">{d.file.name}</div>
                                  <div className="text-xs text-muted-foreground">{Math.round((d.file.size || 0) / 1024)} KB</div>
                                </div>
                                <Select
                                  value={d.docType}
                                  onValueChange={(v) =>
                                    setLogDocs((prev) => prev.map((x) => (x.id === d.id ? { ...x, docType: v } : x)))
                                  }
                                >
                                  <SelectTrigger className="w-full md:w-48">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="Manifest">Manifest</SelectItem>
                                    <SelectItem value="Removal Form">Removal Form</SelectItem>
                                    <SelectItem value="Clearance">Clearance</SelectItem>
                                    <SelectItem value="Other">Other</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => setLogDocs((prev) => prev.filter((x) => x.id !== d.id))}
                                >
                                  Remove
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-xs text-muted-foreground">
                            Optional. Uploads will be saved to Building Documents and linked to this log entry after you click Save.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-4 border-t bg-background flex justify-end gap-2 shrink-0">
                  <Button variant="outline" onClick={() => setLogOpen(false)}>Cancel</Button>
                  <Button onClick={() => createLogMutation.mutate()} disabled={createLogMutation.isPending}>
                    Save
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            </CardHeader>
            <CardContent>
              {abatementLogs.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">No records.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Abatement Date</TableHead>
                      <TableHead>Item #</TableHead>
                      <TableHead>Sample #</TableHead>
                      <TableHead>Material</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Contractor</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead>Clearance</TableHead>
                      <TableHead className="text-right">Cost</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {abatementLogs.map((r: any) => (
                      <TableRow key={r.logId}>
                        <TableCell>{fmtDate(r.abatementDate)}</TableCell>
                        <TableCell className="font-mono text-xs">{r.associatedItemNumber || (r.item?.externalItemId ?? r.itemId) || "—"}</TableCell>
                        <TableCell className="font-mono text-xs">{r.associatedSampleNumber || "—"}</TableCell>
                        <TableCell>{r.materialDescription || "—"}</TableCell>
                        <TableCell>{r.location || "—"}</TableCell>
                        <TableCell>{r.contractor || "—"}</TableCell>
                        <TableCell>{r.method || "—"}</TableCell>
                        <TableCell>
                          {r.clearanceDate ? `${fmtDate(r.clearanceDate)}${r.clearanceResult ? ` · ${r.clearanceResult}` : ""}` : (r.clearanceResult || "—")}
                        </TableCell>
                        <TableCell className="text-right">{r.cost ?? "—"}</TableCell>
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
	            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
	              <div className="space-y-2">
	                <Label>Item ID (external)</Label>
	                <Input value={editPatch.externalItemId} onChange={(e) => setEditPatch({ ...editPatch, externalItemId: e.target.value })} />
	              </div>
	              <div className="space-y-2 md:col-span-2">
	                <Label>Material / Description</Label>
	                <Input value={editPatch.material} onChange={(e) => setEditPatch({ ...editPatch, material: e.target.value })} />
	              </div>
	              <div className="space-y-2">
	                <Label>Location</Label>
	                <Input value={editPatch.location} onChange={(e) => setEditPatch({ ...editPatch, location: e.target.value })} />
	              </div>
	              <div className="space-y-2">
	                <Label>Category</Label>
	                <Select value={editPatch.category || ""} onValueChange={(v) => setEditPatch({ ...editPatch, category: v === "__none__" ? "" : v })}>
	                  <SelectTrigger>
	                    <SelectValue placeholder="Select category" />
	                  </SelectTrigger>
	                  <SelectContent>
	                    <SelectItem value="__none__">—</SelectItem>
	                    {INV_CATEGORY_OPTIONS.map((o) => (
	                      <SelectItem key={o} value={o}>
	                        {o}
	                      </SelectItem>
	                    ))}
	                  </SelectContent>
	                </Select>
	              </div>
	              <div className="space-y-2">
	                <Label>Sample # / PACM</Label>
	                <Select value={editPatch.acmKind} onValueChange={(v) => setEditPatch({ ...editPatch, acmKind: v as any })}>
	                  <SelectTrigger>
	                    <SelectValue />
	                  </SelectTrigger>
	                  <SelectContent>
	                    {INV_ACM_KIND_OPTIONS.map((o) => (
	                      <SelectItem key={o} value={o}>
	                        {o}
	                      </SelectItem>
	                    ))}
	                  </SelectContent>
	                </Select>
	                {editPatch.acmKind === "Sample #" ? (
	                  <Input
	                    placeholder="Enter sample number"
	                    value={editPatch.acmSampleNumber}
	                    onChange={(e) => setEditPatch({ ...editPatch, acmSampleNumber: e.target.value })}
	                  />
	                ) : null}
	              </div>
	              <div className="space-y-2">
	                <Label>Condition</Label>
	                <Select value={editPatch.condition} onValueChange={(v) => setEditPatch({ ...editPatch, condition: v })}>
	                  <SelectTrigger>
	                    <SelectValue />
	                  </SelectTrigger>
	                  <SelectContent>
	                    {INV_CONDITION_OPTIONS.map((o) => (
	                      <SelectItem key={o} value={o}>
	                        {o}
	                      </SelectItem>
	                    ))}
	                  </SelectContent>
	                </Select>
	              </div>
	              <div className="space-y-2">
	                <Label>Status</Label>
	                <Select value={editPatch.status} onValueChange={(v) => setEditPatch({ ...editPatch, status: v })}>
	                  <SelectTrigger>
	                    <SelectValue />
	                  </SelectTrigger>
	                  <SelectContent>
	                    {INV_STATUS_OPTIONS.map((o) => (
	                      <SelectItem key={o} value={o}>
	                        {o}
	                      </SelectItem>
	                    ))}
	                  </SelectContent>
	                </Select>
	              </div>
	              <div className="space-y-2">
	                <Label>Quantity</Label>
	                <Input value={editPatch.quantity} onChange={(e) => setEditPatch({ ...editPatch, quantity: e.target.value })} />
	              </div>
	              <div className="space-y-2">
	                <Label>UoM</Label>
	                <Select value={editPatch.uomKind || ""} onValueChange={(v) => setEditPatch({ ...editPatch, uomKind: v === "__none__" ? "" : v })}>
	                  <SelectTrigger>
	                    <SelectValue placeholder="Select UOM" />
	                  </SelectTrigger>
	                  <SelectContent>
	                    <SelectItem value="__none__">—</SelectItem>
	                    {INV_UOM_OPTIONS.map((o) => (
	                      <SelectItem key={o} value={o}>
	                        {o}
	                      </SelectItem>
	                    ))}
	                  </SelectContent>
	                </Select>
	                {editPatch.uomKind === "Other" ? (
	                  <Input
	                    placeholder="Enter UOM"
	                    value={editPatch.uomOther}
	                    onChange={(e) => setEditPatch({ ...editPatch, uomOther: e.target.value })}
	                  />
	                ) : null}
	              </div>
	              <div className="space-y-2 md:col-span-3">
	                <Label>Notes</Label>
	                <Textarea value={editPatch.notes} onChange={(e) => setEditPatch({ ...editPatch, notes: e.target.value })} />
	              </div>
	            </div>
	          </div>
          <div className="pt-2 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={() => updateItemMutation.mutate()} disabled={!editReason.trim() || updateItemMutation.isPending}>Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={sampleOpen} onOpenChange={setSampleOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{sampleType === "acm" ? "Add ACM Sample" : "Add Paint/Metals Sample"}</DialogTitle>
            <DialogDescription>
              {sampleType === "acm"
                ? "Log a building sample. Optionally link it to an Inspection and/or Inventory Item."
                : "Log a paint/metals sample. Results are recorded in mg/kg with % by weight auto-calculated."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {sampleType === "acm" ? (
              <>
                <div className="space-y-2 md:col-span-3">
                  <Label>Inspection (optional)</Label>
                  <Select
                    value={sampleInspectionId || "__none__"}
                    onValueChange={(v) => setSampleInspectionId(v === "__none__" ? "" : v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {(inspections as any[]).map((ins: any) => (
                        <SelectItem key={ins.inspectionId} value={ins.inspectionId}>
                          {fmtDate(ins.inspectionDate)}{ins.status ? ` · ${ins.status}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-3">
                  <Label>Inventory Item (optional)</Label>
                  <Select value={sampleForm.itemId} onValueChange={(v) => setSampleForm({ ...sampleForm, itemId: v === "__none__" ? "" : v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an item" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {(inventory as any[]).map((i: any) => (
                        <SelectItem key={i.itemId} value={i.itemId}>
                          {itemLabelById.get(i.itemId) || i.itemId}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            ) : null}

            <div className="space-y-2 md:col-span-3">
              <Label>Sampler</Label>
              <Select
                value={sampleForm.samplerUserId || "__none__"}
                onValueChange={(v) => setSampleForm({ ...sampleForm, samplerUserId: v === "__none__" ? "" : v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select sampler" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select...</SelectItem>
                  {(inspectors as any[]).map((u: any) => (
                    <SelectItem key={u.userId} value={u.userId}>
                      {u.name || u.email || u.userId}
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
              <Label>{sampleType === "paint_metals" ? "Substrate" : "Material"}</Label>
              {sampleType === "acm" ? (
                <>
                  <Select
                    value={sampleForm.materialKind}
                    onValueChange={(v) => setSampleForm({ ...sampleForm, materialKind: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select material" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Drywall joint compound">Drywall joint compound</SelectItem>
                      <SelectItem value="Textured ceiling / popcorn">Textured ceiling / popcorn</SelectItem>
                      <SelectItem value="Floor tile">Floor tile</SelectItem>
                      <SelectItem value="Mastic / adhesive">Mastic / adhesive</SelectItem>
                      <SelectItem value="Pipe insulation">Pipe insulation</SelectItem>
                      <SelectItem value="Boiler / tank insulation">Boiler / tank insulation</SelectItem>
                      <SelectItem value="Transite / cement board">Transite / cement board</SelectItem>
                      <SelectItem value="Roofing (shingle/felt)">Roofing (shingle/felt)</SelectItem>
                      <SelectItem value="Vermiculite">Vermiculite</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  {sampleForm.materialKind === "Other" ? (
                    <Input
                      placeholder="Enter material"
                      value={sampleForm.materialOther}
                      onChange={(e) => setSampleForm({ ...sampleForm, materialOther: e.target.value })}
                    />
                  ) : null}
                </>
              ) : (
                <Input value={sampleForm.material} onChange={(e) => setSampleForm({ ...sampleForm, material: e.target.value })} />
              )}
            </div>
            <div className="space-y-2">
              <Label>Location</Label>
              <Input value={sampleForm.location} onChange={(e) => setSampleForm({ ...sampleForm, location: e.target.value })} />
            </div>
            {sampleType === "paint_metals" ? (
              <div className="space-y-2">
                <Label>Analyte</Label>
                <Select value={sampleForm.analyte} onValueChange={(v) => setSampleForm({ ...sampleForm, analyte: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select analyte" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Lead (Pb)">Lead (Pb)</SelectItem>
                    <SelectItem value="Cadmium (Cd)">Cadmium (Cd)</SelectItem>
                    <SelectItem value="Chromium (Cr)">Chromium (Cr)</SelectItem>
                    <SelectItem value="Arsenic (As)">Arsenic (As)</SelectItem>
                    <SelectItem value="Mercury (Hg)">Mercury (Hg)</SelectItem>
                    <SelectItem value="Nickel (Ni)">Nickel (Ni)</SelectItem>
                    <SelectItem value="Selenium (Se)">Selenium (Se)</SelectItem>
                    <SelectItem value="Silver (Ag)">Silver (Ag)</SelectItem>
                    <SelectItem value="Barium (Ba)">Barium (Ba)</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label>Lab</Label>
              <Input value={sampleForm.lab} onChange={(e) => setSampleForm({ ...sampleForm, lab: e.target.value })} />
            </div>
            {sampleType === "acm" ? (
              <div className="space-y-2">
                <Label>Asbestos Type</Label>
                <Select value={sampleForm.asbestosType} onValueChange={(v) => setSampleForm({ ...sampleForm, asbestosType: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Chrysotile">Chrysotile</SelectItem>
                    <SelectItem value="Amosite">Amosite</SelectItem>
                    <SelectItem value="Crocidolite">Crocidolite</SelectItem>
                    <SelectItem value="Tremolite">Tremolite</SelectItem>
                    <SelectItem value="Anthophyllite">Anthophyllite</SelectItem>
                    <SelectItem value="Actinolite">Actinolite</SelectItem>
                    <SelectItem value="Mixed">Mixed</SelectItem>
                    <SelectItem value="None Detected">None Detected</SelectItem>
                    <SelectItem value="Unknown">Unknown</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            {sampleType === "acm" ? (
              <div className="space-y-2">
                <Label>Asbestos Content (%)</Label>
                <Input
                  inputMode="decimal"
                  value={sampleForm.asbestosPercent}
                  onChange={(e) => setSampleForm({ ...sampleForm, asbestosPercent: e.target.value })}
                  placeholder="e.g., 5"
                />
              </div>
            ) : null}

            {sampleType === "paint_metals" ? (
              <div className="space-y-2">
                <Label>Result (mg/kg)</Label>
                <Input
                  inputMode="decimal"
                  value={sampleForm.result}
                  onChange={(e) => setSampleForm({ ...sampleForm, result: e.target.value })}
                  placeholder="e.g., 2500"
                />
              </div>
            ) : null}

            {sampleType === "paint_metals" ? (
              <div className="space-y-2">
                <Label>% by weight</Label>
                <Input
                  value={(() => {
                    const n = Number(sampleForm.result);
                    if (!Number.isFinite(n)) return "";
                    return (n / 10000).toFixed(4);
                  })()}
                  readOnly
                />
              </div>
            ) : null}

            {sampleType === "acm" ? (
              <div className="space-y-2 md:col-span-3">
                <Label>Description</Label>
                <Input value={sampleForm.description} onChange={(e) => setSampleForm({ ...sampleForm, description: e.target.value })} placeholder="Optional description" />
              </div>
            ) : null}

            {sampleType === "paint_metals" ? (
              <div className="space-y-2 md:col-span-3">
                <Label>Photos</Label>
                <div className="flex flex-col gap-2">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      if (!files.length) return;
                      setSamplePhotos((prev) => [
                        ...prev,
                        ...files.map((file) => ({ id: crypto.randomUUID(), file })),
                      ]);
                      e.currentTarget.value = "";
                    }}
                  />
                  {samplePhotos.length ? (
                    <div className="border rounded-md p-3 space-y-2">
                      {samplePhotos.map((p) => (
                        <div key={p.id} className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{p.file.name}</div>
                            <div className="text-xs text-muted-foreground">{Math.round((p.file.size || 0) / 1024)} KB</div>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setSamplePhotos((prev) => prev.filter((x) => x.id !== p.id))}
                          >
                            Remove
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      Optional. Photos will be saved to Building Documents and linked to this sample after Save.
                    </div>
                  )}
                </div>
              </div>
            ) : null}
            <div className="space-y-2 md:col-span-3">
              <Label>Notes</Label>
              <Textarea value={sampleForm.notes} onChange={(e) => setSampleForm({ ...sampleForm, notes: e.target.value })} />
            </div>
          </div>
          <div className="pt-2 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSampleOpen(false)}>Cancel</Button>
            <Button onClick={() => addBuildingSampleMutation.mutate()} disabled={addBuildingSampleMutation.isPending}>
              Save Sample
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
