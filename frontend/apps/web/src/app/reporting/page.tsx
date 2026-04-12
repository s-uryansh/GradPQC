"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Users, Calendar, Search, Download, Send,
  FileText, FileSpreadsheet, Braces,
} from "lucide-react";
import { toast } from "sonner";
import { loadCBOM, type CBOMReport } from "@/lib/data";
import { summarise, enterpriseCyberScore, cyberTier } from "@/lib/cbom";
import { useRole } from "@/lib/useRole";

type ReportTab = "executive" | "scheduled" | "ondemand";

type ScheduledForm = {
  reportType: string;
  frequency: string;
  assets: string;
  date: string;
  time: string;
  email: string;
};

const ONDEMAND_TYPES = [
  "Executive Reporting",
  "Assets Discovery",
  "Assets Inventory",
  "CBOM",
  "Posture of PQC",
  "Cyber Rating (Tiers 1-4)",
];

export default function ReportingPage() {
  const [activeTab, setActiveTab] = useState<ReportTab>("executive");
  const [sections, setSections] = useState({
    discovery: true,
    inventory: true,
    cbom: true,
    posture: true,
    cyberRating: true,
  });
  const [report, setReport] = useState<CBOMReport | null>(null);
  const { role } = useRole();
  const isViewer = role === "viewer";

  // On-demand state
  const [selectedType, setSelectedType] = useState(ONDEMAND_TYPES[3]);
  const [selectedFormat, setSelectedFormat] = useState("JSON");
  const [onDemandEmail, setOnDemandEmail] = useState("");
  const [onDemandLoading, setOnDemandLoading] = useState(false);
  // printType tracks what the print section should render — set before window.print()
  const [printType, setPrintType] = useState<string>("Executive Reporting");

  useEffect(() => {
    loadCBOM()
      .then(setReport)
      .catch(() => {/* executive section shows placeholders if backend is down */});
  }, []);

  const { register, handleSubmit, reset } = useForm<ScheduledForm>();

  async function onSchedule(data: ScheduledForm) {
    try {
      const res = await fetch("http://localhost:8080/api/reports/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportType: data.reportType,
          frequency: data.frequency,
          assets: data.assets,
          email: data.email,
          time: data.time,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        toast.success(
          `Report scheduled for ${json.frequency} at ${json.time} IST → ${json.email}`,
        );
        reset();
      } else {
        toast.error("Failed to schedule report.");
      }
    } catch {
      toast.error("Connection error. Is the Go backend running?");
    }
  }

  function safeFilename(reportType: string, ext: string) {
    return reportType.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "") + "_report." + ext;
  }

  async function handleGenerateReport() {
    setOnDemandLoading(true);
    const format = selectedFormat.toLowerCase();

    // PDF: set print type to current on-demand selection, then trigger print
    if (format === "pdf") {
      setPrintType(selectedType);
      // allow React to re-render the print section before printing
      setTimeout(() => {
        window.print();
        setOnDemandLoading(false);
      }, 100);
      return;
    }

    try {
      const res = await fetch("http://localhost:8080/api/reports/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportType: selectedType,
          format,
          email: onDemandEmail.trim(),
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        toast.error(text || "Failed to generate report.");
        return;
      }

      if (onDemandEmail.trim()) {
        const json = await res.json();
        toast.success(json.message ?? `Report sent to ${onDemandEmail}`);
      } else {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = format === "excel"
          ? safeFilename(selectedType, "xlsx")
          : safeFilename(selectedType, "json");
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("Report downloaded successfully.");
      }
    } catch {
      toast.error("Connection error. Is the Go backend running?");
    } finally {
      setOnDemandLoading(false);
    }
  }

  // Derived metrics for executive preview
  const s = report ? summarise(report) : null;
  const score = report ? enterpriseCyberScore(report.assets) : 0;
  const tier = cyberTier(score);
  const avgQMRS =
    report && report.assets.length > 0
      ? Math.round(report.assets.reduce((sum, a) => sum + a.qmrs, 0) / report.assets.length)
      : 0;

  const allTabs = [
    { id: "executive" as const, label: "Executives Reporting", icon: Users,    desc: "High-level summary for leadership" },
    { id: "scheduled" as const, label: "Scheduled Reporting",  icon: Calendar, desc: "Automated reports on a schedule"   },
    { id: "ondemand"  as const, label: "On-Demand Reporting",  icon: Search,   desc: "Generate reports as needed"        },
  ];
  // Viewers can only access the executive summary tab
  const tabs = isViewer ? allTabs.slice(0, 1) : allTabs;

  return (
    <>
      {/* ── PRINT-ONLY report (hidden on screen, dynamic based on printType) ── */}
      <div className="hidden print:block">
        <div className="max-w-4xl mx-auto p-10 bg-white text-gray-900">
          {/* Header – shared across all report types */}
          <div className="flex items-start justify-between mb-8 pb-6 border-b-2 border-[#8B1A1A]">
            <div>
              <div className="text-3xl font-bold text-[#8B1A1A]">Punjab National Bank</div>
              <div className="text-lg text-gray-600 mt-1">
                {printType === "Executive Reporting"
                  ? "Quantum Cryptographic Posture – Executive Report"
                  : `${printType} – On-Demand Report`}
              </div>
              <div className="text-sm text-gray-400 mt-1">
                NIST IR 8547 | RBI Cyber Security Framework
              </div>
            </div>
            <div className="text-right text-sm text-gray-500">
              <div className="font-semibold text-base text-gray-800">GradPQC Platform</div>
              <div>
                {new Date().toLocaleDateString("en-IN", {
                  day: "2-digit", month: "long", year: "numeric",
                })}
              </div>
              <div>PNB Cybersecurity Hackathon 2026</div>
            </div>
          </div>

          {/* KPI strip – all types */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {[
              { label: "Total Assets", value: s?.totalAssets ?? "—" },
              { label: "Cyber Tier",   value: tier },
              { label: "Avg QMRS",     value: `${avgQMRS}/100` },
              { label: "PQC Ready",    value: `${s?.pqcReady ?? 0}/${s?.totalAssets ?? 0}` },
            ].map(({ label, value }) => (
              <div key={label} className="border border-gray-200 rounded-lg p-4 text-center">
                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</div>
                <div className="text-2xl font-bold text-gray-900">{String(value)}</div>
              </div>
            ))}
          </div>

          {/* Executive / Posture: runway + compliance columns */}
          {(printType === "Executive Reporting" || printType === "Posture of PQC") && (
            <div className="grid grid-cols-2 gap-6 mb-8">
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">Runway Status</h3>
                <div className="space-y-2">
                  {[
                    { label: "Red – Immediate Action Required", value: s?.redRunway ?? 0,   dot: "bg-red-500"   },
                    { label: "Amber – Monitor & Plan",          value: s?.amberRunway ?? 0,  dot: "bg-amber-500" },
                    { label: "Green – On Track",                value: (s?.totalAssets ?? 0) - (s?.redRunway ?? 0) - (s?.amberRunway ?? 0), dot: "bg-emerald-500" },
                  ].map(({ label, value, dot }) => (
                    <div key={label} className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${dot}`} />
                      <span className="text-sm text-gray-700 flex-1">{label}</span>
                      <span className="text-sm font-semibold">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 mb-3">RBI / CERT-In Compliance</h3>
                <div className="space-y-2">
                  {[
                    { label: "RBI Violations",             value: s?.rbiViolations  ?? 0, dot: "bg-red-500"    },
                    { label: "PFS Broken",                  value: s?.pfsBroken     ?? 0, dot: "bg-orange-500" },
                    { label: "Certificates Expiring ≤90d", value: s?.expiringCerts  ?? 0, dot: "bg-amber-500"  },
                    { label: "High Risk Assets",            value: s?.highRiskAssets ?? 0, dot: "bg-red-400"   },
                  ].map(({ label, value, dot }) => (
                    <div key={label} className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${dot}`} />
                      <span className="text-sm text-gray-700 flex-1">{label}</span>
                      <span className="text-sm font-semibold">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* CBOM / Inventory: asset table */}
          {(printType === "CBOM" || printType === "Assets Inventory") && report && (
            <div className="mb-8">
              <h3 className="font-semibold text-gray-800 mb-3">{printType} – Asset Detail</h3>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-[#1B3A6B] text-white">
                    {["Domain", "TLS", "Key Exchange", "Cipher Suite", "QMRS", "Quantum Status", "RBI", "Runway"].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.assets.map((a, i) => (
                    <tr key={a.domain} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"} style={{pageBreakInside: "avoid"}}>
                      <td className="px-3 py-1.5 font-medium">{a.domain}</td>
                      <td className="px-3 py-1.5">{a.tls_version}</td>
                      <td className="px-3 py-1.5">{a.key_exchange}</td>
                      <td className="px-3 py-1.5 text-[10px]">{a.cipher_suite}</td>
                      <td className="px-3 py-1.5">{a.qmrs.toFixed(1)}</td>
                      <td className="px-3 py-1.5">{a.quantum_status}</td>
                      <td className="px-3 py-1.5">{a.rbi_compliance}</td>
                      <td className="px-3 py-1.5">{a.runway_status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Assets Discovery */}
          {printType === "Assets Discovery" && report && (
            <div className="mb-8">
              <h3 className="font-semibold text-gray-800 mb-3">Discovered Assets</h3>
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-[#1B3A6B] text-white">
                    {["Domain", "Asset Type", "TLS Version", "Cert Expiry (Days)", "Crypto Agility"].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.assets.map((a, i) => (
                    <tr key={a.domain} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"} style={{pageBreakInside: "avoid"}}>
                      <td className="px-3 py-1.5 font-medium">{a.domain}</td>
                      <td className="px-3 py-1.5">{a.asset_type}</td>
                      <td className="px-3 py-1.5">{a.tls_version}</td>
                      <td className="px-3 py-1.5">{a.cert_days_remaining}</td>
                      <td className="px-3 py-1.5">{a.crypto_agility_rating}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Cyber Rating */}
          {printType === "Cyber Rating (Tiers 1-4)" && (
            <div className="mb-8">
              <h3 className="font-semibold text-gray-800 mb-3">Cyber Rating Summary</h3>
              <div className="grid grid-cols-2 gap-6">
                <div className="border border-gray-200 rounded-lg p-5">
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">Enterprise Cyber Score</div>
                  <div className="text-4xl font-bold text-[#8B1A1A]">{score}</div>
                  <div className="text-lg font-semibold text-gray-700 mt-1">{tier}</div>
                </div>
                <div className="border border-gray-200 rounded-lg p-5">
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-2">Tier Breakdown</div>
                  {[
                    { label: "PQC-Ready Assets",  value: s?.pqcReady ?? 0 },
                    { label: "High Risk Assets",   value: s?.highRiskAssets ?? 0 },
                    { label: "RBI Violations",     value: s?.rbiViolations ?? 0 },
                    { label: "Expiring ≤90d",      value: s?.expiringCerts ?? 0 },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex justify-between text-sm py-0.5">
                      <span className="text-gray-600">{label}</span>
                      <span className="font-semibold">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Migration horizon – shown for executive and posture */}
          {(printType === "Executive Reporting" || printType === "Posture of PQC") && (
            <div className="border border-gray-200 rounded-lg p-5 mb-8">
              <h3 className="font-semibold text-gray-800 mb-3">PQC Migration Horizon</h3>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { year: "2030",      title: "TLS 1.2 Deprecated", desc: "All RSA-based TLS 1.2 must migrate to ECDHE or PQC algorithms." },
                  { year: "2035",      title: "TLS 1.2 Disallowed",  desc: "TLS 1.2 fully disallowed per NIST IR 8547. TLS 1.3 minimum."   },
                  { year: "Post-2035", title: "PQC Mandatory",       desc: "ML-KEM-768 & ML-DSA-44 required for all public-facing endpoints." },
                ].map(({ year, title, desc }) => (
                  <div key={year} className="bg-gray-50 rounded p-3">
                    <div className="font-bold text-[#8B1A1A] text-xs mb-0.5">{year} – {title}</div>
                    <div className="text-gray-600 text-xs">{desc}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-xs text-gray-400 text-center pt-4 border-t border-gray-100">
            Confidential – For Board / CISO use only &nbsp;|&nbsp; GradPQC v1.0 &nbsp;|&nbsp;
            FIPS 203/204/205 Aligned &nbsp;|&nbsp; NIST IR 8547
          </div>
        </div>
      </div>

      {/* ── SCREEN content ───────────────────────────────────────────────── */}
      <div className="space-y-6 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reporting</h1>
          <p className="text-sm text-gray-500 mt-1">
            Generate and schedule cryptographic posture reports
          </p>
        </div>

        {/* Tab selector */}
        <div className="grid grid-cols-3 gap-6">
          {tabs.map(({ id, label, icon: Icon, desc }) => (
            <Card
              key={id}
              className={`cursor-pointer transition-all ${
                activeTab === id
                  ? "ring-2 ring-[#8B1A1A] bg-[#8B1A1A]/5"
                  : "hover:bg-gray-50"
              }`}
              onClick={() => setActiveTab(id)}
            >
              <CardContent className="p-6 text-center">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${
                    activeTab === id ? "bg-[#8B1A1A]/10" : "bg-gray-100"
                  }`}
                >
                  <Icon
                    className={`h-6 w-6 ${
                      activeTab === id ? "text-[#8B1A1A]" : "text-gray-400"
                    }`}
                  />
                </div>
                <div className="font-semibold text-gray-900 text-sm">{label}</div>
                <div className="text-xs text-gray-500 mt-1">{desc}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ── Executive Tab ─────────────────────────── */}
        {activeTab === "executive" && (
          <Card>
            <CardContent className="p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="h-4 w-4 text-amber-500" />
                Executive Summary
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                One-click board-level PDF combining cryptographic posture, RBI compliance,
                and quantum migration timeline. Uses the browser&apos;s native print dialog
                with print-optimised formatting.
              </p>

              {s && (
                <div className="grid grid-cols-4 gap-4 mb-6">
                  {[
                    { label: "Total Assets", value: s.totalAssets },
                    { label: "Cyber Tier",   value: tier },
                    { label: "Avg QMRS",     value: `${avgQMRS}/100` },
                    { label: "PQC Ready",    value: `${s.pqcReady}/${s.totalAssets}` },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-gray-50 rounded-lg p-3 text-center">
                      <div className="text-xs text-gray-500">{label}</div>
                      <div className="text-xl font-bold text-gray-900 mt-0.5">
                        {String(value)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 mb-6">
                {[
                  { label: "Scope",       value: "All public-facing assets"             },
                  { label: "Standard",    value: "NIST IR 8547 ipd (November 2024)"     },
                  { label: "Horizon",     value: "2030 deprecation / 2035 disallowed"   },
                  { label: "Methodology", value: "QMRS scoring with runway calculation" },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500">{label}</div>
                    <div className="text-sm font-medium text-gray-900 mt-0.5">{value}</div>
                  </div>
                ))}
              </div>

              <Button
                onClick={() => { setPrintType("Executive Reporting"); setTimeout(() => window.print(), 100); }}
                className="bg-amber-500 hover:bg-amber-600 text-white gap-2"
              >
                <Download className="h-4 w-4" />
                Download Executive Report (PDF)
              </Button>
            </CardContent>
          </Card>
        )}

        {/* ── Scheduled Tab ─────────────────────────── */}
        {activeTab === "scheduled" && (
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
                        className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white"
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
                        className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white"
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
                        className="w-full border border-gray-200 rounded-md px-3 py-2 text-sm bg-white"
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
                              {key === "cyberRating"
                                ? "Cyber Rating"
                                : key.charAt(0).toUpperCase() + key.slice(1)}
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
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white gap-2"
                    >
                      <Calendar className="h-4 w-4" />
                      Schedule Report
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* ── On-Demand Tab ─────────────────────────── */}
        {activeTab === "ondemand" && (
          <Card>
            <CardContent className="p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <Search className="h-4 w-4 text-amber-500" />
                On-Demand Reporting
                <span className="text-sm font-normal text-gray-500 ml-1">
                  Request reports immediately
                </span>
              </h2>

              <div className="grid grid-cols-2 gap-8">
                {/* Report type list */}
                <div className="space-y-1">
                  <Label className="mb-2 block">Report Type</Label>
                  {ONDEMAND_TYPES.map(type => (
                    <div
                      key={type}
                      onClick={() => setSelectedType(type)}
                      className={`flex items-center gap-2 text-sm py-1.5 px-2 rounded cursor-pointer transition-colors ${
                        selectedType === type
                          ? "bg-amber-50 text-amber-700 font-medium"
                          : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <div
                        className={`w-3 h-3 rounded-full border flex-shrink-0 ${
                          selectedType === type
                            ? "bg-amber-500 border-amber-500"
                            : "bg-amber-200 border-amber-400"
                        }`}
                      />
                      {type}
                    </div>
                  ))}
                </div>

                {/* Options + generate */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>
                      Send via Email{" "}
                      <span className="text-gray-400 font-normal">(optional)</span>
                    </Label>
                    <Input
                      type="email"
                      placeholder="audit@pnb.bank.in"
                      value={onDemandEmail}
                      onChange={e => setOnDemandEmail(e.target.value)}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>File Format</Label>
                    <div className="flex gap-2">
                      {[
                        { fmt: "PDF",   Icon: FileText },
                        { fmt: "Excel", Icon: FileSpreadsheet },
                        { fmt: "JSON",  Icon: Braces },
                      ].map(({ fmt, Icon }) => (
                        <button
                          key={fmt}
                          type="button"
                          onClick={() => setSelectedFormat(fmt)}
                          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md border text-sm font-medium transition-colors ${
                            selectedFormat === fmt
                              ? "bg-amber-500 border-amber-500 text-white"
                              : "border-gray-200 text-gray-600 hover:border-amber-300 bg-white"
                          }`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                          {fmt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500">
                    <span className="font-medium text-gray-700">{selectedType}</span>
                    {" — "}
                    {selectedFormat}
                    {onDemandEmail && (
                      <span className="text-blue-600"> → {onDemandEmail}</span>
                    )}
                    {!onDemandEmail && selectedFormat !== "PDF" && (
                      <span className="block mt-1 text-amber-600">
                        No email provided – file will download directly.
                      </span>
                    )}
                  </div>

                  <Button
                    onClick={handleGenerateReport}
                    disabled={onDemandLoading}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white gap-2"
                  >
                    {onDemandEmail.trim() ? (
                      <Send className="h-4 w-4" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    {onDemandLoading
                      ? "Generating…"
                      : onDemandEmail.trim()
                        ? "Send Report"
                        : "Download Report"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}
