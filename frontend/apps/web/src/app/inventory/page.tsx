"use client";

import { useEffect, useState } from "react";
import { loadCBOM, type CBOMReport, runwayBg } from "@/lib/data";
import { Card, CardContent } from "@/components/ui/card";
import Loader from "@/components/loader";

export default function InventoryPage() {
  const [report, setReport] = useState<CBOMReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCBOM().then(setReport).catch(e => setError(e.message));
  }, []);

  if (error) return <div className="text-red-600 p-4">{error}</div>;
  if (!report) return <Loader />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Asset Inventory</h1>
        <p className="text-sm text-gray-500 mt-1">
          All public-facing assets with cryptographic details
        </p>
      </div>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#8B1A1A]">
                  {["Asset Name", "URL", "Type", "TLS", "Cipher Suite", "Key Size", "Cert Expiry", "QMRS", "Runway"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-white whitespace-nowrap">
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
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs truncate max-w-xs">{asset.cipher_suite}</td>
                    <td className="px-4 py-3 text-gray-600">{asset.key_size}-bit</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      {asset.cert_expiry}
                      <div className="text-xs text-gray-400">{asset.cert_days_remaining}d left</div>
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-900">{asset.qmrs.toFixed(0)}</td>
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
    </div>
  );
}