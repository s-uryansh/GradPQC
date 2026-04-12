"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import Loader from "@/components/loader";
import { AlertCircle, Trophy, ShieldCheck, Activity } from "lucide-react";
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

// Color Utility Functions
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
    case "Elite-PQC": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    case "Standard":  return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    case "Legacy":    return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    default:          return "bg-red-500/20 text-red-400 border-red-500/30";
  }
};

const runwayBg = (s: string) => {
  switch (s) {
    case "Green": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    case "Amber": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    default:      return "bg-red-500/20 text-red-400 border-red-500/30";
  }
};

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  show: { 
    opacity: 1, 
    y: 0, 
    scale: 1, 
    transition: { type: "spring", stiffness: 260, damping: 20 } 
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

  // Antigravity Loading State
  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[70vh] gap-6">
      <motion.div 
        animate={{ rotate: 360, scale: [1, 1.1, 1] }} 
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="w-16 h-16 border-t-4 border-[#8B1A1A] border-r-4 border-transparent rounded-full"
      />
      <motion.div 
        animate={{ opacity: [0.5, 1, 0.5] }} 
        transition={{ duration: 1.5, repeat: Infinity }}
        className="text-sm font-semibold tracking-widest uppercase text-gray-500"
      >
        Running Concurrent TLS Handshakes Across Indian Banking Sector...
      </motion.div>
    </div>
  );

  if (error) return (
    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex justify-center mt-20">
      <div className="bg-red-500/10 border border-red-500/50 text-red-600 px-6 py-4 rounded-xl backdrop-blur-md flex items-center gap-3 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
        <AlertCircle className="w-5 h-5" />
        <p className="font-semibold">Benchmarking Error: {error}</p>
      </div>
    </motion.div>
  );

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

  const isLeading = (pnb?.enterprise_score ?? 0) >= industryAvgScore;

  return (
    <motion.div 
      variants={containerVariants} 
      initial="hidden" 
      animate="show" 
      className="space-y-6 max-w-7xl mx-auto"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <Trophy className="w-8 h-8 text-[#8B1A1A]" />
            Competitor Quantum Benchmarking
          </h1>
          <p className="text-sm text-gray-500 mt-1 font-medium">
            Live TLS scan comparison across the Indian banking sector · {scanned.length} institutions verified
          </p>
        </div>
      </motion.div>

      {/* Summary Cards with Glassmorphism */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <motion.div variants={itemVariants}>
          <Card className="relative overflow-hidden border border-gray-200 bg-white/80 backdrop-blur-xl shadow-lg hover:shadow-xl transition-shadow">
            {/* Subtle Burn Glow for PNB Card */}
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-[#8B1A1A]/10 blur-3xl rounded-full pointer-events-none" />
            <CardContent className="p-6">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#8B1A1A]" /> PNB Enterprise Score
              </div>
              <div className="text-5xl font-black mt-2" style={{ color: tierColor(pnb?.cyber_tier ?? "") }}>
                {pnb?.enterprise_score ?? "—"}
              </div>
              <div className={`inline-block mt-3 px-3 py-1 border rounded-md text-[10px] font-bold uppercase tracking-wider ${tierBg(pnb?.cyber_tier ?? "")}`}>
                {pnb?.cyber_tier ?? "—"}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="border border-gray-200 bg-white/80 backdrop-blur-xl shadow-lg">
            <CardContent className="p-6">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-2">
                <Activity className="w-4 h-4 text-blue-500" /> Industry Average
              </div>
              <div className="text-5xl font-black text-gray-800 mt-2">{industryAvgScore}</div>
              <div className="text-xs font-semibold text-gray-400 mt-3 uppercase tracking-wider">Across {scanned.length} Banks</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="border border-gray-200 bg-white/80 backdrop-blur-xl shadow-lg">
            <CardContent className="p-6">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-500" /> Industry Rank
              </div>
              <div className="text-5xl font-black text-gray-800 mt-2">
                #{pnbRank} <span className="text-2xl text-gray-400 font-medium">/ {scanned.length}</span>
              </div>
              <div className="text-xs font-semibold text-gray-400 mt-3 uppercase tracking-wider">By Readiness Score</div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className={`border backdrop-blur-xl shadow-lg relative overflow-hidden ${isLeading ? 'border-emerald-200 bg-emerald-50/50' : 'border-red-200 bg-red-50/50'}`}>
            <div className={`absolute -bottom-10 -left-10 w-32 h-32 blur-3xl rounded-full pointer-events-none ${isLeading ? 'bg-emerald-500/20' : 'bg-red-500/20'}`} />
            <CardContent className="p-6 relative z-10">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">PNB vs Industry</div>
              <div className={`text-5xl font-black mt-2 ${isLeading ? "text-emerald-600" : "text-red-600"}`}>
                {isLeading ? "+" : ""}
                {(pnb?.enterprise_score ?? 0) - industryAvgScore}
              </div>
              <div className="text-xs font-bold text-gray-500 mt-3 uppercase tracking-wider">
                {isLeading ? "Above Average" : "Below Average"}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Score Bar Chart */}
      <motion.div variants={itemVariants}>
        <Card className="border border-gray-200 bg-white shadow-xl rounded-2xl overflow-hidden">
          <CardContent className="p-8">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest mb-6">Enterprise Quantum Readiness Ranking</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData} barSize={56} margin={{ top: 20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 600, fill: "#4B5563" }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 1000]} tick={{ fontSize: 12, fill: "#9CA3AF" }} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: "#F3F4F6" }} 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}
                  formatter={(v) => [`${v} / 1000`, "Score"]} 
                />
                <ReferenceLine 
                  y={industryAvgScore} 
                  stroke="#9CA3AF" 
                  strokeDasharray="5 5"
                  label={{ value: `INDUSTRY AVG: ${industryAvgScore}`, position: "insideTopLeft", fontSize: 10, fill: "#6B7280", fontWeight: "bold" }} 
                />
                <Bar dataKey="score" radius={[8, 8, 0, 0]}>
                  <LabelList dataKey="score" position="top" style={{ fontSize: 13, fontWeight: 800, fill: "#374151" }} />
                  {chartData.map((entry, i) => (
                    <Cell
                      key={i}
                      fill={entry.name === "PNB" ? "#8B1A1A" : tierColor(entry.tier)}
                      opacity={entry.name === "PNB" ? 1 : 0.6}
                      className="transition-all duration-300 hover:opacity-100"
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>

      {/* Detailed Monte Carlo Comparison Table */}
      <motion.div variants={itemVariants}>
        <Card className="border border-gray-200 bg-white shadow-xl rounded-2xl overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
            <h3 className="text-sm font-bold text-gray-800 uppercase tracking-widest">Monte Carlo Breach Probability Matrix</h3>
          </div>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#8B1A1A] text-white">
                  <tr>
                    {["Institution", "Q-Score", "Cyber Tier", "TLS Stack", "Key Exchange", "P(Breach '30)", "P(Breach '35)", "Runway", "PQC Status"].map(h => (
                      <th key={h} className="px-6 py-4 text-xs font-bold uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {[...scanned]
                    .sort((a, b) => b.enterprise_score - a.enterprise_score)
                    .map((bank) => {
                      const isPNB = bank.bank_name === "PNB";
                      return (
                        <tr
                          key={bank.bank_name}
                          className={`transition-colors ${isPNB ? "bg-[#8B1A1A]/5 hover:bg-[#8B1A1A]/10" : "bg-white hover:bg-gray-50"}`}
                        >
                          <td className="px-6 py-4 font-black text-gray-900 whitespace-nowrap">
                            {isPNB && <span className="mr-2 text-[10px] bg-[#8B1A1A] text-white px-2 py-1 rounded-md tracking-wider">OURS</span>}
                            {bank.bank_name}
                          </td>
                          <td className="px-6 py-4 font-black text-lg" style={{ color: tierColor(bank.cyber_tier) }}>
                            {bank.enterprise_score}
                          </td>
                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 border rounded-md text-[10px] font-bold uppercase tracking-wider ${tierBg(bank.cyber_tier)}`}>
                              {bank.cyber_tier}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs font-semibold text-gray-600">{bank.tls_version}</td>
                          <td className="px-6 py-4 text-xs font-mono text-gray-500 bg-gray-50 rounded p-1">{bank.key_exchange}</td>
                          
                          {/* Monte Carlo Results */}
                          <td className="px-6 py-4">
                            <span className={`font-black text-sm ${bank.quantum_break_prob_2030 > 0.5 ? "text-red-600" : "text-amber-500"}`}>
                              {(bank.quantum_break_prob_2030 * 100).toFixed(1)}%
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`font-black text-sm ${bank.quantum_break_prob_2035 > 0.7 ? "text-red-600" : "text-amber-500"}`}>
                              {(bank.quantum_break_prob_2035 * 100).toFixed(1)}%
                            </span>
                          </td>

                          <td className="px-6 py-4">
                            <span className={`px-2.5 py-1 border rounded-md text-[10px] font-bold uppercase tracking-wider ${runwayBg(bank.runway_status)}`}>
                              {bank.runway_status}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            {bank.pqc_ready
                              ? <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"><ShieldCheck className="w-3 h-3"/> Ready</span>
                              : <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-600 border border-red-500/20"><AlertCircle className="w-3 h-3"/> Vulnerable</span>}
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
            
            {/* Show any banks that failed to scan */}
            {report.banks.filter(b => !b.scanned).length > 0 && (
              <div className="bg-gray-50 p-4 border-t border-gray-100">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Unreachable Endpoints</p>
                {report.banks.filter(b => !b.scanned).map(b => (
                  <div key={b.bank_name} className="text-xs text-red-500 font-medium">
                    {b.bank_name} ({b.domain}) — Connection timed out or blocked
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <motion.p variants={itemVariants} className="text-xs font-semibold text-gray-400 text-right uppercase tracking-wider pb-10">
        Data derived from public TLS metadata · Cached to prevent rate-limiting · {report.generated_at}
      </motion.p>
    </motion.div>
  );
}