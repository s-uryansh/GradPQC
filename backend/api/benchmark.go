package api

import (
	"encoding/json"
	"gradpqc/compliance"
	"gradpqc/montecarlo"
	"gradpqc/nist"
	"gradpqc/scanner"
	"gradpqc/scoring"
	"math"
	"net/http"
	"sync"
	"time"
)

type BankProfile struct {
	BankName         string  `json:"bank_name"`
	Domain           string  `json:"domain"`
	EnterpriseScore  int     `json:"enterprise_score"`
	CyberTier        string  `json:"cyber_tier"`
	PQCReady         bool    `json:"pqc_ready"`
	AvgQMRS          float64 `json:"avg_qmrs"`
	QuantumBreak2030 float64 `json:"quantum_break_prob_2030"`
	QuantumBreak2035 float64 `json:"quantum_break_prob_2035"`
	RunwayStatus     string  `json:"runway_status"`
	TLSVersion       string  `json:"tls_version"`
	KeyExchange      string  `json:"key_exchange"`
	Scanned          bool    `json:"scanned"`
	ScanError        string  `json:"scan_error,omitempty"`
}

type BenchmarkReport struct {
	GeneratedAt string        `json:"generated_at"`
	Banks       []BankProfile `json:"banks"`
}

var (
	benchCache    *BenchmarkReport
	benchCacheMu  sync.Mutex
	benchCacheExp time.Time
	benchCacheTTL = 60 * time.Minute
)

var competitorList = []struct{ name, domain string }{
<<<<<<< HEAD
	{"PNB", "pnbindia.in"},
=======
	{"PNB", "pnb.bank.in"},
>>>>>>> 82fac72 (Middleware and frontend bugs fixed + code reviews)
	{"SBI", "sbi.co.in"},
	{"HDFC Bank", "hdfcbank.com"},
	{"ICICI Bank", "icicibank.com"},
	{"Axis Bank", "axisbank.com"},
	{"Kotak Mahindra", "kotak.com"},
	{"Bank of Baroda", "bankofbaroda.in"},
}

func HandleBenchmark(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	benchCacheMu.Lock()
	if benchCache != nil && time.Now().Before(benchCacheExp) {
		cached := benchCache
		benchCacheMu.Unlock()
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(cached)
		return
	}
	benchCacheMu.Unlock()

	// Scan all competitors in parallel
	results := make([]BankProfile, len(competitorList))
	var wg sync.WaitGroup

	for i, comp := range competitorList {
		wg.Add(1)
		go func(idx int, name, domain string) {
			defer wg.Done()
			results[idx] = scanCompetitor(name, domain)
		}(i, comp.name, comp.domain)
	}
	wg.Wait()

	report := &BenchmarkReport{
		GeneratedAt: time.Now().UTC().Format(time.RFC3339),
		Banks:       results,
	}

	benchCacheMu.Lock()
	benchCache = report
	benchCacheExp = time.Now().Add(benchCacheTTL)
	benchCacheMu.Unlock()

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(report)
}

func scanCompetitor(name, domain string) BankProfile {
	profile := BankProfile{BankName: name, Domain: domain}

	asset, err := scanner.ScanTarget(domain)
	if err != nil {
		profile.ScanError = err.Error()
		return profile
	}

	scanner.TestDowngrade(asset)
	if asset.PFSAdvertised {
		scanner.TestKeyReuse(asset)
	}
	scanner.DetectTerminator(asset)
	scoring.ComputeQES(asset)
	scoring.ComputeDES(asset, "")
	leadDays := scoring.ComputeMCS(asset)
	scoring.ComputeQMRS(asset, scoring.DefaultWeights)
	scoring.ComputeCryptoAgility(asset)
	nist.ComputeRunway(asset, leadDays)
	compliance.ComputeCompliance(asset)
	montecarlo.ComputeMonteCarlo(asset)

	cyberScore := int(math.Round((100 - asset.QMRS) * 10))

	profile.EnterpriseScore = cyberScore
	profile.CyberTier = benchTier(cyberScore)
	profile.PQCReady = asset.QuantumStatus == "PQC-Ready"
	profile.AvgQMRS = math.Round(asset.QMRS*10) / 10
	profile.QuantumBreak2030 = asset.QuantumBreakProb2030
	profile.QuantumBreak2035 = asset.QuantumBreakProb2035
	profile.RunwayStatus = asset.RunwayStatus
	profile.TLSVersion = asset.TLSVersion
	profile.KeyExchange = asset.KeyExchange
	profile.Scanned = true

	return profile
}

func benchTier(score int) string {
	if score >= 700 {
		return "Elite-PQC"
	}
	if score >= 400 {
		return "Standard"
	}
	if score >= 100 {
		return "Legacy"
	}
	return "Critical"
}
