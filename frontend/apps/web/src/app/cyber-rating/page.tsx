"use client";

import { useEffect, useState } from "react";
import { loadCBOM, type CBOMReport } from "@/lib/data";
import {
  assetCyberScore, enterpriseCyberScore,
  cyberTier, tierBg, tierColor
} from "@/lib/cbom";
import { Card, CardContent } from "@/components/ui/card";
import Loader from "@/components/loader";
import { useRole } from "@/lib/useRole";
import ViewerGate from "@/components/viewer-gate";

export default function CyberRatingPage() {
  const [report, setReport] = useState<CBOMReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { role } = useRole();
  const isViewer = role === "viewer";

  useEffect(() => {
    loadCBOM().then(setReport).catch(e => setError(e.message));
  }, []);

  if (error) return <div className="text-red-600 p-4">{error}</div>;
  if (!report) return <Loader />;

  const score = enterpriseCyberScore(report.assets);
  const tier  = cyberTier(score);

  const tiers = [
    { name: "Legacy",    range: "below 400",  criteria: "TLS 1.0/1.1 enabled; weak ciphers (CBC, 3DES); PFS missing; key possibly 1024-bit",                                                          action: "Remediation required; upgrade TLS stack; rotate certificates; remove weak cipher suites" },
    { name: "Standard",  range: "400 to 700", criteria: "TLS 1.2 supported; key above 2048-bit; mostly strong ciphers but backward compatibility allowed; PFS optional",                              action: "Improve gradually; disable legacy protocols; standardise cipher suites" },
    { name: "Elite-PQC", range: "above 700",  criteria: "TLS 1.2/TLS 1.3 only; strong ciphers (AES-GCM, ChaCha20); PFS enabled; certificate above 2048-bit; no weak protocols; HSTS enabled",       action: "Maintain configuration; periodic monitoring; recommended baseline for public-facing apps" },
    { name: "Critical",  range: "below 100",  criteria: "SSL v2/v3 enabled; key below 1024-bit; weak cipher suites below 112-bit security; known vulnerabilities",                                    action: "Immediate action; block or isolate service; replace certificate and TLS configuration; patch vulnerabilities" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cyber Rating</h1>
        <p className="text-sm text-gray-500 mt-1">
          Consolidated enterprise-level PQC readiness score
        </p>
      </div>

      {/* Enterprise score */}
      <Card>
        <CardContent className="p-8">
          <div className="text-center">
            <div className="text-sm text-gray-500 mb-2">
              Consolidated Enterprise-Level Cyber-Rating Score
            </div>
            <div className="inline-flex items-center gap-4 bg-emerald-500 text-white px-8 py-4 rounded-xl mb-4">
              <span className="text-5xl font-bold">{score}</span>
              <span className="text-2xl font-medium">/1000</span>
              <div className="border-l border-white/30 pl-4">
                <div className="font-semibold">{tier}</div>
                <div className="text-xs text-white/80">Indicates a stronger security posture</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Per-asset scores */}
      <Card>
        <CardContent className="p-0">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Per-Asset PQC Score</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                {["URL", "PQC Score", "Tier", "TLS Version", "Key Exchange", "Quantum Status"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(isViewer ? report.assets.slice(0, 3) : report.assets).map((asset, i) => {
                const s = assetCyberScore(asset);
                const t = cyberTier(s * 10);
                return (
                  <tr key={asset.domain} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-4 py-3 font-medium text-gray-900">{asset.domain}</td>
                    <td className="px-4 py-3 font-bold text-gray-900">{s}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${tierBg(t)}`}>
                        {t}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{asset.tls_version}</td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{asset.key_exchange}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        asset.quantum_status === "PQC-Ready"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      }`}>
                        {asset.quantum_status}
                      </span>
                    </td>
                  </tr>
                );
              })}
              <ViewerGate hidden={isViewer ? Math.max(0, report.assets.length - 3) : 0} label="assets" />
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Tier criteria table */}
      <Card>
        <CardContent className="p-0">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">PQC Rating Tiers</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#8B1A1A]">
                {["Tier", "PQC Rating", "Security Level", "Compliance Criteria", "Priority Action"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-white">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tiers.map((t, i) => (
                <tr key={t.name} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="px-4 py-3 font-semibold text-gray-900">{t.name}</td>
                  <td className="px-4 py-3 text-gray-600">{t.range}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${tierBg(cyberTier(
                      t.name === "Elite-PQC" ? 800 :
                      t.name === "Standard"  ? 550 :
                      t.name === "Legacy"    ? 200 : 50
                    ))}`}>
                      {t.name === "Elite-PQC" ? "Modern best-practice"
                        : t.name === "Standard" ? "Acceptable enterprise"
                        : t.name === "Legacy" ? "Weak but operational"
                        : "Insecure / exploitable"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs max-w-sm">{t.criteria}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs max-w-sm">{t.action}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}