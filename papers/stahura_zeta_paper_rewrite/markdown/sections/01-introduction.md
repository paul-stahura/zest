[← Contents](../README.md) · [2 Siegel’s 1932 formula →](02-siegel-s-1932-formula.md)

---

<a id="introduction"></a>

## 1 Introduction

Siegel published his study of Riemann’s unpublished papers in 1932 \[21\]. Working through the Nachlaß at Göttingen[^1] he recovered, from calculations Riemann never published, an asymptotic evaluation of ζ by the saddle-point method. The result is what is now called the Riemann–Siegel formula, and it is the starting point of this paper.

This paper does seven things: the five results announced in the abstract, together with the reparameterization they rest on and an account of the geometry from which they came.

**1.** **A reparameterization.** We introduce a change of variable $`t=I(T)`$ that collapses Siegel’s two roles for *t* (the imaginary part of the input and the quantity determining the summation cutoff) into one continuous cutoff parameter *T* (§[3](03-reparameterization-and-cutoff-choice-the-i-t-map.md#sec-IT)). The map $`t=I(T)`$ is exact, while our choice $`m=\lfloor T\rfloor`$ differs from Siegel’s standard cutoff. The Riemann–Siegel identity remains exact with this new cutoff.

**2.** **Two new remainders.** The Riemann–Siegel formula states that $`\zeta = \Sigma_1 + \Sigma_2 + R`$, where $`\Sigma_1,\Sigma_2`$ are finite Dirichlet sums and *R* is a remainder integral. We define two exact remainder terms, *R₁* and *R₂*, and prove

```math
R \;=\; R_1 + R_2,
\qquad\text{hence}\qquad
\zeta \;=\; \Sigma_1 + R_1 + \Sigma_2 + R_2.
```

This is the paper’s central identity, stated and proved as Theorem [4.2](04-decomposing-the-remainder-r-r1-r2.md#thm-decomp) (§[4](04-decomposing-the-remainder-r-r1-r2.md#sec-decomp)). A formalization of its proof in Lean is given in Appendix [B](b-lean-formalization-of-r-r1-r2.md#app-lean-decomp).

**3.** **Just a fractional summand.** The two new remainders are not opaque integrals: each is exactly *one more summand* of its Dirichlet sum, namely the $`(m+1)`$st term, scaled by a real “fractional” weight $`\hat d_1`$ or $`\hat d_2`$ (§[5](05-the-remainders-are-one-more-partial-summand.md#sec-summand)). The exact zeta function thus reduces to the main sum and the dual sum, each carried one fractional summand past its cutoff, with no other remainder term:

```math
\zeta(s)=\sum_{n=1}^m n^{-s} + \hat d_1\,(m+1)^{-s}
        + \chi(s)\sum_{n=1}^m n^{s-1} + \hat d_2\,\chi(s)\,(m+1)^{s-1},
```

which is [(23)](05-the-remainders-are-one-more-partial-summand.md#eq-zeta-clean) of §[5](05-the-remainders-are-one-more-partial-summand.md#sec-summand). The weights are positive on the critical line, where they also coincide, $`d_1=d_2`$, and positive off it outside narrow windows (Proposition [4.1](04-decomposing-the-remainder-r-r1-r2.md#prop-weights), proved in Appendix [A](a-proof-of-proposition-4-1-reality-and-positivity.md#sec-positivity)).

**4.** **Periodicity.** In the variable $`\{T\}`$ the weights repeat one fixed waveform in every unit interval of *T* (§[6](06-periodicity-in-t.md#sec-periodicity)): *d₁* converges to the explicit tangent waveform $`\mathcal W_{\infty}`$ of [(25)](06-periodicity-in-t.md#eq-W-infty), and at fixed fractional part $`\{T\}=x`$ the normalized weight $`\sqrt{m+1}\,d_1`$ converges to a closed-form limit profile $`d(x)`$. The waveform and its limit were first observed geometrically, as the yin and yang curves of §[6.4](06-periodicity-in-t.md#sec-yinyang-inf); only afterwards did we show they can be reached symbolically from a function in Siegel’s paper (§[6.3](06-periodicity-in-t.md#sec-tangent-derivation)).


Periodicity of the weights(detail of Figure [1](06-periodicity-in-t.md#fig-d1-periodicity))\
<img src="../figures/fig_d1_periodicity_strip.png" width="912">


**5.** **Where the insights came from: geometry.** None of this was first derived; it was first *seen*. Drawing the partial-sum chains of ζ as links and joints in the complex plane, and sweeping σ and *T* continuously, is how the mapping $`I(T)`$, the yin-yang curves, the split of *R*, and the weights were found (§[9](09-the-geometry-behind-the-result-experimental-math.md#sec-geometry), §[10](10-geometric-origins-of-the-i-t-and-yin-and-yang-fu.md#sec-geometric-origins)). The bisector point, the two legs it makes with the origin and ζ, and the angles $`\vartheta_1,\vartheta_2`$ organize everything that follows.

**6.** **Loci that confine the zeros.** A zero of ζ requires the two legs to be equal in length *and* folded back onto one another. Off the critical line the equal-leg locus consists of thin ovals, and those ovals are the only places off the line where a zero could possibly lie. A zero also needs the fold angle to reach π there, so showing the two conditions never meet on an oval is yet another possible route to the Riemann hypothesis (§[9.4](09-the-geometry-behind-the-result-experimental-math.md#sec-toward-proof), §[9.5](09-the-geometry-behind-the-result-experimental-math.md#sec-eqleg-density)).

**7.** **A new zero-counting function.** From critical-line information alone we build

```math
N_{\ast}(T)
=\frac{1}{\pi}\arg\Bigl(Z-\frac{iZ'}{\vartheta'}\Bigr)+\frac32,
```

which is [(163)](12-theta1-theta2-and-the-zero-counting-function.md#eq-N-star-prufer) of §[12](12-theta1-theta2-and-the-zero-counting-function.md#sec-counting): unlike the Riemann–von Mangoldt count $`N(t)`$, which counts all zeros in the strip, $`N_{\ast}`$ counts only the zeros on the critical line; it is continuous, increasing under the Riemann hypothesis, and passes an integer exactly where *Z* changes sign (§[12](12-theta1-theta2-and-the-zero-counting-function.md#sec-counting)). $`N(t)`$ is a step function and tells nothing about $`|Z|`$, while the vector behind $`N_{\ast}`$ carries $`|Z|`$ along with the count: its winding gives the zeros and its modulus gives the envelope of $`|Z|`$.


**Riemann–von Mangoldt count $`\textcolor[RGB]{31,119,180}{N(t)}`$, and $`\textcolor[RGB]{44,160,44}{N_{\ast}(T)}`$**\
<img src="../figures/fig_N_Nstar_intro.png">

---

[^1]: The chronology pins the reading to Göttingen, where the Nachlaß is held: Siegel studied it there in the early 1930s (though he didn’t move to Göttingen until 1938) and published in 1932, before his first visit to the Institute for Advanced Study (January–June 1935) and his longer residence there (1940–1951).

---

[← Contents](../README.md) · [2 Siegel’s 1932 formula →](02-siegel-s-1932-formula.md)
