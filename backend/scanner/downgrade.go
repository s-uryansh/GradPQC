package scanner

import (
	"crypto/tls"
	"fmt"
	"gradpqc/cbom"
	"net"
	"time"
)

var downgradeVersions = []struct {
	version uint16
	label   string
}{
	{tls.VersionTLS10, "TLS 1.0"},
	{tls.VersionTLS11, "TLS 1.1"},
	{tls.VersionTLS12, "TLS 1.2"},
}

func TestDowngrade(asset *cbom.Asset) {
	host, port := splitHostPort(asset.Domain)

	for _, attempt := range downgradeVersions {
		if tlsVersionUint(asset.TLSVersion) <= attempt.version {
			continue
		}

		accepted, err := tryVersion(host, port, attempt.version)
		if err != nil {
			continue
		}
		if accepted {
			asset.DowngradeVulnerable = true
			asset.LowestAcceptedTLS = attempt.label
			asset.PFSNote = fmt.Sprintf(
				"Downgrade accepted: server negotiated %s despite advertising %s",
				attempt.label, asset.TLSVersion,
			)
			return
		}
	}

	asset.DowngradeVulnerable = false
	asset.LowestAcceptedTLS = asset.TLSVersion
}

func tlsVersionUint(version string) uint16 {
	switch version {
	case "TLS 1.0":
		return tls.VersionTLS10
	case "TLS 1.1":
		return tls.VersionTLS11
	case "TLS 1.2":
		return tls.VersionTLS12
	case "TLS 1.3":
		return tls.VersionTLS13
	default:
		return tls.VersionTLS13
	}
}

func tryVersion(host, port string, maxVersion uint16) (bool, error) {
	conf := &tls.Config{
		InsecureSkipVerify: true,
		ServerName:         host,
		MinVersion:         maxVersion,
		MaxVersion:         maxVersion,
	}

	dialer := &net.Dialer{Timeout: dialTimeout}
	rawConn, err := dialer.Dial("tcp", net.JoinHostPort(host, port))
	if err != nil {
		return false, err
	}
	defer rawConn.Close()

	tlsConn := tls.Client(rawConn, conf)
	tlsConn.SetDeadline(time.Now().Add(dialTimeout))

	err = tlsConn.Handshake()
	if err != nil {
		return false, nil
	}

	tlsConn.Close()
	return true, nil
}
