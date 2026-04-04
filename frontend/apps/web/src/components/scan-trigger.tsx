"use client";

import { useState, useRef } from "react";
import { Search, Loader2, Upload, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ScanTrigger({ userRole }: { userRole: string }) {
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, domain: "" });
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (userRole === "viewer") return null;

  async function handleSingleScan(e: React.FormEvent) {
    e.preventDefault();
    if (!domain.trim()) return;
    await executeScans([domain.trim()]);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      // Split by newlines or commas, trim whitespace, and remove empty lines
      const domains = text.split(/[\n,]+/).map(d => d.trim()).filter(Boolean);
      
      if (domains.length > 0) {
        await executeScans(domains);
      } else {
        setMessage({ text: "No valid domains found in the uploaded file.", type: "error" });
      }
    };
    reader.readAsText(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  async function executeScans(targets: string[]) {
    setLoading(true);
    setMessage(null);
    let successCount = 0;

    for (let i = 0; i < targets.length; i++) {
      const currentDomain = targets[i];
      setProgress({ current: i + 1, total: targets.length, domain: currentDomain });
      
      try {
        const res = await fetch("http://localhost:8080/api/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ domain: currentDomain }),
        });

        if (res.ok) successCount++;
      } catch (err: any) {
        console.error(`Failed to scan ${currentDomain}`, err);
      }
    }

    setMessage({ 
      text: `Successfully scanned ${successCount}/${targets.length} assets. Refreshing data...`, 
      type: "success" 
    });
    setDomain("");
    setLoading(false);
    
    setTimeout(() => window.location.reload(), 1500);
  }

  return (
    <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200 mb-6 relative">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 text-sm">Asset Scanning Engine</h3>
          <p className="text-xs text-gray-500">Privilege: {userRole.toUpperCase()} | Scan a single asset or upload a CSV/TXT inventory file.</p>
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        {/* Single Scan Form */}
        <form onSubmit={handleSingleScan} className="flex items-center gap-3 flex-1">
          <Input 
            placeholder="e.g., ibapi.pnb.bank.in" 
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="h-9 w-full"
            disabled={loading}
          />
          <Button 
            type="submit" 
            disabled={loading || !domain.trim()} 
            className="h-9 bg-[#8B1A1A] hover:bg-[#6B1414] text-white whitespace-nowrap"
          >
            <Search className="h-4 w-4 mr-2" />
            Scan Single
          </Button>
        </form>

        <div className="h-8 w-px bg-gray-200 shrink-0" />

        <div className="shrink-0">
          <input 
            type="file" 
            accept=".txt,.csv" 
            className="hidden" 
            ref={fileInputRef}
            onChange={handleFileUpload}
            disabled={loading}
          />
          <Button 
            type="button"
            variant="outline"
            disabled={loading}
            onClick={() => fileInputRef.current?.click()}
            className="h-9 border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            {loading && progress.total > 1 ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Upload className="h-4 w-4 mr-2 text-[#8B1A1A]" />
            )}
            {loading && progress.total > 1 ? `Scanning (${progress.current}/${progress.total})` : "Upload CSV / TXT"}
          </Button>
        </div>
      </div>
      
      {loading && progress.total > 1 && (
        <div className="mt-4 text-xs font-medium text-amber-600 flex items-center bg-amber-50 py-2 px-3 rounded-md border border-amber-100 w-fit">
          <Loader2 className="h-3.5 w-3.5 animate-spin mr-2" />
          Processing target: <span className="font-mono text-gray-800 ml-1.5">{progress.domain}</span>
        </div>
      )}
      
      {message && (
        <div className={`mt-4 px-4 py-2 rounded text-sm font-medium w-fit ${message.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"}`}>
          {message.text}
        </div>
      )}
    </div>
  );
}