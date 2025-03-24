package zeta

import (
	"math"
	"math/cmplx"
)

const (
	minN      = 100
	maxN      = 1000000
	twoPi     = math.Pi * 2
	sqrtTwoPi = 2.506628274631000502415765284811045253006986740609938316629923576 // math.Sqrt(twoPi)
	cabsZMax  = 10000.0
	maxIts    = 5000
	maxGamma  = 450
)

var bCoeff = []float64{
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

var gCoeff = []float64{
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

// EulerMaclauren computes the Riemann zeta function using the Euler-Maclaurin formula
func EulerMaclauren(s complex128) complex128 {
	if real(s) < 0.0 {
		if math.Abs(imag(s)) < maxGamma {
			s = 1.0 - s
			g := complexGamma(s)
			z := ems(s)
			z *= g * 2.0 * cmplx.Pow(complex(twoPi, 0), -s) * cmplx.Cos(complex(math.Pi/2*real(s), 0))
			return z
		}
		return ems(s)
	}
	return ems(s)
}

// ems implements the Euler-Maclaurin summation
func ems(s complex128) complex128 {
	n := int(cmplx.Abs(s))
	if n > maxN {
		n = maxN
	}
	if n < minN {
		n = minN
	}

	var z complex128
	for k := 1; k < n; k++ {
		z += cmplx.Pow(complex(float64(k), 0), -s)
	}

	z += cmplx.Pow(complex(float64(n), 0), 1-s)/(s-1) + 0.5*cmplx.Pow(complex(float64(n), 0), -s)

	var t, temp complex128
	for k := 1; k < 20; k++ {
		t += complex(bCoeff[k], 0) * pochhammer(s, (2*k)-1) * cmplx.Pow(complex(float64(n), 0), 1-s-complex(float64(2*k), 0))
		if t == temp {
			break
		}
		temp = t
	}
	return z + t
}

// pochhammer computes the Pochhammer symbol (rising factorial)
func pochhammer(s complex128, n int) complex128 {
	poch := complex(1.0, 0)
	for i := 0; i < n; i++ {
		poch *= s + complex(float64(i), 0)
	}
	return poch
}

// complexGamma computes the complex gamma function
func complexGamma(s complex128) complex128 {
	if real(s) < 0.5 {
		if imag(s) == 0 && real(s) == math.Floor(real(s)) {
			return complex(math.Inf(1), 0)
		}
		return complex(math.Pi, 0) / (cmplx.Sin(s*complex(math.Pi, 0)) * complexGamma(1.0-s))
	}

	s -= 1.0
	g := complex(gCoeff[0], 0)
	for i := 1; i < 15; i++ {
		g += complex(gCoeff[i], 0) / (s + complex(float64(i), 0))
	}
	g *= complex(sqrtTwoPi, 0) * cmplx.Pow(s+complex(5.2421875, 0), s+complex(0.5, 0)) * cmplx.Exp(-complex(5.2421875, 0)-s)
	return g
}

// Iterate performs iteration of the zeta function
func Iterate(s complex128, epsilon float64) int {
	if epsilon == 0 {
		epsilon = 1e-15
	}

	i := 0
	var cabsZ float64
	diff := 100.0
	var z complex128

	for diff > epsilon && cabsZ < cabsZMax && i < maxIts {
		z = EulerMaclauren(s)
		diff = math.Abs(real(z) - real(s))
		cabsZ = cmplx.Abs(z)
		i++
		s = z
	}

	if cabsZ >= cabsZMax {
		if real(z) < 0.0 {
			i++
		} else {
			i += 2
		}
	}

	return i
}

// IndexToImag converts an index to imaginary part
func IndexToImag(index float64) float64 {
	return (index*2 + 1) * math.Pi / (math.Log(index+1) - math.Log(index))
}

// ImagToIndex converts imaginary part to index
func ImagToIndex(imag float64) float64 {
	gamma := 0.57721566490153286060651209008240243104215933593992
	e := 2.7182818284590452353602874713526624977572
	gammaToTheE := math.Pow(gamma, e)
	twoRoot3Pi := 2 * math.Sqrt(3*math.Pi)
	return math.Sqrt(6*gammaToTheE/imag+6*imag+math.Pi)/twoRoot3Pi - 1.0/2.0
}
