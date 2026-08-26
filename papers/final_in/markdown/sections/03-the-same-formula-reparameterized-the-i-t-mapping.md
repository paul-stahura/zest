[← Contents](../README.md) · [← 2 Siegel’s 1932 decomposition](02-siegel-s-1932-decomposition.md) · [4 Decomposing the remainder: R=R1ps+R2ps →](04-decomposing-the-remainder-r-r1ps-r2ps.md)

---

<a id="sec-IT"></a>

## 3 The same formula, reparameterized: The $`I(T)`$ mapping

We introduce a change-in-variable mapping for *t*:

<a id="eq-IT"></a>

```math
t
\;=\;
\frac{\pi\,\bigl(2\,T + 1\bigr)}{\log\!\bigl(\tfrac{1}{T} + 1\bigr)}
\;=\; I(T),
\qquad
m \;=\; \lfloor T\rfloor .\qquad\text{(10)}
```

Here *T* is a real number, while $`m=\lfloor T\rfloor`$ is an integer. So now *m* and *t* depend on *T*, the reverse of Siegel’s [(9)](02-siegel-s-1932-decomposition.md#eq-siegel-m). The single function *I* therefore determines both the imaginary part of the input and the integer index of summation; for this reason we call *T* “the index” even though it is real.

So now $`s=\sigma+it`$ is the same as

<a id="autoeq-3"></a>

```math
s \;=\; \sigma + i\,I(T),\qquad\text{(11)}
```

and we carry σ and *T* as two separate arguments of ζ. Nothing about the *value* of ζ changes; we have only renamed the variable that generates *t* and *m*. In this notation Siegel’s decomposition [(8)](02-siegel-s-1932-decomposition.md#eq-siegel-named) becomes

<a id="eq-zeta-T"></a>

```math
\zeta(\sigma,T)
=
\Sigma_1 + \Sigma_2 + R,\qquad\text{(12)}
```

where, with $`m=\lfloor T\rfloor`$,

```math
\begin{align}
\Sigma_1(\sigma,T) &= \sum_{n=1}^m
\frac{1}{n^{\,\sigma + i\,I(T)}}, \\[4pt]
\Sigma_2(\sigma,T) &= \chi\!\bigl(\sigma + i\,I(T)\bigr)
\sum_{n=1}^m
\frac{1}{n^{\,1 - \sigma - i\,I(T)}} .
\end{align}
```

Using the identity

<a id="autoeq-4"></a>

```math
\frac{(2\pi)^s e^{\tfrac{\pi i s}{2}}}{\Gamma(s)\bigl(e^{2\pi i s}-1\bigr)}
\;=\;
\frac{\chi(s)}{\,e^{i\pi s}-1\,},\qquad\text{(15)}
```

the remainder becomes

<a id="eq-R-T"></a>

```math
R(\sigma,T)
=
\frac{\chi\!\bigl(\sigma + i\,I(T)\bigr)}{\,e^{\,i\pi (\sigma + i\,I(T))}-1\,}
\int_{C_2} g(x)\,\mathrm{d}x .\qquad\text{(16)}
```

The point of this section is only that [(12)](#eq-zeta-T) *is* [(8)](02-siegel-s-1932-decomposition.md#eq-siegel-named): the reparameterization is an exact identity, not an approximation. Everything that follows takes place inside this reindexed but otherwise unchanged Riemann–Siegel formula.


**Remark 16**. The derivation of $`I(T)`$ and its approximations and inverse are developed in §[10.1](10-i-t-functions.md#sec-IT-origin). The context *behind* the mapping is not needed to state or use [(12)](#eq-zeta-T).

---

[← Contents](../README.md) · [← 2 Siegel’s 1932 decomposition](02-siegel-s-1932-decomposition.md) · [4 Decomposing the remainder: R=R1ps+R2ps →](04-decomposing-the-remainder-r-r1ps-r2ps.md)
