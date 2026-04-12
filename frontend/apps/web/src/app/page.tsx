"use client";

import { useEffect, useState } from "react";
import { loadCBOM, type CBOMReport } from "@/lib/data";
import { summarise } from "@/lib/cbom";
import {
  Globe, Server, AlertTriangle, Clock, Search, Plus, Play, Activity as ActivityIcon, MapPin, CheckCircle2, AlertCircle, Shield, Lock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Loader from "@/components/loader";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import ScanTrigger from "@/components/scan-trigger";
import { useRole } from "@/lib/useRole";

function getMockData(domain: string) {
  const hash = domain.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const owners = ["IT", "DevOps", "Infra", "Security", "Network"];
  const locations = ["India", "USA", "Singapore", "Germany"];
  
  return {
    ipv4: `103.109.${hash % 255}.${(hash * 2) % 255}`,
    ipv6: `2001:0db8:85a3:8a2e:${(hash * 100).toString(16)}:abcd`,
    owner: owners[hash % owners.length],
    location: locations[hash % locations.length],
    ttl: [300, 3600, 14400, 86400][hash % 4]
  };
}

const RISK_COLORS = ["#EF4444", "#F97316", "#F59E0B", "#10B981"];
const IP_COLORS = ["#3B82F6", "#8B5CF6"];

export default function HomePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [report, setReport] = useState<CBOMReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { role } = useRole();
  const isViewer = role === "viewer";

  useEffect(() => {
    loadCBOM().then(setReport).catch(e => setError(e.message));
    const handler = setTimeout(() => setDebouncedSearch(searchTerm), 2000);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-600 m-6">
      {error}. Make sure cbom_report.json is in the public folder.
    </div>
  );
  if (!report) return <Loader />;
  // Viewers see only the first 3 assets; analysts/admins see all
  const allFiltered = report.assets.filter(asset =>
    asset.domain.toLowerCase().includes(debouncedSearch.toLowerCase())
  );
  const filteredAssets = isViewer ? allFiltered.slice(0, 3) : allFiltered;
  const s = summarise(report);
  
  const riskData = [
    { name: "Critical", value: report.assets.filter(a => a.qmrs >= 90).length || 1 },
    { name: "High", value: report.assets.filter(a => a.qmrs >= 70 && a.qmrs < 90).length },
    { name: "Medium", value: report.assets.filter(a => a.qmrs >= 40 && a.qmrs < 70).length },
    { name: "Low", value: report.assets.filter(a => a.qmrs < 40).length || 1 },
  ];

  const expiryData = [
    { range: "0-30 Days", count: report.assets.filter(a => a.cert_days_remaining <= 30).length },
    { range: "30-60 Days", count: report.assets.filter(a => a.cert_days_remaining > 30 && a.cert_days_remaining <= 60).length },
    { range: "60-90 Days", count: report.assets.filter(a => a.cert_days_remaining > 60 && a.cert_days_remaining <= 90).length },
    { range: ">90 Days", count: report.assets.filter(a => a.cert_days_remaining > 90).length },
  ];

  const ipData = [
    { name: "IPv4", value: 86 },
    { name: "IPv6", value: 14 },
  ];

  const summaryCards = [
    { label: "Total Assets", value: s.totalAssets, icon: Globe, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Public Web Apps", value: s.publicWebApps, icon: Server, color: "text-indigo-600", bg: "bg-indigo-50" },
    { label: "APIs", value: s.apis, icon: ActivityIcon, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "Servers", value: report.assets.filter(a => a.asset_type === "Server" || !a.asset_type.includes("API")).length, icon: Server, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Expiring Certificates", value: s.expiringCerts, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "High Risk Assets", value: s.highRiskAssets, icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
  ];

  return (
    <div className="space-y-6">
    <ScanTrigger userRole={role} />
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {summaryCards.map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="shadow-sm bg-white border-gray-200">
            <CardContent className="p-4">
              <div className={`w-8 h-8 ${bg} rounded flex items-center justify-center mb-3`}>
                <Icon className={`h-4 w-4 ${color}`} />
              </div>
              <div className="text-2xl font-bold text-gray-900">{value}</div>
              <div className="text-xs font-semibold text-gray-500 mt-1 uppercase tracking-wide">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="shadow-sm bg-white border-gray-200">
          <CardHeader className="pb-2 border-b border-gray-100">
            <CardTitle className="text-sm font-bold text-gray-700">Asset Risk Distribution</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-6">
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={riskData} innerRadius={50} outerRadius={70} paddingAngle={2} dataKey="value">
                    {riskData.map((_, index) => <Cell key={`cell-${index}`} fill={RISK_COLORS[index % RISK_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-2">
              {riskData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: RISK_COLORS[index] }} />
                  <span className="text-xs text-gray-600 font-medium">{entry.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm bg-white border-gray-200">
          <CardHeader className="pb-2 border-b border-gray-100">
            <CardTitle className="text-sm font-bold text-gray-700">Certificate Expiry Timeline</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-6">
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={expiryData} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="range" type="category" axisLine={false} tickLine={false} tick={{fontSize: 11, fill: '#6B7280'}} width={70} />
                  <Tooltip cursor={{fill: '#F3F4F6'}} />
                  <Bar dataKey="count" fill="#8B1A1A" radius={[0, 4, 4, 0]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm bg-white border-gray-200">
          <CardHeader className="pb-2 border-b border-gray-100">
            <CardTitle className="text-sm font-bold text-gray-700">IP Version Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-6">
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={ipData} innerRadius={0} outerRadius={70} dataKey="value">
                    {ipData.map((_, index) => <Cell key={`cell-${index}`} fill={IP_COLORS[index % IP_COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-2">
              {ipData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: IP_COLORS[index] }} />
                  <span className="text-xs text-gray-600 font-medium">{entry.name}: {entry.value}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm bg-white border-gray-200">
          <CardHeader className="pb-2 border-b border-gray-100">
            <CardTitle className="text-sm font-bold text-gray-700">Asset Type Distribution</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-6 space-y-4">
             {[
               { label: "Web Applications", count: s.publicWebApps },
               { label: "APIs", count: s.apis },
               { label: "Servers", count: report.assets.filter(a => a.asset_type === "Server").length },
               { label: "Load Balancers", count: report.assets.filter(a => a.tls_terminator === "F5 BIG-IP" || a.tls_terminator === "AWS ALB").length },
               { label: "Other", count: report.assets.filter(a => a.asset_type === "IPsec-Endpoint" || a.asset_type === "TLS-VPN-Portal").length }
             ].map((item) => (
               <div key={item.label} className="flex items-center justify-between">
                 <span className="text-sm text-gray-600">{item.label}</span>
                 <span className="text-sm font-bold text-gray-900">{item.count}</span>
               </div>
             ))}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm bg-white border-gray-200">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-white rounded-t-xl">
          <h2 className="text-base font-bold text-gray-800">Asset Inventory</h2>
          <div className="flex items-center gap-3">
            {/* <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search..." className="pl-8 h-8 w-[200px] bg-gray-50 border-gray-200 text-xs" />
            </div> */}
          </div>
        </div>
        <CardContent className="p-0">
          <div className="overflow-x-auto max-h-[400px]">
            <table className="w-full text-xs text-left">
              <thead className="sticky top-0 bg-gray-100/90 backdrop-blur text-gray-500 border-b border-gray-200 z-10">
                <tr>
                  {["Asset Name", "URL", "IPv4 Address", "IPv6 Address", "Type", "Owner", "Risk", "Cert Status", "Key Length", "Last Scan"].map(h => (
                    <th key={h} className="px-4 py-3 font-semibold whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAssets.map((asset) => {
                  const mock = getMockData(asset.domain);
                  const isExpiring = asset.cert_days_remaining < 30;
                  const riskLevel = asset.qmrs >= 80 ? "Critical" : asset.qmrs >= 60 ? "High" : asset.qmrs >= 40 ? "Medium" : "Low";
                  const riskColor = asset.qmrs >= 80 ? "text-red-700 bg-red-100 border border-red-200" : asset.qmrs >= 60 ? "text-orange-700 bg-orange-100 border border-orange-200" : asset.qmrs >= 40 ? "text-amber-700 bg-amber-100 border border-amber-200" : "text-emerald-700 bg-emerald-100 border border-emerald-200";

                  return (
                    <tr key={asset.domain} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 font-semibold text-gray-900">{asset.domain}</td>
                      <td className="px-4 py-3 text-blue-600 hover:underline cursor-pointer">https://{asset.domain}</td>
                      <td className="px-4 py-3 text-gray-600 font-mono">{mock.ipv4}</td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-[10px]">{mock.ipv6}</td>
                      <td className="px-4 py-3 text-gray-600">{asset.asset_type}</td>
                      <td className="px-4 py-3 text-gray-600">{mock.owner}</td>
                      <td className="px-4 py-3">
                        {isViewer ? (
                          <span className="text-gray-400 flex items-center gap-1"><Lock className="w-3 h-3" /> Restricted</span>
                        ) : (
                          <span className={`px-2 py-0.5 rounded font-semibold ${riskColor}`}>{riskLevel}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={isExpiring ? "text-amber-600 font-medium flex items-center gap-1" : "text-emerald-600 font-medium flex items-center gap-1"}>
                          {isExpiring ? <><AlertCircle className="w-3.5 h-3.5"/> Expiring</> : <><CheckCircle2 className="w-3.5 h-3.5"/> Valid</>}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {isViewer ? <span className="text-gray-400 flex items-center gap-1"><Lock className="w-3 h-3" /> —</span> : `${asset.key_size}-bit`}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-[10px] whitespace-nowrap">2 hrs ago</td>
                    </tr>
                  );
                })}
                {isViewer && report.assets.length > 3 && (
                  <tr>
                    <td colSpan={10} className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                        <Lock className="w-4 h-4 text-amber-500" />
                        <span>{report.assets.length - 3} more assets hidden. Contact your admin for Analyst access.</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm bg-white border-gray-200">
            <CardHeader className="pb-3 border-b border-gray-100">
              <CardTitle className="text-base font-bold text-gray-800">Nameserver Records</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[300px]">
                <table className="w-full text-xs text-left">
                  <thead className="sticky top-0 bg-gray-100/90 backdrop-blur text-gray-500 border-b border-gray-200 z-10">
                    <tr>
                      {["Hostname", "IP Address", "Type", "Asset", "TTL"].map(h => (
                        <th key={h} className="px-4 py-3 font-semibold whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {report.assets.slice(0, 5).map((asset) => {
                      const mock = getMockData(asset.domain);
                      const isNS = asset.domain.startsWith("www") ? "A" : "NS";
                      return (
                        <tr key={asset.domain + "-ns"} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3 font-medium text-gray-900">ns.{asset.domain}</td>
                          <td className="px-4 py-3 text-gray-600 font-mono">{mock.ipv4}</td>
                          <td className="px-4 py-3 text-gray-600 font-semibold">{isNS}</td>
                          <td className="px-4 py-3 text-blue-600">{asset.domain}</td>
                          <td className="px-4 py-3 text-gray-600">{mock.ttl}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card className="shadow-sm bg-white border-gray-200">
            <CardHeader className="pb-3 border-b border-gray-100">
              <CardTitle className="text-base font-bold text-gray-800">Crypto & Security Overview</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[300px]">
                <table className="w-full text-xs text-left">
                  <thead className="sticky top-0 bg-gray-100/90 backdrop-blur text-gray-500 border-b border-gray-200 z-10">
                    <tr>
                      {["Asset", "Key Length", "Cipher Suite", "TLS", "Certificate Authority"].map(h => (
                        <th key={h} className="px-4 py-3 font-semibold whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {report.assets.slice(0, 5).map((asset) => {
                      return (
                        <tr key={asset.domain + "-crypto"} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3 text-blue-600">{asset.domain}</td>
                          <td className="px-4 py-3 text-gray-600">{asset.key_size}-bit</td>
                          <td className="px-4 py-3 text-gray-600 font-mono text-[10px] truncate max-w-[120px]">{asset.cipher_suite}</td>
                          <td className="px-4 py-3 text-gray-600">{asset.tls_version}</td>
                          <td className="px-4 py-3 text-gray-600 truncate max-w-[100px]">{asset.cert_signature_algorithm}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="shadow-sm bg-white border-gray-200">
          <CardHeader className="pb-3 border-b border-gray-100">
            <CardTitle className="text-sm font-bold text-gray-800">Recent Scans & Activity</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-4">
            <div className="flex gap-3 items-start">
              <div className="w-2 h-2 mt-1.5 rounded-full bg-emerald-500 shrink-0" />
              <div>
                <div className="text-xs font-semibold text-gray-900">Full scan completed: {report.assets.length} assets</div>
                <div className="text-[10px] text-gray-500 mt-0.5">10 min ago</div>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <div className="w-2 h-2 mt-1.5 rounded-full bg-red-500 shrink-0" />
              <div>
                <div className="text-xs font-semibold text-gray-900">Weak cipher detected: vpn.pnb.bank.in</div>
                <div className="text-[10px] text-gray-500 mt-0.5">1 hr ago</div>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <div className="w-2 h-2 mt-1.5 rounded-full bg-blue-500 shrink-0" />
              <div>
                <div className="text-xs font-semibold text-gray-900">New asset discovered: dev-api.pnb.bank.in</div>
                <div className="text-[10px] text-gray-500 mt-0.5">3 hrs ago</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm bg-white border-gray-200">
          <CardHeader className="pb-3 border-b border-gray-100">
            <CardTitle className="text-sm font-bold text-gray-800">Geographic Asset Distribution</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="space-y-3">
              {["India", "USA", "Singapore", "Germany"].map((loc, idx) => (
                 <div key={loc} className="flex items-center justify-between">
                   <div className="flex items-center gap-2">
                     <MapPin className="w-3 h-3 text-gray-400" />
                     <span className="text-xs font-medium text-gray-700">{loc}</span>
                   </div>
                   <span className="text-xs font-bold text-gray-900">{Math.max(1, report.assets.length - (idx * 2))}</span>
                 </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}