# GradPQC: Quantum Migration Intelligence Platform

GradPQC is an automated cryptographic governance engine developed for the PNB PSB Hackathon 2026 (Theme: Quantum-Proof Systems). 

The platform consists of two main components:
1. **Backend (Go):** A highly specialized TLS scanner that actively analyzes public-facing endpoints for quantum vulnerabilities, ephemeral key reuse, and downgrade attacks. It scores assets and calculates a migration runway based on NIST IR 8547 guidelines.
2. **Frontend (Next.js):** A professional web dashboard that visualizes the generated Cryptographic Bill of Materials (CBOM), enterprise cyber ratings, and RBI/CERT-In compliance posture.

---

## Repository Structure

```text
GradPQC/
|-- backend/          # Go-based TLS scanner, scoring engine, and JSON export
|-- frontend/         # Next.js web dashboard, authentication, and UI
```

---

## Prerequisites

Ensure you have the following installed on your system:
- **Go** (v1.22 or higher)
- **Node.js** (v18 or higher)
- **pnpm** (Package manager for frontend)
- **MySQL Server** (For frontend user authentication)

---

## Complete Setup & Execution Guide

Follow these steps in order to run the entire platform end-to-end.

### Step 1: Database Configuration
Open your MySQL server and execute the following to create the authentication database:
```sql
CREATE DATABASE gradpqc;
USE gradpqc;

CREATE TABLE user (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  passwordHash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Step 2: Run the Backend Scanner
The backend must run first to generate the cryptographic inventory data.
```bash
cd backend
go mod tidy

# Run the scanner against the targets defined in targets.txt
go run main.go
```
*Note: This will output `cbom_report.json` and `cbom_report.xlsx` inside the `backend/output/` directory.*

### Step 3: Configure the Frontend
Navigate to the web application directory and create your environment variables.
```bash
cd ../frontend/apps/web
```

Create a `.env.local` file in this directory with the following contents:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=gradpqc
JWT_SECRET=your_secure_random_jwt_secret_key_here
```

# Install dependencies and run
```
pnpm install
pnpm run dev
```

### Step 4: Access the Platform
1. Open your web browser and navigate to `http://localhost:3000` (or `http://localhost:3001` depending on terminal output).
2. Click **Create account** to register a new user.
3. Sign in to view the live dashboard, CBOM inventory, and PQC Posture analytics.

# Verification

* Verify TLS Version

  - ``` openssl s_client -connect pnb.bank.in:443 -tls1_2 2>/dev/null | grep -E "Protocol|Cipher" ```

* Verify Certificate 

  - ``` echo | openssl s_client -connect pnb.bank.in:443 2>/dev/null | openssl x509 -noout -dates -subject -issuer ```

* Verify Ephemeral Key Reuse

  - ``` openssl s_client -connect pnb.bank.in:443 -msg 2>&1 | grep -A2 "ServerKeyExchange" ```