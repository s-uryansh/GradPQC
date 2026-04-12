package scoring

import "gradpqc/cbom"

type Weights struct {
	QES float64
	DES float64
	MCS float64
}

var DefaultWeights = Weights{
	QES: 0.50,
	DES: 0.30,
	MCS: 0.20,
}

func ComputeQMRS(asset *cbom.Asset, w Weights) {
	asset.QMRS = ((asset.QESNorm * w.QES) +
		(asset.DESNorm * w.DES) +
		(asset.MCSNorm * w.MCS)) * 100
}
