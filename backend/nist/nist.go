package nist

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"gradpqc/cbom"
	"time"
)

//go:embed table.json
var tableData []byte

type AlgorithmEntry struct {
	SecurityLevelBits int    `json:"security_level_bits"`
	DeprecatedAfter   string `json:"deprecated_after"`
	DisallowedAfter   string `json:"disallowed_after"`
	NISTRef           string `json:"nist_ref"`
	Framing           string `json:"framing"`
	Replacement       string `json:"replacement"`
}

type Table struct {
	Algorithms map[string]AlgorithmEntry `json:"algorithms"`
}

var table Table

func init() {
	if err := json.Unmarshal(tableData, &table); err != nil {
		panic(fmt.Sprintf("failed to load NIST table: %v", err))
	}
}

func ComputeRunway(asset *cbom.Asset, mcsLeadDays int) {
	entry, ok := table.Algorithms[asset.KeyExchange]

	if !ok {
		asset.DeprecationDate = "Unknown"
		asset.RunwayDays = -1
		asset.RunwayStatus = "Red"
		asset.RecommendedAlgorithm = "Manual review required"
		asset.Action = "Algorithm not in NIST IR 8547 table. Manual review required."
		return
	}

	asset.RecommendedAlgorithm = entry.Replacement
	asset.NISTRef = entry.NISTRef
	asset.DisallowedDate = entry.DisallowedAfter

	// PQC ready
	if entry.DeprecatedAfter == "" && entry.DisallowedAfter == "" {
		asset.DeprecationDate = "None"
		asset.RunwayDays = 9999
		asset.RunwayStatus = "Green"
		asset.QuantumStatus = "PQC-Ready"
		asset.Action = "No migration required. Asset is quantum-safe."
		return
	}

	asset.QuantumStatus = "Not-PQC-Ready"

	today := time.Now()

	// Stage 1: check deprecation date (2030)
	if entry.DeprecatedAfter != "" {
		deprecatedDate, err := time.Parse("2006-01-02", entry.DeprecatedAfter)
		if err == nil {
			runway := int(deprecatedDate.Sub(today).Hours()/24) - mcsLeadDays
			asset.DeprecationDate = entry.DeprecatedAfter
			asset.RunwayDays = runway

			switch {
			case runway < 0:
				asset.RunwayStatus = "Red"
				asset.Action = fmt.Sprintf(
					"Deprecation window closed (2030). Replace %s with %s immediately. Ref: %s",
					asset.KeyExchange, entry.Replacement, entry.NISTRef,
				)
			case runway < 180:
				asset.RunwayStatus = "Amber"
				asset.Action = fmt.Sprintf(
					"Migration must begin immediately. %d days of runway before 2030 deprecation. Replace %s with %s. Ref: %s",
					runway, asset.KeyExchange, entry.Replacement, entry.NISTRef,
				)
			default:
				asset.RunwayStatus = "Green"
				asset.Action = fmt.Sprintf(
					"Plan migration of %s to %s before 2030 deprecation. Runway: %d days. Ref: %s",
					asset.KeyExchange, entry.Replacement, runway, entry.NISTRef,
				)
			}
			return
		}
	}

	// Stage 2: no deprecation date but has disallowed date (2035)
	if entry.DisallowedAfter != "" {
		disallowedDate, err := time.Parse("2006-01-02", entry.DisallowedAfter)
		if err == nil {
			runway := int(disallowedDate.Sub(today).Hours()/24) - mcsLeadDays
			asset.DeprecationDate = entry.DisallowedAfter
			asset.RunwayDays = runway

			switch {
			case runway < 0:
				asset.RunwayStatus = "Red"
				asset.Action = fmt.Sprintf(
					"Disallowed window closed (2035). Replace %s with %s immediately. Ref: %s",
					asset.KeyExchange, entry.Replacement, entry.NISTRef,
				)
			case runway < 180:
				asset.RunwayStatus = "Amber"
				asset.Action = fmt.Sprintf(
					"Migration must begin immediately. %d days before 2035 disallowed cutoff. Replace %s with %s. Ref: %s",
					runway, asset.KeyExchange, entry.Replacement, entry.NISTRef,
				)
			default:
				asset.RunwayStatus = "Green"
				asset.Action = fmt.Sprintf(
					"Plan migration of %s to %s before 2035 disallowed cutoff. Runway: %d days. Ref: %s",
					asset.KeyExchange, entry.Replacement, runway, entry.NISTRef,
				)
			}
		}
	}
}
