import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Wrench, CalendarClock, MapPin, User as UserIcon } from "lucide-react";

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

type OrgUser = {
  userId: string;
  email?: string | null;
  name: string;
  status?: string | null;
  role?: string | null;
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

export default function Equipment() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: rows = [], isLoading } = useQuery<EquipmentRow[]>({
    queryKey: ["/api/equipment"],
  });

  const { data: orgUsers = [] } = useQuery<OrgUser[]>({
    queryKey: ["/api/inspectors"],
  });

  const userNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of orgUsers) {
      if (u?.userId) map.set(u.userId, u.name || u.email || u.userId);
    }
    return map;
  }, [orgUsers]);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    category: "Air Sampling Pump",
    manufacturer: "",
    model: "",
    serialNumber: "",
    assetTag: "",
    status: "in_service",
    location: "",
    calibrationIntervalDays: "365",
    lastCalibrationDate: "",
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        category: form.category,
        manufacturer: form.manufacturer || null,
        model: form.model || null,
        serialNumber: form.serialNumber.trim(),
        assetTag: form.assetTag || null,
        status: form.status,
        location: form.location || null,
        calibrationIntervalDays: form.calibrationIntervalDays ? Number(form.calibrationIntervalDays) : undefined,
        lastCalibrationDate: form.lastCalibrationDate || null,
      };
      const res = await apiRequest("POST", "/api/equipment", payload);
      return (await res.json()) as EquipmentRow;
    },
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["/api/equipment"] });
      setCreateOpen(false);
      setForm({
        category: "Air Sampling Pump",
        manufacturer: "",
        model: "",
        serialNumber: "",
        assetTag: "",
        status: "in_service",
        location: "",
        calibrationIntervalDays: "365",
        lastCalibrationDate: "",
      });
      setLocation(`/equipment/${created.equipmentId}`);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create equipment",
        description: error?.message || "Unable to create equipment record.",
        variant: "destructive",
      });
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
          <h1 className="text-3xl font-bold">Equipment</h1>
          <p className="text-gray-600 mt-2">Organization equipment tracking for air sampling pumps</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Pump
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Add Equipment</DialogTitle>
              <DialogDescription>Create a persistent equipment record (stable ID) for the organization.</DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(value) => setForm({ ...form, status: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
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
                <Label>Manufacturer</Label>
                <Input value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Model</Label>
                <Input value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Serial Number</Label>
                <Input value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Asset Tag (optional)</Label>
                <Input value={form.assetTag} onChange={(e) => setForm({ ...form, assetTag: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Calibration Interval (days)</Label>
                <Input
                  type="number"
                  value={form.calibrationIntervalDays}
                  onChange={(e) => setForm({ ...form, calibrationIntervalDays: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Last Calibration Date</Label>
                <Input type="date" value={form.lastCalibrationDate} onChange={(e) => setForm({ ...form, lastCalibrationDate: e.target.value })} />
              </div>
            </div>
            <div className="pt-2 flex justify-end gap-2">
              <Button
                onClick={() => createMutation.mutate()}
                disabled={!form.serialNumber.trim() || createMutation.isPending}
              >
                <Wrench className="h-4 w-4 mr-2" />
                Create
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Air Sampling Pumps
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-gray-600">Loading...</div>
          ) : sorted.length === 0 ? (
            <div className="py-10 text-center text-gray-600">No equipment yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Equipment</TableHead>
                  <TableHead>Serial</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Calibration</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Assigned</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map((row) => {
                  const due = row.calibrationDueDate;
                  const days = daysUntil(due);
                  return (
                    <TableRow
                      key={row.equipmentId}
                      className="cursor-pointer"
                      onClick={() => setLocation(`/equipment/${row.equipmentId}`)}
                    >
                      <TableCell>
                        <div className="font-medium">{row.manufacturer || row.category} {row.model || ""}</div>
                        <div className="text-xs text-gray-500">{row.category}</div>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{row.serialNumber}</TableCell>
                      <TableCell>{statusBadge(row.status)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <CalendarClock className="h-4 w-4 text-gray-500" />
                          <span>{due || "N/A"}</span>
                          {typeof days === "number" && (
                            <Badge variant={days < 0 ? "destructive" : days < 30 ? "secondary" : "outline"}>
                              {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`}
                            </Badge>
                          )}
                        </div>
                        {row.lastCalibrationDate && (
                          <div className="text-xs text-gray-500">Last: {row.lastCalibrationDate}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-gray-500" />
                          <span>{row.location || "—"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 text-sm">
                          <UserIcon className="h-4 w-4 text-gray-500" />
                          <span title={row.assignedToUserId || undefined}>
                            {row.assignedToUserId
                              ? (userNameById.get(row.assignedToUserId) || row.assignedToUserId)
                              : "—"}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
