package scanner

import (
	"crypto/ecdsa"
	"crypto/rsa"
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"gradpqc/cbom"
	"net"
	"strings"
	"time"
)

const defaultPort = "443"
const dialTimeout = 10 * time.Second

func ScanTarget(domain string) (*cbom.Asset, error) {
	asset := &cbom.Asset{Domain: domain}

	host, port := splitHostPort(domain)

	tlsConf := &tls.Config{
		InsecureSkipVerify: true, // audit, not verify
		ServerName:         host,
	}

	conn, err := dialTLS(host, port, tlsConf)
	if err != nil {
		return nil, fmt.Errorf("tls dial failed: %w", err)
	}
	defer conn.Close()

	state := conn.ConnectionState()

	asset.TLSVersion = tlsVersionString(state.Version)
	asset.CipherSuite = tls.CipherSuiteName(state.CipherSuite)
	asset.PFSAdvertised = hasPFS(asset.CipherSuite)

	if len(state.PeerCertificates) > 0 {
		populateCertFields(asset, state.PeerCertificates[0])
	}
	asset.TLSTerminator = fetchServerHeader(host, port)
	asset.TLSTerminatorSource = "Header-probe"
	asset.KeyExchange = extractKeyExchange(asset.CipherSuite)
	asset.AssetType = detectAssetType(domain, port)

	return asset, nil
}

func dialTLS(host, port string, conf *tls.Config) (*tls.Conn, error) {
	dialer := &net.Dialer{Timeout: dialTimeout}
	rawConn, err := dialer.Dial("tcp", net.JoinHostPort(host, port))
	if err != nil {
		return nil, err
	}

	tlsConn := tls.Client(rawConn, conf)
	if err := tlsConn.Handshake(); err != nil {
		rawConn.Close()
		return nil, err
	}

	return tlsConn, nil
}

func populateCertFields(asset *cbom.Asset, cert *x509.Certificate) {
	asset.CertExpiry = cert.NotAfter.Format("2006-01-02")
	asset.CertIssueDate = cert.NotBefore.Format("2006-01-02")
	asset.CertDaysRemaining = int(time.Until(cert.NotAfter).Hours() / 24)

	asset.CertSignatureAlgorithm = cert.SignatureAlgorithm.String()
	asset.KeySize = certKeySize(cert)

	asset.HNDLExposureDays = int(time.Since(cert.NotBefore).Hours() / 24)
}

func tlsVersionString(version uint16) string {
	switch version {
	case tls.VersionTLS10:
		return "TLS 1.0"
	case tls.VersionTLS11:
		return "TLS 1.1"
	case tls.VersionTLS12:
		return "TLS 1.2"
	case tls.VersionTLS13:
		return "TLS 1.3"
	default:
		return fmt.Sprintf("Unknown(0x%04x)", version)
	}
}

func hasPFS(cipherSuite string) bool {
	pfsSuites := []string{"ECDHE", "DHE", "TLS_AES", "TLS_CHACHA20"}
	for _, s := range pfsSuites {
		if contains(cipherSuite, s) {
			return true
		}
	}
	return false
}
func fetchServerHeader(host, port string) string {
	conf := &tls.Config{
		InsecureSkipVerify: true,
		ServerName:         host,
	}

	dialer := &net.Dialer{Timeout: dialTimeout}
	rawConn, err := dialer.Dial("tcp", net.JoinHostPort(host, port))
	if err != nil {
		return ""
	}
	defer rawConn.Close()

	tlsConn := tls.Client(rawConn, conf)
	if err := tlsConn.Handshake(); err != nil {
		return ""
	}
	defer tlsConn.Close()

	// send minimal HTTP request to get Server header
	fmt.Fprintf(tlsConn, "HEAD / HTTP/1.0\r\nHost: %s\r\n\r\n", host)

	buf := make([]byte, 1024)
	tlsConn.SetDeadline(time.Now().Add(5 * time.Second))
	n, _ := tlsConn.Read(buf)

	response := string(buf[:n])
	for _, line := range strings.Split(response, "\r\n") {
		if strings.HasPrefix(strings.ToLower(line), "server:") {
			return strings.TrimSpace(line[7:])
		}
	}
	return ""
}
func extractKeyExchange(cipherSuite string) string {
	switch {
	case contains(cipherSuite, "ECDHE_RSA"):
		return "ECDHE-RSA"
	case contains(cipherSuite, "ECDHE_ECDSA"):
		return "ECDHE-ECDSA"
	case contains(cipherSuite, "DHE_RSA"):
		return "DHE-RSA"
	case contains(cipherSuite, "RSA"):
		return "RSA"
	case contains(cipherSuite, "TLS_AES"):
		return "X25519 (TLS 1.3)"
	case contains(cipherSuite, "TLS_CHACHA20"):
		return "X25519 (TLS 1.3)"
	default:
		return "Unknown"
	}
}

func certKeySize(cert *x509.Certificate) int {
	switch pub := cert.PublicKey.(type) {
	case *rsa.PublicKey:
		return pub.N.BitLen()
	case *ecdsa.PublicKey:
		return pub.Curve.Params().BitSize
	default:
		return 0
	}
}

func detectAssetType(domain, port string) string {
	vpnPaths := []string{"vpn", "remote", "sslvpn", "globalprotect"}
	for _, p := range vpnPaths {
		if contains(domain, p) {
			return "TLS-VPN-Portal"
		}
	}
	if port == "500" || port == "4500" {
		return "IPsec-Endpoint"
	}
	apiPaths := []string{"api", "gateway", "service", "backend"}
	for _, p := range apiPaths {
		if contains(domain, p) {
			return "API"
		}
	}
	return "Web"
}

func splitHostPort(target string) (string, string) {
	host, port, err := net.SplitHostPort(target)
	if err != nil {
		return target, defaultPort
	}
	return host, port
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) &&
		(s == substr ||
			len(s) > 0 && containsHelper(s, substr))
}

func containsHelper(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
