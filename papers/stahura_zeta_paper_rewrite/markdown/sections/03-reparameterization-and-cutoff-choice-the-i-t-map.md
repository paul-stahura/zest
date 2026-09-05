[← Contents](../README.md) · [← 2 Siegel’s 1932 formula](02-siegel-s-1932-formula.md) · [4 Decomposing the remainder: R=R1+R2 →](04-decomposing-the-remainder-r-r1-r2.md)

---

<a id="sec-IT"></a>

## 3 Reparameterization and cutoff choice: The $`I(T)`$ mapping

Unless a statement explicitly gives a larger domain, assume throughout that $`T>0`$, $`0<\sigma<1`$, $`t=I(T)`$, and $`s=\sigma+it`$.

We introduce a change-of-variable mapping for *t*, and with it fix the variables used for the rest of the paper:

<a id="eq-IT"></a>

```math
t
\;=\;
\frac{\pi\,\bigl(2\,T + 1\bigr)}{\log\!\bigl(\tfrac{1}{T} + 1\bigr)}
\;=\; I(T),
\qquad
s=\sigma+it,
\qquad
m \;=\; \lfloor T\rfloor,
\qquad
M \;=\; \lceil T\rceil,\qquad\text{(9)}
```

For non-integer *T*, $`M=m+1`$ and is the index of the next omitted summand. At integer *T*, $`M=m`$ and refers instead to the last included summand. All “next summand” statements below are therefore restricted to non-integer *T* or interpreted through one-sided limits. Here *T* is a real number, while $`m=\lfloor T\rfloor`$ is an integer. So now *m* and *t* depend on *T*, the reverse of Siegel’s [(8)](02-siegel-s-1932-formula.md#eq-siegel-m). The single function *I* therefore determines both the imaginary part of the input and the integer summation cutoff; for this reason we call *T* “the index” even though it is real.

<a id="rem-T-vs-a"></a>


**Remark 3.1**. The index is similar to, but not exactly, the classical Riemann–Siegel cutoff $`\sqrt{t/2\pi}`$. Expanding the logarithm in [(9)](#eq-IT) gives

```math
\frac{I(T)}{2\pi}
\;=\;T^2+T+\tfrac16+O\!\bigl(\tfrac1{T^2}\bigr)
\;=\;\Bigl(T+\tfrac12\Bigr)^2-\tfrac1{12}+O\!\bigl(\tfrac1{T^2}\bigr),
```

and taking square roots,

```math
\sqrt{\tfrac t{2\pi}}
\;=\;T+\tfrac12-\frac{1}{24\,(T+\tfrac12)}+O\!\bigl(\tfrac1{T^3}\bigr).
```

So *T* is approximately, but not exactly, $`\sqrt{t/2\pi}-\tfrac12`$, and the approximation improves as *T* grows: the difference between $`T+\tfrac12`$ and $`\sqrt{t/2\pi}`$ is $`O(1/T)`$, with explicit leading term $`\tfrac1{24}(T+\tfrac12)^{-1}`$. (At $`T=6`$, for instance, $`\sqrt{t/2\pi}=6.4936`$ while $`T+\tfrac12-\tfrac1{24\cdot6.5}=6.4936`$ as well.)


The abbreviations of [(9)](#eq-IT) are in force for the rest of the paper: every object below depends on σ and *T* through them, and we do not carry the arguments. In this notation Siegel’s formula [(7)](02-siegel-s-1932-formula.md#eq-siegel-named) becomes

<a id="eq-zeta-T"></a>

```math
\zeta
=
\Sigma_1 + \Sigma_2 + R,\qquad\text{(10)}
```

where

<a id="autoeq-10"></a>

<a id="autoeq-11"></a>

```math
\begin{align}
\Sigma_1 &= \sum_{n=1}^m n^{-s}
\quad\text{(the main sum)},\qquad\text{(11)}\\[4pt]
\Sigma_2 &= \chi(s)
\sum_{n=1}^m n^{\,s-1}
\quad\text{(the dual sum)},\qquad\text{(12)}
\end{align}
```

where $`s=\sigma+i\,I(T)`$ and $`m=\lfloor T\rfloor`$. Using the identity

<a id="autoeq-3"></a>

```math
\frac{(2\pi)^s e^{\tfrac{\pi i s}{2}}}{\Gamma(s)\bigl(e^{2\pi i s}-1\bigr)}
\;=\;
\frac{\chi(s)}{\,e^{i\pi s}-1\,},\qquad\text{(13)}
```

the remainder becomes

<a id="eq-R-T"></a>

```math
R
=
\frac{\chi(s)}{\,e^{\,i\pi s}-1\,}
\int_{C_2} g(x)\,\mathrm{d}x ,\qquad\text{(14)}
```

where $`s=\sigma+i\,I(T)`$.

For any integer $`q\geq0`$, let

```math
R_q(s):=\zeta(s)-\sum_{n=1}^qn^{-s}
-\chi(s)\sum_{n=1}^qn^{s-1}.
```

Siegel’s standard choice is $`q=\lfloor\sqrt{t/(2\pi)}\rfloor`$, whereas here $`t=I(T)`$ and $`q=m=\lfloor T\rfloor`$; below we write $`R:=R_m`$. Thus the map $`t=I(T)`$ is exact, but the construction combines that exact reparameterization with a change from Siegel’s standard cutoff.

---

[← Contents](../README.md) · [← 2 Siegel’s 1932 formula](02-siegel-s-1932-formula.md) · [4 Decomposing the remainder: R=R1+R2 →](04-decomposing-the-remainder-r-r1-r2.md)
