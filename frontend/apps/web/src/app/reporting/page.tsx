"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, Calendar, Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useUser } from "@/components/user-context";
import { loadCBOM, type CBOMReport, type Asset } from "@/lib/data";

type ReportType = "executive" | "scheduled" | "ondemand";

type ScheduledForm = {
  reportType: string;
  frequency: string;
  assets: string;
  date: string;
  time: string;
  email: string;
};

const ON_DEMAND_TYPES = [
  "Executive Reporting",
  "Assets Discovery",
  "Assets Inventory",
  "CBOM",
  "Posture of PQC",
  "Cyber Rating (Tiers 1-4)",
];

const REPORT_SLUGS: Record<string, string> = {
  "Executive Reporting":      "executive_report",
  "Assets Discovery":         "assets_discovery_report",
  "Assets Inventory":         "assets_inventory_report",
  "CBOM":                     "cbom_report",
  "Posture of PQC":           "posture_pqc_report",
  "Cyber Rating (Tiers 1-4)": "cyber_rating_report",
};

// ── download helpers ─────────────────────────────────────────────────────────

function downloadJSON(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadCSV(filename: string, headers: string[], rows: Record<string, unknown>[]) {
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const lines = [
    headers.map(esc).join(","),
    ...rows.map(row => headers.map(h => esc(row[h])).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function openPDFWindow(title: string, html: string) {
  const win = window.open("", "_blank");
  if (!win) {
    toast.error("Popup blocked — please allow popups to download PDF.");
    return;
  }
  win.document.write(`<!DOCTYPE html><html><head><title>${title}</title><style>
    body{font-family:Arial,sans-serif;font-size:12px;color:#111;padding:20px}
    h1{color:#8B1A1A;font-size:20px;margin-bottom:4px}
    h2{color:#333;font-size:14px;border-bottom:1px solid #ccc;padding-bottom:4px;margin-top:20px}
    .meta{color:#666;font-size:11px;margin-bottom:16px}
    table{width:100%;border-collapse:collapse;margin-bottom:20px}
    th{background:#8B1A1A;color:white;padding:6px 8px;text-align:left;font-size:11px}
    td{padding:5px 8px;border-bottom:1px solid #eee;font-size:11px}
    tr:nth-child(even) td{background:#f9f9f9}
    @page{margin:15mm}
  </style></head><body>${html}</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}

// ── per-report builders ───────────────────────────────────────────────────────

function hdr(title: string) {
  return `<h1>${title}</h1><p class="meta">Generated: ${new Date().toLocaleString()} &nbsp;|&nbsp; GradPQC — PNB Quantum Migration Intelligence</p>`;
}

function table(headers: string[], rows: string[][]) {
  const ths = headers.map(h => `<th>${h}</th>`).join("");
  const trs = rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("");
  return `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`;
}

function buildDiscovery(assets: Asset[]) {
  return hdr("Assets Discovery Report") + table(
    ["Domain", "Asset Type", "TLS Version", "Quantum Status"],
    assets.map(a => [a.domain, a.asset_type, a.tls_version, a.quantum_status]),
  );
}

function buildInventory(assets: Asset[]) {
  return hdr("Assets Inventory Report") + table(
    ["Domain", "Type", "TLS", "Cipher Suite", "Key Size", "Cert Days", "QMRS", "RBI Compliance"],
    assets.map(a => [a.domain, a.asset_type, a.tls_version, a.cipher_suite,
      String(a.key_size), String(a.cert_days_remaining), a.qmrs.toFixed(1), a.rbi_compliance]),
  );
}

function buildPosture(assets: Asset[]) {
  return hdr("PQC Posture Report") + table(
    ["Domain", "QMRS", "Quantum Status", "Runway", "Days", "Recommended Algorithm", "Action"],
    assets.map(a => [a.domain, a.qmrs.toFixed(1), a.quantum_status, a.runway_status,
      String(a.runway_days), a.recommended_algorithm, a.action]),
  );
}

function buildCyberRating(assets: Asset[]) {
  return hdr("Cyber Rating Report") + table(
    ["Domain", "Agility Rating", "QMRS", "Quantum Status", "RBI Compliance", "CERT-In Status"],
    assets.map(a => [a.domain, a.crypto_agility_rating, a.qmrs.toFixed(1),
      a.quantum_status, a.rbi_compliance, a.certin_status]),
  );
}

function buildCBOM(assets: Asset[]) {
  return hdr("Cryptographic Bill of Materials (CBOM)") + table(
    ["Domain", "Type", "TLS", "Cipher", "Key Exchange", "Key Size", "QMRS", "Quantum", "RBI", "Runway"],
    assets.map(a => [a.domain, a.asset_type, a.tls_version, a.cipher_suite, a.key_exchange,
      String(a.key_size), a.qmrs.toFixed(1), a.quantum_status, a.rbi_compliance, a.runway_status]),
  );
}

function buildExecutive(report: CBOMReport) {
  const total = report.total_assets;
  const pqcReady = report.assets.filter(a => a.quantum_status === "PQC-Ready").length;
  const critical = report.assets.filter(a => a.qmrs >= 90).length;
  const highRisk = report.assets.filter(a => a.qmrs >= 70 && a.qmrs < 90).length;
  const rbiViolations = report.assets.filter(a => a.rbi_compliance === "Violation").length;

  const summary = table(
    ["Metric", "Value"],
    [
      ["Total Assets Scanned",              String(total)],
      ["PQC-Ready Assets",                  String(pqcReady)],
      ["Critical Risk Assets (QMRS ≥ 90)",  String(critical)],
      ["High Risk Assets (QMRS 70–90)",      String(highRisk)],
      ["RBI Compliance Violations",          String(rbiViolations)],
      ["Standard",                           "NIST IR 8547 ipd (November 2024)"],
      ["Deprecation Horizon",                "2030 deprecation / 2035 disallowed"],
      ["Scoring Methodology",                "QMRS with HNDL runway calculation"],
    ],
  );

  return hdr("Executive Summary Report")
    + "<h2>Summary</h2>" + summary
    + "<h2>Asset Detail</h2>" + buildInventory(report.assets);
}

// ── report data factory ───────────────────────────────────────────────────────

type ReportBundle = {
  pdfHtml: string;
  csvHeaders: string[];
  csvRows: Record<string, unknown>[];
  jsonData: unknown;
};

function buildBundle(type: string, report: CBOMReport): ReportBundle {
  switch (type) {
    case "Executive Reporting":
      return {
        pdfHtml: buildExecutive(report),
        csvHeaders: ["domain", "asset_type", "qmrs", "quantum_status", "runway_status", "rbi_compliance"],
        csvRows: report.assets as unknown as Record<string, unknown>[],
        jsonData: { report_type: type, generated_at: new Date().toISOString(), total_assets: report.total_assets, assets: report.assets },
      };

    case "Assets Discovery":
      return {
        pdfHtml: buildDiscovery(report.assets),
        csvHeaders: ["domain", "asset_type", "tls_version", "quantum_status"],
        csvRows: report.assets.map(a => ({ domain: a.domain, asset_type: a.asset_type, tls_version: a.tls_version, quantum_status: a.quantum_status })),
        jsonData: { report_type: type, generated_at: new Date().toISOString(), assets: report.assets.map(a => ({ domain: a.domain, asset_type: a.asset_type, tls_version: a.tls_version, quantum_status: a.quantum_status })) },
      };

    case "Assets Inventory":
      return {
        pdfHtml: buildInventory(report.assets),
        csvHeaders: ["domain", "asset_type", "tls_version", "cipher_suite", "key_size", "cert_days_remaining", "qmrs", "quantum_status", "rbi_compliance"],
        csvRows: report.assets as unknown as Record<string, unknown>[],
        jsonData: { report_type: type, generated_at: new Date().toISOString(), assets: report.assets },
      };

    case "Posture of PQC":
      return {
        pdfHtml: buildPosture(report.assets),
        csvHeaders: ["domain", "qmrs", "quantum_status", "runway_status", "runway_days", "recommended_algorithm", "action"],
        csvRows: report.assets.map(a => ({ domain: a.domain, qmrs: a.qmrs, quantum_status: a.quantum_status, runway_status: a.runway_status, runway_days: a.runway_days, recommended_algorithm: a.recommended_algorithm, action: a.action })),
        jsonData: { report_type: type, generated_at: new Date().toISOString(), assets: report.assets.map(a => ({ domain: a.domain, qmrs: a.qmrs, quantum_status: a.quantum_status, runway_status: a.runway_status, runway_days: a.runway_days, recommended_algorithm: a.recommended_algorithm, action: a.action })) },
      };

    case "Cyber Rating (Tiers 1-4)":
      return {
        pdfHtml: buildCyberRating(report.assets),
        csvHeaders: ["domain", "crypto_agility_rating", "qmrs", "quantum_status", "rbi_compliance", "certin_status"],
        csvRows: report.assets.map(a => ({ domain: a.domain, crypto_agility_rating: a.crypto_agility_rating, qmrs: a.qmrs, quantum_status: a.quantum_status, rbi_compliance: a.rbi_compliance, certin_status: a.certin_status })),
        jsonData: { report_type: type, generated_at: new Date().toISOString(), assets: report.assets.map(a => ({ domain: a.domain, crypto_agility_rating: a.crypto_agility_rating, qmrs: a.qmrs, quantum_status: a.quantum_status, rbi_compliance: a.rbi_compliance, certin_status: a.certin_status })) },
      };

    default: // CBOM
      return {
        pdfHtml: buildCBOM(report.assets),
        csvHeaders: ["domain", "asset_type", "tls_version", "cipher_suite", "key_exchange", "key_size", "qmrs", "quantum_status", "rbi_compliance", "runway_status"],
        csvRows: report.assets as unknown as Record<string, unknown>[],
        jsonData: { report_type: type, generated_at: report.generated_at, total_assets: report.total_assets, assets: report.assets },
      };
  }
}

// ── component ────────────────────────────────────────────────────────────────

export default function ReportingPage() {
  const { role } = useUser();
  const isViewer = role === "viewer";

  const [activeType, setActiveType] = useState<ReportType>("executive");
  const [selectedReportType, setSelectedReportType] = useState("CBOM");
  const [selectedFormat, setSelectedFormat] = useState("PDF");
  const [generating, setGenerating] = useState(false);
  const [sections, setSections] = useState({
    discovery: true,
    inventory: true,
    cbom: true,
    posture: true,
    cyberRating: true,
  });

  const { register, handleSubmit } = useForm<ScheduledForm>();

  async function onSchedule(data: ScheduledForm) {
    try {
      const res = await fetch("http://localhost:8080/api/reports/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        toast.success("Report scheduled successfully! You will receive an email at the scheduled time.");
      } else {
        toast.error("Failed to schedule report.");
      }
    } catch {
      toast.error("Connection error to backend.");
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const report = await loadCBOM();
      const slug = REPORT_SLUGS[selectedReportType] ?? "report";
      const { pdfHtml, csvHeaders, csvRows, jsonData } = buildBundle(selectedReportType, report);

      if (selectedFormat === "JSON") {
        downloadJSON(slug, jsonData);
      } else if (selectedFormat === "Excel") {
        downloadCSV(slug, csvHeaders, csvRows);
        toast.success(`Downloaded ${slug}.csv — open with Excel.`);
      } else {
        openPDFWindow(selectedReportType, pdfHtml);
      }
    } catch {
      toast.error("Failed to fetch report data from backend.");
    } finally {
      setGenerating(false);
    }
  }

  const reportTypes: { type: ReportType; label: string; icon: typeof Users; desc: string }[] = [
    { type: "executive", label: "Executives Reporting",  icon: Users,    desc: "High-level summary for leadership" },
    { type: "scheduled", label: "Scheduled Reporting",   icon: Calendar, desc: "Automated reports on a schedule"   },
    { type: "ondemand",  label: "On-Demand Reporting",   icon: Search,   desc: "Generate reports as needed"        },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reporting</h1>
        <p className="text-sm text-gray-500 mt-1">
          Generate and schedule cryptographic posture reports
          {isViewer && <span className="ml-2 text-amber-600 font-medium">(View-only access)</span>}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {reportTypes.map(({ type, label, icon: Icon, desc }) => (
          <Card
            key={type}
            className={`cursor-pointer transition-all ${
              activeType === type
                ? "ring-2 ring-[#8B1A1A] bg-[#8B1A1A]/5"
                : "hover:bg-gray-50"
            }`}
            onClick={() => setActiveType(type)}
          >
            <CardContent className="p-6 text-center">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${
                activeType === type ? "bg-[#8B1A1A]/10" : "bg-gray-100"
              }`}>
                <Icon className={`h-6 w-6 ${activeType === type ? "text-[#8B1A1A]" : "text-gray-400"}`} />
              </div>
              <div className="font-semibold text-gray-900 text-sm">{label}</div>
              <div className="text-xs text-gray-500 mt-1">{desc}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {activeType === "scheduled" && (
        <Card>
          <CardContent className="p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-amber-500" />
              Schedule Reporting
              <div className="ml-auto flex items-center gap-2">
                <span className="text-sm text-gray-500">Enable Schedule</span>
                <div className="w-10 h-5 bg-amber-500 rounded-full relative cursor-pointer">
                  <div className="w-4 h-4 bg-white rounded-full absolute right-0.5 top-0.5" />
                </div>
              </div>
            </h2>
            <form onSubmit={handleSubmit(onSchedule)}>
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Report Type</Label>
                    <select
                      {...register("reportType")}
                      className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                    >
                      <option>Executive Summary Report</option>
                      <option>CBOM Full Report</option>
                      <option>PQC Posture Report</option>
                      <option>Cyber Rating Report</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Frequency</Label>
                    <select
                      {...register("frequency")}
                      className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                    >
                      <option>Weekly</option>
                      <option>Daily</option>
                      <option>Monthly</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Select Assets</Label>
                    <select
                      {...register("assets")}
                      className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                    >
                      <option>All Assets</option>
                      <option>High Risk Only</option>
                      <option>PQC Not Ready</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label>Include Sections</Label>
                    <div className="flex flex-wrap gap-3">
                      {Object.entries(sections).map(([key, checked]) => (
                        <div key={key} className="flex items-center gap-1.5">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={v =>
                              setSections(s => ({ ...s, [key]: v as boolean }))
                            }
                          />
                          <span className="text-sm capitalize text-gray-600">
                            {key === "cyberRating" ? "Cyber Rating" : key.charAt(0).toUpperCase() + key.slice(1)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Date</Label>
                    <Input type="date" {...register("date")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Time (IST)</Label>
                    <Input type="time" {...register("time")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Delivery Email</Label>
                    <Input
                      type="email"
                      placeholder="executives@pnb.bank.in"
                      {...register("email")}
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={isViewer}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isViewer ? "Scheduling not available (Viewer)" : "Schedule Report"}
                  </Button>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {activeType === "ondemand" && (
        <Card>
          <CardContent className="p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-6 flex items-center gap-2">
              <Search className="h-4 w-4 text-amber-500" />
              On-Demand Reporting
              <span className="text-sm font-normal text-gray-500 ml-1">Request reports as needed</span>
            </h2>
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-2">
                <Label>Report Type</Label>
                {ON_DEMAND_TYPES.map(type => (
                  <div
                    key={type}
                    onClick={() => setSelectedReportType(type)}
                    className={`flex items-center gap-2 text-sm py-2 px-3 rounded-lg cursor-pointer transition-colors ${
                      selectedReportType === type
                        ? "bg-[#8B1A1A]/10 text-[#8B1A1A] font-semibold"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-full border flex-shrink-0 ${
                      selectedReportType === type
                        ? "bg-[#8B1A1A] border-[#8B1A1A]"
                        : "bg-amber-500/30 border-amber-500"
                    }`} />
                    {type}
                  </div>
                ))}
              </div>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Send via Email</Label>
                  <Input type="email" placeholder="Enter email address" />
                </div>
                <div className="space-y-1.5">
                  <Label>Save to Location</Label>
                  <Input defaultValue="/Reports/OnDemand/" />
                </div>
                <div className="space-y-1.5">
                  <Label>File Format</Label>
                  <select
                    value={selectedFormat}
                    onChange={e => setSelectedFormat(e.target.value)}
                    className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm"
                  >
                    <option>PDF</option>
                    <option>Excel</option>
                    <option>JSON</option>
                  </select>
                </div>
                <Button
                  onClick={handleGenerate}
                  disabled={isViewer || generating}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generating ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating…</>
                  ) : isViewer ? (
                    "Download not available (Viewer)"
                  ) : (
                    `Generate ${selectedReportType} (${selectedFormat})`
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeType === "executive" && (
        <Card>
          <CardContent className="p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Executive Summary</h2>
            <p className="text-sm text-gray-600 mb-6">
              This report provides a high-level overview of the organisation's quantum migration readiness
              for leadership and board-level stakeholders.
            </p>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Scope",        value: "All public-facing assets"               },
                { label: "Standard",     value: "NIST IR 8547 ipd (November 2024)"       },
                { label: "Horizon",      value: "2030 deprecation / 2035 disallowed"     },
                { label: "Methodology",  value: "QMRS scoring with runway calculation"   },
              ].map(({ label, value }) => (
                <div key={label} className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs text-gray-500">{label}</div>
                  <div className="text-sm font-medium text-gray-900 mt-0.5">{value}</div>
                </div>
              ))}
            </div>
            <Button
              onClick={async () => {
                if (isViewer) return;
                setGenerating(true);
                try {
                  const report = await loadCBOM();
                  openPDFWindow("Executive Report", buildExecutive(report));
                } catch {
                  toast.error("Failed to fetch data.");
                } finally {
                  setGenerating(false);
                }
              }}
              disabled={isViewer || generating}
              className="mt-6 bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating…</>
              ) : isViewer ? (
                "Download not available (Viewer)"
              ) : (
                "Download Executive Report (PDF)"
              )}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
