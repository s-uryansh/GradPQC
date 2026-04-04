package scanner

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"strings"
	"time"
)

type CrtShEntry struct {
	NameValue string `json:"name_value"`
}

func DiscoverSubdomains(rootDomain string) ([]string, error) {
	uniqueDomains := make(map[string]bool)

	// Attempt 1: crt.sh
	crtshURL := fmt.Sprintf("https://crt.sh/?q=%%25.%s&output=json", rootDomain)
	client := &http.Client{Timeout: 30 * time.Second}

	resp, err := client.Get(crtshURL)
	if err == nil && resp.StatusCode == http.StatusOK {
		var entries []CrtShEntry
		if err := json.NewDecoder(resp.Body).Decode(&entries); err == nil {
			for _, entry := range entries {
				names := strings.Split(entry.NameValue, "\n")
				for _, name := range names {
					name = strings.TrimSpace(strings.ToLower(name))
					name = strings.TrimPrefix(name, "*.")
					if strings.HasSuffix(name, rootDomain) {
						uniqueDomains[name] = true
					}
				}
			}
		}
	}
	if resp != nil {
		resp.Body.Close()
	}

	if len(uniqueDomains) == 0 {
		fmt.Println("[INFO] crt.sh failed or returned 0, falling back to HackerTarget...")
		htURL := fmt.Sprintf("https://api.hackertarget.com/hostsearch/?q=%s", rootDomain)
		htResp, htErr := client.Get(htURL)

		if htErr == nil && htResp.StatusCode == http.StatusOK {
			// HackerTarget returns CSV format: subdomain.example.com,192.168.1.1
			var buf bytes.Buffer
			buf.ReadFrom(htResp.Body)
			lines := strings.Split(buf.String(), "\n")

			for _, line := range lines {
				parts := strings.Split(line, ",")
				if len(parts) > 0 && parts[0] != "" {
					name := strings.TrimSpace(strings.ToLower(parts[0]))
					if strings.HasSuffix(name, rootDomain) {
						uniqueDomains[name] = true
					}
				}
			}
		}
		if htResp != nil {
			htResp.Body.Close()
		}
	}

	var activePublicDomains []string
	for domain := range uniqueDomains {
		if isPublicFacing(domain) {
			activePublicDomains = append(activePublicDomains, domain)
		}
	}

	if len(activePublicDomains) == 0 {
		return nil, fmt.Errorf("no active public subdomains found or rate limited")
	}

	return activePublicDomains, nil
}

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

func isPrivateIP(ip net.IP) bool {
	privateRanges := []string{
		"10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16",
		"127.0.0.0/8", "::1/128", "fc00::/7",
	}
	for _, cidr := range privateRanges {
		_, network, err := net.ParseCIDR(cidr)
		if err == nil && network.Contains(ip) {
			return true
		}
	}
	return false
}
