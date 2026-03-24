import type { Asset, CBOMReport } from "./data";


export type CyberTier = "Elite-PQC" | "Standard" | "Legacy" | "Critical";

export function assetCyberScore(asset: Asset): number {
  return Math.round(100 - asset.qmrs);
}

export function enterpriseCyberScore(assets: Asset[]): number {
  if (assets.length === 0) return 0;
  const avg = assets.reduce((sum, a) => sum + assetCyberScore(a), 0) / assets.length;
  return Math.round(avg * 10);
}

export function cyberTier(score: number): CyberTier {
  if (score >= 700) return "Elite-PQC";
  if (score >= 400) return "Standard";
  if (score >= 100) return "Legacy";
  return "Critical";
}

export function tierColor(tier: CyberTier): string {
  switch (tier) {
    case "Elite-PQC": return "text-emerald-600";
    case "Standard":  return "text-amber-500";
    case "Legacy":    return "text-orange-500";
    case "Critical":  return "text-red-600";
  }
}

export function tierBg(tier: CyberTier): string {
  switch (tier) {
    case "Elite-PQC": return "bg-emerald-100 text-emerald-700";
    case "Standard":  return "bg-amber-100 text-amber-700";
    case "Legacy":    return "bg-orange-100 text-orange-700";
    case "Critical":  return "bg-red-100 text-red-700";
  }
}


export type PQCGrade = "Elite" | "Critical" | "Standard";

export function pqcGrade(asset: Asset): PQCGrade {
  if (asset.quantum_status === "PQC-Ready") return "Elite";
  if (asset.runway_status === "Red" || asset.rbi_compliance === "Violation") return "Critical";
  return "Standard";
}


export interface CBOMSummary {
  totalAssets: number;
  publicWebApps: number;
  apis: number;
  vpnEndpoints: number;
  expiringCerts: number;  
  highRiskAssets: number; 
  redRunway: number;
  amberRunway: number;
  pfsBroken: number;
  rbiViolations: number;
  pqcReady: number;
  notPqcReady: number;
}

export function summarise(report: CBOMReport): CBOMSummary {
  const assets = report.assets;
  return {
    totalAssets:    assets.length,
    publicWebApps:  assets.filter(a => a.asset_type === "Web").length,
    apis:           assets.filter(a => a.asset_type === "API").length,
    vpnEndpoints:   assets.filter(a => a.asset_type.includes("VPN")).length,
    expiringCerts:  assets.filter(a => a.cert_days_remaining < 90).length,
    highRiskAssets: assets.filter(a => a.qmrs >= 80).length,
    redRunway:      assets.filter(a => a.runway_status === "Red").length,
    amberRunway:    assets.filter(a => a.runway_status === "Amber").length,
    pfsBroken:      assets.filter(a => a.pfs_advertised && !a.pfs_actual).length,
    rbiViolations:  assets.filter(a => a.rbi_compliance === "Violation").length,
    pqcReady:       assets.filter(a => a.quantum_status === "PQC-Ready").length,
    notPqcReady:    assets.filter(a => a.quantum_status !== "PQC-Ready").length,
  };
}


export function cipherUsage(assets: Asset[]): { name: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const a of assets) {
    counts[a.cipher_suite] = (counts[a.cipher_suite] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}


export function keyLengthDistribution(assets: Asset[]): { size: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const a of assets) {
    const key = `${a.key_size}`;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([size, count]) => ({ size, count }))
    .sort((a, b) => Number(b.size) - Number(a.size));
}


export function tlsDistribution(assets: Asset[]): { version: string; count: number }[] {
  const counts: Record<string, number> = {};
  for (const a of assets) {
    counts[a.tls_version] = (counts[a.tls_version] ?? 0) + 1;
  }
  return Object.entries(counts).map(([version, count]) => ({ version, count }));
}