[← Contents](../README.md) · [← 1 Introduction](01-introduction.md) · [3 Reparameterization and cutoff choice: The… →](03-reparameterization-and-cutoff-choice-the-i-t-map.md)

---

<a id="sec-siegel"></a>

## 2 Siegel’s 1932 formula

We begin with the Riemann–Siegel formula, which expresses $`\zeta(s)`$ as two finite Dirichlet sums plus a remainder integral, as it appears in Siegel’s 1932 paper \[21\] (his equation 13):

<a id="eq-siegel13"></a>

```math
\zeta(s)
=
\sum_{n=1}^m n^{-s}
\;+\;
\frac{(2\pi)^s}{2\,\Gamma(s)\,\cos\!\bigl(\tfrac{\pi s}{2}\bigr)}
\sum_{n=1}^m n^{s-1}
\;+\;
\frac{(2\pi)^s e^{\tfrac{\pi i s}{2}}}{\Gamma(s)\,\bigl(e^{2\pi i s}-1\bigr)}
\int_{C_2} g(x)\,\mathrm{d}x,\qquad\text{(1)}
```

where *m* is an integer cutoff, fixed below in [(8)](#eq-siegel-m), and in Siegel’s notation $`\epsilon=e^{-\pi i/4}=(1-i)/\sqrt2`$. The oriented path *C₂* consists of two half-lines meeting at $`\eta\bigl(1-\tfrac{\epsilon}{2}\bigr)`$, with $`\eta=+\sqrt{t/2\pi}`$ the saddle point; one half-line passes through η, the other through $`-(m+\tfrac12)`$, and *g* is defined below.

It is convenient to name the three pieces. Recall the functional-equation factor

<a id="autoeq-1"></a>

```math
\chi(s) \;:=\; 2^s\pi^{s-1}\sin\!\Bigl(\tfrac{\pi s}{2}\Bigr)\Gamma(1-s)
\;=\;
\frac{(2\pi)^s}{2\,\Gamma(s)\,\cos\!\bigl(\tfrac{\pi s}{2}\bigr)},\qquad\text{(2)}
```

so that, writing $`s=\sigma+it`$ and taking the first *m* terms,

<a id="autoeq-7"></a>

<a id="autoeq-8"></a>

<a id="autoeq-9"></a>

```math
\begin{align}
\Sigma_1(s) &\;:=\; \sum_{n=1}^m n^{-s}
\quad\text{(the main sum)},\qquad\text{(3)}\\[2pt]
\Sigma_2(s) &\;:=\; \frac{(2\pi)^s}{2\,\Gamma(s)\,\cos\!\bigl(\tfrac{\pi s}{2}\bigr)}
\sum_{n=1}^m n^{s-1}
= \chi(s)\sum_{n=1}^m n^{s-1}
\quad\text{(the dual sum)},\qquad\text{(4)}\\[2pt]
R(s) &\;:=\; \frac{(2\pi)^s e^{\tfrac{\pi i s}{2}}}{\Gamma(s)\,\bigl(e^{2\pi i s}-1\bigr)}
\int_{C_2} g(x)\,\mathrm{d}x,\qquad\text{(5)}
\end{align}
```

where

<a id="autoeq-2"></a>

```math
g(x)\;:=\;x^{s-1}\,\frac{e^{-2\pi i m x}}{e^{2\pi i x}-1}.\qquad\text{(6)}
```

With these names, [(1)](#eq-siegel13) reads

<a id="eq-siegel-named"></a>

```math
\zeta(s) = \Sigma_1 + \Sigma_2 + R.\qquad\text{(7)}
```

In Siegel’s formulation *m* is the summation cutoff, and to minimize the remainder he takes

<a id="eq-siegel-m"></a>

```math
m=\left\lfloor\sqrt{\tfrac{t}{2\pi}}\right\rfloor .\qquad\text{(8)}
```

Thus *t* plays two roles at once: it is the imaginary part of the input *s*, and, through [(8)](#eq-siegel-m), it also fixes the number of terms *m*. In this way *m* depends on *t*. The next section reverses the dependency.

---

[← Contents](../README.md) · [← 1 Introduction](01-introduction.md) · [3 Reparameterization and cutoff choice: The… →](03-reparameterization-and-cutoff-choice-the-i-t-map.md)
