"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import Loader from "@/components/loader";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, ReferenceLine, LabelList,
} from "recharts";

interface BankProfile {
  bank_name: string;
  domain: string;
  enterprise_score: number;
  cyber_tier: string;
  pqc_ready: boolean;
  avg_qmrs: number;
  quantum_break_prob_2030: number;
  quantum_break_prob_2035: number;
  runway_status: string;
  tls_version: string;
  key_exchange: string;
  scanned: boolean;
  scan_error?: string;
}

interface BenchmarkReport {
  generated_at: string;
  banks: BankProfile[];
}

const tierColor = (tier: string) => {
  switch (tier) {
    case "Elite-PQC": return "#10B981";
    case "Standard":  return "#F59E0B";
    case "Legacy":    return "#F97316";
    default:          return "#EF4444";
  }
};

const tierBg = (tier: string) => {
  switch (tier) {
    case "Elite-PQC": return "bg-emerald-100 text-emerald-700";
    case "Standard":  return "bg-amber-100 text-amber-700";
    case "Legacy":    return "bg-orange-100 text-orange-700";
    default:          return "bg-red-100 text-red-700";
  }
};

const runwayBg = (s: string) => {
  switch (s) {
    case "Green": return "bg-emerald-100 text-emerald-700";
    case "Amber": return "bg-amber-100 text-amber-700";
    default:      return "bg-red-100 text-red-700";
  }
};

export default function CompetitorPage() {
  const [report, setReport] = useState<BenchmarkReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("http://localhost:8080/api/benchmark")
      .then(r => r.json())
      .then((data: BenchmarkReport) => { setReport(data); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-64 gap-4">
      <Loader />
      <p className="text-sm text-gray-500">Scanning competitor TLS endpoints — this takes ~15 seconds…</p>
    </div>
  );
  if (error) return <div className="text-red-600 p-4">{error}</div>;
  if (!report) return null;

  const scanned = report.banks.filter(b => b.scanned);
  const pnb = scanned.find(b => b.bank_name === "PNB");
  const competitors = scanned.filter(b => b.bank_name !== "PNB");

  const industryAvgScore = scanned.length
    ? Math.round(scanned.reduce((s, b) => s + b.enterprise_score, 0) / scanned.length)
    : 0;

  const pnbRank = [...scanned]
    .sort((a, b) => b.enterprise_score - a.enterprise_score)
    .findIndex(b => b.bank_name === "PNB") + 1;

  const chartData = [...scanned]
    .sort((a, b) => b.enterprise_score - a.enterprise_score)
    .map(b => ({ name: b.bank_name, score: b.enterprise_score, tier: b.cyber_tier }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Competitor Quantum Benchmarking</h1>
        <p className="text-sm text-gray-500 mt-1">
          Live TLS scan comparison across Indian banking sector · {scanned.length} banks scanned
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="text-xs text-gray-500 mb-1">PNB Enterprise Score</div>
            <div className="text-3xl font-bold" style={{ color: tierColor(pnb?.cyber_tier ?? "") }}>
              {pnb?.enterprise_score ?? "—"}
            </div>
            <div className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold ${tierBg(pnb?.cyber_tier ?? "")}`}>
              {pnb?.cyber_tier ?? "—"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs text-gray-500 mb-1">Industry Average</div>
            <div className="text-3xl font-bold text-gray-800">{industryAvgScore}</div>
            <div className="text-xs text-gray-400 mt-1">across {scanned.length} banks</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs text-gray-500 mb-1">PNB Industry Rank</div>
            <div className="text-3xl font-bold text-gray-800">
              #{pnbRank} <span className="text-base text-gray-400">of {scanned.length}</span>
            </div>
            <div className="text-xs text-gray-400 mt-1">by quantum readiness score</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="text-xs text-gray-500 mb-1">PNB vs Industry</div>
            <div className={`text-3xl font-bold ${(pnb?.enterprise_score ?? 0) >= industryAvgScore ? "text-emerald-600" : "text-red-600"}`}>
              {(pnb?.enterprise_score ?? 0) >= industryAvgScore ? "+" : ""}
              {(pnb?.enterprise_score ?? 0) - industryAvgScore}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {(pnb?.enterprise_score ?? 0) >= industryAvgScore ? "above" : "below"} industry average
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Score bar chart */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Enterprise Quantum Readiness Score Comparison</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} barSize={48}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis domain={[0, 1000]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => [`${v}`, "Score"]} />
              <ReferenceLine y={industryAvgScore} stroke="#6B7280" strokeDasharray="4 2"
                label={{ value: `Industry avg ${industryAvgScore}`, position: "right", fontSize: 11, fill: "#6B7280" }} />
              <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="score" position="top" style={{ fontSize: 11, fontWeight: 600 }} />
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.name === "PNB" ? "#8B1A1A" : tierColor(entry.tier)}
                    opacity={entry.name === "PNB" ? 1 : 0.75}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed comparison table */}
      <Card>
        <CardContent className="p-0">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-700">Detailed Quantum Risk Comparison</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                {["Bank", "Score", "Tier", "TLS Version", "Key Exchange", "P(break 2030)", "P(break 2035)", "Runway", "PQC Ready"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...scanned]
                .sort((a, b) => b.enterprise_score - a.enterprise_score)
                .map((bank, i) => (
                  <tr
                    key={bank.bank_name}
                    className={`${i % 2 === 0 ? "bg-white" : "bg-gray-50/50"} ${bank.bank_name === "PNB" ? "ring-2 ring-inset ring-[#8B1A1A]/20" : ""}`}
                  >
                    <td className="px-4 py-3 font-semibold text-gray-900">
                      {bank.bank_name === "PNB" && (
                        <span className="mr-1.5 text-[10px] bg-[#8B1A1A] text-white px-1.5 py-0.5 rounded">YOU</span>
                      )}
                      {bank.bank_name}
                    </td>
                    <td className="px-4 py-3 font-bold" style={{ color: tierColor(bank.cyber_tier) }}>
                      {bank.enterprise_score}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${tierBg(bank.cyber_tier)}`}>
                        {bank.cyber_tier}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{bank.tls_version}</td>
                    <td className="px-4 py-3 text-xs text-gray-600">{bank.key_exchange}</td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold text-sm ${bank.quantum_break_prob_2030 > 0.5 ? "text-red-600" : "text-amber-500"}`}>
                        {(bank.quantum_break_prob_2030 * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold text-sm ${bank.quantum_break_prob_2035 > 0.7 ? "text-red-600" : "text-amber-500"}`}>
                        {(bank.quantum_break_prob_2035 * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${runwayBg(bank.runway_status)}`}>
                        {bank.runway_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {bank.pqc_ready
                        ? <span className="text-emerald-600 font-semibold">Yes</span>
                        : <span className="text-red-500 font-semibold">No</span>}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          {report.banks.filter(b => !b.scanned).map(b => (
            <div key={b.bank_name} className="px-4 py-2 text-xs text-gray-400 border-t border-gray-100">
              {b.bank_name} ({b.domain}) — scan failed: {b.scan_error}
            </div>
          ))}
        </CardContent>
      </Card>

      <p className="text-xs text-gray-400 text-right">
        Data based on publicly observable TLS handshake metadata · Cached 60 min · {report.generated_at}
      </p>
    </div>
  );
}
