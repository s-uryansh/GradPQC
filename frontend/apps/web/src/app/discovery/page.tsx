"use client";

import { useEffect, useState } from "react";
import { loadCBOM, type CBOMReport } from "@/lib/data";
import { Card, CardContent } from "@/components/ui/card";
import Loader from "@/components/loader";

export default function DiscoveryPage() {
  const [report, setReport] = useState<CBOMReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"domains" | "ssl" | "ips">("domains");

  useEffect(() => {
    loadCBOM().then(setReport).catch(e => setError(e.message));
  }, []);

  if (error) return <div className="text-red-600 p-4">{error}</div>;
  if (!report) return <Loader />;

  const tabs = [
    { key: "domains", label: `Domains (${report.total_assets})` },
    { key: "ssl",     label: `SSL (${report.total_assets})`     },
    { key: "ips",     label: "IP Address/Subnets"               },
  ] as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Asset Discovery</h1>
        <p className="text-sm text-gray-500 mt-1">
          Discovered public-facing assets and their cryptographic details
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {tabs.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              tab === key
                ? "bg-[#8B1A1A] text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "domains" && (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#8B1A1A]">
                  {["Detection Date", "Domain Name", "TLS Version", "Cert Expiry", "Status"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-white">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.assets.map((asset, i) => (
                  <tr key={asset.domain} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-4 py-3 text-gray-600">{report.generated_at.split("T")[0]}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{asset.domain}</td>
                    <td className="px-4 py-3 text-gray-600">{asset.tls_version}</td>
                    <td className="px-4 py-3 text-gray-600">{asset.cert_expiry}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-700">
                        Confirmed
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {tab === "ssl" && (
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#8B1A1A]">
                  {["Detection Date", "Common Name", "Issuer", "Valid From", "Valid To", "Key Size"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-white">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {report.assets.map((asset, i) => (
                  <tr key={asset.domain} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="px-4 py-3 text-gray-600">{report.generated_at.split("T")[0]}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{asset.domain}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{asset.cert_signature_algorithm}</td>
                    <td className="px-4 py-3 text-gray-600">{asset.cert_issue_date}</td>
                    <td className="px-4 py-3 text-gray-600">{asset.cert_expiry}</td>
                    <td className="px-4 py-3 text-gray-600">{asset.key_size}-bit</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {tab === "ips" && (
        <Card>
          <CardContent className="p-6 text-center text-gray-500">
            <p className="text-sm">
              IP address and subnet data is derived from live DNS resolution during scanning.
              Run the Go scanner to populate this data.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}