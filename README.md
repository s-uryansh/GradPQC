# GradPQC: Quantum Migration Intelligence
![Go Version](https://img.shields.io/badge/Go-1.21+-00ADD8?style=flat&logo=go)
![Next.js](https://img.shields.io/badge/Next.js-black?logo=next.js&logoColor=white)
![Status](https://img.shields.io/badge/Status-Completed_Development-success)

GradPQC is an enterprise-grade cryptographic governance platform built for the **PNB PSB Hackathon 2026**. It actively discovers public-facing banking assets, analyzes their cryptographic posture, and uses predictive intelligence to calculate exact quantum-breach probabilities before NIST's 2030 deadlines.

> GradPQC doesn't just tell you your cipher is weak. It predicts exactly when a quantum computer will break it, and calculates the financial ROI of fixing it today.

## The Problem

Financial institutions face a catastrophic blind spot: **Harvest Now, Decrypt Later (HNDL)**. Adversaries are actively recording encrypted banking traffic today, waiting for quantum computers (Q-Day) to break RSA and ECC. Standard scanners only report static certificate expiry. They fail to detect hidden "Shadow IT" subdomains, they cannot predict technological growth curves, and they do not translate cryptographic risk into boardroom financial metrics.

## The Solution

GradPQC replaces static scanning with **Predictive Cryptographic Intelligence**. It features a blazing-fast, concurrent Go backend that deeply fingerprints TLS handshakes, paired with a Next.js dashboard.

Using Machine Learning and Monte Carlo simulations, it actively scores enterprise posture against NIST IR 8547 standards, clusters assets to find rogue servers, and benchmarks readiness against industry competitors in real-time.

### Key Features

  * **Monte Carlo Breach Simulation:** Runs 10,000 probabilistic hardware-growth timelines to predict the exact year an asset's encryption will collapse.
  * **Shadow IT Detection (ML):** Uses unsupervised clustering on TLS profiles (Key Size, Cipher Strength, Issuer) to flag rogue or forgotten infrastructure deviating from enterprise policies.
  * **Concurrent Competitor Benchmarking:** Spawns parallel Goroutines to instantly scan and rank competitor banks (SBI, HDFC, ICICI) against your quantum readiness score.
  * **Migration ROI Calculator:** Gordon-Loeb financial modeling translating quantum vulnerability percentages into exact Rupee exposure.
  * **Automated Cron Reporting:** Built-in Go scheduler that generates and emails PDF/Excel executive summaries and CBOMs (Cryptographic Bill of Materials) daily/weekly.
  * **Deep Fingerprinting:** Tests for ephemeral key reuse (broken PFS), active downgrade vulnerabilities, and JA3S load-balancer termination detection.

-----

## Technical Architecture

### Flow

```
Frontend (Next.js)
        ↓
Backend (Go API + Cron)
        ↓
Core Engines
        ↓
MySQL
        ↓
Reports / Dashboard
```

---

### Frontend

* Next.js App Router
* Route-based modules (`/posture`, `/roi`, etc.)
* JWT auth + RBAC (`admin`, `analyst`, `viewer`)
* API proxy layer

---

### Backend

* Go modular services
* Goroutine concurrency
* Built-in cron scheduler

**Modules**

* `scanner` → TLS fingerprinting
* `scoring` → QES, DES, MCS, QMRS
* `montecarlo` → breach simulation
* `shadowit` → anomaly detection
* `cbom` → asset inventory
* `api` → handlers

---

### Core Engine

```
Domain → TLS Scan → Feature Extract → Score → Store
```

* Detects downgrade, PFS issues
* Extracts cert + cipher data

---

### Intelligence

* Deterministic scoring (QMRS)
* Monte Carlo → breach probability
* Clustering → Shadow IT

---

### Data Layer

* MySQL
* Tables: `domains`, `scan_results`, `scheduled_reports`, `user`
* Idempotent migrations

---

### Reporting

* Cron-based automation
* PDF / Excel export
* Email delivery

---

### Key Strength

* High concurrency
* Modular design
* Predictive + static analysis
* No external scheduler

-----

## Installation & Setup

### Dependencies

  * **Go 1.22+**
  * **Node.js 20+ & pnpm**
  * **MariaDB / MySQL**

### 1\. Database Setup

> Database is initalized on the backend start.

### 2\. Backend Initialization (Go)

```bash
cd backend
go mod tidy

# Start the concurrent scanning API and Cron engine
go run main.go
# Server runs on http://localhost:8080
```

### 3\. Frontend Initialization (Next.js)

```bash
cd frontend/apps/web
pnpm install

pnpm run dev --port 3001
# Open http://localhost:3001
```

-----

## Scoring Model & Intelligence

**Quantum Migration Risk Score (QMRS)**

```text
QMRS = (QES x 0.50) + (DES x 0.30) + (MCS x 0.20)
Output: 0 to 100 (Deterministic Risk)
```

**Quantum Runway (NIST IR 8547)**

```text
Runway = Deprecation Date - Today - MCS Lead Time (days)
🟢 Green : > 365 days buffer (PQC-Ready)
🟠 Amber : 0 to 365 days (Warning / Migration Phase)
🔴 Red   : Window closed (Critical Vulnerability)
```

**Monte Carlo Engine**
Calculates `P(Breach 2030)` using log-normal distributions of physical qubit growth rates mapped against Shor's Algorithm requirements (e.g., 4096 logical qubits for RSA-2048).

-----

## Team

| Name | Role | Contact |
|------|------|---------|
| Mrs. Sweta Mishra | Mentor | sweta.mishra@snu.edu.in |
| Suryansh Rohil | Team Lead and Core Developer | sr738@snu.edu.in |
| Anish Gupta | Frontend Developer | ag801@snu.edu.in |
| Prakhar Sethi | QA Tester and Documentation Lead | ps385@snu.edu.in |

**Institution:** Shiv Nadar University

-----

## References & Compliance

  * **NIST IR 8547 ipd:** Transition to Post-Quantum Cryptography Standards
  * **FIPS 203, 204, 205:** ML-KEM, ML-DSA, SLH-DSA (2024)
  * **RBI Cyber Security Framework:** Indian Banking Regulatory Standards
  * **CERT-In:** Cryptographic Guidelines & CBOM Annexure-A

-----

*Submitted for PSB Hackathon 2026 organised by Punjab National Bank, an initiative of the Government of India, Ministry of Finance, Department of Financial Services.*