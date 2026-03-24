package cbom

import (
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"
)

type QuantumSafeLabel struct {
	Label              string   `json:"label"`
	Asset              string   `json:"asset"`
	AlgorithmsVerified []string `json:"algorithms_verified"`
	FIPSReferences     []string `json:"fips_references"`
	AssessmentDate     string   `json:"assessment_date"`
	Assessor           string   `json:"assessor"`
	AssetFingerprint   string   `json:"asset_fingerprint"`
	ValidityDays       int      `json:"validity_period_days"`
	DetectionContext   string   `json:"detection_context"`
}

// pqcAlgorithms maps detected algorithm names to their FIPS references
var pqcAlgorithms = map[string]string{
	"ML-KEM-512":  "FIPS 203",
	"ML-KEM-768":  "FIPS 203",
	"ML-KEM-1024": "FIPS 203",
	"ML-DSA-44":   "FIPS 204",
	"ML-DSA-65":   "FIPS 204",
	"ML-DSA-87":   "FIPS 204",
	"SLH-DSA":     "FIPS 205",
}

func GenerateLabel(asset *Asset) (*QuantumSafeLabel, error) {
	if asset.QuantumStatus != "PQC-Ready" {
		return nil, fmt.Errorf("asset %s is not PQC-Ready — label not issued", asset.Domain)
	}

	algorithms, fipsRefs := detectPQCAlgorithms(asset)
	if len(algorithms) == 0 {
		return nil, fmt.Errorf("no NIST-standardised PQC algorithms detected for %s", asset.Domain)
	}

	fingerprint := computeFingerprint(asset)

	label := &QuantumSafeLabel{
		Label:              "PQC Ready - Quantum Safe",
		Asset:              asset.Domain,
		AlgorithmsVerified: algorithms,
		FIPSReferences:     fipsRefs,
		AssessmentDate:     time.Now().Format("2006-01-02"),
		Assessor:           "GradPQC v1.0",
		AssetFingerprint:   fingerprint,
		ValidityDays:       90,
		DetectionContext:   "Validated using OQS-OpenSSL provider for TLS extension identification. Native production PQC support remains rare. Label reflects algorithm detection, not broad production availability.",
	}

	return label, nil
}

func ExportLabel(label *QuantumSafeLabel, dir string) error {
	if err := os.MkdirAll(dir, 0755); err != nil {
		return fmt.Errorf("could not create labels directory: %w", err)
	}

	// sanitise domain for filename
	filename := strings.ReplaceAll(label.Asset, ".", "_")
	filename = strings.ReplaceAll(filename, "/", "_")
	path := fmt.Sprintf("%s/quantum_safe_%s.json", dir, filename)

	data, err := json.MarshalIndent(label, "", "  ")
	if err != nil {
		return fmt.Errorf("label marshal failed: %w", err)
	}

	return os.WriteFile(path, data, 0644)
}

func detectPQCAlgorithms(asset *Asset) ([]string, []string) {
	var algorithms []string
	var fipsRefs []string
	seen := make(map[string]bool)

	// check key exchange
	for algo, fips := range pqcAlgorithms {
		if strings.Contains(asset.KeyExchange, algo) {
			if !seen[fips] {
				algorithms = append(algorithms, algo)
				fipsRefs = append(fipsRefs, fips)
				seen[fips] = true
			}
		}
	}

	// check cipher suite
	for algo, fips := range pqcAlgorithms {
		if strings.Contains(asset.CipherSuite, algo) {
			if !seen[fips] {
				algorithms = append(algorithms, algo)
				fipsRefs = append(fipsRefs, fips)
				seen[fips] = true
			}
		}
	}

	// check cert signature algorithm
	for algo, fips := range pqcAlgorithms {
		if strings.Contains(asset.CertSignatureAlgorithm, algo) {
			if !seen[fips] {
				algorithms = append(algorithms, algo)
				fipsRefs = append(fipsRefs, fips)
				seen[fips] = true
			}
		}
	}

	return algorithms, fipsRefs
}

func computeFingerprint(asset *Asset) string {
	raw := fmt.Sprintf("%s|%s|%s|%s|%s",
		asset.Domain,
		asset.CipherSuite,
		asset.KeyExchange,
		asset.CertSignatureAlgorithm,
		asset.CertExpiry,
	)
	hash := sha256.Sum256([]byte(raw))
	return fmt.Sprintf("sha256:%x", hash)
}
