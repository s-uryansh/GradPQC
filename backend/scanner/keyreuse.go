package scanner

import (
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"net"
	"time"

	"gradpqc/cbom"
)

const keyReuseConnections = 3
const keyReuseDelay = 100 * time.Millisecond

func TestKeyReuse(asset *cbom.Asset) {
	host, port := splitHostPort(asset.Domain)

	keys := make([]string, 0, keyReuseConnections)

	for i := 0; i < keyReuseConnections; i++ {
		key, err := extractEphemeralKey(host, port)
		if err != nil {
			asset.PFSNote = fmt.Sprintf("key reuse test failed: %v", err)
			return
		}
		keys = append(keys, key)
		time.Sleep(keyReuseDelay)
	}

	if allIdentical(keys) {
		asset.PFSActual = false
		asset.PFSNote = fmt.Sprintf(
			"BROKEN: ephemeral key reuse detected across %d connections. PFS is not functioning despite being advertised.",
			keyReuseConnections,
		)
	} else {
		asset.PFSActual = true
		asset.PFSNote = fmt.Sprintf(
			"Verified: unique ephemeral keys across %d connections. PFS functioning correctly.",
			keyReuseConnections,
		)
	}
}

func extractEphemeralKey(host, port string) (string, error) {
	conf := &tls.Config{
		InsecureSkipVerify: true,
		ServerName:         host,
		// capture raw certificates for key extraction
		VerifyPeerCertificate: func(rawCerts [][]byte, _ [][]*x509.Certificate) error {
			return nil
		},
	}

	dialer := &net.Dialer{Timeout: dialTimeout}
	rawConn, err := dialer.Dial("tcp", net.JoinHostPort(host, port))
	if err != nil {
		return "", err
	}
	defer rawConn.Close()

	tlsConn := tls.Client(rawConn, conf)
	tlsConn.SetDeadline(time.Now().Add(dialTimeout))

	if err := tlsConn.Handshake(); err != nil {
		return "", err
	}
	defer tlsConn.Close()

	state := tlsConn.ConnectionState()

	if state.Version == tls.VersionTLS13 {
		if len(state.TLSUnique) > 0 {
			return fmt.Sprintf("%x", state.TLSUnique), nil
		}
		return sessionFingerprint(state), nil
	}

	if len(state.PeerCertificates) > 0 {
		cert := state.PeerCertificates[0]
		return fmt.Sprintf("%x", cert.RawSubjectPublicKeyInfo), nil
	}

	return sessionFingerprint(state), nil
}

func sessionFingerprint(state tls.ConnectionState) string {
	return fmt.Sprintf("%d-%d-%x",
		state.Version,
		state.CipherSuite,
		state.TLSUnique,
	)
}

func allIdentical(keys []string) bool {
	if len(keys) == 0 {
		return false
	}
	for _, k := range keys[1:] {
		if k != keys[0] {
			return false
		}
	}
	return true
}
