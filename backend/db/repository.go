package db

import (
	"database/sql"
	"gradpqc/cbom"
	"log"
)

func SaveScanResult(asset *cbom.Asset) error {
	var domainID int
	err := DB.QueryRow("SELECT id FROM domains WHERE root_domain = ?", asset.Domain).Scan(&domainID)
	if err == sql.ErrNoRows {
		res, err := DB.Exec("INSERT INTO domains (root_domain, subdomain) VALUES (?, ?)", asset.Domain, asset.Domain)
		if err != nil {
			return err
		}
		id, _ := res.LastInsertId()
		domainID = int(id)
	} else if err != nil {
		return err
	}

	query := `
		INSERT INTO scan_results (
			domain_id, asset_type, tls_version, cipher_suite, key_exchange, cert_signature_algorithm,
			key_size, cert_expiry, cert_days_remaining, cert_issue_date, pfs_advertised, pfs_actual,
			pfs_note, tls_terminator, tls_terminator_source, lowest_accepted_tls, downgrade_vulnerable,
			qes_raw, qes_norm, des_raw, des_norm, des_confidence, mcs_class, mcs_norm, mcs_confidence,
			qmrs, crypto_agility_rating, hndl_exposure_days, quantum_status, recommended_algorithm,
			rbi_compliance, certin_status, deprecation_date, runway_days, runway_status, nist_ref,
			disallowed_date, action
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`

	_, err = DB.Exec(query,
		domainID, asset.AssetType, asset.TLSVersion, asset.CipherSuite, asset.KeyExchange, asset.CertSignatureAlgorithm,
		asset.KeySize, asset.CertExpiry, asset.CertDaysRemaining, asset.CertIssueDate, asset.PFSAdvertised, asset.PFSActual,
		asset.PFSNote, asset.TLSTerminator, asset.TLSTerminatorSource, asset.LowestAcceptedTLS, asset.DowngradeVulnerable,
		asset.QESRaw, asset.QESNorm, asset.DESRaw, asset.DESNorm, asset.DESConf, asset.MCSClass, asset.MCSNorm, asset.MCSConf,
		asset.QMRS, asset.CryptoAgilityRating, asset.HNDLExposureDays, asset.QuantumStatus, asset.RecommendedAlgorithm,
		asset.RBICompliance, asset.CERTInStatus, asset.DeprecationDate, asset.RunwayDays, asset.RunwayStatus, asset.NISTRef,
		asset.DisallowedDate, asset.Action,
	)

	if err != nil {
		log.Printf("Error inserting scan result for %s: %v", asset.Domain, err)
		return err
	}
	return nil
}

func FetchLatestResults() ([]cbom.Asset, error) {
	query := `
		SELECT 
			d.subdomain, s.asset_type, s.tls_version, s.cipher_suite, s.key_exchange, s.cert_signature_algorithm,
			s.key_size, s.cert_expiry, s.cert_days_remaining, s.cert_issue_date, s.pfs_advertised, s.pfs_actual,
			s.pfs_note, s.tls_terminator, s.tls_terminator_source, s.lowest_accepted_tls, s.downgrade_vulnerable,
			s.qes_raw, s.qes_norm, s.des_raw, s.des_norm, s.des_confidence, s.mcs_class, s.mcs_norm, s.mcs_confidence,
			s.qmrs, s.crypto_agility_rating, s.hndl_exposure_days, s.quantum_status, s.recommended_algorithm,
			s.rbi_compliance, s.certin_status, s.deprecation_date, s.runway_days, s.runway_status, s.nist_ref,
			s.disallowed_date, s.action
		FROM scan_results s
		JOIN domains d ON s.domain_id = d.id
		ORDER BY s.scanned_at DESC LIMIT 100
	`

	rows, err := DB.Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	assets := make([]cbom.Asset, 0)

	seen := make(map[string]bool)

	for rows.Next() {
		var a cbom.Asset
		err := rows.Scan(
			&a.Domain, &a.AssetType, &a.TLSVersion, &a.CipherSuite, &a.KeyExchange, &a.CertSignatureAlgorithm,
			&a.KeySize, &a.CertExpiry, &a.CertDaysRemaining, &a.CertIssueDate, &a.PFSAdvertised, &a.PFSActual,
			&a.PFSNote, &a.TLSTerminator, &a.TLSTerminatorSource, &a.LowestAcceptedTLS, &a.DowngradeVulnerable,
			&a.QESRaw, &a.QESNorm, &a.DESRaw, &a.DESNorm, &a.DESConf, &a.MCSClass, &a.MCSNorm, &a.MCSConf,
			&a.QMRS, &a.CryptoAgilityRating, &a.HNDLExposureDays, &a.QuantumStatus, &a.RecommendedAlgorithm,
			&a.RBICompliance, &a.CERTInStatus, &a.DeprecationDate, &a.RunwayDays, &a.RunwayStatus, &a.NISTRef,
			&a.DisallowedDate, &a.Action,
		)
		if err != nil {
			log.Printf("Error scanning row: %v", err)
			continue
		}

		if !seen[a.Domain] {
			assets = append(assets, a)
			seen[a.Domain] = true
		}
	}

	return assets, nil
}
