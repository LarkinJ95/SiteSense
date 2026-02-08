import { useMemo, useState } from "react";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus } from "lucide-react";

type ClientRow = { id: string; name: string };
type BuildingRow = {
  buildingId: string;
  clientId: string;
  clientName?: string;
  name: string;
  address?: string | null;
  nextDueDate?: any;
  overdue?: boolean;
};

const fmtDate = (value: any) => {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
};

export default function Buildings() {
  const { toast } = useToast();

  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const clientFilterId = (params?.get("clientId") || "").trim();

  const { data: clients = [] } = useQuery<ClientRow[]>({
    queryKey: ["/api/asbestos/clients"],
  });

  const { data: buildings = [], isLoading } = useQuery<BuildingRow[]>({
    queryKey: ["/api/asbestos/buildings"],
  });

  const filtered = useMemo(() => {
    if (!clientFilterId) return buildings;
    return (buildings || []).filter((b) => String(b.clientId) === clientFilterId);
  }, [buildings, clientFilterId]);

  const [open, setOpen] = useState(false);
  const [clientId, setClientId] = useState(clientFilterId || "");
  const [form, setForm] = useState({ name: "", address: "", notes: "" });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!clientId) throw new Error("Client is required");
      const res = await apiRequest("POST", `/api/asbestos/clients/${clientId}/buildings`, {
        clientId,
        name: form.name.trim(),
        address: form.address.trim() || null,
        notes: form.notes.trim() || null,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/asbestos/buildings"] });
      if (clientId) queryClient.invalidateQueries({ queryKey: [`/api/asbestos/clients/${clientId}/buildings`] });
      setOpen(false);
      setForm({ name: "", address: "", notes: "" });
      toast({ title: "Building created" });
    },
    onError: (err: any) => toast({ title: "Failed", description: err?.message || "Unable to create building.", variant: "destructive" }),
  });

  const clientNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of clients || []) map.set(String(c.id), c.name);
    return map;
  }, [clients]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Buildings</h1>
          <p className="text-sm text-muted-foreground">Buildings under clients (inventory + inspections).</p>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/inspections">Back to Inspections</Link>
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Building
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add Building</DialogTitle>
                <DialogDescription>Creates a building under a client.</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Client</Label>
                  <Select value={clientId} onValueChange={setClientId}>
                    <SelectTrigger><SelectValue placeholder="Select a client" /></SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                <Button onClick={() => createMutation.mutate()} disabled={!clientId || !form.name.trim() || createMutation.isPending}>
                  Create
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>
            Building List{clientFilterId ? ` (Filtered)` : ""}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No buildings yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Building</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Next Due</TableHead>
                  <TableHead>Inspections</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((b) => (
                    <TableRow key={b.buildingId}>
                      <TableCell>{b.clientName || clientNameById.get(String(b.clientId)) || "—"}</TableCell>
                      <TableCell className="font-medium">
                        <Link className="text-primary underline" href={`/buildings/${b.buildingId}`}>
                          {b.name}
                        </Link>
                      </TableCell>
                      <TableCell>{b.address || "—"}</TableCell>
                      <TableCell className={b.overdue ? "text-red-600 font-medium" : ""}>{fmtDate(b.nextDueDate)}</TableCell>
                      <TableCell>
                        <Link className="text-primary underline" href={`/buildings/${b.buildingId}`}>
                          Open
                        </Link>
                      </TableCell>
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
