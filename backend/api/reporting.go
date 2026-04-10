package api

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"gradpqc/cbom"
	"gradpqc/db"
	"gradpqc/montecarlo"
	"mime/multipart"
	"net/http"
	"net/smtp"
	"net/textproto"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/xuri/excelize/v2"
)

var nonAlphanumRe = regexp.MustCompile(`[^a-z0-9]+`)

// sanitizeReportName converts "Posture of PQC" → "posture_of_pqc".
func sanitizeReportName(reportType string) string {
	s := strings.ToLower(strings.TrimSpace(reportType))
	s = nonAlphanumRe.ReplaceAllString(s, "_")
	s = strings.Trim(s, "_")
	if s == "" {
		return "report"
	}
	return s
}

// ─── SMTP helpers ────────────────────────────────────────────────────────────

// smtpConfig reads SMTP settings from .env.
// Keys: SMTP_HOST, SMTP_PORT, SMTP_FROM (sender address), SMTP_PASSWORD.
func smtpConfig() (host, port, from, password string) {
	host = os.Getenv("SMTP_HOST")
	port = os.Getenv("SMTP_PORT")
	from = os.Getenv("SMTP_FROM")
	password = os.Getenv("SMTP_PASSWORD")
	if port == "" {
		port = "587"
	}
	return
}

// sendEmailAttachment sends an email with an optional file attachment.
// Pass nil attachment for plain-text only (e.g. test email).
func sendEmailAttachment(to, subject, body, filename string, attachment []byte, mimeType string) error {
	host, port, from, password := smtpConfig()

	if host == "" || from == "" {
		return fmt.Errorf("SMTP not configured – set SMTP_HOST, SMTP_PORT, SMTP_FROM, SMTP_PASSWORD in backend/.env")
	}

	var raw string
	if len(attachment) == 0 {
		raw = fmt.Sprintf(
			"From: GradPQC <%s>\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=utf-8\r\n\r\n%s",
			from, to, subject, body,
		)
	} else {
		var buf bytes.Buffer
		mw := multipart.NewWriter(&buf)

		th := make(textproto.MIMEHeader)
		th.Set("Content-Type", "text/plain; charset=utf-8")
		tw, _ := mw.CreatePart(th)
		fmt.Fprint(tw, body)

		ah := make(textproto.MIMEHeader)
		ah.Set("Content-Type", mimeType)
		ah.Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filepath.Base(filename)))
		ah.Set("Content-Transfer-Encoding", "base64")
		aw, _ := mw.CreatePart(ah)
		fmt.Fprint(aw, base64.StdEncoding.EncodeToString(attachment))
		mw.Close()

		raw = fmt.Sprintf(
			"From: GradPQC <%s>\r\nTo: %s\r\nSubject: %s\r\nMIME-Version: 1.0\r\nContent-Type: multipart/mixed; boundary=%s\r\n\r\n%s",
			from, to, subject, mw.Boundary(), buf.String(),
		)
	}

	auth := smtp.PlainAuth("", from, password, host)
	if err := smtp.SendMail(host+":"+port, auth, from, []string{to}, []byte(raw)); err != nil {
		return fmt.Errorf("smtp.SendMail(%s:%s from=%s) → %w", host, port, from, err)
	}
	return nil
}

// ─── Type-specific report generation ─────────────────────────────────────────

type reportResult struct {
	data     []byte
	filename string
	mimeType string
}

func buildReport(assets []cbom.Asset, reportType, format string) (*reportResult, error) {
	safeName := sanitizeReportName(reportType)
	rt := strings.ToLower(strings.TrimSpace(reportType))

	switch format {
	case "json":
		data, err := buildJSONReport(assets, rt)
		if err != nil {
			return nil, err
		}
		return &reportResult{data, safeName + "_report.json", "application/json"}, nil

	case "excel":
		data, err := buildExcelReport(assets, rt, reportType)
		if err != nil {
			return nil, err
		}
		return &reportResult{
			data, safeName + "_report.xlsx",
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		}, nil

	default:
		return nil, fmt.Errorf("unsupported format: %s", format)
	}
}

// buildJSONReport returns type-specific JSON bytes.
func buildJSONReport(assets []cbom.Asset, reportType string) ([]byte, error) {
	now := time.Now().Format("2006-01-02T15:04:05Z")

	switch reportType {
	case "posture of pqc":
		type postureAsset struct {
			Domain              string  `json:"domain"`
			QuantumStatus       string  `json:"quantum_status"`
			RunwayStatus        string  `json:"runway_status"`
			RunwayDays          int     `json:"runway_days"`
			QMRS                float64 `json:"qmrs"`
			RBICompliance       string  `json:"rbi_compliance"`
			CERTInStatus        string  `json:"certin_status"`
			RecommendedAlgo     string  `json:"recommended_algorithm"`
		}
		out := struct {
			GeneratedAt string         `json:"generated_at"`
			TotalAssets int            `json:"total_assets"`
			ReportType  string         `json:"report_type"`
			Assets      []postureAsset `json:"assets"`
		}{now, len(assets), "Posture of PQC", nil}
		for _, a := range assets {
			out.Assets = append(out.Assets, postureAsset{
				a.Domain, a.QuantumStatus, a.RunwayStatus, a.RunwayDays,
				a.QMRS, a.RBICompliance, a.CERTInStatus, a.RecommendedAlgorithm,
			})
		}
		return json.MarshalIndent(out, "", "  ")

	case "assets discovery":
		type discoveryAsset struct {
			Domain             string `json:"domain"`
			AssetType          string `json:"asset_type"`
			TLSVersion         string `json:"tls_version"`
			CertExpiry         string `json:"cert_expiry"`
			CertDaysRemaining  int    `json:"cert_days_remaining"`
			CryptoAgilityRating string `json:"crypto_agility_rating"`
		}
		out := struct {
			GeneratedAt string           `json:"generated_at"`
			TotalAssets int              `json:"total_assets"`
			ReportType  string           `json:"report_type"`
			Assets      []discoveryAsset `json:"assets"`
		}{now, len(assets), "Assets Discovery", nil}
		for _, a := range assets {
			out.Assets = append(out.Assets, discoveryAsset{
				a.Domain, a.AssetType, a.TLSVersion,
				a.CertExpiry, a.CertDaysRemaining, a.CryptoAgilityRating,
			})
		}
		return json.MarshalIndent(out, "", "  ")

	case "assets inventory":
		type inventoryAsset struct {
			Domain        string `json:"domain"`
			AssetType     string `json:"asset_type"`
			TLSVersion    string `json:"tls_version"`
			KeyExchange   string `json:"key_exchange"`
			KeySize       int    `json:"key_size"`
			PFSAdvertised bool   `json:"pfs_advertised"`
			PFSActual     bool   `json:"pfs_actual"`
			CertExpiry    string `json:"cert_expiry"`
			CertDays      int    `json:"cert_days_remaining"`
			TLSTerminator string `json:"tls_terminator"`
		}
		out := struct {
			GeneratedAt string           `json:"generated_at"`
			TotalAssets int              `json:"total_assets"`
			ReportType  string           `json:"report_type"`
			Assets      []inventoryAsset `json:"assets"`
		}{now, len(assets), "Assets Inventory", nil}
		for _, a := range assets {
			out.Assets = append(out.Assets, inventoryAsset{
				a.Domain, a.AssetType, a.TLSVersion, a.KeyExchange, a.KeySize,
				a.PFSAdvertised, a.PFSActual, a.CertExpiry, a.CertDaysRemaining, a.TLSTerminator,
			})
		}
		return json.MarshalIndent(out, "", "  ")

	case "cyber rating (tiers 1-4)":
		type cyberAsset struct {
			Domain        string  `json:"domain"`
			QMRS          float64 `json:"qmrs"`
			QuantumStatus string  `json:"quantum_status"`
			RunwayStatus  string  `json:"runway_status"`
			RBICompliance string  `json:"rbi_compliance"`
		}
		// compute enterprise score
		total := 0.0
		for _, a := range assets {
			total += a.QMRS
		}
		avg := 0.0
		if len(assets) > 0 {
			avg = total / float64(len(assets))
		}
		out := struct {
			GeneratedAt     string      `json:"generated_at"`
			TotalAssets     int         `json:"total_assets"`
			ReportType      string      `json:"report_type"`
			EnterpriseScore float64     `json:"enterprise_score"`
			Assets          []cyberAsset `json:"assets"`
		}{now, len(assets), "Cyber Rating (Tiers 1-4)", avg, nil}
		for _, a := range assets {
			out.Assets = append(out.Assets, cyberAsset{
				a.Domain, a.QMRS, a.QuantumStatus, a.RunwayStatus, a.RBICompliance,
			})
		}
		return json.MarshalIndent(out, "", "  ")

	case "executive reporting":
		red, amber, pqcReady, rbiViol, highRisk, expiring := 0, 0, 0, 0, 0, 0
		totalQMRS := 0.0
		for _, a := range assets {
			switch a.RunwayStatus {
			case "Red":
				red++
			case "Amber":
				amber++
			}
			if a.QuantumStatus == "PQC-Ready" {
				pqcReady++
			}
			if a.RBICompliance == "Violation" {
				rbiViol++
			}
			if a.QMRS >= 70 {
				highRisk++
			}
			if a.CertDaysRemaining > 0 && a.CertDaysRemaining <= 90 {
				expiring++
			}
			totalQMRS += a.QMRS
		}
		avgQMRS := 0.0
		if len(assets) > 0 {
			avgQMRS = totalQMRS / float64(len(assets))
		}
		out := struct {
			GeneratedAt   string  `json:"generated_at"`
			ReportType    string  `json:"report_type"`
			TotalAssets   int     `json:"total_assets"`
			PQCReady      int     `json:"pqc_ready"`
			RedRunway     int     `json:"red_runway"`
			AmberRunway   int     `json:"amber_runway"`
			RBIViolations int     `json:"rbi_violations"`
			HighRiskAssets int   `json:"high_risk_assets"`
			ExpiringCerts int    `json:"expiring_certs_90d"`
			AvgQMRS       float64 `json:"avg_qmrs"`
		}{now, "Executive Reporting", len(assets), pqcReady, red, amber, rbiViol, highRisk, expiring, avgQMRS}
		return json.MarshalIndent(out, "", "  ")

	default: // "cbom" and anything else → full report
		report := cbom.NewCBOM(assets)
		return json.MarshalIndent(report, "", "  ")
	}
}

// buildExcelReport returns type-specific Excel bytes.
func buildExcelReport(assets []cbom.Asset, reportType, displayType string) ([]byte, error) {
	f := excelize.NewFile()
	sheet := displayType
	if sheet == "" {
		sheet = "CBOM Report"
	}
	f.NewSheet(sheet)
	f.DeleteSheet("Sheet1")

	// Header style
	headerStyle, err := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Color: "FFFFFF", Size: 11},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"1B3A6B"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center", WrapText: true},
	})
	if err != nil {
		return nil, fmt.Errorf("header style: %w", err)
	}
	greenStyle, _ := f.NewStyle(&excelize.Style{Fill: excelize.Fill{Type: "pattern", Color: []string{"E2EFDA"}, Pattern: 1}})
	amberStyle, _ := f.NewStyle(&excelize.Style{Fill: excelize.Fill{Type: "pattern", Color: []string{"FFF2CC"}, Pattern: 1}})
	redStyle, _ := f.NewStyle(&excelize.Style{Fill: excelize.Fill{Type: "pattern", Color: []string{"FCE4D6"}, Pattern: 1}})

	writeHeaders := func(headers []string) {
		for i, h := range headers {
			cell, _ := excelize.CoordinatesToCellName(i+1, 1)
			f.SetCellValue(sheet, cell, h)
			f.SetCellStyle(sheet, cell, cell, headerStyle)
		}
	}

	writeRow := func(row int, values []interface{}) {
		for i, v := range values {
			cell, _ := excelize.CoordinatesToCellName(i+1, row)
			f.SetCellValue(sheet, cell, v)
		}
	}

	colorCell := func(col, row int, status string) {
		cell, _ := excelize.CoordinatesToCellName(col, row)
		switch status {
		case "Green", "Compliant", "PQC-Ready":
			f.SetCellStyle(sheet, cell, cell, greenStyle)
		case "Amber", "Advisory":
			f.SetCellStyle(sheet, cell, cell, amberStyle)
		case "Red", "Violation":
			f.SetCellStyle(sheet, cell, cell, redStyle)
		}
	}

	switch reportType {
	case "posture of pqc":
		writeHeaders([]string{"Domain", "Quantum Status", "Runway Status", "Runway Days", "QMRS Score", "RBI Compliance", "CERT-In Status", "Recommended Algorithm"})
		for i, a := range assets {
			r := i + 2
			writeRow(r, []interface{}{a.Domain, a.QuantumStatus, a.RunwayStatus, a.RunwayDays, a.QMRS, a.RBICompliance, a.CERTInStatus, a.RecommendedAlgorithm})
			colorCell(2, r, a.QuantumStatus)
			colorCell(3, r, a.RunwayStatus)
			colorCell(6, r, a.RBICompliance)
		}

	case "assets discovery":
		writeHeaders([]string{"Domain", "Asset Type", "TLS Version", "Cert Expiry", "Cert Days Remaining", "Crypto Agility"})
		for i, a := range assets {
			r := i + 2
			writeRow(r, []interface{}{a.Domain, a.AssetType, a.TLSVersion, a.CertExpiry, a.CertDaysRemaining, a.CryptoAgilityRating})
		}

	case "assets inventory":
		writeHeaders([]string{"Domain", "Asset Type", "TLS Version", "Key Exchange", "Key Size", "PFS Advertised", "PFS Actual", "Cert Expiry", "Cert Days Remaining", "TLS Terminator"})
		for i, a := range assets {
			r := i + 2
			writeRow(r, []interface{}{a.Domain, a.AssetType, a.TLSVersion, a.KeyExchange, a.KeySize, a.PFSAdvertised, a.PFSActual, a.CertExpiry, a.CertDaysRemaining, a.TLSTerminator})
		}

	case "cyber rating (tiers 1-4)":
		writeHeaders([]string{"Domain", "QMRS Score", "Quantum Status", "Runway Status", "RBI Compliance", "CERT-In Status"})
		for i, a := range assets {
			r := i + 2
			writeRow(r, []interface{}{a.Domain, a.QMRS, a.QuantumStatus, a.RunwayStatus, a.RBICompliance, a.CERTInStatus})
			colorCell(3, r, a.QuantumStatus)
			colorCell(4, r, a.RunwayStatus)
			colorCell(5, r, a.RBICompliance)
		}

	case "executive reporting":
		// Summary sheet – one row per metric
		writeHeaders([]string{"Metric", "Value"})
		red, amber, pqcReady, rbiViol, highRisk, expiring := 0, 0, 0, 0, 0, 0
		totalQMRS := 0.0
		for _, a := range assets {
			switch a.RunwayStatus {
			case "Red":
				red++
			case "Amber":
				amber++
			}
			if a.QuantumStatus == "PQC-Ready" {
				pqcReady++
			}
			if a.RBICompliance == "Violation" {
				rbiViol++
			}
			if a.QMRS >= 70 {
				highRisk++
			}
			if a.CertDaysRemaining > 0 && a.CertDaysRemaining <= 90 {
				expiring++
			}
			totalQMRS += a.QMRS
		}
		avgQMRS := 0.0
		if len(assets) > 0 {
			avgQMRS = totalQMRS / float64(len(assets))
		}
		metrics := [][]interface{}{
			{"Total Assets", len(assets)},
			{"PQC-Ready Assets", pqcReady},
			{"Red Runway (Immediate Action)", red},
			{"Amber Runway (Monitor & Plan)", amber},
			{"RBI Violations", rbiViol},
			{"High Risk Assets", highRisk},
			{"Certificates Expiring ≤90d", expiring},
			{"Average QMRS Score", fmt.Sprintf("%.1f", avgQMRS)},
		}
		for i, m := range metrics {
			writeRow(i+2, m)
		}

	default: // CBOM full report
		return cbom.ExportExcelBytes(cbom.NewCBOM(assets))
	}

	// freeze header, auto-fit columns
	f.SetPanes(sheet, &excelize.Panes{Freeze: true, YSplit: 1, TopLeftCell: "A2", ActivePane: "bottomLeft"})

	var buf bytes.Buffer
	if err := f.Write(&buf); err != nil {
		return nil, fmt.Errorf("excel write: %w", err)
	}
	return buf.Bytes(), nil
}

// ─── Schedule handler ─────────────────────────────────────────────────────────

// ScheduleRequest is the JSON body for POST /api/reports/schedule.
type ScheduleRequest struct {
	ReportType    string `json:"reportType"`
	Frequency     string `json:"frequency"`
	Assets        string `json:"assets"`
	DeliveryEmail string `json:"email"`
	Time          string `json:"time"`
}

func setCORSHeaders(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
}

func HandleScheduleReport(w http.ResponseWriter, r *http.Request) {
	setCORSHeaders(w)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req ScheduleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON: "+err.Error(), http.StatusBadRequest)
		return
	}

	_, err := db.DB.Exec(
		`INSERT INTO scheduled_reports (report_type, frequency, assets_scope, delivery_email, scheduled_time)
		 VALUES (?, ?, ?, ?, ?)`,
		req.ReportType, req.Frequency, req.Assets, req.DeliveryEmail, req.Time,
	)
	if err != nil {
		http.Error(w, "Failed to save schedule: "+err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{
		"message":   "Report scheduled successfully",
		"frequency": req.Frequency,
		"time":      req.Time,
		"email":     req.DeliveryEmail,
	})
}

// ─── Download handler ─────────────────────────────────────────────────────────

func HandleDownloadReport(w http.ResponseWriter, r *http.Request) {
	setCORSHeaders(w)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		ReportType string `json:"reportType"`
		Format     string `json:"format"`
		Email      string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON: "+err.Error(), http.StatusBadRequest)
		return
	}

	format := strings.ToLower(strings.TrimSpace(req.Format))

	assets, err := db.FetchLatestResults()
	if err != nil {
		http.Error(w, "Failed to fetch scan results: "+err.Error(), http.StatusInternalServerError)
		return
	}
	if len(assets) == 0 {
		http.Error(w, "No scan results found. Run a scan first.", http.StatusNotFound)
		return
	}
	for i := range assets {
		montecarlo.ComputeMonteCarlo(&assets[i])
	}

	result, err := buildReport(assets, req.ReportType, format)
	if err != nil {
		if strings.HasPrefix(err.Error(), "unsupported format") {
			http.Error(w, err.Error(), http.StatusBadRequest)
		} else {
			http.Error(w, "Failed to generate report: "+err.Error(), http.StatusInternalServerError)
		}
		return
	}

	email := strings.TrimSpace(req.Email)
	if email != "" {
		subject := fmt.Sprintf("GradPQC %s Report", req.ReportType)
		body := fmt.Sprintf(
			"Your on-demand GradPQC report is attached.\n\nReport: %s\nFormat: %s\n\nGenerated by GradPQC – PNB Cybersecurity Hackathon 2026\nNIST IR 8547 | RBI Cyber Security Framework Aligned",
			req.ReportType, strings.ToUpper(format),
		)
		if err := sendEmailAttachment(email, subject, body, result.filename, result.data, result.mimeType); err != nil {
			http.Error(w, "Failed to send email: "+err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"message": "Report sent successfully to " + email,
		})
		return
	}

	w.Header().Set("Content-Type", result.mimeType)
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, result.filename))
	w.Header().Set("Cache-Control", "no-cache")
	w.Write(result.data)
}

// ─── Cron scheduler ───────────────────────────────────────────────────────────

func StartCronScheduler() {
	ticker := time.NewTicker(1 * time.Minute)
	go func() {
		for range ticker.C {
			runScheduledReports()
		}
	}()
	fmt.Println("[cron] scheduled-report engine started (interval: 1 min)")
}

type scheduledRow struct {
	ID            int
	ReportType    string
	Frequency     string
	AssetsScope   string
	DeliveryEmail string
	ScheduledTime string
}

func runScheduledReports() {
	ist := time.FixedZone("IST", 5*60*60+30*60)
	now := time.Now().In(ist)
	currentHHMM := fmt.Sprintf("%02d:%02d", now.Hour(), now.Minute())

	rows, err := db.DB.Query(`
		SELECT id, report_type, frequency, assets_scope, delivery_email, scheduled_time
		FROM scheduled_reports
		WHERE delivery_email != ''
		  AND (last_sent_at IS NULL OR last_sent_at < DATE_SUB(NOW(), INTERVAL 23 HOUR))
	`)
	if err != nil {
		fmt.Printf("[cron] db query error: %v\n", err)
		return
	}
	defer rows.Close()

	found := 0
	for rows.Next() {
		found++
		var sr scheduledRow
		if err := rows.Scan(&sr.ID, &sr.ReportType, &sr.Frequency, &sr.AssetsScope, &sr.DeliveryEmail, &sr.ScheduledTime); err != nil {
			fmt.Printf("[cron] scan error: %v\n", err)
			continue
		}
		fmt.Printf("[cron] checking id=%d type=%q freq=%q scheduledAt=%q now=%q IST\n",
			sr.ID, sr.ReportType, sr.Frequency, sr.ScheduledTime, currentHHMM)

		if !isReportDue(sr.Frequency, sr.ScheduledTime, currentHHMM, now) {
			fmt.Printf("[cron] id=%d not due (need %s, now %s IST)\n", sr.ID, sr.ScheduledTime, currentHHMM)
			continue
		}
		if err := dispatchScheduledReport(sr); err != nil {
			fmt.Printf("[cron] FAILED id=%d → %s: %v\n", sr.ID, sr.DeliveryEmail, err)
			continue
		}
		db.DB.Exec("UPDATE scheduled_reports SET last_sent_at = NOW() WHERE id = ?", sr.ID)
		fmt.Printf("[cron] OK – sent %s %s → %s\n", sr.Frequency, sr.ReportType, sr.DeliveryEmail)
	}
	if found == 0 {
		fmt.Printf("[cron] no pending reports at %s IST\n", currentHHMM)
	}
}

func isReportDue(frequency, scheduledTime, currentHHMM string, now time.Time) bool {
	if scheduledTime != currentHHMM {
		return false
	}
	switch strings.ToLower(frequency) {
	case "daily":
		return true
	case "weekly":
		return now.Weekday() == time.Monday
	case "monthly":
		return now.Day() == 1
	}
	return false
}

func dispatchScheduledReport(sr scheduledRow) error {
	assets, err := db.FetchLatestResults()
	if err != nil {
		return fmt.Errorf("fetch scan results: %w", err)
	}
	if len(assets) == 0 {
		return fmt.Errorf("no scan results (run a scan first)")
	}
	for i := range assets {
		montecarlo.ComputeMonteCarlo(&assets[i])
	}

	result, err := buildReport(assets, sr.ReportType, "json")
	if err != nil {
		return fmt.Errorf("build report: %w", err)
	}

	subject := fmt.Sprintf("GradPQC Scheduled Report: %s (%s)", sr.ReportType, sr.Frequency)
	body := fmt.Sprintf(
		"Your %s scheduled %s report is attached.\n\nScope: %s\n\nGenerated by GradPQC – PNB Cybersecurity Hackathon 2026.\nNIST IR 8547 | RBI Cyber Security Framework Aligned.",
		sr.Frequency, sr.ReportType, sr.AssetsScope,
	)
	return sendEmailAttachment(sr.DeliveryEmail, subject, body, result.filename, result.data, result.mimeType)
}

// ─── Test email endpoint ──────────────────────────────────────────────────────

// HandleTestEmail handles POST /api/reports/test-email.
// Body: { "email": "test@example.com" }
func HandleTestEmail(w http.ResponseWriter, r *http.Request) {
	setCORSHeaders(w)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusOK)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Email == "" {
		http.Error(w, "Invalid JSON or missing email field", http.StatusBadRequest)
		return
	}

	host, port, from, pass := smtpConfig()
	fmt.Printf("[test-email] SMTP_HOST=%q SMTP_PORT=%q SMTP_FROM=%q SMTP_PASSWORD_SET=%v\n",
		host, port, from, pass != "")

	testBody := "This is a GradPQC SMTP test email.\n\nIf you receive this, SMTP is configured correctly.\n\nGradPQC – PNB Cybersecurity Hackathon 2026"
	if err := sendEmailAttachment(req.Email, "GradPQC SMTP Test", testBody, "", nil, ""); err != nil {
		fmt.Printf("[test-email] FAILED: %v\n", err)
		http.Error(w, "SMTP test failed: "+err.Error(), http.StatusInternalServerError)
		return
	}

	fmt.Printf("[test-email] OK → %s\n", req.Email)
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Test email sent to " + req.Email})
}
