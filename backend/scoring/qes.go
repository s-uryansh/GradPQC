package scoring

import "gradpqc/cbom"

// QES scoring table
// Higher score = more quantum vulnerable
var cipherQESMap = map[string]float64{
	"RSA":              10.0,
	"DHE-RSA":          8.0,
	"ECDHE-RSA":        7.0,
	"ECDHE-ECDSA":      6.0,
	"X25519 (TLS 1.3)": 5.0,
}

var tlsVersionPenalty = map[string]float64{
	"TLS 1.0": 3.0,
	"TLS 1.1": 2.0,
	"TLS 1.2": 1.0,
	"TLS 1.3": 0.0,
}

func ComputeQES(asset *cbom.Asset) {
	base := cipherQESMap[asset.KeyExchange]
	if base == 0 {
		base = 5.0 // unknown algorithm, assume moderate risk
	}

	penalty := tlsVersionPenalty[asset.TLSVersion]

	// downgrade vulnerability spikes QES to max
	if asset.DowngradeVulnerable {
		asset.QESRaw = 10.0
		asset.QESNorm = 1.0
		return
	}

	// broken PFS despite being advertised spikes QES
	if asset.PFSAdvertised && !asset.PFSActual {
		asset.QESRaw = 10.0
		asset.QESNorm = 1.0
		return
	}

	raw := base + penalty
	if raw > 10.0 {
		raw = 10.0
	}

	asset.QESRaw = raw
	asset.QESNorm = raw / 10.0
}
