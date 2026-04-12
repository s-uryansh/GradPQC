package compliance

import (
	"gradpqc/cbom"
)

// RBI Cyber Security Framework for Banks (2016, updated advisories)
// Minimum TLS version: TLS 1.2
// CERT-In guidelines align with RBI on minimum TLS version

type ComplianceStatus struct {
	RBIStatus    string
	RBIReason    string
	CERTInStatus string
	CERTInReason string
}

var tlsVersionRank = map[string]int{
	"TLS 1.0": 0,
	"TLS 1.1": 1,
	"TLS 1.2": 2,
	"TLS 1.3": 3,
}

func ComputeCompliance(asset *cbom.Asset) {
	status := assessRBI(asset)
	asset.RBICompliance = status.RBIStatus
	asset.CERTInStatus = status.CERTInStatus
}

func assessRBI(asset *cbom.Asset) ComplianceStatus {
	rank, known := tlsVersionRank[asset.TLSVersion]

	if !known {
		return ComplianceStatus{
			RBIStatus:    "Unknown",
			RBIReason:    "TLS version not recognised",
			CERTInStatus: "Unknown",
			CERTInReason: "TLS version not recognised",
		}
	}

	// TLS 1.0 and TLS 1.1 are active violations today
	if rank < 2 {
		return ComplianceStatus{
			RBIStatus:    "Violation",
			RBIReason:    asset.TLSVersion + " is below RBI mandated minimum of TLS 1.2. Immediate remediation required.",
			CERTInStatus: "Non-Compliant",
			CERTInReason: asset.TLSVersion + " does not meet CERT-In minimum protocol requirements.",
		}
	}

	// TLS 1.2 with weak cipher
	if asset.TLSVersion == "TLS 1.2" && isWeakCipher(asset.CipherSuite) {
		return ComplianceStatus{
			RBIStatus:    "Advisory",
			RBIReason:    "TLS 1.2 in use with weak cipher suite. Upgrade to TLS 1.3 or stronger cipher suite recommended.",
			CERTInStatus: "Non-Recommended",
			CERTInReason: "Weak cipher suite detected. CERT-In advises strong cipher suites with TLS 1.2 or above.",
		}
	}

	// TLS 1.2 with strong cipher: baseline compliant but not quantum safe
	if asset.TLSVersion == "TLS 1.2" {
		return ComplianceStatus{
			RBIStatus:    "Compliant",
			RBIReason:    "TLS 1.2 with acceptable cipher suite. Quantum migration still required by 2030.",
			CERTInStatus: "Compliant",
			CERTInReason: "Meets current CERT-In minimum requirements. PQC migration recommended.",
		}
	}

	// TLS 1.3: fully compliant today
	return ComplianceStatus{
		RBIStatus:    "Compliant",
		RBIReason:    "TLS 1.3 meets and exceeds RBI cyber security framework requirements.",
		CERTInStatus: "Compliant",
		CERTInReason: "TLS 1.3 meets CERT-In guidelines. PQC migration required before 2035.",
	}
}

func isWeakCipher(cipherSuite string) bool {
	weakPatterns := []string{
		"RC4",
		"3DES",
		"DES",
		"NULL",
		"EXPORT",
		"anon",
		"MD5",
	}
	for _, pattern := range weakPatterns {
		if contains(cipherSuite, pattern) {
			return true
		}
	}
	return false
}

func contains(s, substr string) bool {
	if len(s) < len(substr) {
		return false
	}
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
