package shadowit

import (
	"fmt"
	"math"
	"strings"

	"gradpqc/cbom"
)

// orgProfile holds the majority cryptographic profile for the organisation,
// derived from mode values across all scanned assets.
type orgProfile struct {
	modeKeySize    int
	modeTLSVersion string
	modeIssuerOrg  string
	modeSigAlg     string
}

// DetectShadowIT computes shadow IT flags for every asset by comparing each
// asset's cryptographic profile against the organisation's majority norm.
// It requires at least 3 assets to establish a meaningful profile.
func DetectShadowIT(assets []cbom.Asset) {
	if len(assets) < 3 {
		return
	}
	profile := buildProfile(assets)
	for i := range assets {
		pts, reason := scoreDeviation(&assets[i], profile)
		confidence := math.Min(float64(pts)/4.0, 1.0)
		confidence = math.Round(confidence*100) / 100
		assets[i].ShadowIT = confidence >= 0.5
		assets[i].ShadowITConfidence = confidence
		assets[i].ShadowITReason = reason
	}
}

func buildProfile(assets []cbom.Asset) orgProfile {
	keySizes := map[int]int{}
	tlsVersions := map[string]int{}
	issuers := map[string]int{}
	sigAlgs := map[string]int{}

	for _, a := range assets {
		if a.KeySize > 0 {
			keySizes[a.KeySize]++
		}
		if a.TLSVersion != "" {
			tlsVersions[a.TLSVersion]++
		}
		if a.CertIssuerOrg != "" {
			issuers[a.CertIssuerOrg]++
		}
		if a.CertSignatureAlgorithm != "" {
			sigAlgs[a.CertSignatureAlgorithm]++
		}
	}

	return orgProfile{
		modeKeySize:    modeInt(keySizes),
		modeTLSVersion: modeStr(tlsVersions),
		modeIssuerOrg:  modeStr(issuers),
		modeSigAlg:     modeStr(sigAlgs),
	}
}

func scoreDeviation(asset *cbom.Asset, p orgProfile) (int, string) {
	pts := 0
	var reasons []string

	// Key size significantly weaker than the org standard.
	if p.modeKeySize > 0 && asset.KeySize > 0 {
		if float64(asset.KeySize)/float64(p.modeKeySize) < 0.6 {
			pts++
			reasons = append(reasons,
				fmt.Sprintf("key size %d-bit (org standard: %d-bit)", asset.KeySize, p.modeKeySize))
		}
	}

	// TLS version older than the org standard.
	if tlsRank(asset.TLSVersion) < tlsRank(p.modeTLSVersion) {
		pts++
		reasons = append(reasons,
			fmt.Sprintf("%s (org standard: %s)", asset.TLSVersion, p.modeTLSVersion))
	}

	// Certificate issuer differs from the org's normal CA.
	if p.modeIssuerOrg != "" && asset.CertIssuerOrg != "" &&
		asset.CertIssuerOrg != p.modeIssuerOrg {
		pts++
		reasons = append(reasons,
			fmt.Sprintf("cert issuer %q (org CA: %q)", asset.CertIssuerOrg, p.modeIssuerOrg))
	}

	// Signature algorithm differs from the org standard.
	if p.modeSigAlg != "" && asset.CertSignatureAlgorithm != "" &&
		asset.CertSignatureAlgorithm != p.modeSigAlg {
		pts++
		reasons = append(reasons,
			fmt.Sprintf("sig alg %s (org standard: %s)", asset.CertSignatureAlgorithm, p.modeSigAlg))
	}

	return pts, strings.Join(reasons, "; ")
}

func tlsRank(version string) int {
	switch version {
	case "TLS 1.0":
		return 0
	case "TLS 1.1":
		return 1
	case "TLS 1.2":
		return 2
	case "TLS 1.3":
		return 3
	default:
		return -1
	}
}

func modeInt(m map[int]int) int {
	maxCount, best := 0, 0
	for k, v := range m {
		if v > maxCount {
			maxCount = v
			best = k
		}
	}
	return best
}

func modeStr(m map[string]int) string {
	maxCount, best := 0, ""
	for k, v := range m {
		if v > maxCount {
			maxCount = v
			best = k
		}
	}
	return best
}
