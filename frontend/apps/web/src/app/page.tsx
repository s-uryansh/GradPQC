"use client";

import { useEffect, useState } from "react";
import { loadCBOM, type CBOMReport, runwayBg, rbiColor } from "@/lib/data";
import { summarise, enterpriseCyberScore, cyberTier, tierBg } from "@/lib/cbom";
import {
  Globe, Server, Key, AlertTriangle,
  ShieldAlert, Clock, TrendingUp, Activity
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import Loader from "@/components/loader";

export default function HomePage() {
  const [report, setReport] = useState<CBOMReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCBOM().then(setReport).catch(e => setError(e.message));
  }, []);

  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600">
      {error}. Make sure cbom_report.json is in the public folder.
    </div>
  );
  if (!report) return <Loader />;

  const s = summarise(report);
  const score = enterpriseCyberScore(report.assets);
  const tier = cyberTier(score);

  const summaryCards = [
    { label: "Total Assets",        value: s.totalAssets,    icon: Globe,       color: "text-blue-600",   bg: "bg-blue-50"   },
    { label: "Public Web Apps",     value: s.publicWebApps,  icon: Server,      color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "APIs",                value: s.apis,           icon: Activity,    color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Expiring Certs",      value: s.expiringCerts,  icon: Clock,       color: "text-amber-600",  bg: "bg-amber-50"  },
    { label: "High Risk Assets",    value: s.highRiskAssets, icon: AlertTriangle, color: "text-red-600",  bg: "bg-red-50"    },
  ];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Home</h1>
        <p className="text-sm text-gray-500 mt-1">
          Last scan: {report.generated_at} · {report.total_assets} assets
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-5 gap-4">
        {summaryCards.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center mb-3`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <div className="text-2xl font-bold text-gray-900">{value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Enterprise score + Asset table */}
      <div className="grid grid-cols-3 gap-6">
        {/* Score card */}
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-sm text-gray-500 mb-2">Enterprise Cyber Rating</div>
            <div className="text-5xl font-bold text-gray-900 mb-2">{score}</div>
            <div className="text-sm text-gray-400 mb-3">out of 1000</div>
            <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${tierBg(tier)}`}>
              {tier}
            </span>
            <div className="mt-4 text-xs text-gray-400">
              Based on {report.total_assets} scanned assets
            </div>
          </CardContent>
        </Card>

        {/* Risk breakdown */}
        <Card>
          <CardContent className="p-6">
            <div className="text-sm font-semibold text-gray-700 mb-4">Risk Breakdown</div>
            <div className="space-y-3">
              {[
                { label: "Red Runway",     value: s.redRunway,     color: "bg-red-500"     },
                { label: "Amber Runway",   value: s.amberRunway,   color: "bg-amber-500"   },
                { label: "PFS Broken",     value: s.pfsBroken,     color: "bg-orange-500"  },
                { label: "RBI Violations", value: s.rbiViolations, color: "bg-purple-500"  },
                { label: "PQC Not Ready",  value: s.notPqcReady,   color: "bg-gray-400"    },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
                    <span className="text-xs text-gray-600">{label}</span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">{value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* PQC posture */}
        <Card>
          <CardContent className="p-6">
            <div className="text-sm font-semibold text-gray-700 mb-4">PQC Posture</div>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>PQC Ready</span>
                  <span>{s.pqcReady} / {s.totalAssets}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full"
                    style={{ width: `${s.totalAssets ? (s.pqcReady / s.totalAssets) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Migration Required</span>
                  <span>{s.notPqcReady} / {s.totalAssets}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 rounded-full"
                    style={{ width: `${s.totalAssets ? (s.notPqcReady / s.totalAssets) * 100 : 0}%` }}
                  />
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="text-xs text-gray-400">
                NIST IR 8547 ipd (Nov 2024) · Deprecation horizon 2030
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Asset inventory table */}
      <Card>
        <CardContent className="p-0">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Asset Inventory</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#8B1A1A]">
                  {["Asset Name", "URL", "Type", "TLS", "Key Length", "Cert Status", "Risk", "Runway"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-white">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.assets.map((asset, i) => (
                  <tr key={asset.domain} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-4 py-3 font-medium text-gray-900">{asset.domain}</td>
                    <td className="px-4 py-3 text-blue-600 text-xs">https://{asset.domain}</td>
                    <td className="px-4 py-3 text-gray-600">{asset.asset_type}</td>
                    <td className="px-4 py-3 text-gray-600">{asset.tls_version}</td>
                    <td className="px-4 py-3 text-gray-600">{asset.key_size}-bit</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        asset.cert_days_remaining < 30
                          ? "bg-red-100 text-red-700"
                          : asset.cert_days_remaining < 90
                          ? "bg-amber-100 text-amber-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}>
                        {asset.cert_days_remaining < 30 ? "Expiring Soon" : "Valid"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        asset.qmrs >= 80 ? "bg-red-100 text-red-700"
                        : asset.qmrs >= 50 ? "bg-amber-100 text-amber-700"
                        : "bg-emerald-100 text-emerald-700"
                      }`}>
                        {asset.qmrs >= 80 ? "High" : asset.qmrs >= 50 ? "Medium" : "Low"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${runwayBg(asset.runway_status)}`}>
                        {asset.runway_status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Crypto overview */}
      <Card>
        <CardContent className="p-0">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Crypto and Security Overview</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  {["Asset", "Key Length", "Cipher Suite", "TLS", "Certificate Authority"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.assets.map((asset, i) => (
                  <tr key={asset.domain} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-4 py-3 font-medium text-gray-900">{asset.domain}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        asset.key_size < 2048 ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"
                      }`}>
                        {asset.key_size}-bit
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 font-mono">{asset.cipher_suite}</td>
                    <td className="px-4 py-3 text-gray-600">{asset.tls_version}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {asset.cert_signature_algorithm}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}