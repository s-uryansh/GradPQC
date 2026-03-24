package scoring

import (
	"gradpqc/cbom"
	"strings"
)

func ComputeCryptoAgility(asset *cbom.Asset) {
	score := 0

	switch asset.TLSVersion {
	case "TLS 1.3":
		score += 3
	case "TLS 1.2":
		score += 2
	case "TLS 1.1":
		score += 1
	case "TLS 1.0":
		score += 0
	}

	if strings.Contains(asset.CipherSuite, "GCM") || strings.Contains(asset.CipherSuite, "CHACHA20") {
		score += 2
	}

	if strings.Contains(asset.KeyExchange, "ECDHE") || strings.Contains(asset.KeyExchange, "X25519") {
		score += 2
	}

	switch asset.MCSClass {
	case "A":
		score += 3
	case "B":
		score += 2
	case "C":
		score += 1
	case "D":
		score += 0
	}

	if asset.PFSAdvertised && !asset.PFSActual {
		score -= 2
	}

	if asset.DowngradeVulnerable {
		score -= 2
	}

	switch {
	case score >= 8:
		asset.CryptoAgilityRating = "High"
	case score >= 5:
		asset.CryptoAgilityRating = "Medium"
	default:
		asset.CryptoAgilityRating = "Low"
	}
}
