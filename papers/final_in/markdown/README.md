<a id="top"></a>

# The Riemann–Siegel Remainder as a Fractional Summand

**Paul Stahura** — `paul+zeta@stahura.net`

## Abstract

Starting from the Riemann–Siegel decomposition of $`\zeta(s)`$ given in Siegel’s 1932 paper, we introduce a change of variable, $`t=I(T)`$, that replaces Siegel’s coupled pair “imaginary part *t* / summation index *m*” with one real index *T*. We then split Siegel’s single remainder integral *R* into two exact pieces, $`R_{1ps}`$ and $`R_{2ps}`$, and prove that $`R = R_{1ps}+R_{2ps}`$, so that

```math
\zeta \;=\; \Sigma_1 + R_{1ps} + \Sigma_2 + R_{2ps}.
```

Our central observation is that each of these remainders is nothing more than *one additional, fractional partial summand* appended to its Dirichlet sum:

```math
\zeta(s)=\sum_{n=1}^m n^{-s} + \hat d_1\,(m+1)^{-s}
        + \chi(s)\sum_{n=1}^m n^{s-1} + \hat d_2\,\chi(s)\,(m+1)^{s-1},
```

with $`\hat d_1,\hat d_2`$ real numbers (always positive on the critical line), the fractions of those two summands that are used. As a corollary, when $`\sigma=\tfrac12`$ one has $`d_1=d_2`$ (equivalently $`\hat d_1=\hat d_2`$); this fact is formally verified in Lean. Also, with this rescaling the remainder terms are nearly periodic in *T* with period one, converging to a fixed waveform in the fractional part of *T*. This decomposition of Siegel’s *R* was discovered through experimental mathematics using a spiral visualization of the partial sums, described later in the paper. We also discuss a number of other observations, including what we call the yin yang curves, the zero counting function, and ovals of equal length leg loci.

## Contents

- [1 Introduction](sections/01-introduction.md)
- [2 Siegel’s 1932 decomposition](sections/02-siegel-s-1932-decomposition.md)
- [3 The same formula, reparameterized: The I(T) mapping](sections/03-the-same-formula-reparameterized-the-i-t-mapping.md)
- [4 Decomposing the remainder: R=R1ps+R2ps](sections/04-decomposing-the-remainder-r-r1ps-r2ps.md)
- [5 The remainders are “one more partial summand”](sections/05-the-remainders-are-one-more-partial-summand.md)
- [6 Summands as links and joints](sections/06-summands-as-links-and-joints.md)
  - [6.1 Sum form](sections/06-summands-as-links-and-joints.md#sec-sum-form)
  - [6.2 Product form](sections/06-summands-as-links-and-joints.md#sec-product-form)
- [7 Other remainders](sections/07-other-remainders.md)
  - [7.1 Kuznetsov’s remainders](sections/07-other-remainders.md#sec-kuznetsov)
  - [7.2 The three remainders naming convention summary](sections/07-other-remainders.md#sec-remainders-summary)
  - [7.3 Scaling the remainders with the fractional part of T unchanged](sections/07-other-remainders.md#sec-remainder-scaling)
- [8 The positive real function d₁ and its periodicity](sections/08-the-positive-real-function-d1-and-its-periodicit.md)
  - [8.1 The exact formulas](sections/08-the-positive-real-function-d1-and-its-periodicit.md#sec-d1-exact)
  - [8.2 Approximation of d₁ when σ=1/2](sections/08-the-positive-real-function-d1-and-its-periodicit.md#sec-d1-approx-critical)
  - [8.3 Approximation of d₁ and d₂ when σ≠1/2](sections/08-the-positive-real-function-d1-and-its-periodicit.md#sec-d1-approx-general)
  - [8.4 Where are the d₁ and d₂ poles?](sections/08-the-positive-real-function-d1-and-its-periodicit.md#sec-pole-locations)
  - [8.5 The weights d1,d2 are positive outside narrow windows of T](sections/08-the-positive-real-function-d1-and-its-periodicit.md#sec-d1-positive)
  - [8.6 The limit profile of the fractional amount: the waveform in closed form](sections/08-the-positive-real-function-d1-and-its-periodicit.md#sec-d1-limit)
  - [8.7 Uniform bounds: the fraction stays between 1/5 and 4/5](sections/08-the-positive-real-function-d1-and-its-periodicit.md#sec-d1-bounds)
- [9 The geometry behind the result (experimental mathematics)](sections/09-the-geometry-behind-the-result-experimental-math.md)
  - [9.1 The bisector link and the bisector point](sections/09-the-geometry-behind-the-result-experimental-math.md#sec-bisector)
  - [9.2 Legs](sections/09-the-geometry-behind-the-result-experimental-math.md#sec-legs)
  - [9.3 The strip lines at ≈0.25 and ≈0.75 are not flat](sections/09-the-geometry-behind-the-result-experimental-math.md#sec-strip-lines-not-flat)
  - [9.4 PS, AK and RS Legs and Angles](sections/09-the-geometry-behind-the-result-experimental-math.md#sec-ps-ak-r2)
  - [9.5 Toward a proof](sections/09-the-geometry-behind-the-result-experimental-math.md#sec-toward-proof)
  - [9.6 Equal legs density](sections/09-the-geometry-behind-the-result-experimental-math.md#sec-eqleg-density)
- [10 I(T) functions](sections/10-i-t-functions.md)
  - [10.1 The origin of I(T): the neighboring links in the bisector frame](sections/10-i-t-functions.md#sec-IT-origin)
  - [10.2 I(T) functions for other L-functions besides the zeta function](sections/10-i-t-functions.md#sec-IT-Lfunctions)
- [11 The yin and yang curves](sections/11-the-yin-and-yang-curves.md)
  - [11.1 The formulas for the yin and yang curves](sections/11-the-yin-and-yang-curves.md#sec-yinyang-formulas)
  - [11.2 Derivation of R1ps from the yin and yang functions](sections/11-the-yin-and-yang-curves.md#sec-derive-r1ps)
  - [11.3 Derivation of R2ps from the yin and yang functions](sections/11-the-yin-and-yang-curves.md#sec-derive-r2ps)
  - [11.4 Comparison of yin and yang to Siegel’s integral result](sections/11-the-yin-and-yang-curves.md#sec-yinyang-siegel)
  - [11.5 The yin and yang curves are not symmetrical](sections/11-the-yin-and-yang-curves.md#sec-yinyang-asym)
  - [11.6 The limit curve and the Ψ function: the C₀ connection](sections/11-the-yin-and-yang-curves.md#sec-yinyang-infinity)
- [12 General yin and yang, and the d₁ and d₂ formulas](sections/12-general-yin-and-yang-and-the-d1-and-d2-formulas.md)
  - [12.1 Links crossing](sections/12-general-yin-and-yang-and-the-d1-and-d2-formulas.md#sec-links-crossing)
  - [12.2 General yin and yang form for any link](sections/12-general-yin-and-yang-and-the-d1-and-d2-formulas.md#sec-yinyang-any)
  - [12.3 d₁ and d₂ for any link](sections/12-general-yin-and-yang-and-the-d1-and-d2-formulas.md#sec-d1-any)
  - [12.4 The crossings: Σ1x and Σ2x formula](sections/12-general-yin-and-yang-and-the-d1-and-d2-formulas.md#sec-sum-x)
  - [12.5 First-part and second-part sums](sections/12-general-yin-and-yang-and-the-d1-and-d2-formulas.md#sec-half-link-sums)
  - [12.6 Cutting at one crossing](sections/12-general-yin-and-yang-and-the-d1-and-d2-formulas.md#sec-cut-any-link)
- [13 ϑ₁, ϑ₂ and the zero-counting function](sections/13-theta1-theta2-and-the-zero-counting-function.md)
  - [13.1 Review: the Riemann–von Mangoldt formula and Nps](sections/13-theta1-theta2-and-the-zero-counting-function.md#sec-counting-review)
  - [13.2 Improving Nps: the velocity split and a curve that lands on every ordinate](sections/13-theta1-theta2-and-the-zero-counting-function.md#sec-counting-star)
  - [13.3 Connecting the count, ϑ₂, and the equal-leg loci](sections/13-theta1-theta2-and-the-zero-counting-function.md#sec-counting-ovals)
- [14 Further observations](sections/14-further-observations.md)
  - [14.1 Length ratios: Σ₁ to Σ₂, and R1ps to R2ps](sections/14-further-observations.md#sec-length-ratios)
  - [14.2 The envelope of |ζ(1/2,t)|](sections/14-further-observations.md#sec-envelope)
  - [14.3 Collinearity of the three first-half remainders](sections/14-further-observations.md#sec-colinearity)
  - [14.4 Joint angles](sections/14-further-observations.md#sec-joint-angles)
  - [14.5 Incremental change](sections/14-further-observations.md#sec-incremental)
- [15 Prior literature](sections/15-prior-literature.md)
  - [15.1 Nickel’s Argand-diagram geometry](sections/15-prior-literature.md#sec-nickel)
  - [15.2 Levinson’s G](sections/15-prior-literature.md#sec-levinson)
  - [15.3 Spirals of exponential sums](sections/15-prior-literature.md#sec-curlicues)
- [16 Statements left unproved](sections/16-statements-left-unproved.md)
  - [Possible, but longer](sections/16-statements-left-unproved.md#possible-but-longer)
  - [Observational](sections/16-statements-left-unproved.md#observational)
- [17 Glossary](sections/17-glossary.md)
  - [The parameters](sections/17-glossary.md#the-parameters)
  - [The chain: joints and links](sections/17-glossary.md#the-chain-joints-and-links)
  - [The remainder on the chain](sections/17-glossary.md#the-remainder-on-the-chain)
  - [The bisector](sections/17-glossary.md#the-bisector)
  - [Frames](sections/17-glossary.md#frames)
  - [Legs](sections/17-glossary.md#legs)
  - [How the picture moves with T](sections/17-glossary.md#how-the-picture-moves-with-t)
  - [Crossings along the chain](sections/17-glossary.md#crossings-along-the-chain)
  - [Yin and yang](sections/17-glossary.md#yin-and-yang)
  - [The far chain (links near ζ)](sections/17-glossary.md#the-far-chain-links-near-zeta)
- [Acknowledgments](sections/acknowledgments.md)
- [A Lean formalization of R=R1ps+R2ps](sections/a-lean-formalization-of-r-r1ps-r2ps.md)
  - [A.1 Correspondence with the written proof](sections/a-lean-formalization-of-r-r1ps-r2ps.md#correspondence-with-the-written-proof)
  - [A.2 What is proved and what is hypothesized](sections/a-lean-formalization-of-r-r1ps-r2ps.md#what-is-proved-and-what-is-hypothesized)
  - [A.3 Source listing](sections/a-lean-formalization-of-r-r1ps-r2ps.md#source-listing)
- [B Lean formalization of the critical line: d1=d2, |R1ps|=|R2ps|, and equal legs](sections/b-lean-formalization-of-the-critical-line-d1-d2-r1.md)
  - [B.1 The chain of implications](sections/b-lean-formalization-of-the-critical-line-d1-d2-r1.md#the-chain-of-implications)
  - [B.2 What is proved and what is hypothesized](sections/b-lean-formalization-of-the-critical-line-d1-d2-r1.md#what-is-proved-and-what-is-hypothesized-1)
  - [B.3 Source listing](sections/b-lean-formalization-of-the-critical-line-d1-d2-r1.md#source-listing-1)
- [References](sections/references.md)

