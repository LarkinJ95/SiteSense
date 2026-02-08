import { useEffect, useMemo, useRef } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";

type OrgUser = {
  userId: string;
  email?: string | null;
  name: string;
  status?: string | null;
  role?: string | null;
};

type ReportData = {
  equipment: any;
  reportGeneratedAt: number;
  calibrationEvents: any[];
  usage: any[];
  notes: any[];
  documents: any[];
};

const fmt = (value: any) => {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
};

const fmtDateTime = (ms?: number | null) => {
  if (!ms) return "—";
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return "—";
  }
};

const fmtDateMaybe = (value?: string | null) => {
  if (!value) return "—";
  return value;
};

const noteTypeLabel = (value?: string | null) => {
  const raw = (value || "").toString().trim();
  if (!raw) return "";
  const cleaned = raw.replace(/[_-]+/g, " ").trim().toLowerCase();
  return cleaned ? cleaned.charAt(0).toUpperCase() + cleaned.slice(1) : "";
};

export default function EquipmentReport() {
  const { id } = useParams();

  const { data, isLoading, error } = useQuery<ReportData>({
    queryKey: [`/api/equipment/${id}/report-data`],
  });

  const { data: orgUsers = [] } = useQuery<OrgUser[]>({
    queryKey: ["/api/inspectors"],
  });

  useEffect(() => {
    document.title = "Equipment Report - AbateIQ";
  }, []);

  const printedRef = useRef(false);
  const shouldAutoPrint =
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("print") === "1";

  useEffect(() => {
    if (!shouldAutoPrint) return;
    if (printedRef.current) return;
    if (!data) return;
    printedRef.current = true;
    // Let the browser render first so print preview isn't blank.
    setTimeout(() => window.print(), 100);
  }, [shouldAutoPrint, data]);

  if (error) {
    return <div className="p-6">Unable to load report.</div>;
  }
  if (isLoading || !data) {
    return <div className="p-6">Loading report...</div>;
  }

  const e = data.equipment || {};
  const calibration = Array.isArray(data.calibrationEvents) ? data.calibrationEvents : [];
  const usage = Array.isArray(data.usage) ? data.usage : [];
  const notes = Array.isArray(data.notes) ? data.notes : [];
  const documents = Array.isArray(data.documents) ? data.documents : [];

  const assignedName = useMemo(() => {
    const user = orgUsers.find((u) => u.userId === e.assignedToUserId);
    return user?.name || user?.email || e.assignedToUserId || "";
  }, [orgUsers, e.assignedToUserId]);

  return (
    <div className="report-root">
      <style>{`
        .report-root {
          max-width: 8.5in;
          margin: 0 auto;
          padding: 24px;
          color: #111827;
          background: white;
        }
        .report-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          border-bottom: 1px solid #e5e7eb;
          padding-bottom: 12px;
          margin-bottom: 16px;
        }
        .report-title {
          font-size: 22px;
          font-weight: 700;
          line-height: 1.2;
        }
        .report-subtitle {
          font-size: 12px;
          color: #6b7280;
          margin-top: 6px;
        }
        .kv-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px 16px;
        }
        .kv {
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 10px 12px;
        }
        .k {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: #6b7280;
        }
        .v {
          font-size: 13px;
          margin-top: 4px;
          word-break: break-word;
        }
        .section {
          margin-top: 18px;
        }
        .section-title {
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 8px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 12px;
        }
        th, td {
          border: 1px solid #e5e7eb;
          padding: 8px;
          vertical-align: top;
        }
        th {
          background: #f9fafb;
          text-align: left;
          font-weight: 700;
        }
        .muted {
          color: #6b7280;
          font-size: 12px;
        }
        .note {
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 10px 12px;
          margin-bottom: 10px;
        }
        .note-meta {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          font-size: 11px;
          color: #6b7280;
          margin-bottom: 6px;
        }
        .note-body {
          font-size: 12px;
          white-space: pre-wrap;
        }
        .break-before {
          break-before: page;
          page-break-before: always;
        }
        .no-print {
          display: inline-flex;
        }
        @page {
          size: Letter;
          margin: 0.5in;
        }
        @media print {
          header, footer, nav {
            display: none !important;
          }
          .report-root {
            padding: 0;
            margin: 0;
            max-width: none;
          }
          .no-print {
            display: none !important;
          }
          table thead {
            display: table-header-group;
          }
          tr, img, .kv, .note {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      `}</style>

      <div className="report-header">
        <div>
          <div className="report-title">Equipment Report</div>
          <div className="report-subtitle">
            Report generated: {fmtDateTime(data.reportGeneratedAt)} · Equipment ID: {fmt(e.equipmentId)}
          </div>
        </div>
        <Button className="no-print" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-2" />
          Print
        </Button>
      </div>

      <div className="section">
        <div className="section-title">Equipment Summary</div>
        <div className="kv-grid">
          <div className="kv"><div className="k">Category</div><div className="v">{fmt(e.category)}</div></div>
          <div className="kv"><div className="k">Manufacturer / Model</div><div className="v">{fmt(e.manufacturer)} {e.model ? ` / ${e.model}` : ""}</div></div>
          <div className="kv"><div className="k">Serial Number</div><div className="v">{fmt(e.serialNumber)}</div></div>
          <div className="kv"><div className="k">Asset Tag</div><div className="v">{fmt(e.assetTag)}</div></div>
          <div className="kv"><div className="k">Status</div><div className="v">{fmt(e.status)}</div></div>
          <div className="kv"><div className="k">Location</div><div className="v">{fmt(e.location)}</div></div>
          <div className="kv"><div className="k">Assigned To</div><div className="v">{fmt(assignedName)}</div></div>
          <div className="kv"><div className="k">Calibration Interval (days)</div><div className="v">{fmt(e.calibrationIntervalDays)}</div></div>
          <div className="kv"><div className="k">Last Calibration Date</div><div className="v">{fmtDateMaybe(e.lastCalibrationDate)}</div></div>
          <div className="kv"><div className="k">Calibration Due Date</div><div className="v">{fmtDateMaybe(e.calibrationDueDate)}</div></div>
          <div className="kv"><div className="k">Created</div><div className="v">{fmtDateTime(e.createdAt)}</div></div>
          <div className="kv"><div className="k">Updated</div><div className="v">{fmtDateTime(e.updatedAt)}</div></div>
        </div>
      </div>

      <div className="section break-before">
        <div className="section-title">Calibration History</div>
        {calibration.length === 0 ? (
          <div className="muted">No records</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Performed By</th>
                <th>Method/Standard</th>
                <th>Target</th>
                <th>As-Found</th>
                <th>As-Left</th>
                <th>Tolerance</th>
                <th>Pass/Fail</th>
                <th>Certificate</th>
              </tr>
            </thead>
            <tbody>
              {calibration.map((c) => (
                <tr key={c.calEventId}>
                  <td>{fmt(c.calDate)}</td>
                  <td>{fmt(c.calType)}</td>
                  <td>{fmt(c.performedBy)}</td>
                  <td>{fmt(c.methodStandard)}</td>
                  <td>{fmt(c.targetFlowLpm)}</td>
                  <td>{fmt(c.asFoundFlowLpm)}</td>
                  <td>{fmt(c.asLeftFlowLpm)}</td>
                  <td>
                    {c.tolerance ? `${c.tolerance}${c.toleranceUnit ? ` ${c.toleranceUnit}` : ""}` : "—"}
                  </td>
                  <td>{fmt(c.passFail)}</td>
                  <td>
                    {c.certificateNumber ? fmt(c.certificateNumber) : "—"}
                    {c.certificateFileUrl ? (
                      <div className="muted">
                        Link: {c.certificateFileUrl}
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="section break-before">
        <div className="section-title">Job / Usage History</div>
        {usage.length === 0 ? (
          <div className="muted">No records</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Job</th>
                <th>Client/Site</th>
                <th>Used From</th>
                <th>Used To</th>
                <th>Context</th>
                <th>Sample Run</th>
              </tr>
            </thead>
            <tbody>
              {usage.map((u) => (
                <tr key={u.usageId}>
                  <td>
                    {u.job?.jobNumber ? fmt(u.job.jobNumber) : fmt(u.jobId)}
                    <div className="muted">{u.job?.jobName ? fmt(u.job.jobName) : ""}</div>
                  </td>
                  <td>
                    {u.job?.clientName ? fmt(u.job.clientName) : "—"}
                    <div className="muted">{u.job?.siteName ? fmt(u.job.siteName) : ""}</div>
                  </td>
                  <td>{u.usedFrom ? fmtDateTime(u.usedFrom) : "—"}</td>
                  <td>{u.usedTo ? fmtDateTime(u.usedTo) : "—"}</td>
                  <td>{fmt(u.context)}</td>
                  <td>{fmt(u.sampleRunId)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="section break-before">
        <div className="section-title">Equipment Notes</div>
        {notes.length === 0 ? (
          <div className="muted">No records</div>
        ) : (
          <div>
            {notes.map((n) => (
              <div key={n.noteId} className="note">
                <div className="note-meta">
                  <div>
                    {fmtDateTime(n.createdAt)} · {fmt(n.author?.name)}{n.author?.email ? ` (${n.author.email})` : ""}
                  </div>
                  <div>
                    {n.noteType ? `Type: ${noteTypeLabel(n.noteType)}` : ""}{n.visibility ? ` · ${n.visibility}` : ""}
                  </div>
                </div>
                <div className="note-body">{fmt(n.noteText)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="section break-before">
        <div className="section-title">Attachments / Documents</div>
        {documents.length === 0 ? (
          <div className="muted">No records</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Filename</th>
                <th>Doc Type</th>
                <th>Uploaded</th>
                <th>Linked Entity</th>
                <th>Link</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((d) => (
                <tr key={d.documentId}>
                  <td>{fmt(d.originalName)}</td>
                  <td>{fmt(d.docType)}</td>
                  <td>{fmtDateTime(d.uploadedAt)}</td>
                  <td>{d.linkedEntityType ? `${d.linkedEntityType}${d.linkedEntityId ? `:${d.linkedEntityId}` : ""}` : "—"}</td>
                  <td>
                    {d.url ? (
                      <a href={d.url} target="_blank" rel="noreferrer">{d.url}</a>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
