package api

import (
	"encoding/json"
	"gradpqc/db"
	"net/http"
)

type ScheduleRequest struct {
	ReportType    string `json:"reportType"`
	Frequency     string `json:"frequency"`
	Assets        string `json:"assets"`
	DeliveryEmail string `json:"email"`
	Time          string `json:"time"`
}

func HandleScheduleReport(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == http.MethodOptions {
		return
	}

	var req ScheduleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	_, err := db.DB.Exec(
		"INSERT INTO scheduled_reports (report_type, frequency, assets_scope, delivery_email, scheduled_time) VALUES (?, ?, ?, ?, ?)",
		req.ReportType, req.Frequency, req.Assets, req.DeliveryEmail, req.Time,
	)

	if err != nil {
		http.Error(w, "Failed to save schedule", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]string{"message": "Report scheduled successfully"})
}
