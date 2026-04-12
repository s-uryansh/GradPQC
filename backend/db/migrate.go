package db

import "log"

// RunMigrations ensures all required tables and columns exist.
// Uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS so it is safe to run on every startup.
func RunMigrations() {
	stmts := []string{
		// Core tables (no-ops if already present)
		`CREATE TABLE IF NOT EXISTS domains (
			id            INT AUTO_INCREMENT PRIMARY KEY,
			root_domain   VARCHAR(255) NOT NULL,
			subdomain     VARCHAR(255) NOT NULL,
			discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

		`CREATE TABLE IF NOT EXISTS user (
				id           VARCHAR(36) PRIMARY KEY,
				email        VARCHAR(255) NOT NULL UNIQUE,
				passwordHash VARCHAR(255) NOT NULL,
				created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				role         ENUM('admin','analyst','viewer') DEFAULT 'viewer'
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

		`CREATE TABLE IF NOT EXISTS scan_results (
			id                       INT AUTO_INCREMENT PRIMARY KEY,
			domain_id                INT NOT NULL,
			asset_type               VARCHAR(100),
			tls_version              VARCHAR(50),
			cipher_suite             VARCHAR(255),
			key_exchange             VARCHAR(100),
			cert_signature_algorithm VARCHAR(100),
			key_size                 INT,
			cert_expiry              VARCHAR(100),
			cert_days_remaining      INT,
			cert_issue_date          VARCHAR(100),
			pfs_advertised           BOOLEAN,
			pfs_actual               BOOLEAN,
			pfs_note                 TEXT,
			tls_terminator           VARCHAR(100),
			tls_terminator_source    VARCHAR(100),
			lowest_accepted_tls      VARCHAR(50),
			downgrade_vulnerable     BOOLEAN,
			qes_raw                  FLOAT,
			qes_norm                 FLOAT,
			des_raw                  FLOAT,
			des_norm                 FLOAT,
			des_confidence           VARCHAR(50),
			mcs_class                VARCHAR(10),
			mcs_norm                 FLOAT,
			mcs_confidence           VARCHAR(50),
			qmrs                     FLOAT,
			crypto_agility_rating    VARCHAR(50),
			hndl_exposure_days       INT,
			quantum_status           VARCHAR(100),
			recommended_algorithm    VARCHAR(100),
			rbi_compliance           VARCHAR(100),
			certin_status            VARCHAR(100),
			deprecation_date         VARCHAR(100),
			runway_days              INT,
			runway_status            VARCHAR(50),
			nist_ref                 VARCHAR(100),
			disallowed_date          VARCHAR(100),
			action                   TEXT,
			scanned_at               TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY (domain_id) REFERENCES domains(id)
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

		`CREATE TABLE IF NOT EXISTS scheduled_reports (
			id             INT AUTO_INCREMENT PRIMARY KEY,
			report_type    VARCHAR(100) NOT NULL,
			frequency      VARCHAR(50)  NOT NULL,
			assets_scope   VARCHAR(100) NOT NULL,
			delivery_email VARCHAR(255) NOT NULL,
			scheduled_time VARCHAR(10)  NOT NULL,
			last_sent_at   TIMESTAMP    NULL DEFAULT NULL,
			created_at     TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

		// Add last_sent_at to scheduled_reports if it was created without it
		`ALTER TABLE scheduled_reports ADD COLUMN IF NOT EXISTS last_sent_at TIMESTAMP NULL DEFAULT NULL`,

		// Add role column to user table if it doesn't already exist
	}

	for _, s := range stmts {
		if _, err := DB.Exec(s); err != nil {
			log.Printf("[migrate] skipped (already exists or unsupported): %v", err)
		}
	}
	log.Println("[migrate] migrations applied")
}
