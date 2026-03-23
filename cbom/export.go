package cbom

import (
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/xuri/excelize/v2"
)

func ExportJSON(c *CBOM, path string) error {
	data, err := json.MarshalIndent(c, "", "  ")
	if err != nil {
		return fmt.Errorf("json marshal failed: %w", err)
	}
	return os.WriteFile(path, data, 0644)
}

func ExportExcel(c *CBOM, path string) error {
	f := excelize.NewFile()
	sheet := "CBOM Report"
	f.NewSheet(sheet)
	f.DeleteSheet("Sheet1")

	headers := []string{
		"Domain",
		"Asset Type",
		"TLS Version",
		"Cipher Suite",
		"Key Exchange",
		"Cert Signature Algorithm",
		"Key Size",
		"PFS Advertised",
		"PFS Actual",
		"PFS Note",
		"Cert Expiry",
		"Cert Days Remaining",
		"HNDL Exposure Days",
		"TLS Terminator",
		"Terminator Source",
		"Crypto Agility",
		"Quantum Status",
		"QES Score",
		"DES Score",
		"DES Confidence",
		"MCS Class",
		"MCS Confidence",
		"QMRS Score",
		"RBI Compliance",
		"CERT-In Status",
		"Deprecation Date",
		"Runway Days",
		"Runway Status",
		"Recommended Algorithm",
		"Action",
	}

	// header style
	headerStyle, err := f.NewStyle(&excelize.Style{
		Font: &excelize.Font{
			Bold:  true,
			Color: "FFFFFF",
			Size:  11,
		},
		Fill: excelize.Fill{
			Type:    "pattern",
			Color:   []string{"1B3A6B"},
			Pattern: 1,
		},
		Alignment: &excelize.Alignment{
			Horizontal: "center",
			WrapText:   true,
		},
	})
	if err != nil {
		return fmt.Errorf("header style failed: %w", err)
	}

	// status styles
	greenStyle, _ := f.NewStyle(&excelize.Style{
		Fill: excelize.Fill{Type: "pattern", Color: []string{"E2EFDA"}, Pattern: 1},
	})
	amberStyle, _ := f.NewStyle(&excelize.Style{
		Fill: excelize.Fill{Type: "pattern", Color: []string{"FFF2CC"}, Pattern: 1},
	})
	redStyle, _ := f.NewStyle(&excelize.Style{
		Fill: excelize.Fill{Type: "pattern", Color: []string{"FCE4D6"}, Pattern: 1},
	})

	// write headers
	for i, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 1)
		f.SetCellValue(sheet, cell, h)
		f.SetCellStyle(sheet, cell, cell, headerStyle)
	}

	// write rows
	for rowIdx, asset := range c.Assets {
		row := rowIdx + 2
		values := []interface{}{
			asset.Domain,
			asset.AssetType,
			asset.TLSVersion,
			asset.CipherSuite,
			asset.KeyExchange,
			asset.CertSignatureAlgorithm,
			asset.KeySize,
			asset.PFSAdvertised,
			asset.PFSActual,
			asset.PFSNote,
			asset.CertExpiry,
			asset.CertDaysRemaining,
			asset.HNDLExposureDays,
			asset.TLSTerminator,
			asset.TLSTerminatorSource,
			asset.CryptoAgilityRating,
			asset.QuantumStatus,
			asset.QESRaw,
			asset.DESRaw,
			asset.DESConf,
			asset.MCSClass,
			asset.MCSConf,
			asset.QMRS,
			asset.RBICompliance,
			asset.CERTInStatus,
			asset.DeprecationDate,
			asset.RunwayDays,
			asset.RunwayStatus,
			asset.RecommendedAlgorithm,
			asset.Action,
		}

		for colIdx, val := range values {
			cell, _ := excelize.CoordinatesToCellName(colIdx+1, row)
			f.SetCellValue(sheet, cell, val)
		}

		// colour the runway status cell (column 28)
		runwayCell, _ := excelize.CoordinatesToCellName(28, row)
		switch asset.RunwayStatus {
		case "Green":
			f.SetCellStyle(sheet, runwayCell, runwayCell, greenStyle)
		case "Amber":
			f.SetCellStyle(sheet, runwayCell, runwayCell, amberStyle)
		case "Red":
			f.SetCellStyle(sheet, runwayCell, runwayCell, redStyle)
		}

		// colour RBI compliance cell (column 24)
		rbiCell, _ := excelize.CoordinatesToCellName(24, row)
		switch asset.RBICompliance {
		case "Compliant":
			f.SetCellStyle(sheet, rbiCell, rbiCell, greenStyle)
		case "Advisory":
			f.SetCellStyle(sheet, rbiCell, rbiCell, amberStyle)
		case "Violation":
			f.SetCellStyle(sheet, rbiCell, rbiCell, redStyle)
		}
	}

	// set column widths
	colWidths := map[string]float64{
		"A": 30, "B": 16, "C": 12, "D": 40, "E": 18,
		"F": 28, "G": 10, "H": 14, "I": 12, "J": 45,
		"K": 14, "L": 18, "M": 18, "N": 20, "O": 18,
		"P": 16, "Q": 16, "R": 12, "S": 12, "T": 16,
		"U": 12, "V": 16, "W": 12, "X": 16, "Y": 16,
		"Z": 16, "AA": 14, "AB": 14, "AC": 35, "AD": 60,
	}
	for col, width := range colWidths {
		f.SetColWidth(sheet, col, col, width)
	}

	// freeze header row
	f.SetPanes(sheet, &excelize.Panes{
		Freeze:      true,
		YSplit:      1,
		TopLeftCell: "A2",
		ActivePane:  "bottomLeft",
	})

	return f.SaveAs(path)
}

func NewCBOM(assets []Asset) *CBOM {
	return &CBOM{
		GeneratedAt: time.Now().Format("2006-01-02T15:04:05Z"),
		TotalAssets: len(assets),
		Assets:      assets,
	}
}
