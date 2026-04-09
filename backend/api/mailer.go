package api

import (
	"fmt"
	"gradpqc/db"
	"log"
	"net/smtp"
	"os"
	"strconv"
	"strings"
	"time"
)

// lastSent tracks the last send time per scheduled_report id to prevent duplicate sends.
var lastSent = map[int64]time.Time{}

// StartScheduler launches a background goroutine that checks scheduled reports every minute.
func StartScheduler() {
	ticker := time.NewTicker(1 * time.Minute)
	go func() {
		for range ticker.C {
			runScheduledReports()
		}
	}()
	log.Println("[Scheduler] Started — checking every minute")
}

func runScheduledReports() {
	rows, err := db.DB.Query(
		"SELECT id, report_type, frequency, delivery_email, scheduled_time FROM scheduled_reports",
	)
	if err != nil {
		log.Printf("[Scheduler] DB query error: %v", err)
		return
	}
	defer rows.Close()

	now := time.Now()

	for rows.Next() {
		var id int64
		var reportType, frequency, email, scheduledTime string
		if err := rows.Scan(&id, &reportType, &frequency, &email, &scheduledTime); err != nil {
			continue
		}

		if !shouldSend(id, frequency, scheduledTime, now) {
			continue
		}

		if err := sendReportEmail(email, reportType); err != nil {
			log.Printf("[Scheduler] Failed to send %s to %s: %v", reportType, email, err)
		} else {
			lastSent[id] = now
			log.Printf("[Scheduler] Sent '%s' to %s", reportType, email)
		}
	}
}

// shouldSend returns true when the current minute matches the scheduled time
// and sufficient time has passed since the last send for the given frequency.
func shouldSend(id int64, frequency, scheduledTime string, now time.Time) bool {
	parts := strings.Split(scheduledTime, ":")
	if len(parts) < 2 {
		return false
	}
	hour, err1 := strconv.Atoi(strings.TrimSpace(parts[0]))
	minute, err2 := strconv.Atoi(strings.TrimSpace(parts[1]))
	if err1 != nil || err2 != nil {
		return false
	}

	if now.Hour() != hour || now.Minute() != minute {
		return false
	}

	last, sent := lastSent[id]
	if !sent {
		return true
	}

	elapsed := now.Sub(last)
	switch strings.ToLower(frequency) {
	case "daily":
		return elapsed >= 23*time.Hour
	case "weekly":
		return elapsed >= 6*24*time.Hour
	case "monthly":
		return elapsed >= 28*24*time.Hour
	}
	return false
}

// sendReportEmail builds and sends an HTML email with a summary of the latest scan data.
func sendReportEmail(to, reportType string) error {
	host := os.Getenv("SMTP_HOST")
	port := os.Getenv("SMTP_PORT")
	from := os.Getenv("SMTP_FROM")
	password := os.Getenv("SMTP_PASSWORD")

	if host == "" || from == "" {
		return fmt.Errorf("SMTP not configured: set SMTP_HOST and SMTP_FROM in .env")
	}
	if port == "" {
		port = "587"
	}

	body, err := buildEmailBody(reportType)
	if err != nil {
		return fmt.Errorf("building email body: %w", err)
	}

	msg := []byte(
		"From: " + from + "\r\n" +
			"To: " + to + "\r\n" +
			"Subject: GradPQC Scheduled Report: " + reportType + "\r\n" +
			"MIME-Version: 1.0\r\n" +
			"Content-Type: text/html; charset=\"utf-8\"\r\n" +
			"\r\n" +
			body,
	)

	auth := smtp.PlainAuth("", from, password, host)
	return smtp.SendMail(host+":"+port, auth, from, []string{to}, msg)
}

func buildEmailBody(reportType string) (string, error) {
	assets, err := db.FetchLatestResults()
	if err != nil {
		return "", err
	}
	if len(assets) == 0 {
		return fmt.Sprintf(
			`<html><body style="font-family:Arial,sans-serif">
<h2 style="color:#8B1A1A">GradPQC Scheduled Report: %s</h2>
<p>No scan data available yet.</p></body></html>`, reportType,
		), nil
	}

	total := len(assets)
	pqcReady, critical, rbiViolations := 0, 0, 0
	for _, a := range assets {
		if a.QuantumStatus == "PQC-Ready" {
			pqcReady++
		}
		if a.QMRS >= 90 {
			critical++
		}
		if a.RBICompliance == "Violation" {
			rbiViolations++
		}
	}

	var rows strings.Builder
	for _, a := range assets {
		rows.WriteString(fmt.Sprintf(
			`<tr><td style="padding:5px 10px">%s</td><td style="padding:5px 10px">%s</td>`+
				`<td style="padding:5px 10px">%.1f</td><td style="padding:5px 10px">%s</td>`+
				`<td style="padding:5px 10px">%s</td><td style="padding:5px 10px">%s</td></tr>`,
			a.Domain, a.AssetType, a.QMRS, a.QuantumStatus, a.RunwayStatus, a.RBICompliance,
		))
	}

	return fmt.Sprintf(`<html><body style="font-family:Arial,sans-serif;font-size:13px;color:#111">
<h2 style="color:#8B1A1A">GradPQC Scheduled Report: %s</h2>
<p style="color:#666">Generated: %s</p>
<table style="border-collapse:collapse;width:100%%">
  <thead><tr style="background:#8B1A1A;color:white">
    <th style="padding:6px 10px;text-align:left">Domain</th>
    <th style="padding:6px 10px;text-align:left">Type</th>
    <th style="padding:6px 10px;text-align:left">QMRS</th>
    <th style="padding:6px 10px;text-align:left">Quantum Status</th>
    <th style="padding:6px 10px;text-align:left">Runway</th>
    <th style="padding:6px 10px;text-align:left">RBI Compliance</th>
  </tr></thead>
  <tbody>%s</tbody>
</table>
<p><strong>Total Assets:</strong> %d &nbsp;|&nbsp;
   <strong>PQC-Ready:</strong> %d &nbsp;|&nbsp;
   <strong>Critical Risk:</strong> %d &nbsp;|&nbsp;
   <strong>RBI Violations:</strong> %d</p>
<hr/><p style="color:#999;font-size:11px">PNB Cybersecurity · GradPQC Quantum Migration Intelligence</p>
</body></html>`,
		reportType,
		time.Now().Format("2006-01-02 15:04:05 IST"),
		rows.String(),
		total, pqcReady, critical, rbiViolations,
	), nil
}
