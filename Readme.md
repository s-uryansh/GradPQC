# GradPQC Scanner

Cryptographic Inventory and Quantum Migration Intelligence Platform for Public-Facing Banking Systems.

Submitted for the PNB PSB Hackathon 2026 under the theme: Quantum-Proof Systems.

---

## Overview

GradPQC is a Go-based command-line scanner that performs passive and active TLS inspection on public-facing assets, generates a structured Cryptographic Bill of Materials (CBOM) aligned with CERT-In Annexure-A elements, and calculates whether an organisation has sufficient time to migrate its cryptographic posture before NIST's 2030 algorithm deprecation horizon.

The core differentiator is the migration runway calculation: GradPQC does not only identify what cryptographic algorithms are in use. It determines whether the time remaining before the NIST deprecation deadline is greater than the estimated remediation lead time for that specific asset. This is the question no existing TLS scanner answers.

---

## Problem Statement

Banks and financial institutions protect public-facing traffic using RSA and ECDHE-based algorithms. These algorithms are vulnerable to Shor's algorithm running on a cryptographically relevant quantum computer (CRQC). NIST has set a migration planning horizon of 2030 for RSA and ECDHE deprecation.

The threat is not only future. Adversaries are currently intercepting and storing encrypted bank traffic with the intent to decrypt it once a CRQC becomes available. This is a Harvest Now, Decrypt Later (HNDL) attack. The data is already being captured. The window to act is narrowing.

Most organisations do not have a complete inventory of what cryptographic algorithms are running on their public-facing systems, let alone a structured migration plan with realistic timelines.

GradPQC solves both problems.

---

## Features

### Core Pipeline

- TLS handshake inspection using Go standard library crypto/tls
- Full CBOM generation per asset covering TLS version, cipher suite, key exchange algorithm, certificate signature algorithm, key size, PFS status, certificate expiry, and HNDL exposure window
- Three-dimension risk scoring: Quantum Exposure Severity (QES), Data Exposure Sensitivity (DES), Migration Complexity Score (MCS)
- Quantum Migration Risk Score (QMRS) aggregation with policy-configurable weights
- Migration runway calculation against NIST SP 800-131A Rev 2 and CNSA 2.0 deprecation table
- Automatic Quantum Safe label issuance for assets confirmed running FIPS 203, 204, or 205 algorithms
- VPN portal detection and IPsec endpoint recognition
- Public-facing scope enforcement with private IP rejection

### Active Security Testing

- Active downgrade attack simulation: tests whether a server will accept weaker protocol versions than it advertises, adjusting QES score on confirmed downgrade acceptance
- Ephemeral key reuse detection: makes three successive TLS connections and compares server ephemeral public key shares; identical shares indicate broken PFS regardless of advertised cipher suite

### Infrastructure Intelligence

- TLS termination fingerprinting via JA3S signature matching: identifies the terminating device (F5 BIG-IP, Citrix NetScaler, AWS ALB, Nginx, Apache) and adjusts MCS class accordingly
- Crypto agility rating: assesses how readily a system can accept a new cryptographic algorithm without full rebuild
- HNDL exposure window: calculates days of accumulated harvestable exposure using certificate issue date

### Compliance and Governance

- RBI Cyber Security Framework compliance overlay: flags assets running TLS 1.0 or TLS 1.1 as active regulatory violations independent of quantum risk
- CERT-In guideline mapping per asset
- Jira and ServiceNow webhook integration: fires structured payload on Red runway status to open a high-priority incident ticket automatically
- CBOM export in Excel format for governance and audit teams
- CBOM export in JSON format for system integration
- HTML dashboard with priority quadrant chart, sortable CBOM table, and runway timeline bars

---

## Architecture

```
Input (targets.txt + policy.yaml + assets.yaml)
        |
        v
Stage 1: Input and Scope Enforcement
        - Validate public IP reachability
        - Reject private IP ranges
        - Load policy weights and sensitivity tags
        |
        v
Stage 2: TLS Handshake Inspection
        - Connect via crypto/tls
        - Extract cipher suite, TLS version, key exchange, certificate fields
        - Active downgrade simulation
        - Ephemeral key reuse detection (3 connections, compare key shares)
        - VPN and IPsec endpoint detection
        - JA3S termination fingerprinting
        |
        v
Stage 3: Risk Scoring
        - QES: algorithm quantum vulnerability (weight 0.50)
        - DES: endpoint data sensitivity via URL patterns or YAML tags (weight 0.30)
        - MCS: migration complexity from terminator fingerprint (weight 0.20)
        - All components normalised 0-1 before weighting
        - QMRS = (QES x 0.50) + (DES x 0.30) + (MCS x 0.20)
        - Crypto agility rating computed
        - HNDL exposure window computed
        |
        v
Stage 4: Deadline and Runway Calculation
        - Algorithm looked up in NIST deprecation table
        - Runway = Deprecation Date - Today - MCS Lead Time (days)
        - RBI and CERT-In compliance status mapped
        - Red / Amber / Green status assigned
        - Webhook payload fired on Red status
        |
        v
Stage 5: Output Generation
        - Dashboard
        - CBOM Excel export
        - CBOM JSON export
        - Quantum Safe label (JSON) for PQC-ready assets
        - Migration queue (ranked)
```

---

## Scoring Model

### QMRS Formula

```
QMRS = (QES_norm x 0.50) + (DES_norm x 0.30) + (MCS_norm x 0.20)
```

Output range: 0.00 to 1.00, displayed as 0 to 100 in the dashboard.

### QES: Quantum Exposure Severity

Measures cryptographic algorithm vulnerability against quantum attack. Derived from TLS version, cipher suite, key exchange algorithm, and PFS integrity test result. Raw scale 1 to 10, normalised to 0 to 1.

### DES: Data Exposure Sensitivity

Estimates the value of data traversing the connection. Sourced from assets.yaml tags if present, otherwise inferred from URL path patterns. Endpoints matching /login, /auth, /otp, /transfer, /pay score High (3). Others score Medium (2) or Low (1). Always displayed with confidence level. Raw scale 1 to 3, normalised to 0 to 1.

### MCS: Migration Complexity Score

| Class | Description | Lead Time |
|-------|-------------|-----------|
| A | TLS configuration change | 30 days |
| B | Certificate rotation | 90 days |
| C | Server or library upgrade | 180 days |
| D | Vendor or third-party dependency | 450 days |

Class is determined by JA3S termination fingerprint where available. Falls back to server header inference. Unknown terminators default to Class D with LOW confidence. Raw scale 1 to 4, normalised to 0 to 1.

### Runway Calculation

```
Runway (days) = Deprecation Date - Today - MCS Lead Time

Green  : Runway positive with more than 180 days remaining
Amber  : Runway positive but fewer than 180 days remaining
Red    : Runway zero or negative : migration window has closed
```

All deprecation dates are framed as migration planning horizons per NIST guidance, not predicted cryptographic break dates.

---

## NIST Reference Table

| Algorithm | Deprecation Horizon | Reference |
|-----------|---------------------|-----------|
| RSA-2048 | 2030-01-01 | NIST SP 800-131A Rev 2, CNSA 2.0 |
| RSA-3072 | 2030-01-01 | NIST SP 800-131A Rev 2 |
| ECDHE-P256 | 2030-01-01 | CNSA 2.0 (NSA 2022) |
| ECDHE-P384 | 2035-01-01 | CNSA 2.0 (NSA 2022) |
| AES-256-GCM | No deprecation | Quantum-resistant at current key size |
| ML-KEM-768 | No deprecation | FIPS 203 (2024) : PQC Ready |
| ML-DSA-65 | No deprecation | FIPS 204 (2024) : PQC Ready |
| SLH-DSA | No deprecation | FIPS 205 (2024) : PQC Ready |

---

## CBOM Output Fields

Every scanned asset produces the following fields in the CBOM:

| Field | Description |
|-------|-------------|
| Asset | Domain or IP address |
| Asset Type | Web, API, TLS VPN Portal, IPsec Endpoint |
| TLS Version | Negotiated protocol version |
| Cipher Suite | Full cipher suite string |
| Key Exchange | Algorithm used for key exchange |
| Cert Signature Algorithm | Algorithm used to sign the certificate |
| Key Size | Public key size in bits |
| PFS Advertised | Whether ECDHE or DHE is in the cipher suite |
| PFS Actual | Result of ephemeral key reuse detection test |
| Cert Expiry Date | Certificate expiry date |
| Cert Days Remaining | Days until certificate expiry |
| HNDL Exposure Window | Days of accumulated harvestable exposure |
| TLS Terminator | Detected terminating device from JA3S fingerprint |
| Crypto Agility Rating | High, Medium, or Low |
| Quantum Status | PQC Ready or Not PQC Ready |
| QES Score | Quantum Exposure Severity (0 to 10) |
| DES Score | Data Exposure Sensitivity (1 to 3) with confidence |
| MCS Class | Migration Complexity Class (A to D) with confidence |
| QMRS Score | Aggregate risk score (0 to 100) |
| RBI Compliance | Compliant, Advisory, or Violation |
| CERT-In Status | Compliant or Non-Recommended |
| Runway Status | Green, Amber, or Red |
| Recommended Algorithm | NIST-standardised replacement algorithm |
| Action | Specific next step with deadline |

---

## Input Files

### targets.txt

One domain or IP address per line. Any target resolving to a private IP range is rejected with an explicit message.

```
pnb.co.in
netbanking.pnb.co.in
api.pnb.co.in
vpn.pnb.co.in
```

### policy.yaml (optional)

Tune scoring weights. Default values align with NIST SP 800-131A prioritisation.

```yaml
weights:
  qes: 0.50
  des: 0.30
  mcs: 0.20
rationale: "NIST SP 800-131A prioritisation : cryptographic exposure is primary risk driver"
```

### assets.yaml (optional)

Tag endpoints with known data sensitivity to improve DES classification confidence.

```yaml
assets:
  - domain: "api.pnb.co.in"
    sensitivity: "high"
    type: "payment-api"
  - domain: "netbanking.pnb.co.in"
    sensitivity: "high"
    type: "authentication"
  - domain: "www.pnb.co.in"
    sensitivity: "low"
    type: "static-web"
```

---

## Output Files

| File | Format | Audience |
|------|--------|----------|
| dashboard.html | HTML | Judges, CISO, demo |
| cbom_report.xlsx | Excel | Governance, audit teams |
| cbom_report.json | JSON | System integration |
| quantum_safe_label_{domain}.json | JSON | Compliance records |
| migration_queue.txt | Plain text | Infrastructure teams |

---

## Quantum Safe Label

Automatically generated for any asset confirmed running ML-KEM, ML-DSA, or SLH-DSA. Detection uses OQS-OpenSSL provider for TLS extension identification.

```json
{
  "label": "PQC Ready - Quantum Safe",
  "asset": "secure.example.com",
  "algorithms_verified": ["ML-KEM-768", "ML-DSA-65"],
  "fips_references": ["FIPS 203", "FIPS 204"],
  "assessment_date": "2026-03-15",
  "assessor": "GradPQC v1.0",
  "asset_fingerprint": "sha256:3f4a1c...",
  "validity_period_days": 90,
  "detection_context": "Validated using OQS-OpenSSL provider. Native production PQC support remains rare."
}
```

---

## Webhook Integration

When an asset receives Red runway status, GradPQC fires a structured JSON webhook payload to the configured endpoint.

```json
{
  "event": "critical_quantum_risk",
  "asset": "api.pnb.co.in",
  "qmrs_score": 89,
  "runway_status": "RED",
  "runway_days": -42,
  "rbi_compliance": "VIOLATION",
  "recommended_algorithm": "ML-KEM-768 (FIPS 203)",
  "mcs_class": "C",
  "action": "Server upgrade required. Migration window has closed. Immediate escalation required.",
  "timestamp": "2026-03-15T14:32:00Z"
}
```

Webhook endpoint is configured in policy.yaml. Compatible with Jira REST API and ServiceNow incident API payload formats.



## Team

| Name | Role | Contact |
|------|------|---------|
| Mrs. Sweta Mishra | Mentor | sweta.mishra@snu.edu.in |
| Suryansh Rohil | Team Lead and Core Developer | sr738@snu.edu.in |
| Anish Gupta | Frontend Dev, Security Researcher and CBOM Analyst | ag801@snu.edu.in |
| Prakhar Sethi | QA Tester and Documentation Lead | ps385@snu.edu.in |

Institution: Shiv Nadar University


## License

Submitted for evaluation under PSB Hackathon 2026 organised by Punjab National Bank, an initiative of the Government of India, Ministry of Finance, Department of Financial Services.