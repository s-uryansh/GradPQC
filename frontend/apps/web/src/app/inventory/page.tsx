"use client";

import { useEffect, useState, useMemo } from "react";
import { loadCBOM, type CBOMReport, runwayBg, type Asset } from "@/lib/data";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Loader from "@/components/loader";
import { Search, ArrowUpDown, Filter, AlertTriangle } from "lucide-react";

type SortConfig = { key: keyof Asset; direction: "asc" | "desc" } | null;

export default function InventoryPage() {
  const [report, setReport] = useState<CBOMReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const [searchInput, setSearchInput] = useState("");
  const [activeSearch, setActiveSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [sortConfig, setSortConfig] = useState<SortConfig>(null);

  useEffect(() => {
    loadCBOM().then(setReport).catch(e => setError(e.message));
  }, []);

  const handleSort = (key: keyof Asset) => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const filteredAssets = useMemo(() => {
    if (!report) return [];
    
    let docs = [...report.assets];

    if (activeSearch) {
      docs = docs.filter(a => a.domain.toLowerCase().includes(activeSearch.toLowerCase()));
    }

    if (statusFilter === "Shadow IT") {
      docs = docs.filter(a => a.shadow_it);
    } else if (statusFilter !== "All") {
      docs = docs.filter(a => a.runway_status === statusFilter);
    }

    if (sortConfig) {
      docs.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return docs;
  }, [report, activeSearch, statusFilter, sortConfig]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      setActiveSearch(searchInput);
    }
  };

  if (error) return <div className="text-red-600 p-4">{error}</div>;
  if (!report) return <Loader />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Asset Inventory</h1>
          <p className="text-sm text-gray-500 mt-1">
            Managing {filteredAssets.length} cryptographic targets
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Status Filter Dropdown */}
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded px-3 h-9">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <select 
              className="text-xs bg-transparent outline-none font-medium text-gray-700 cursor-pointer"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="All">All Statuses</option>
              <option value="Red">Red (Critical)</option>
              <option value="Amber">Amber (Warning)</option>
              <option value="Green">Green (Safe)</option>
              <option value="Shadow IT">Shadow IT</option>
            </select>
          </div>

          {/* Search Bar with Enter Key logic */}
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-[#8B1A1A]" />
            <Input 
              placeholder="Search domain & press Enter..." 
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-9 h-9 w-[300px] bg-white border-gray-200 text-xs focus:ring-1 focus:ring-[#8B1A1A]" 
            />
            <Button 
              size="sm" 
              onClick={() => setActiveSearch(searchInput)}
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 text-[10px] bg-gray-100 hover:bg-gray-200 text-gray-700 border-none"
            >
              Search
            </Button>
          </div>
        </div>
      </div>

      <Card className="border-gray-200 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-[#8B1A1A] text-white">
                  {[
                    { label: "Asset Name", key: "domain" },
                    { label: "Type", key: "asset_type" },
                    { label: "TLS", key: "tls_version" },
                    { label: "Cipher Suite", key: "cipher_suite" },
                    { label: "Key Size", key: "key_size" },
                    { label: "QMRS", key: "qmrs" },
                    { label: "Runway", key: "runway_status" },
                    { label: "Shadow IT", key: "shadow_it" },
                  ].map((head) => (
                    <th 
                      key={head.key} 
                      onClick={() => handleSort(head.key as keyof Asset)}
                      className="px-4 py-3 text-xs font-semibold cursor-pointer hover:bg-[#6B1414] transition-colors whitespace-nowrap"
                    >
                      <div className="flex items-center gap-2">
                        {head.label}
                        <ArrowUpDown className="w-3 h-3 opacity-50" />
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAssets.length > 0 ? (
                  filteredAssets.map((asset, i) => (
                    <tr key={asset.domain} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/50"}>
                      <td className="px-4 py-3 font-medium text-gray-900">{asset.domain}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{asset.asset_type}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{asset.tls_version}</td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-[10px] truncate max-w-[150px]">{asset.cipher_suite}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{asset.key_size}-bit</td>
                      <td className="px-4 py-3 font-bold text-gray-900">{asset.qmrs.toFixed(0)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${runwayBg(asset.runway_status)}`}>
                          {asset.runway_status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {asset.shadow_it ? (
                          <div className="flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                            <div>
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700">
                                SHADOW IT
                              </span>
                              {asset.shadow_it_confidence > 0 && (
                                <div className="text-[9px] text-gray-400 mt-0.5">
                                  {Math.round((asset.shadow_it_confidence ?? 0) * 100)}% confidence
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-gray-400 italic">
                      No assets match your search or filter criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}