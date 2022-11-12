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

func indexToImag(n float64) float64 {
	return (n*2 + 1) * math.Pi / (math.Log(n+1) - math.Log(n))
}

func imagToIndex(imag float64) float64 {
	gamma := 0.57721566490153286060651209008240243104215933593992
	e := 2.7182818284590452353602874713526624977572
	gamma_to_the_e := math.Pow(gamma, e) // = .2245172519832320
	two_root_3_pi := 2 * math.Sqrt(3*math.Pi)
	return math.Sqrt(6*gamma_to_the_e/imag+6*imag+math.Pi)/two_root_3_pi - 1.0/2.0
}

func reimannSiegel(imag float64) vector2d.Vector {
	v := make(vector2d.Vector, 2)

	vvi := -vv(imag)
	zi := z(imag)

	v[0] = zi * ereal(0, vvi)
	v[1] = zi * eimag(0, vvi)

	return v
}

func spiral(imag float64, numLinks int) []vector2d.Vector {
	// mi := int(imagToIndex(imag))
	// zp := reimannSiegel(imag)
	links := make([]vector2d.Vector, numLinks)
	// mp := vector2d.Vector{}

	start := vector2d.Vector{0, 0}
	links[0] = start

	for i := 1; i < numLinks; i++ {
		ii := float64(i)
		x := math.Cos(imag*math.Log(ii)) / math.Pow(ii, .5)
		y := -math.Sin(imag*math.Log(ii)) / math.Pow(ii, .5)

		end := vector2d.Vector{start[0] + x, start[1] + y}
		links[i] = end
		start = end
	}

	return links
}
