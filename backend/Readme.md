# GradPQC Scanner

Cryptographic Inventory and Quantum Migration Intelligence Platform for Public-Facing Banking Systems.
Submitted for the PNB PSB Hackathon 2026, Theme: Quantum-Proof Systems.

> GradPQC does not only tell you what cipher you are using. It tells you whether you still have time to fix it before NIST's 2030 deadline.

---

## Project Structure

```
GradPQC/
├── main.go
├── targets.txt
├── cbom/
│   ├── cbom.go          # CBOM struct definition
│   ├── export.go        # JSON and Excel export
│   └── label.go         # Quantum Safe label generation
├── scanner/
│   ├── scanner.go       # TLS handshake inspection
│   ├── downgrade.go     # Active downgrade simulation
│   ├── keyreuse.go      # Ephemeral key reuse detection
│   └── fingerprint.go   # JA3S termination fingerprinting
├── scoring/
│   ├── qes.go           # Quantum Exposure Severity
│   ├── des.go           # Data Exposure Sensitivity
│   ├── mcs.go           # Migration Complexity Score
│   ├── qmrs.go          # QMRS aggregation
│   └── agility.go       # Crypto agility rating
├── nist/
│   ├── nist.go          # Runway calculation
│   └── table.json       # NIST IR 8547 deprecation table
├── compliance/
│   └── rbi.go           # RBI and CERT-In compliance mapping
├── webhook/
│   └── webhook.go       # Jira and ServiceNow webhook
├── config/
│   ├── policy.yaml      # Scoring weights
│   └── assets.yaml      # Asset sensitivity tags
└── output/
    ├── dashboard.html   # Visual dashboard
    ├── cbom_report.json
    └── cbom_report.xlsx
```

---

## Installation

**Requirements:** Go 1.22 or higher, Git, Python 3 (for serving the dashboard)

```bash
git clone https://github.com/yourusername/gradpqc
cd gradpqc
go mod tidy
```

Dependencies:

```
github.com/xuri/excelize/v2    # Excel export
gopkg.in/yaml.v3               # YAML config loading
```

---

## Usage

**1. Add targets:**

```
# targets.txt
pnb.bank.in
www.pnb.bank.in
pnbnet.pnb.bank.in
```

**2. Tag sensitivity (optional):**

```yaml
# config/assets.yaml
assets:
  - domain: "pnb.bank.in"
    sensitivity: "high"
    type: "banking-portal"
```

**3. Run:**

```bash
go run main.go
```

**4. Open dashboard:**

```bash
cd output
python3 -m http.server 8080
# open http://localhost:8080/dashboard.html
```

---

## Outputs

| File | Description |
|------|-------------|
| `output/cbom_report.json` | Full CBOM: machine readable |
| `output/cbom_report.xlsx` | Full CBOM: Excel for governance |
| `output/dashboard.html` | Visual dashboard |
| `labels/quantum_safe_*.json` | Quantum Safe label for PQC-ready assets |

---

## Verification Commands

Independently verify scanner findings against live infrastructure.

**TLS version and cipher suite:**
```bash
openssl s_client -connect pnb.bank.in:443 -tls1_2 2>/dev/null | grep -E "Protocol|Cipher"
```

**Certificate details:**
```bash
echo | openssl s_client -connect pnb.bank.in:443 2>/dev/null | openssl x509 -noout -dates -subject -issuer
```

**Ephemeral key reuse: run 3 times, compare hex bytes after 04:**
```bash
openssl s_client -connect pnb.bank.in:443 -msg 2>&1 | grep -A2 "ServerKeyExchange"
```
Identical bytes across all three runs confirms key reuse and broken PFS.

**Cross-verify with SSL Labs:**
```
https://www.ssllabs.com/ssltest/analyze.html?d=pnb.bank.in
```
SSL Labs confirms TLS version and cipher suite but does not detect key reuse or calculate migration runway.

**Verify DNS before adding targets:**
```bash
dig pnbnet.pnb.bank.in
```

---

## Scoring Model

```
QMRS = (QES x 0.50) + (DES x 0.30) + (MCS x 0.20)
Output: 0 to 100

Runway = Deprecation Date - Today - MCS Lead Time (days)
Green  : > 180 days remaining
Amber  : 0 to 180 days remaining
Red    : window closed
```

All weights configurable via `config/policy.yaml`. All dates are migration planning horizons per NIST IR 8547 ipd (November 2024).

| MCS Class | Description | Lead Time |
|-----------|-------------|-----------|
| A | Config change | 30 days |
| B | Certificate rotation | 90 days |
| C | Server upgrade | 180 days |
| D | Vendor dependency | 450 days |

---

## Key Features

- Active downgrade simulation: tests if server accepts weaker TLS than advertised
- Ephemeral key reuse detection: verifies PFS is functioning, not just advertised
- JA3S termination fingerprinting: identifies F5, Nginx, AWS ALB for accurate MCS
- RBI and CERT-In compliance overlay: flags current regulatory violations alongside quantum risk
- Migration runway calculation: tells you if time remains to migrate before NIST deadline
- Quantum Safe label: auto-issued for FIPS 203, 204, 205 assets
- Webhook integration: fires to Jira or ServiceNow on Red runway status

---

## Team

| Name | Role | Contact |
|------|------|---------|
| Mrs. Sweta Mishra | Mentor | sweta.mishra@snu.edu.in |
| Suryansh Rohil | Team Lead and Core Developer | sr738@snu.edu.in |
| Anish Gupta | Frontend Developer | ag801@snu.edu.in |
| Prakhar Sethi | QA Tester and Documentation Lead | ps385@snu.edu.in |

Institution: Shiv Nadar University

---

## References

- NIST IR 8547 ipd: Transition to Post-Quantum Cryptography Standards (November 2024)
- NIST SP 800-131A Rev 2: Transitioning Cryptographic Algorithms and Key Lengths
- NSA CNSA 2.0: Commercial National Security Algorithm Suite (September 2022)
- FIPS 203, 204, 205: ML-KEM, ML-DSA, SLH-DSA (2024)
- RBI Cyber Security Framework for Banks (2016)
- CERT-In Cryptographic Guidelines
- CERT-In CBOM Elements: Annexure-A, PSB Hackathon 2026 SRS

---

Submitted for PSB Hackathon 2026 organised by Punjab National Bank, an initiative of the Government of India, Ministry of Finance, Department of Financial Services.