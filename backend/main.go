package main

import (
	"bufio"
	"fmt"
	"gradpqc/cbom"
	"gradpqc/compliance"
	"gradpqc/nist"
	"gradpqc/scanner"
	"gradpqc/scoring"
	"gradpqc/webhook"
	"net"
	"os"
	"strings"

	"gopkg.in/yaml.v3"
)

type AssetTag struct {
	Domain      string `yaml:"domain"`
	Sensitivity string `yaml:"sensitivity"`
	Type        string `yaml:"type"`
}

type AssetsConfig struct {
	Assets []AssetTag `yaml:"assets"`
}

type WeightsConfig struct {
	QES float64 `yaml:"qes"`
	DES float64 `yaml:"des"`
	MCS float64 `yaml:"mcs"`
}

type PolicyConfig struct {
	Weights WeightsConfig `yaml:"weights"`
}

func loadAssetsConfig(path string) (map[string]AssetTag, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var conf AssetsConfig
	if err := yaml.Unmarshal(data, &conf); err != nil {
		return nil, err
	}
	m := make(map[string]AssetTag)
	for _, a := range conf.Assets {
		m[a.Domain] = a
	}
	return m, nil
}

func loadPolicyConfig(path string) (*scoring.Weights, error) {
	data, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var conf PolicyConfig
	if err := yaml.Unmarshal(data, &conf); err != nil {
		return nil, err
	}
	return &scoring.Weights{
		QES: conf.Weights.QES,
		DES: conf.Weights.DES,
		MCS: conf.Weights.MCS,
	}, nil
}

func main() {
	assetTags, err := loadAssetsConfig("config/assets.yaml")
	if err != nil {
		fmt.Printf("[WARN] could not load assets.yaml: %v — using URL inference\n", err)
		assetTags = make(map[string]AssetTag)
	}

	weights, err := loadPolicyConfig("config/policy.yaml")
	if err != nil {
		fmt.Printf("[WARN] could not load policy.yaml: %v — using defaults\n", err)
		weights = &scoring.DefaultWeights
	}

	webhookConf := webhook.DefaultConfig
	targets, err := loadTargets("targets.txt")
	if err != nil {
		fmt.Fprintf(os.Stderr, "error loading targets: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("GradPQC Scanner: %d targets loaded\n", len(targets))

	var assets []cbom.Asset

	for _, target := range targets {
		fmt.Printf("scanning: %s\n", target)

		asset, err := scanner.ScanTarget(target)
		if err != nil {
			fmt.Printf("[ERROR] %s: %v\n", target, err)
			continue
		}

		scanner.TestDowngrade(asset)

		if asset.PFSAdvertised {
			scanner.TestKeyReuse(asset)
		} else {
			asset.PFSActual = false
			asset.PFSNote = "PFS not advertised: key reuse test skipped"
		}

		scanner.DetectTerminator(asset)

		tag := assetTags[target]

		scoring.ComputeQES(asset)
		scoring.ComputeDES(asset, tag.Sensitivity)
		leadDays := scoring.ComputeMCS(asset)
		scoring.ComputeQMRS(asset, *weights)
		scoring.ComputeCryptoAgility(asset)
		nist.ComputeRunway(asset, leadDays)
		compliance.ComputeCompliance(asset)

		if webhook.ShouldTrigger(asset, webhookConf) {
			if webhookConf.Endpoint != "" {
				if err := webhook.Fire(asset, webhookConf); err != nil {
					fmt.Printf("[WARN] webhook failed for %s: %v\n", asset.Domain, err)
				} else {
					fmt.Printf("[WEBHOOK] fired for %s — %s\n", asset.Domain, asset.RunwayStatus)
				}
			} else {
				fmt.Printf("[WEBHOOK] would trigger for %s — %s (endpoint not configured)\n",
					asset.Domain, asset.RunwayStatus,
				)
			}
		}

		fmt.Printf("  TLS: %s | QMRS: %.1f | Runway: %s | RBI: %s\n",
			asset.TLSVersion,
			asset.QMRS,
			asset.RunwayStatus,
			asset.RBICompliance,
		)

		assets = append(assets, *asset)
	}

	if len(assets) == 0 {
		fmt.Println("no assets scanned successfully")
		return
	}

	report := cbom.NewCBOM(assets)

	if err := cbom.ExportJSON(report, "../frontend/apps/web/public/cbom_report.json"); err != nil {
		fmt.Printf("[ERROR] JSON export failed: %v\n", err)
	} else {
		fmt.Println("exported: cbom_report.json")
	}

	if err := cbom.ExportExcel(report, "../frontend/apps/web/public/cbom_report.xlsx"); err != nil {
		fmt.Printf("[ERROR] Excel export failed: %v\n", err)
	} else {
		fmt.Println("exported: cbom_report.xlsx")
	}
	// after exports

	labelCount := 0
	for _, asset := range assets {
		if asset.QuantumStatus != "PQC-Ready" {
			continue
		}
		label, err := cbom.GenerateLabel(&asset)
		if err != nil {
			fmt.Printf("[WARN] label not issued for %s: %v\n", asset.Domain, err)
			continue
		}
		if err := cbom.ExportLabel(label, "labels"); err != nil {
			fmt.Printf("[ERROR] label export failed for %s: %v\n", asset.Domain, err)
			continue
		}
		fmt.Printf("Quantum Safe label issued: labels/quantum_safe_%s.json\n",
			strings.ReplaceAll(asset.Domain, ".", "_"),
		)
		labelCount++
	}

	if labelCount == 0 {
		fmt.Println("no PQC-Ready assets detected: no labels issued")
		// fmt.Println("note: most production systems do not yet run PQC algorithms")
	}
}

// loads target file, if fail show error
// file -> targets.txt
func loadTargets(path string) ([]string, error) {
	f, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer f.Close()

	var targets []string
	sc := bufio.NewScanner(f)

	for sc.Scan() {
		line := strings.TrimSpace(sc.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		if !isPublicFacing(line) {
			fmt.Printf("[SKIP] %s: not internet-facing\n", line)
			continue
		}
		targets = append(targets, line)
	}

	return targets, sc.Err()
}

// converts domain name in IP address
func isPublicFacing(target string) bool {
	host := target
	if strings.Contains(target, ":") {
		h, _, err := net.SplitHostPort(target)
		if err == nil {
			host = h
		}
	}

	ips, err := net.LookupHost(host)
	if err != nil {
		fmt.Printf("[WARN] could not resolve %s: %v\n", host, err)
		return false
	}

	for _, ipStr := range ips {
		ip := net.ParseIP(ipStr)
		if ip == nil {
			continue
		}
		if isPrivateIP(ip) {
			return false
		}
	}

	return true
}

// Takes the IP and check if it is private facing
func isPrivateIP(ip net.IP) bool {
	privateRanges := []string{
		"10.0.0.0/8",
		"172.16.0.0/12",
		"192.168.0.0/16",
		"127.0.0.0/8",
		"::1/128",
		"fc00::/7",
	}

	for _, cidr := range privateRanges {
		_, network, err := net.ParseCIDR(cidr)
		if err != nil {
			continue
		}
		if network.Contains(ip) {
			return true
		}
	}

	return false
}
