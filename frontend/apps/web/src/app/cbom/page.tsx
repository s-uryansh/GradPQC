"use client";

import { useEffect, useState } from "react";
import { loadCBOM, type CBOMReport, runwayBg, rbiColor, pfsBadge, agilityBadge } from "@/lib/data";
import { cipherUsage, keyLengthDistribution, tlsDistribution } from "@/lib/cbom";
import { Card, CardContent } from "@/components/ui/card";
import Loader from "@/components/loader";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";

const COLORS = ["#8B1A1A", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6"];

export default function CBOMPage() {
  const [report, setReport] = useState<CBOMReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCBOM().then(setReport).catch(e => setError(e.message));
  }, []);

  if (error) return <div className="text-red-600 p-4">{error}</div>;
  if (!report) return <Loader />;

  const ciphers = cipherUsage(report.assets);
  const keyLengths = keyLengthDistribution(report.assets);
  const tlsVersions = tlsDistribution(report.assets);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Cryptographic Bill of Materials</h1>
        <p className="text-sm text-gray-500 mt-1">
          {report.total_assets} assets · Generated {report.generated_at}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Applications", value: report.total_assets },
          { label: "Active Certificates", value: report.assets.filter(a => a.cert_days_remaining > 0).length },
          { label: "Weak Cryptography", value: report.assets.filter(a => a.qmrs >= 70).length },
          { label: "Certificate Issues", value: report.assets.filter(a => a.cert_days_remaining < 90).length },
        ].map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-gray-900">{value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{label}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Key Length Distribution</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={keyLengths}>
                <XAxis dataKey="size" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#8B1A1A" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Cipher Usage</h3>
            <div className="space-y-2">
              {ciphers.slice(0, 5).map(({ name, count }) => (
                <div key={name}>
                  <div className="flex justify-between text-xs text-gray-600 mb-0.5">
                    <span className="truncate max-w-[80%] font-mono">{name}</span>
                    <span className="font-bold">{count}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full">
                    <div
                      className="h-full bg-[#8B1A1A] rounded-full"
                      style={{ width: `${(count / report.total_assets) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Encryption Protocols</h3>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={tlsVersions}
                  dataKey="count"
                  nameKey="version"
                  cx="50%"
                  cy="50%"
                  outerRadius={70}
                  label={({ version, percent }) =>
                    `${version} ${((percent ?? 0) * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {tlsVersions.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* CBOM Table */}
      <Card>
        <CardContent className="p-0">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">Certificate Authorities</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-[#8B1A1A]">
                  {[
                    "Domain", "Type", "TLS", "Key Exchange", "Cert Algorithm",
                    "Key Size", "PFS", "Cert Expiry", "HNDL Days",
                    "Terminator", "Agility", "QMRS", "RBI", "Runway", "Recommended"
                  ].map(h => (
                    <th key={h} className="px-3 py-3 text-left font-medium text-white whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.assets.map((asset, i) => {
                  const pfs = pfsBadge(asset.pfs_advertised, asset.pfs_actual);
                  return (
                    <tr key={asset.domain} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                      <td className="px-3 py-2.5 font-medium text-gray-900 whitespace-nowrap">{asset.domain}</td>
                      <td className="px-3 py-2.5 text-gray-600">{asset.asset_type}</td>
                      <td className="px-3 py-2.5 text-gray-600">{asset.tls_version}</td>
                      <td className="px-3 py-2.5 text-gray-600 font-mono">{asset.key_exchange}</td>
                      <td className="px-3 py-2.5 text-gray-600 font-mono">{asset.cert_signature_algorithm}</td>
                      <td className="px-3 py-2.5 text-gray-600">{asset.key_size}-bit</td>
                      <td className="px-3 py-2.5">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${pfs.className}`}>
                          {pfs.label}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">
                        {asset.cert_expiry}
                        <div className="text-gray-400">{asset.cert_days_remaining}d left</div>
                      </td>
                      <td className="px-3 py-2.5 text-gray-600">{asset.hndl_exposure_days}d</td>
                      <td className="px-3 py-2.5 text-gray-600">{asset.tls_terminator}</td>
                      <td className="px-3 py-2.5">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${agilityBadge(asset.crypto_agility_rating)}`}>
                          {asset.crypto_agility_rating || "N/A"}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-bold text-gray-900">{asset.qmrs.toFixed(0)}</td>
                      <td className="px-3 py-2.5">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${rbiColor(asset.rbi_compliance)}`}>
                          {asset.rbi_compliance}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${runwayBg(asset.runway_status)}`}>
                          {asset.runway_status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-gray-600 text-xs max-w-[160px] truncate">
                        {asset.recommended_algorithm}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}