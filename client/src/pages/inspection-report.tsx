import { useEffect, useMemo, useRef } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Printer } from "lucide-react";

type ReportData = {
  inspection: any;
  building: any;
  client: any;
  inventory: any[];
  changes: any[];
  samples: any[];
  documents: any[];
  generatedAt: string;
};

const fmt = (value: any) => (value === null || value === undefined ? "" : String(value));

const fmtDate = (value: any) => {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString();
};

const fmtDateTime = (value: any) => {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString();
};

export default function InspectionReport() {
  const { id } = useParams();
  const [, setLocation] = useLocation();

  const { data, isLoading, error } = useQuery<ReportData>({
    queryKey: id ? [`/api/asbestos/inspections/${id}/report-data`] : ["__skip__report__"],
    enabled: !!id,
  });

  const printedRef = useRef(false);
  useEffect(() => {
    if (!data) return;
    if (printedRef.current) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("print") !== "1") return;
    printedRef.current = true;
    setTimeout(() => window.print(), 150);
  }, [data]);

  useEffect(() => {
    document.title = `Inspection Report - AbateIQ`;
  }, []);

  const inventory = Array.isArray(data?.inventory) ? data!.inventory : [];
  const changes = Array.isArray(data?.changes) ? data!.changes : [];
  const samples = Array.isArray(data?.samples) ? data!.samples : [];
  const docs = Array.isArray(data?.documents) ? data!.documents : [];

  const changesByItem = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const ch of changes) {
      const id = ch?.itemId ? String(ch.itemId) : "";
      if (!id) continue;
      const list = map.get(id) || [];
      list.push(ch);
      map.set(id, list);
    }
    return map;
  }, [changes]);

  if (error) return <div className="p-6">Unable to load report.</div>;
  if (isLoading || !data) return <div className="p-6">Loading report...</div>;

  const title = `${fmt(data.client?.name) || "Client"} - ${fmt(data.building?.name) || "Building"} - Asbestos Inspection Report`;

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <style>{`
        @page { size: letter; margin: 0.75in; }
        @media print {
          .no-print { display: none !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          a { color: inherit; text-decoration: none; }
        }
        .page { max-width: 8.5in; margin: 0 auto; padding: 24px; }
        h1 { font-size: 18px; font-weight: 700; margin: 0 0 8px 0; }
        h2 { font-size: 14px; font-weight: 700; margin: 18px 0 8px 0; }
        .muted { color: #64748b; font-size: 12px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px 16px; margin-top: 12px; }
        .kv { border: 1px solid #e2e8f0; border-radius: 10px; padding: 10px 12px; }
        .k { font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: #64748b; }
        .v { font-size: 13px; margin-top: 4px; word-break: break-word; }
        table { width: 100%; border-collapse: collapse; font-size: 12px; table-layout: auto; }
        th, td { border: 1px solid #e2e8f0; padding: 8px; vertical-align: top; }
        th { background: #f8fafc; text-align: left; font-weight: 700; }
        .section { break-inside: avoid; }
      `}</style>

      <div className="no-print border-b border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => setLocation(`/inspections/${id}`)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="text-sm font-medium">{title}</div>
          </div>
          <Button onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
        </div>
      </div>

      <div className="page">
        <h1>{title}</h1>
        <div className="muted">
          Generated: {fmtDateTime(data.generatedAt)} | Inspection ID: <span className="font-mono">{fmt(data.inspection?.inspectionId)}</span>
        </div>

        <div className="section">
          <div className="grid">
            <div className="kv"><div className="k">Client</div><div className="v">{fmt(data.client?.name)}</div></div>
            <div className="kv"><div className="k">Building</div><div className="v">{fmt(data.building?.name)}</div></div>
            <div className="kv"><div className="k">Inspection Date</div><div className="v">{fmtDate(data.inspection?.inspectionDate)}</div></div>
            <div className="kv"><div className="k">Next Due Date</div><div className="v">{fmtDate(data.inspection?.nextDueDate)}</div></div>
            <div className="kv"><div className="k">Status</div><div className="v">{fmt(data.inspection?.status)}</div></div>
            <div className="kv"><div className="k">Recurrence (years)</div><div className="v">{fmt(data.inspection?.recurrenceYears)}</div></div>
          </div>
        </div>

        <div className="section">
          <h2>Inventory Snapshot / Changes</h2>
          {inventory.length === 0 ? (
            <div className="muted">No records.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Item ID</th>
                  <th>Material</th>
                  <th>Location</th>
                  <th>ACM/PACM</th>
                  <th>Condition</th>
                  <th>Status</th>
                  <th>Changes</th>
                </tr>
              </thead>
              <tbody>
                {inventory.map((i: any) => {
                  const id = String(i.itemId || "");
                  const itemChanges = changesByItem.get(id) || [];
                  return (
                    <tr key={id}>
                      <td className="font-mono">{fmt(i.externalItemId || i.itemId)}</td>
                      <td>{fmt(i.material)}</td>
                      <td>{fmt(i.location)}</td>
                      <td>{fmt(i.acmStatus)}</td>
                      <td>{fmt(i.condition)}</td>
                      <td>{fmt(i.status)}</td>
                      <td>
                        {itemChanges.length === 0 ? (
                          <span className="muted">No records.</span>
                        ) : (
                          <ul className="list-disc pl-4">
                            {itemChanges.map((ch: any) => (
                              <li key={ch.changeId}>
                                <span className="font-medium">{fmt(ch.fieldName)}:</span> {fmt(ch.oldValue)} → {fmt(ch.newValue)}
                                {ch.reason ? ` (${fmt(ch.reason)})` : ""}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        <div className="section">
          <h2>Sample Logs</h2>
          {samples.length === 0 ? (
            <div className="muted">No records.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Sample #</th>
                  <th>Linked Item</th>
                  <th>Collected</th>
                  <th>Material</th>
                  <th>Location</th>
                  <th>Result</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {samples.map((s: any) => (
                  <tr key={String(s.sampleId)}>
                    <td>{fmt(s.sampleType)}</td>
                    <td>{fmt(s.sampleNumber)}</td>
                    <td className="font-mono">{fmt(s.itemId)}</td>
                    <td>{fmtDateTime(s.collectedAt)}</td>
                    <td>{fmt(s.material)}</td>
                    <td>{fmt(s.location)}</td>
                    <td>{fmt(s.result)} {fmt(s.resultUnit)}</td>
                    <td>{fmt(s.notes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="section">
          <h2>Documents Index</h2>
          {docs.length === 0 ? (
            <div className="muted">No records.</div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Name</th>
                  <th>Uploaded</th>
                  <th>Link</th>
                </tr>
              </thead>
              <tbody>
                {docs.map((d: any) => (
                  <tr key={String(d.documentId)}>
                    <td>{fmt(d.docType)}</td>
                    <td>{fmt(d.originalName)}</td>
                    <td>{fmtDateTime(d.uploadedAt)}</td>
                    <td>{d.url ? <a href={d.url} target="_blank" rel="noreferrer">Open</a> : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

