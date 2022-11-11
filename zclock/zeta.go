package main

import (
	"math"
	"zclock/vector2d"
)

func v(t float64) int {
	return int(math.Floor(math.Sqrt(t / (2 * math.Pi))))
}

func vv(t float64) float64 {
	return t/2*math.Log(t/(2*math.Pi)) - t/2.0 - math.Pi/8 +
		1/(48*t) + 7/(5760*math.Pow(t, 3)) + 31/(80640*math.Pow(t, 5))
}

func tt(t float64) float64 {
	return math.Sqrt(t/(2.0*math.Pi)) - float64(v(t))
}

func phi(t float64) float64 {
	return math.Cos(2*math.Pi*(t*t-t-1.0/16.0)) / math.Cos((2 * math.Pi * t))
}

func c0(t float64) float64 {
	return phi(tt(t))
}

func c2(t float64) float64 {
	return 0
}

func ereal(a, b float64) float64 {
	return math.Pow(math.E, a) * math.Cos(b)
}

func eimag(a, b float64) float64 {
	return math.Pow(math.E, a) * math.Sin(b)
}

func z(t float64) float64 {
	a := 0.0
	for k := 0; k < v(t); k++ {
		a += 1.0 / math.Sqrt(float64(k)+1.0) * math.Cos(vv(t)-t*math.Log(float64(k)+1))
	}

	b := math.Pow(-1, float64(v(t))-1) * math.Pow(2*math.Pi/t, .25) *
		(c0(t) + math.Sqrt(2*math.Pi/t)*c2(t))

	return 2*a + b
}

func reimannSiegel(imag float64) vector2d.Vector {
	v := make(vector2d.Vector, 2)

	vvi := -vv(imag)
	zi := z(imag)

	v[0] = zi * ereal(0, vvi)
	v[1] = zi * eimag(0, vvi)

	return v
}
