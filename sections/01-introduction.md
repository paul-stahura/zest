[← Contents](../README.md) · [2 Siegel’s 1932 decomposition →](02-siegel-s-1932-decomposition.md)

---

<a id="introduction"></a>

## 1 Introduction

Siegel published his study of Riemann’s unpublished papers in 1932 \[20\]. Working through the Nachlaß at The Institute for Advanced Study he recovered, from calculations Riemann never published, an asymptotic evaluation of ζ by the saddle-point method. Thus he found the famous Riemann–Siegel formula. That formula is the starting point of this paper.

This paper makes three claims, in increasing order of importance.

**1.** **A reparameterization.** We introduce a change of variable $`t=I(T)`$ that collapses Siegel’s two roles for *t* (the imaginary part of the input and the index of summation) into a single real “index” *T*. With this substitution the Riemann–Siegel formula is unchanged in value; it is the *same* formula, viewed through a different variable, *T*, instead of *t*.

**2.** **A decomposition of the remainder.** The Riemann–Siegel formula states that $`\zeta = \Sigma_1 + \Sigma_2 + R`$, where $`\Sigma_1,\Sigma_2`$ are finite Dirichlet sums and *R* is a remainder integral. In this paper we define two exact remainder terms, $`R_{1ps}`$ and $`R_{2ps}`$, and prove

<a id="eq-main"></a>

```math
R \;=\; R_{1ps} + R_{2ps},
\qquad\text{hence}\qquad
\zeta \;=\; \Sigma_1 + R_{1ps} + \Sigma_2 + R_{2ps}.\qquad\text{(1)}
```

Equation [(1)](#eq-main) is our main result.

**3.** **An interpretation.** The two new remainders are not opaque integrals: each is exactly *one more summand* of its Dirichlet sum, namely the $`(m+1)`$st term, scaled by a real “fractional” weight $`\hat d_1`$ or $`\hat d_2`$, always positive on the critical line and positive elsewhere outside narrow windows around the poles of §[8.4](08-the-positive-real-function-d1-and-its-periodicit.md#sec-pole-locations), as proved in §[8.5](08-the-positive-real-function-d1-and-its-periodicit.md#sec-d1-positive). In this sense the remainder is simply the partial sum carried one fractional step further.

We show that on the critical line $`\sigma=\tfrac12`$ the two weights coincide, $`d_1=d_2`$; we give a proof in §[8](08-the-positive-real-function-d1-and-its-periodicit.md#sec-d1-function) and we provide the proof formally verified in Lean at the end of the paper.

<a id="origin-of-the-result-"></a>

##### Origin of the result.

The decomposition [(1)](#eq-main) was not found analytically. It emerged from experimental mathematics: plotting the partial sums of ζ as a sequence of Euler-like spirals in the complex plane and studying their geometry with a visualization tool we have developed (and published) over several years. These spirals have precedent. Erickson \[8\] plots the partial sums, identifies the shapes as Cornu spirals, labels their centers $`C_n`$, finds $`C_0=\zeta(s)`$, and traces the symmetry he sees among the $`C_n`$ back to the approximate functional equation. Nickel \[16, 17\] studies the same Argand diagram of the steps $`n^{-s}`$ geometrically, pairing each early step with a conjugate region of linked Euler (Cornu) spirals, recovering the functional equation from that symmetry and locating zeros where two vectors point in opposite directions with equal magnitudes, which happens exactly when $`\sigma=\tfrac12`$. Kapitonets \[11\] names the polyline of steps the Riemann spiral and works with its signed radius of curvature, its reverse points and its inflection points. That geometric story (the spirals, a local coordinate frame, and what we call the “yin” and “yang” curves that actually produce $`R_{1ps}`$ and $`R_{2ps}`$) is deferred to §[9](09-the-geometry-behind-the-result-experimental-math.md#sec-geometry) and §[11](11-the-yin-and-yang-curves.md#sec-yinyang), so that the reader sees the clean algebraic result first and its experimental origin second.

<a id="roadmap-"></a>

##### Roadmap.

§[2](02-siegel-s-1932-decomposition.md#sec-siegel) recalls Siegel’s 1932 decomposition. §[3](03-the-same-formula-reparameterized-the-i-t-mapping.md#sec-IT) introduces the mapping $`I(T)`$ and shows the reparameterized formula is identical to the Riemann–Siegel formula. §[4](04-decomposing-the-remainder-r-r1ps-r2ps.md#sec-decomp) defines $`R_{1ps},R_{2ps}`$ and proves [(1)](#eq-main). §[5](05-the-remainders-are-one-more-partial-summand.md#sec-summand) establishes the “one more partial summand” interpretation, and §[6](06-summands-as-links-and-joints.md#sec-matrix-product) recasts each partial sum together with its remainder as a product of homogeneous transformation matrices, one per link, the remainder entering as one extra fractional link. §[7](07-other-remainders.md#sec-other-remainders) discusses other remainders. §[8](08-the-positive-real-function-d1-and-its-periodicit.md#sec-d1-function) studies the weight *d₁* as a function of the index: its handoff jumps, two exactly continuous coordinates built from it, and zeta-free closed-form approximations on and off the critical line. §[9](09-the-geometry-behind-the-result-experimental-math.md#sec-geometry) tells the experimental/geometric story behind the result. §[10](10-i-t-functions.md#sec-IT-functions) collects the $`I(T)`$ functions, including the bisector-frame origin of $`I(T)`$ and variants for *L*-functions. §[11](11-the-yin-and-yang-curves.md#sec-yinyang) develops the yin and yang curves from which the weights *d₁* and *d₂* were derived, and proves their common limit curve as $`T\to\infty`$. §[12](12-general-yin-and-yang-and-the-d1-and-d2-formulas.md#sec-general-yinyang) extends those curves and the weights $`d_1,d_2`$ from the bisector pair to every link, and writes the crossing walks $`\Sigma_{1x}`$ and $`\Sigma_{2x}`$. §[13](13-theta1-theta2-and-the-zero-counting-function.md#sec-counting) turns the leg angles ϑ₁ and ϑ₂ into a zero-counting function on the critical line. §[14](14-further-observations.md#sec-consequences) collects further observations. §[15](15-prior-literature.md#sec-prior-lit) reviews the connection of this paper to other literature. §[16](16-statements-left-unproved.md#sec-unproved) lists statements we would like to prove but have not. A glossary of the geometric vocabulary, with a short dictionary to names used by other authors, follows as §[17](17-glossary.md#sec-glossary).

---

[← Contents](../README.md) · [2 Siegel’s 1932 decomposition →](02-siegel-s-1932-decomposition.md)
