package scoring

import (
	"gradpqc/cbom"
	"strings"
)

var highSensitivityPaths = []string{
	"login", "auth", "otp", "transfer",
	"pay", "payment", "transaction", "fund",
}

var mediumSensitivityPaths = []string{
	"account", "profile", "dashboard",
	"statement", "balance", "user",
}

func ComputeDES(asset *cbom.Asset, sensitivityTag string) {
	// YAML tag takes highest priority
	if sensitivityTag != "" {
		switch strings.ToLower(sensitivityTag) {
		case "high":
			asset.DESRaw = 3.0
			asset.DESConf = "HIGH"
		case "medium":
			asset.DESRaw = 2.0
			asset.DESConf = "HIGH"
		case "low":
			asset.DESRaw = 1.0
			asset.DESConf = "HIGH"
		}
		asset.DESNorm = (asset.DESRaw - 1) / 2.0
		return
	}

	// fall back to URL path matching
	domain := strings.ToLower(asset.Domain)

	for _, path := range highSensitivityPaths {
		if strings.Contains(domain, path) {
			asset.DESRaw = 3.0
			asset.DESNorm = 1.0
			asset.DESConf = "MEDIUM"
			return
		}
	}

	for _, path := range mediumSensitivityPaths {
		if strings.Contains(domain, path) {
			asset.DESRaw = 2.0
			asset.DESNorm = 0.5
			asset.DESConf = "MEDIUM"
			return
		}
	}

	asset.DESRaw = 1.0
	asset.DESNorm = 0.0
	asset.DESConf = "LOW"
}
