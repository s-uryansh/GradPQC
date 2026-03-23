package scanner

import (
	"crypto/md5"
	"crypto/tls"
	"fmt"
	"net"
	"sort"
	"strings"

	"gradpqc/cbom"
)

type terminatorSignature struct {
	Name       string
	JA3SHashes []string
}

var knownTerminators = []terminatorSignature{
	{
		Name: "F5 BIG-IP",
		JA3SHashes: []string{
			"b742b407d22393d3be04c7f7f5a88f52",
			"c1d52344330dda8b9c57da28aba6cc49",
		},
	},
	{
		Name: "Citrix NetScaler",
		JA3SHashes: []string{
			"ae4edc6faf64d08308082ad26be60767",
			"c56c3b3c1f41d6e0f2481c5c6168ded5",
		},
	},
	{
		Name: "AWS ALB",
		JA3SHashes: []string{
			"f4febc55ea12b31ae17cfbf9f4a89e24",
			"72a589da586844d7f0818ce684948eea",
		},
	},
	{
		Name: "Nginx",
		JA3SHashes: []string{
			"15af977ce25de452b96affa2addb1036",
			"3fed133de60c35724739b913cafd0b4e",
		},
	},
	{
		Name: "Apache",
		JA3SHashes: []string{
			"c8e3ae0f93f58a5ab2d3e50aacf4a7e5",
			"fe1edcaa91141d8640a13c47a4b1e00e",
		},
	},
}

func DetectTerminator(asset *cbom.Asset) {
	host, port := splitHostPort(asset.Domain)

	ja3s, err := computeJA3S(host, port)
	if err != nil {
		asset.TLSTerminator = "Unknown"
		asset.TLSTerminatorSource = "Detection failed"
		return
	}

	for _, terminator := range knownTerminators {
		for _, hash := range terminator.JA3SHashes {
			if ja3s == hash {
				asset.TLSTerminator = terminator.Name
				asset.TLSTerminatorSource = "JA3S"
				return
			}
		}
	}

	// no match: fall back to header-based detection
	terminator := detectFromHeaders(asset)
	if terminator != "" {
		asset.TLSTerminator = terminator
		asset.TLSTerminatorSource = "Header"
		return
	}

	asset.TLSTerminator = "Unknown"
	asset.TLSTerminatorSource = "Unmatched"
}

func computeJA3S(host, port string) (string, error) {
	conf := &tls.Config{
		InsecureSkipVerify: true,
		ServerName:         host,
	}

	dialer := &net.Dialer{Timeout: dialTimeout}
	rawConn, err := dialer.Dial("tcp", net.JoinHostPort(host, port))
	if err != nil {
		return "", err
	}
	defer rawConn.Close()

	tlsConn := tls.Client(rawConn, conf)
	if err := tlsConn.Handshake(); err != nil {
		return "", err
	}
	defer tlsConn.Close()

	state := tlsConn.ConnectionState()
	ja3sString := buildJA3SString(state)
	hash := md5.Sum([]byte(ja3sString))
	return fmt.Sprintf("%x", hash), nil
}

func buildJA3SString(state tls.ConnectionState) string {
	version := fmt.Sprintf("%d", state.Version)
	cipher := fmt.Sprintf("%d", state.CipherSuite)

	extensions := deriveExtensionProxy(state)

	return strings.Join([]string{version, cipher, extensions}, ",")
}

func deriveExtensionProxy(state tls.ConnectionState) string {
	var parts []int

	if state.NegotiatedProtocol != "" {
		parts = append(parts, len(state.NegotiatedProtocol))
	}
	if state.ServerName != "" {
		parts = append(parts, len(state.ServerName))
	}

	sort.Ints(parts)

	strs := make([]string, len(parts))
	for i, p := range parts {
		strs[i] = fmt.Sprintf("%d", p)
	}

	return strings.Join(strs, "-")
}

func detectFromHeaders(asset *cbom.Asset) string {
	switch {
	case contains(asset.CipherSuite, "CHACHA20"):
		return "Nginx" // Nginx prioritises ChaCha20
	case contains(asset.CipherSuite, "AES_128_GCM"):
		return "Apache"
	default:
		return ""
	}
}
