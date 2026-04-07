"use client";

import { useEffect, useState } from "react";
import { loadCBOM, type CBOMReport } from "@/lib/data";
import { pqcGrade, type PQCGrade } from "@/lib/cbom";
import { Card, CardContent } from "@/components/ui/card";
import Loader from "@/components/loader";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { CheckCircle, XCircle } from "lucide-react";

const gradeColor: Record<PQCGrade, string> = {
  Elite:    "bg-emerald-100 text-emerald-700",
  Critical: "bg-red-100 text-red-700",
  Standard: "bg-amber-100 text-amber-700",
};

const PIE_COLORS = ["#10B981", "#EF4444", "#F59E0B"];

export default function PosturePage() {
  const [report, setReport] = useState<CBOMReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCBOM().then(setReport).catch(e => setError(e.message));
  }, []);

  if (error) return <div className="text-red-600 p-4">{error}</div>;
  if (!report) return <Loader />;

  const graded = report.assets.map(a => ({ asset: a, grade: pqcGrade(a) }));
  const elite    = graded.filter(g => g.grade === "Elite").length;
  const critical = graded.filter(g => g.grade === "Critical").length;
  const standard = graded.filter(g => g.grade === "Standard").length;

  const pieData = [
    { name: "Elite",    value: elite },
    { name: "Critical", value: critical },
    { name: "Standard", value: standard },
  ].filter(d => d.value > 0);

  const elitePct  = report.total_assets ? Math.round((elite / report.total_assets) * 100) : 0;
  const stdPct    = report.total_assets ? Math.round((standard / report.total_assets) * 100) : 0;
  const critPct   = report.total_assets ? Math.round((critical / report.total_assets) * 100) : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Posture of PQC</h1>
        <p className="text-sm text-gray-500 mt-1">
          Post-quantum cryptography compliance across all public-facing assets
        </p>
      </div>

      {/* Header bar */}
      <div className="bg-[#1B2A4A] rounded-lg px-6 py-4 flex items-center justify-between">
        <h2 className="text-white font-semibold">PQC Compliance Dashboard</h2>
        <div className="flex items-center gap-6 text-sm">
          <span className="text-emerald-400 font-medium">Elite-PQC Ready: {elitePct}%</span>
          <span className="text-amber-400 font-medium">Standard: {stdPct}%</span>
          <span className="text-red-400 font-medium">Critical Apps: {critical}</span>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-6">
        {/* Bar chart */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Assets by Classification Grade</h3>
            <div className="flex items-end gap-4 h-32">
              {[
                { label: "Elite",    value: elite,    color: "bg-emerald-500" },
                { label: "Critical", value: critical, color: "bg-red-500"     },
                { label: "Standard", value: standard, color: "bg-amber-500"   },
              ].map(({ label, value, color }) => {
                const height = report.total_assets
                  ? Math.max((value / report.total_assets) * 100, value > 0 ? 8 : 0)
                  : 0;
                return (
                  <div key={label} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-bold text-gray-700">{value}</span>
                    <div
                      className={`w-full rounded-t ${color}`}
                      style={{ height: `${height}%`, minHeight: value > 0 ? "8px" : "0" }}
                    />
                    <span className="text-xs text-gray-500">{label}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Pie chart */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Application Status</h3>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={65}
                  label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex justify-center gap-4 mt-2">
              {["Elite-PQC Ready", "Critical", "Standard"].map((label, i) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ background: PIE_COLORS[i] }} />
                  <span className="text-xs text-gray-500">{label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Risk matrix */}
        <Card>
          <CardContent className="p-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Risk Overview</h3>
            <div className="grid grid-cols-3 grid-rows-3 gap-1 h-32">
              {[
                "bg-red-500", "bg-red-400", "bg-amber-400",
                "bg-red-400", "bg-amber-400", "bg-amber-300",
                "bg-amber-400", "bg-amber-300", "bg-emerald-400",
              ].map((color, i) => (
                <div key={i} className={`${color} rounded opacity-80`} />
              ))}
            </div>
            <div className="flex gap-3 mt-3">
              {[
                { color: "bg-red-500",    label: "High Risk"    },
                { color: "bg-amber-400",  label: "Medium Risk"  },
                { color: "bg-emerald-400",label: "No risk"      },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded ${color}`} />
                  <span className="text-xs text-gray-500">{label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Asset PQC support table */}
      <Card>
        <CardContent className="p-0">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-700">Asset PQC Support</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50">
                {["Asset Name", "IP", "PQC Support", "Grade", "Quantum Break Risk", "Action"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {graded.map(({ asset, grade }, i) => (
                <tr key={asset.domain} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                  <td className="px-4 py-3 font-medium text-gray-900">{asset.domain}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">Public</td>
                  <td className="px-4 py-3">
                    {asset.quantum_status === "PQC-Ready"
                      ? <CheckCircle className="h-4 w-4 text-emerald-500" />
                      : <XCircle className="h-4 w-4 text-red-500" />
                    }
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${gradeColor[grade]}`}>
                      {grade}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {asset.quantum_break_p50 && asset.quantum_break_p50 > 0 ? (
                      <div className="space-y-1 min-w-[140px]">
                        <div className="flex justify-between text-[10px] text-gray-500">
                          <span>by 2030</span>
                          <span className="font-semibold text-red-600">
                            {((asset.quantum_break_prob_2030 ?? 0) * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div
                            className="bg-red-500 h-1.5 rounded-full"
                            style={{ width: `${(asset.quantum_break_prob_2030 ?? 0) * 100}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-500">
                          <span>by 2035</span>
                          <span className="font-semibold text-amber-600">
                            {((asset.quantum_break_prob_2035 ?? 0) * 100).toFixed(0)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div
                            className="bg-amber-400 h-1.5 rounded-full"
                            style={{ width: `${(asset.quantum_break_prob_2035 ?? 0) * 100}%` }}
                          />
                        </div>
                        <div className="text-[10px] text-gray-400">
                          P50 break: <span className="font-medium text-gray-600">{asset.quantum_break_p50}</span>
                        </div>
                      </div>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">
                        PQC-Safe
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">
                    {asset.action}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Improvement recommendations */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-4">Improvement Recommendations</h3>
          <div className="space-y-2">
            {[
              "Upgrade to TLS 1.3 with PQC hybrid key exchange",
              "Implement ML-KEM-768 (FIPS 203) for key encapsulation",
              "Update cryptographic libraries to support OQS-OpenSSL",
              "Develop PQC migration plan aligned with NIST IR 8547 timeline",
              "Address broken PFS by fixing ephemeral key reuse on load balancers",
            ].map((rec, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm text-gray-600">
                <div className="w-5 h-5 bg-amber-100 rounded flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-amber-600 text-xs font-bold">{i + 1}</span>
                </div>
                {rec}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}