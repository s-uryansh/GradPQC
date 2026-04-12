"use client";

import { useEffect, useState, useMemo } from "react";
import { loadCBOM, type CBOMReport } from "@/lib/data";
import { Card, CardContent } from "@/components/ui/card";
import Loader from "@/components/loader";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

function formatCrore(crore: number): string {
  if (crore >= 10000) return `₹${(crore / 100).toFixed(1)}L Cr`;
  if (crore >= 1000)  return `₹${(crore / 100).toFixed(2)}K Cr`;
  if (crore >= 1)     return `₹${crore.toFixed(1)} Cr`;
  return `₹${(crore * 100).toFixed(0)} L`;
}

export default function ROIPage() {
  const [report, setReport] = useState<CBOMReport | null>(null);
  const [error, setError]   = useState<string | null>(null);

  // User-configurable inputs
  const [dailyVolumeCr, setDailyVolumeCr]       = useState(500);   // ₹ crores per day
  const [costPerAssetL, setCostPerAssetL]        = useState(50);    // ₹ lakhs per asset
  const [breachRecoveryMult, setBreachRecoveryMult] = useState(3);  // multiplier for indirect costs

  useEffect(() => {
    loadCBOM().then(setReport).catch(e => setError(e.message));
  }, []);

  const calc = useMemo(() => {
    if (!report || report.assets.length === 0) return null;

    const vulnerable = report.assets.filter(a => a.quantum_status !== "PQC-Ready");
    if (vulnerable.length === 0) return null;

    const totalAssets     = report.assets.length;
    const vulnCount       = vulnerable.length;

    const avgBreakProb2030 = vulnerable.reduce((s, a) => s + (a.quantum_break_prob_2030 ?? 0), 0) / vulnCount;
    const avgBreakProb2035 = vulnerable.reduce((s, a) => s + (a.quantum_break_prob_2035 ?? 0), 0) / vulnCount;
    const avgHndlDays      = vulnerable.reduce((s, a) => s + a.hndl_exposure_days, 0) / vulnCount;

    // Migration cost: assets × cost per asset (lakhs → crores ÷ 100)
    const migrationCostCr = (vulnCount * costPerAssetL) / 100;

    // Breach risk by 2030: probability × exposed transaction value
    // Exposed value = daily volume × average days of harvested traffic
    const exposedValueCr2030 = avgBreakProb2030 * dailyVolumeCr * avgHndlDays;
    const totalRisk2030Cr    = exposedValueCr2030 * breachRecoveryMult;

    // Breach risk by 2035
    const exposedValueCr2035 = avgBreakProb2035 * dailyVolumeCr * avgHndlDays;
    const totalRisk2035Cr    = exposedValueCr2035 * breachRecoveryMult;

    const roiMultiple2030 = migrationCostCr > 0 ? totalRisk2030Cr / migrationCostCr : 0;
    const roiMultiple2035 = migrationCostCr > 0 ? totalRisk2035Cr / migrationCostCr : 0;

    const savingsIfMigrateNow = totalRisk2030Cr - migrationCostCr;

    return {
      totalAssets, vulnCount,
      avgBreakProb2030, avgBreakProb2035,
      avgHndlDays: Math.round(avgHndlDays),
      migrationCostCr,
      exposedValueCr2030, exposedValueCr2035,
      totalRisk2030Cr, totalRisk2035Cr,
      roiMultiple2030, roiMultiple2035,
      savingsIfMigrateNow,
    };
  }, [report, dailyVolumeCr, costPerAssetL, breachRecoveryMult]);

  if (error) return <div className="text-red-600 p-4">{error}</div>;
  if (!report) return <Loader />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Migration ROI Calculator</h1>
        <p className="text-sm text-gray-500 mt-1">
          Financial case for quantum migration — cost of acting now vs cost of a quantum breach
        </p>
      </div>

      {/* Input sliders */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-5">Configure Parameters</h3>
          <div className="grid grid-cols-3 gap-8">

            <div>
              <label className="text-xs font-medium text-gray-600">
                Daily Transaction Volume
              </label>
              <div className="text-2xl font-bold text-[#8B1A1A] mt-1">₹{dailyVolumeCr.toLocaleString()} Cr</div>
              <input
                type="range" min={50} max={5000} step={50}
                value={dailyVolumeCr}
                onChange={e => setDailyVolumeCr(Number(e.target.value))}
                className="w-full mt-2 accent-[#8B1A1A]"
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                <span>₹50 Cr</span><span>₹5,000 Cr</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600">
                Migration Cost per Asset
              </label>
              <div className="text-2xl font-bold text-[#8B1A1A] mt-1">₹{costPerAssetL} L</div>
              <input
                type="range" min={10} max={500} step={10}
                value={costPerAssetL}
                onChange={e => setCostPerAssetL(Number(e.target.value))}
                className="w-full mt-2 accent-[#8B1A1A]"
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                <span>₹10 L</span><span>₹500 L</span>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600">
                Indirect Cost Multiplier
              </label>
              <div className="text-2xl font-bold text-[#8B1A1A] mt-1">{breachRecoveryMult}×</div>
              <input
                type="range" min={1} max={10} step={0.5}
                value={breachRecoveryMult}
                onChange={e => setBreachRecoveryMult(Number(e.target.value))}
                className="w-full mt-2 accent-[#8B1A1A]"
              />
              <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                <span>1× (direct only)</span><span>10× (reputational)</span>
              </div>
            </div>

          </div>
        </CardContent>
      </Card>

      {calc ? (
        <>
          {/* The big numbers */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="border-2 border-emerald-200">
              <CardContent className="p-6 text-center">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Cost to Migrate Now
                </div>
                <div className="text-4xl font-bold text-emerald-600">
                  {formatCrore(calc.migrationCostCr)}
                </div>
                <div className="text-xs text-gray-400 mt-2">
                  {calc.vulnCount} vulnerable assets × ₹{costPerAssetL}L each
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-red-200">
              <CardContent className="p-6 text-center">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Breach Risk by 2030
                </div>
                <div className="text-4xl font-bold text-red-600">
                  {formatCrore(calc.totalRisk2030Cr)}
                </div>
                <div className="text-xs text-gray-400 mt-2">
                  {(calc.avgBreakProb2030 * 100).toFixed(0)}% probability × {calc.avgHndlDays}d exposure × {breachRecoveryMult}× multiplier
                </div>
              </CardContent>
            </Card>

            <Card className="border-2 border-amber-200">
              <CardContent className="p-6 text-center">
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                  Net Savings if Migrate Now
                </div>
                <div className={`text-4xl font-bold ${calc.savingsIfMigrateNow > 0 ? "text-emerald-600" : "text-red-600"}`}>
                  {formatCrore(Math.abs(calc.savingsIfMigrateNow))}
                </div>
                <div className="text-xs text-gray-400 mt-2">
                  ROI multiple: <span className="font-semibold text-gray-600">{calc.roiMultiple2030.toFixed(1)}×</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Comparison chart */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Cost vs Risk Comparison (₹ Crores)</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={[
                    { name: "Migration Cost (Now)",   value: calc.migrationCostCr },
                    { name: "Breach Risk by 2030",    value: calc.totalRisk2030Cr },
                    { name: "Breach Risk by 2035",    value: calc.totalRisk2035Cr },
                  ]}
                  barSize={60}
                >
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `₹${v.toFixed(0)}Cr`} />
                  <Tooltip formatter={(v) => [formatCrore(Number(v)), "Amount"]} />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    <Cell fill="#10B981" />
                    <Cell fill="#EF4444" />
                    <Cell fill="#F59E0B" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Asset breakdown */}
          <Card>
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Risk Breakdown</h3>
              <div className="grid grid-cols-4 gap-4 text-center">
                {[
                  { label: "Total Assets",        value: calc.totalAssets,                          unit: ""    },
                  { label: "Vulnerable Assets",   value: calc.vulnCount,                            unit: ""    },
                  { label: "Avg HNDL Exposure",   value: calc.avgHndlDays,                          unit: "days"},
                  { label: "Avg Break Prob 2030", value: `${(calc.avgBreakProb2030 * 100).toFixed(0)}`, unit: "%"   },
                ].map(({ label, value, unit }) => (
                  <div key={label} className="bg-gray-50 rounded-lg p-4">
                    <div className="text-2xl font-bold text-gray-900">{value}<span className="text-base text-gray-500 ml-0.5">{unit}</span></div>
                    <div className="text-xs text-gray-500 mt-1">{label}</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recommendation */}
          <Card className="bg-[#1B2A4A]">
            <CardContent className="p-6">
              <h3 className="text-sm font-semibold text-white mb-2">Executive Recommendation</h3>
              <p className="text-white/80 text-sm leading-relaxed">
                Migrating <strong className="text-white">{calc.vulnCount} vulnerable assets</strong> to post-quantum cryptography
                at an estimated cost of <strong className="text-amber-300">{formatCrore(calc.migrationCostCr)}</strong> protects
                against a projected breach risk of <strong className="text-red-300">{formatCrore(calc.totalRisk2030Cr)}</strong> by 2030
                — a <strong className="text-emerald-300">{calc.roiMultiple2030.toFixed(1)}× return on investment</strong>.
                Average HNDL exposure of <strong className="text-white">{calc.avgHndlDays} days</strong> means
                adversaries are already harvesting encrypted traffic today.
                Every day of delay increases the irrecoverable exposure window.
              </p>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="p-10 text-center text-gray-400">
            No scan data available. Run scans from the Discovery page first.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
