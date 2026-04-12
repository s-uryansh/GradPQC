package cbom

type Asset struct {
	// Identity
	Domain    string `json:"domain"`
	AssetType string `json:"asset_type"`

	// TLS Handshake Data
	TLSVersion  string `json:"tls_version"`
	CipherSuite string `json:"cipher_suite"`
	KeyExchange string `json:"key_exchange"`

	// Certificate Data
	CertSignatureAlgorithm string `json:"cert_signature_algorithm"`
	KeySize                int    `json:"key_size"`
	CertExpiry             string `json:"cert_expiry"`
	CertDaysRemaining      int    `json:"cert_days_remaining"`
	CertIssueDate          string `json:"cert_issue_date"`

	// PFS
	PFSAdvertised bool   `json:"pfs_advertised"`
	PFSActual     bool   `json:"pfs_actual"`
	PFSNote       string `json:"pfs_note"`

	// Infrastructure
	TLSTerminator       string `json:"tls_terminator"`
	TLSTerminatorSource string `json:"tls_terminator_source"`
	LowestAcceptedTLS   string `json:"lowest_accepted_tls"`
	DowngradeVulnerable bool   `json:"downgrade_vulnerable"`

	// Scoring
	QESRaw   float64 `json:"qes_raw"`        // 1-10
	QESNorm  float64 `json:"qes_norm"`       // 0-1
	DESRaw   float64 `json:"des_raw"`        // 1-3
	DESNorm  float64 `json:"des_norm"`       // 0-1
	DESConf  string  `json:"des_confidence"` // HIGH / MEDIUM / LOW
	MCSClass string  `json:"mcs_class"`      // A / B / C / D
	MCSNorm  float64 `json:"mcs_norm"`       // 0-1
	MCSConf  string  `json:"mcs_confidence"` // HIGH / MEDIUM / LOW
	QMRS     float64 `json:"qmrs"`           // 0-100

	// Risk
	CryptoAgilityRating string `json:"crypto_agility_rating"` // High / Medium / Low
	HNDLExposureDays    int    `json:"hndl_exposure_days"`

	// Quantum
	QuantumStatus        string `json:"quantum_status"` // PQC-Ready / Not-PQC-Ready
	RecommendedAlgorithm string `json:"recommended_algorithm"`

	// Compliance
	RBICompliance string `json:"rbi_compliance"` // Compliant / Advisory / Violation
	CERTInStatus  string `json:"certin_status"`  // Compliant / Non-Recommended

	// Runway
	DeprecationDate string `json:"deprecation_date"`
	RunwayDays      int    `json:"runway_days"`
	RunwayStatus    string `json:"runway_status"` // Green / Amber / Red

	NISTRef        string `json:"nist_ref"`
	DisallowedDate string `json:"disallowed_date"`

	Action string `json:"action"`

	// Monte Carlo Quantum Break Simulation
	QuantumBreakP25      int     `json:"quantum_break_p25"`       // optimistic break year (25th percentile)
	QuantumBreakP50      int     `json:"quantum_break_p50"`       // median break year
	QuantumBreakP75      int     `json:"quantum_break_p75"`       // pessimistic break year (75th percentile)
	QuantumBreakProb2030 float64 `json:"quantum_break_prob_2030"` // probability broken by 2030
	QuantumBreakProb2035 float64 `json:"quantum_break_prob_2035"` // probability broken by 2035

	// Shadow IT Detection
	CertIssuerOrg      string  `json:"cert_issuer_org"`
	ShadowIT           bool    `json:"shadow_it"`
	ShadowITConfidence float64 `json:"shadow_it_confidence"`
	ShadowITReason     string  `json:"shadow_it_reason"`
}

type CBOM struct {
	GeneratedAt string  `json:"generated_at"`
	TotalAssets int     `json:"total_assets"`
	Assets      []Asset `json:"assets"`
}
