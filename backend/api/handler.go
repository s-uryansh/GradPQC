package api

import (
	"encoding/json"
	"gradpqc/cbom"
	"gradpqc/compliance"
	"gradpqc/db"
	"gradpqc/montecarlo"
	"gradpqc/nist"
	"gradpqc/scanner"
	"gradpqc/scoring"
	"gradpqc/shadowit"
	"net/http"
)

type ScanRequest struct {
	Domain string `json:"domain"`
}

func HandleScan(w http.ResponseWriter, r *http.Request) {

	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req ScanRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON body", http.StatusBadRequest)
		return
	}

	asset, err := scanner.ScanTarget(req.Domain)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	scanner.TestDowngrade(asset)
	if asset.PFSAdvertised {
		scanner.TestKeyReuse(asset)
	}

	scanner.DetectTerminator(asset)
	scoring.ComputeQES(asset)
	scoring.ComputeDES(asset, "medium")
	leadDays := scoring.ComputeMCS(asset)
	scoring.ComputeQMRS(asset, scoring.DefaultWeights)
	scoring.ComputeCryptoAgility(asset)
	nist.ComputeRunway(asset, leadDays)
	compliance.ComputeCompliance(asset)
	montecarlo.ComputeMonteCarlo(asset)

	if err := db.SaveScanResult(asset); err != nil {
		http.Error(w, "Failed to save to database", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"message": "Scan completed successfully",
		"asset":   asset,
	})
}

func HandleResults(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	assets, err := db.FetchLatestResults()
	if err != nil {
		http.Error(w, "Failed to fetch results", http.StatusInternalServerError)
		return
	}

	// Apply in-memory intelligence on top of stored scan data.
	for i := range assets {
		montecarlo.ComputeMonteCarlo(&assets[i])
	}
	shadowit.DetectShadowIT(assets)

	report := cbom.NewCBOM(assets)

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	json.NewEncoder(w).Encode(report)
}
func HandleDiscover(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	domain := r.URL.Query().Get("domain")
	if domain == "" {
		http.Error(w, "Missing domain parameter", http.StatusBadRequest)
		return
	}

	subdomains, err := scanner.DiscoverSubdomains(domain)
	if err != nil {
		http.Error(w, "Failed to discover subdomains: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"root_domain": domain,
		"count":       len(subdomains),
		"subdomains":  subdomains,
	})
}
