package main

import (
	"math"
	"math/cmplx"

	"github.com/faiface/pixel"
)

const (
	MIN_N      float64 = 100
	MAX_N      float64 = 1000000
	CABS_Z_MAX float64 = 10000.0
	MAX_ITS    int     = 5000
	MAX_GAMMA  float64 = 450
)

var b_coeff = []float64{
	1.0000000000000000000000000000000,
	0.0833333333333333333333333333333,
	-0.0013888888888888888888888888888,
	3.3068783068783068783068783068783e-5,
	-8.2671957671957671957671957671958e-7,
	2.0876756987868098979210090321201e-8,
	-5.2841901386874931848476822021796e-10,
	1.3382536530684678832826980975129e-11,
	-3.3896802963225828668301953912494e-13,
	8.5860620562778445641359054504256e-15,
	-2.1748686985580618730415164238659e-16,
	5.5090028283602295152026526089023e-18,
	-1.3954464685812523340707686264064e-19,
	3.5347070396294674716932299778038e-21,
	-8.9535174266605480875210207537274e-23,
	2.2679524523376830603109507388682e-24,
	-5.7447906688722024452638819876070e-26,
	1.4551724756148649018662648672713e-27,
	-3.6859949406653101781817824799086e-29,
	9.3367342570950446720325551527856e-31,
}

var g_coeff = []float64{
	0.99999999999999709182,
	57.15623566586292351700,
	-59.59796035547549124800,
	14.13609797474174717400,
	-0.491913816097620199780,
	0.33994649984811888699e-4,
	0.46523628927048575665e-4,
	-0.98374475304879564677e-4,
	0.15808870322491248884e-3,
	-0.21026444172410488319e-3,
	0.21743961811521264320e-3,
	-0.16431810653676389022e-3,
	0.84418223983852743293e-4,
	-0.26190838401581408670e-4,
	0.36899182659531622704e-5,
}

func compute(s complex128) complex128 {
	var z, g complex128
	if real(s) < 0.0 {
		if math.Abs(imag(s)) < MAX_GAMMA {
			s = 1.0 - s
			g = complex_gamma(s)
			z = ems(s)
			z *= g * 2.0 * cmplx.Pow(2*math.Pi, -s) * cmplx.Cos(math.Pi/2*s)
		} else {
			z = ems(s)
		}
	} else {
		z = ems(s)
	}
	return z
}

// euler maclaurin summation
func ems(s complex128) complex128 {
	N := cmplx.Abs(s)
	var k int
	var z, t, temp complex128
	if N > MAX_N {
		N = MAX_N
	}
	if N < MIN_N {
		N = MIN_N
	}
	for k = 1; k < int(N); k++ {
		z += cmplx.Pow(complex(float64(k), 0), -s)
	}
	z += cmplx.Pow(complex(N, 0), 1-s)/(s-1) + 0.5*cmplx.Pow(complex(N, 0), -s)
	for k := 1; k < 20; k++ {
		poc := pochhammer(s, (2*k)-1) * cmplx.Pow(complex(N, 0), 1-s-complex(float64(2*k), 0))
		t += complex(b_coeff[k], 0) * poc
		if t-temp == 0.0 {
			break
		}
		temp = t
	}
	return z + t
}

func pochhammer(s complex128, n int) complex128 {
	var i int
	var poch_val complex128 = 1.0
	for i = 0; i < n; i++ {
		poch_val *= (s + complex(float64(i), 0))
	}
	return poch_val
}

func complex_gamma(s complex128) complex128 {
	g := complex(g_coeff[0], 0)
	if real(s) < 0.5 {
		if real(s) == math.Floor(real(s)) && imag(s) == 0.0 {
			return complex(math.Inf(1), 0)
		} else {
			return math.Pi / (cmplx.Sin(s*math.Pi) * complex_gamma(1.0-s))
		}
	} else {
		s -= 1.0
		for i := 1; i < 15; i++ {
			g += complex(g_coeff[i], 0) / (s + complex(float64(i), 0))
		}
		g *= cmplx.Sqrt(2*math.Pi) * cmplx.Pow(s+5.2421875, s+0.5) * cmplx.Exp(complex(-5.2421875, 0)-s)
		return g
	}
}

func spiral(s complex128) []pixel.Vec {
	numLinks := int(imag(s)/math.Pi + 1)
	links := make([]pixel.Vec, numLinks)

	start := pixel.V(0, 0)
	links[0] = start
	i := imag(s)
	r := real(s)

	for l := 1; l < numLinks; l++ {
		x := math.Cos(i*math.Log(float64(l))) / math.Pow(float64(l), r)
		y := -math.Sin(i*math.Log(float64(l))) / math.Pow(float64(l), r)
		end := pixel.V(start.X+x, start.Y+y)

		links[l] = end
		start = end
	}

	return links
}

func imagToIndex(imag float64) float64 {
	//best so far -- this is from Zzrob
	gamma := 0.57721566490153286060651209008240243104215933593992
	e := 2.7182818284590452353602874713526624977572
	gamma_to_the_e := math.Pow(gamma, e) // = .2245172519832320
	two_root_3_pi := 2 * math.Sqrt(3*math.Pi)
	return_this := math.Sqrt(6*gamma_to_the_e/imag+6*imag+math.Pi)/two_root_3_pi - 1.0/2.0

	return (return_this)
}

func indexToImag(n float64) float64 {
	return (n*2 + 1) * math.Pi / (math.Log(n+1) - math.Log(n))
}
