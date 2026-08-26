[← Contents](../README.md) · [← 1 Introduction](01-introduction.md) · [3 The same formula, reparameterized: The I(… →](03-the-same-formula-reparameterized-the-i-t-mapping.md)

---

<a id="sec-siegel"></a>

## 2 Siegel’s 1932 decomposition

We begin with the Riemann–Siegel decomposition of $`\zeta(s)`$ into two finite Dirichlet sums plus a remainder integral, as it appears in Siegel’s 1932 paper \[20\] (his equation 13):

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
\int_{C_2} g(x)\,\mathrm{d}x,\qquad\text{(2)}
```

where the path *C₂* consists of two half-lines meeting at the point $`\eta\bigl(1-\tfrac{\epsilon}{2}\bigr)`$ for a small fixed $`\epsilon>0`$, one half-line passing through the saddle point $`\eta=+\sqrt{t/2\pi}`$ and the other through $`-(m+\tfrac12)`$, and *g* is defined below.

It is convenient to name the three pieces. Recall the completion factor

<a id="autoeq-1"></a>

```math
\chi(s) \;:=\; 2^s\pi^{s-1}\sin\!\Bigl(\tfrac{\pi s}{2}\Bigr)\Gamma(1-s)
\;=\;
\frac{(2\pi)^s}{2\,\Gamma(s)\,\cos\!\bigl(\tfrac{\pi s}{2}\bigr)},\qquad\text{(3)}
```

so that, writing $`s=\sigma+it`$ and taking the first *m* terms,

```math
\begin{align}
\Sigma_1(s) &\;:=\; \sum_{n=1}^m n^{-s}, \\[2pt]
\Sigma_2(s) &\;:=\; \frac{(2\pi)^s}{2\,\Gamma(s)\,\cos\!\bigl(\tfrac{\pi s}{2}\bigr)}
\sum_{n=1}^m n^{s-1}
= \chi(s)\sum_{n=1}^m n^{s-1}, \\[2pt]
R(s) &\;:=\; \frac{(2\pi)^s e^{\tfrac{\pi i s}{2}}}{\Gamma(s)\,\bigl(e^{2\pi i s}-1\bigr)}
\int_{C_2} g(x)\,\mathrm{d}x,
\end{align}
```

where

<a id="autoeq-2"></a>

```math
g(x)\;:=\;x^{s-1}\,\frac{e^{-2\pi i m x}}{e^{2\pi i x}-1}.\qquad\text{(7)}
```

With these names, [(2)](#eq-siegel13) reads

<a id="eq-siegel-named"></a>

```math
\zeta(s) = \Sigma_1 + \Sigma_2 + R.\qquad\text{(8)}
```

In Siegel’s formulation *m* is the index of summation, and to minimize the remainder he takes

<a id="eq-siegel-m"></a>

```math
m=\left\lfloor\sqrt{\tfrac{t}{2\pi}}\right\rfloor .\qquad\text{(9)}
```

Thus *t* plays two roles at once: it is the imaginary part of the input *s*, and, through [(9)](#eq-siegel-m), it also fixes the number of terms *m*. In this way *m* depends on *t*. The next section reverses the dependency.

---

[← Contents](../README.md) · [← 1 Introduction](01-introduction.md) · [3 The same formula, reparameterized: The I(… →](03-the-same-formula-reparameterized-the-i-t-mapping.md)
