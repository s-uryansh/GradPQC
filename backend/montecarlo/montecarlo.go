package montecarlo

import (
	"math"
	"math/rand"
	"sort"

	"gradpqc/cbom"
)

const (
	simCount  = 10_000
	startYear = 2026
	endYear   = 2050

	// Effective logical qubits available in early 2026.
	// IBM/Google current state: ~1000 physical qubits, ~1000:1 physical/logical ratio
	// = ~1 fault-tolerant logical qubit. Being generous at 200 to model
	// near-term improvements already in the pipeline.
	initialQubits = 200.0

	// Log-normal parameters for annual qubit growth multiplier.
	// Mean multiplier: exp(0.5 + 0.4²/2) ≈ 1.79x/year
	// Median multiplier: exp(0.5) ≈ 1.65x/year
	growthMu    = 0.50
	growthSigma = 0.40
)

// requiredQubits is the number of fault-tolerant logical qubits needed to
// execute Shor's algorithm against each key exchange scheme.
// Sources: Banegas et al. (2021), Webber et al. (2022 IBM estimate).
var requiredQubits = map[string]float64{
	"RSA":              4096, // RSA-2048: ~4096 logical qubits
	"DHE-RSA":          4096,
	"ECDHE-RSA":        2330, // P-256 elliptic curve Shor's estimate
	"ECDHE-ECDSA":      2330,
	"X25519 (TLS 1.3)": 2330,
}

type SimResult struct {
	P25      int     // optimistic break year (25th percentile)
	P50      int     // median break year
	P75      int     // pessimistic break year (75th percentile)
	Prob2030 float64 // probability of cryptographic break by 2030
	Prob2035 float64 // probability of cryptographic break by 2035
}

// cache ensures simulations run only once per algorithm type.
var cache = map[string]*SimResult{}

// ComputeMonteCarlo runs (or retrieves cached) Monte Carlo simulation
// for the asset's key exchange algorithm and writes results onto the asset.
func ComputeMonteCarlo(asset *cbom.Asset) {
	alg := asset.KeyExchange
	r, ok := cache[alg]
	if !ok {
		r = runSimulation(alg)
		cache[alg] = r
	}
	asset.QuantumBreakP25 = r.P25
	asset.QuantumBreakP50 = r.P50
	asset.QuantumBreakP75 = r.P75
	asset.QuantumBreakProb2030 = r.Prob2030
	asset.QuantumBreakProb2035 = r.Prob2035
}

func runSimulation(keyExchange string) *SimResult {
	required, ok := requiredQubits[keyExchange]
	if !ok {
		// PQC-ready or unknown — not breakable by quantum Shor's attack.
		return &SimResult{}
	}

	// Fixed seed for reproducible, auditable output.
	rng := rand.New(rand.NewSource(42))
	breakYears := make([]int, simCount)

	for i := 0; i < simCount; i++ {
		qubits := initialQubits
		breakYear := endYear + 1 // sentinel: not broken within window

		for year := startYear; year <= endYear; year++ {
			z := rng.NormFloat64()
			annualGrowth := math.Exp(growthMu + growthSigma*z)
			qubits *= annualGrowth
			if qubits >= required {
				breakYear = year
				break
			}
		}
		breakYears[i] = breakYear
	}

	sort.Ints(breakYears)

	broke2030, broke2035 := 0, 0
	for _, y := range breakYears {
		if y <= 2030 {
			broke2030++
		}
		if y <= 2035 {
			broke2035++
		}
	}

	return &SimResult{
		P25:      breakYears[simCount*25/100],
		P50:      breakYears[simCount*50/100],
		P75:      breakYears[simCount*75/100],
		Prob2030: math.Round(float64(broke2030)/simCount*1000) / 1000,
		Prob2035: math.Round(float64(broke2035)/simCount*1000) / 1000,
	}
}
