package webhook

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"gradpqc/cbom"
)

type WebhookPayload struct {
	Event                string  `json:"event"`
	Asset                string  `json:"asset"`
	QMRSScore            float64 `json:"qmrs_score"`
	RunwayStatus         string  `json:"runway_status"`
	RunwayDays           int     `json:"runway_days"`
	RBICompliance        string  `json:"rbi_compliance"`
	TLSVersion           string  `json:"tls_version"`
	KeyExchange          string  `json:"key_exchange"`
	PFSActual            bool    `json:"pfs_actual"`
	DowngradeVulnerable  bool    `json:"downgrade_vulnerable"`
	RecommendedAlgorithm string  `json:"recommended_algorithm"`
	MCSClass             string  `json:"mcs_class"`
	Action               string  `json:"action"`
	Timestamp            string  `json:"timestamp"`
}

type Config struct {
	Endpoint              string
	TimeoutSeconds        int
	TriggerOnRed          bool
	TriggerOnAmber        bool
	TriggerOnRBIViolation bool
}

var DefaultConfig = Config{
	Endpoint:              "",
	TimeoutSeconds:        10,
	TriggerOnRed:          true,
	TriggerOnAmber:        false,
	TriggerOnRBIViolation: true,
}

func ShouldTrigger(asset *cbom.Asset, conf Config) bool {
	if conf.TriggerOnRed && asset.RunwayStatus == "Red" {
		return true
	}
	if conf.TriggerOnAmber && asset.RunwayStatus == "Amber" {
		return true
	}
	if conf.TriggerOnRBIViolation && asset.RBICompliance == "Violation" {
		return true
	}
	return false
}

func Fire(asset *cbom.Asset, conf Config) error {
	if conf.Endpoint == "" {
		return fmt.Errorf("webhook endpoint not configured")
	}

	payload := buildPayload(asset)

	data, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("payload marshal failed: %w", err)
	}

	client := &http.Client{
		Timeout: time.Duration(conf.TimeoutSeconds) * time.Second,
	}

	resp, err := client.Post(conf.Endpoint, "application/json", bytes.NewReader(data))
	if err != nil {
		return fmt.Errorf("webhook delivery failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("webhook returned non-2xx status: %d", resp.StatusCode)
	}

	return nil
}

func buildPayload(asset *cbom.Asset) WebhookPayload {
	event := "quantum_risk_detected"
	if asset.RBICompliance == "Violation" {
		event = "rbi_compliance_violation"
	}
	if asset.RunwayStatus == "Red" {
		event = "critical_quantum_risk"
	}

	return WebhookPayload{
		Event:                event,
		Asset:                asset.Domain,
		QMRSScore:            asset.QMRS,
		RunwayStatus:         asset.RunwayStatus,
		RunwayDays:           asset.RunwayDays,
		RBICompliance:        asset.RBICompliance,
		TLSVersion:           asset.TLSVersion,
		KeyExchange:          asset.KeyExchange,
		PFSActual:            asset.PFSActual,
		DowngradeVulnerable:  asset.DowngradeVulnerable,
		RecommendedAlgorithm: asset.RecommendedAlgorithm,
		MCSClass:             asset.MCSClass,
		Action:               asset.Action,
		Timestamp:            time.Now().UTC().Format(time.RFC3339),
	}
}
