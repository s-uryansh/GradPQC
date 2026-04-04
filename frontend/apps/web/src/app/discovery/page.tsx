"use client";

import { useEffect, useState } from "react";
import { loadCBOM, type CBOMReport } from "@/lib/data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import Loader from "@/components/loader";
import { Search, Globe, Play, Loader2, CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

export default function DiscoveryPage() {
  const [rootDomain, setRootDomain] = useState("");
  const [discovered, setDiscovered] = useState<string[]>([]);
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [isListExpanded, setIsListExpanded] = useState(true);

  async function handleDiscover(e: React.FormEvent) {
    e.preventDefault();
    if (!rootDomain) return;
    setIsDiscovering(true);
    setDiscovered([]);
    
    try {
      const res = await fetch(`http://localhost:8080/api/discover?domain=${rootDomain}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Discovery failed");
      
      setDiscovered(data.subdomains || []);
      setSelectedDomains(data.subdomains || []); // Default select all
      setIsListExpanded(true);
      toast.success(`Found ${data.count} subdomains for ${rootDomain}`);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsDiscovering(false);
    }
  }

  async function handleBulkScan() {
    if (selectedDomains.length === 0) return;
    setIsScanning(true);
    setScanProgress(0);

    for (let i = 0; i < selectedDomains.length; i++) {
      const domain = selectedDomains[i];
      try {
        await fetch("http://localhost:8080/api/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domain }),
        });
      } catch (err) {
        console.error(`Failed: ${domain}`);
      }
      setScanProgress(i + 1);
    }

    setIsScanning(false);
    toast.success("Bulk scan complete. Inventory updated.");
    setTimeout(() => window.location.href = "/", 1500);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Asset Discovery</h1>
        <p className="text-sm text-gray-500 mt-1">Search for root domains to uncover hidden infrastructure and subdomains.</p>
      </div>

      <Card className="border-gray-200">
        <CardContent className="p-6">
          <form onSubmit={handleDiscover} className="flex items-end gap-4">
            <div className="flex-1 space-y-1.5">
              <label className="text-xs font-semibold text-gray-700 uppercase">Root Domain</label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  placeholder="e.g., pnb.bank.in" 
                  value={rootDomain}
                  onChange={(e) => setRootDomain(e.target.value)}
                  className="pl-9 h-10 border-gray-300 focus:border-[#8B1A1A]"
                  disabled={isDiscovering || isScanning}
                />
              </div>
            </div>
            <Button type="submit" disabled={isDiscovering || isScanning || !rootDomain} className="h-10 bg-[#8B1A1A] hover:bg-[#6B1414] text-white px-8">
              {isDiscovering ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Search className="h-4 w-4 mr-2" />}
              {isDiscovering ? "Discovering..." : "Discover Subdomains"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {discovered.length > 0 && (
        <Card className="border-gray-200 overflow-hidden">
          <CardHeader 
            className="bg-gray-50 border-b border-gray-200 flex flex-row items-center justify-between py-3 cursor-pointer select-none"
            onClick={() => setIsListExpanded(!isListExpanded)}
          >
            <div className="flex items-center gap-4">
              {isListExpanded ? <ChevronUp className="h-4 w-4 text-gray-500" /> : <ChevronDown className="h-4 w-4 text-gray-500" />}
              <CardTitle className="text-sm font-bold text-gray-800">
                Discovered Assets ({discovered.length})
              </CardTitle>
              <div className="text-xs font-medium px-2 py-0.5 bg-amber-100 text-amber-700 rounded">
                Selected: {selectedDomains.length}
              </div>
            </div>
            
            <div onClick={(e) => e.stopPropagation()}>
              <Button 
                onClick={handleBulkScan} 
                disabled={isScanning || selectedDomains.length === 0}
                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {isScanning ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Play className="h-3 w-3 mr-2" />}
                {isScanning ? `Adding (${scanProgress}/${selectedDomains.length})` : "Add Selected to Inventory"}
              </Button>
            </div>
          </CardHeader>
          
          {isListExpanded && (
            <CardContent className="p-0">
              <div className="overflow-x-auto max-h-[400px]">
                <table className="w-full text-xs text-left">
                  <thead className="sticky top-0 bg-white border-b border-gray-200 z-10 text-gray-500">
                    <tr>
                      <th className="px-6 py-3 w-10">
                        <Checkbox 
                          checked={selectedDomains.length === discovered.length}
                          onCheckedChange={(checked) => setSelectedDomains(checked ? discovered : [])}
                        />
                      </th>
                      <th className="px-6 py-3 font-semibold uppercase tracking-wider">Subdomain</th>
                      <th className="px-6 py-3 font-semibold uppercase tracking-wider text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {discovered.map((domain, idx) => (
                      <tr key={domain} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-6 py-3">
                          <Checkbox 
                            checked={selectedDomains.includes(domain)}
                            onCheckedChange={() => {
                              setSelectedDomains(prev => 
                                prev.includes(domain) ? prev.filter(d => d !== domain) : [...prev, domain]
                              );
                            }}
                          />
                        </td>
                        <td className="px-6 py-3 font-mono font-medium text-gray-900">{domain}</td>
                        <td className="px-6 py-3 text-right">
                          {isScanning && selectedDomains.indexOf(domain) < scanProgress ? (
                            <span className="inline-flex items-center text-emerald-600 font-bold">
                              <CheckCircle2 className="h-3 w-3 mr-1" /> Added
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">Ready</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}