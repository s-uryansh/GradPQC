package scoring

import "gradpqc/cbom"

type terminatorProfile struct {
	Class      string
	LeadDays   int
	Confidence string
}

var terminatorMCS = map[string]terminatorProfile{
	"Nginx":            {Class: "A", LeadDays: 30, Confidence: "HIGH"},
	"Apache":           {Class: "A", LeadDays: 30, Confidence: "HIGH"},
	"AWS ALB":          {Class: "B", LeadDays: 90, Confidence: "HIGH"},
	"Citrix NetScaler": {Class: "D", LeadDays: 450, Confidence: "HIGH"},
	"F5 BIG-IP":        {Class: "D", LeadDays: 450, Confidence: "HIGH"},
	"Unknown":          {Class: "D", LeadDays: 450, Confidence: "LOW"},
}

var mcsNormMap = map[string]float64{
	"A": 0.0,
	"B": 0.33,
	"C": 0.66,
	"D": 1.0,
}

func ComputeMCS(asset *cbom.Asset) int {
	if asset.TLSTerminator == "" {
		asset.TLSTerminator = "Unknown"
	}

	profile, ok := terminatorMCS[asset.TLSTerminator]
	if !ok {
		profile = terminatorMCS["Unknown"]
	}

	asset.MCSClass = profile.Class
	asset.MCSNorm = mcsNormMap[profile.Class]
	asset.MCSConf = profile.Confidence

	return profile.LeadDays
}
