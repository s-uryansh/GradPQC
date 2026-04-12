import { z } from "zod";


export const AssetSchema = z.object({
  domain: z.string(),
  asset_type: z.string(),
  tls_version: z.string(),
  cipher_suite: z.string(),
  key_exchange: z.string(),
  cert_signature_algorithm: z.string(),
  key_size: z.number(),
  cert_expiry: z.string(),
  cert_days_remaining: z.number(),
  cert_issue_date: z.string(),
  pfs_advertised: z.boolean(),
  pfs_actual: z.boolean(),
  pfs_note: z.string(),
  tls_terminator: z.string(),
  tls_terminator_source: z.string(),
  lowest_accepted_tls: z.string(),
  downgrade_vulnerable: z.boolean(),
  qes_raw: z.number(),
  qes_norm: z.number(),
  des_raw: z.number(),
  des_norm: z.number(),
  des_confidence: z.string(),
  mcs_class: z.string(),
  mcs_norm: z.number(),
  mcs_confidence: z.string(),
  qmrs: z.number(),
  crypto_agility_rating: z.string(),
  hndl_exposure_days: z.number(),
  quantum_status: z.string(),
  recommended_algorithm: z.string(),
  rbi_compliance: z.string(),
  certin_status: z.string(),
  deprecation_date: z.string(),
  runway_days: z.number(),
  runway_status: z.string(),
  nist_ref: z.string(),
  disallowed_date: z.string(),
  action: z.string(),

  // Monte Carlo Quantum Break Simulation
  quantum_break_p25: z.number().optional().default(0),
  quantum_break_p50: z.number().optional().default(0),
  quantum_break_p75: z.number().optional().default(0),
  quantum_break_prob_2030: z.number().optional().default(0),
  quantum_break_prob_2035: z.number().optional().default(0),

  // Shadow IT Detection
  cert_issuer_org: z.string().optional().default(""),
  shadow_it: z.boolean().optional().default(false),
  shadow_it_confidence: z.number().optional().default(0),
  shadow_it_reason: z.string().optional().default(""),
});

export const CBOMReportSchema = z.object({
  generated_at: z.string(),
  total_assets: z.number(),
  assets: z.array(AssetSchema),
});

export type Asset = z.infer<typeof AssetSchema>;
export type CBOMReport = z.infer<typeof CBOMReportSchema>;


export async function loadCBOM(): Promise<CBOMReport> {
  const res = await fetch("http://localhost:8080/api/results", {
    cache: "no-store",
    mode: "cors",
  });

  if (!res.ok) throw new Error("Failed to load live data from Go backend");
  const raw = await res.json();
  return CBOMReportSchema.parse(raw);
}


export function runwayColor(status: string): string {
  switch (status) {
    case "Red":   return "text-red-600";
    case "Amber": return "text-amber-500";
    case "Green": return "text-emerald-600";
    default:      return "text-gray-500";
  }
}

export function runwayBg(status: string): string {
  switch (status) {
    case "Red":   return "bg-red-100 text-red-700";
    case "Amber": return "bg-amber-100 text-amber-700";
    case "Green": return "bg-emerald-100 text-emerald-700";
    default:      return "bg-gray-100 text-gray-600";
  }
}

export function rbiColor(status: string): string {
  switch (status) {
    case "Violation": return "bg-red-100 text-red-700";
    case "Advisory":  return "bg-amber-100 text-amber-700";
    case "Compliant": return "bg-emerald-100 text-emerald-700";
    default:          return "bg-gray-100 text-gray-600";
  }
}

export function pfsBadge(advertised: boolean, actual: boolean): {
  label: string;
  className: string;
} {
  if (!advertised) return { label: "No PFS", className: "bg-gray-100 text-gray-600" };
  if (!actual)     return { label: "BROKEN", className: "bg-red-100 text-red-700" };
  return             { label: "OK",     className: "bg-emerald-100 text-emerald-700" };
}

export function agilityBadge(rating: string): string {
  switch (rating) {
    case "High":   return "bg-emerald-100 text-emerald-700";
    case "Medium": return "bg-amber-100 text-amber-700";
    case "Low":    return "bg-red-100 text-red-700";
    default:       return "bg-gray-100 text-gray-600";
  }
}