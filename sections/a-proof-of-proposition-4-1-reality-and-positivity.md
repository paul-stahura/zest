[← Contents](../README.md) · [← Acknowledgments](acknowledgments.md) · [B Lean formalization of R=R1+R2 →](b-lean-formalization-of-r-r1-r2.md)

---

<a id="sec-positivity"></a>

## A Proof of Proposition [4.1](04-decomposing-the-remainder-r-r1-r2.md#prop-weights): reality and positivity of *d₁* and *d₂*

This section proves Proposition [4.1](04-decomposing-the-remainder-r-r1-r2.md#prop-weights), one subsection per ingredient. §[A.1](#sec-proof-i-ii) proves parts (i) and (ii), which are short and purely algebraic. §[A.2](#sec-phase-bound) sets up the Riemann–Siegel notation and proves the key phase bound: the factor $`\cos u`$ stays away from zero at every fractional part. §[A.3](#sec-proof-iii) proves part (iii), positivity on the critical line, where no fractional parts need to be excluded at all. §[A.4](#sec-proof-iv) proves part (iv), positivity across the strip outside two windows of width $`O(1/T)`$ per unit interval, and §[A.5](#sec-pole-locations) locates those windows, near the parallel-summand heights $`\{T\}\approx\tfrac14,\tfrac34`$. §[A.6](#sec-limits) proves the two limit statements used in §[6](06-periodicity-in-t.md#sec-periodicity): the normalized weight converges to the profile [(31)](06-periodicity-in-t.md#eq-d-profile), and the pinned waves converge to the tangent waveform [(25)](06-periodicity-in-t.md#eq-W-infty). Finally, §[A.7](#sec-d1-bounds) proves the uniform finite-*T* bounds $`\tfrac15<\hat d_1=\hat d_2<\tfrac45`$ on the critical line. Throughout, the criterion is one of signs: both weights are positive exactly when the two numerators of [(17)](04-decomposing-the-remainder-r-r1-r2.md#eq-d1)–[(18)](04-decomposing-the-remainder-r-r1-r2.md#eq-d2) carry the same sign as the common denominator $`\sin(2\omega+\psi)`$.

<a id="sec-proof-i-ii"></a>

### A.1 Proof of parts (i) and (ii): remainders are along the summands, and *d₁* and *d₂* are real


*Proof.*

**1.** For non-integer *T* we have $`M=m+1`$, so the next summand of Σ₁ factors as $`(m+1)^{-s}=(m+1)^{-\sigma}e^{-it\log(m+1)}=(m+1)^{-\sigma}e^{-i\omega}`$, a positive real multiple of the unit direction $`e^{-i\omega}`$; by [(15)](04-decomposing-the-remainder-r-r1-r2.md#eq-R1-def), $`R_1=d_1e^{-i\omega}`$ lies along it. Likewise the next summand of Σ₂ factors as $`\chi(s)\,(m+1)^{s-1}
=|\chi|\,(m+1)^{\sigma-1}\,e^{\,i(\omega+\psi)}`$, a positive real multiple of $`e^{\,i(\omega+\psi)}`$, and by [(16)](04-decomposing-the-remainder-r-r1-r2.md#eq-R2-def), $`R_2=d_2e^{\,i(\omega+\psi)}`$ lies along it. Explicitly,

```math
R_1=(m+1)^{\sigma}d_1\cdot(m+1)^{-s},
\qquad
R_2=\frac{(m+1)^{1-\sigma}}{|\chi(s)|}\,d_2\cdot\chi(s)\,(m+1)^{s-1},
```

with both scale factors real by part (ii).

**2.** View [(21)](04-decomposing-the-remainder-r-r1-r2.md#eq-R-two-dirs) as a real $`2\times2`$ linear system for the unknowns $`d_1,d_2`$, one equation each from the real and imaginary parts. Cramer’s rule gives exactly the pair of sine expressions [(17)](04-decomposing-the-remainder-r-r1-r2.md#eq-d1)–[(18)](04-decomposing-the-remainder-r-r1-r2.md#eq-d2), which are real by inspection: every ingredient ($`|R|`$, and sines of real angles) is real.

 ◻


<a id="sec-phase-bound"></a>

### A.2 Notation and the key phase bound

Let $`\vartheta(t)=\arg\Gamma\bigl(\tfrac14+\tfrac{it}2\bigr)
-\tfrac t2\log\pi`$ be the Riemann–Siegel theta function, with asymptotic expansion $`\vartheta(t)=\tfrac t2\log\tfrac t{2\pi}-\tfrac t2-\tfrac\pi8
+O(1/t)`$, and let $`Z(t)=e^{i\vartheta(t)}\zeta(\tfrac12+it)`$ be the (real) Riemann–Siegel *Z* function. On the critical line $`\chi(\tfrac12+it)=e^{-2i\vartheta(t)}`$, so $`\psi=-2\vartheta`$ there. Put

<a id="autoeq-6"></a>

```math
a=\sqrt{\tfrac t{2\pi}},\qquad N=\lfloor a\rfloor,\qquad \hat p=a-N,
\qquad u=\omega-\vartheta(t),\qquad\text{(194)}
```

so that *N* is the Riemann–Siegel cutoff while $`m=\lfloor T\rfloor`$ is ours, and *u* is the phase of the next summand measured against $`-\vartheta`$. Expanding $`\log(1+\tfrac1T)`$ in $`t=I(T)`$ gives

<a id="eq-a-vs-T"></a>

```math
\frac{t}{2\pi}=\Bigl(T+\tfrac12\Bigr)^2-\tfrac1{12}+O\!\Bigl(\tfrac1{T^2}\Bigr),
\qquad\text{hence}\qquad
a=T+\tfrac12+O\!\Bigl(\tfrac1{T}\Bigr),\qquad\text{(195)}
```

so, apart from boundary intervals of width $`O(1/T)`$ in the fractional part $`x=\{T\}`$ near $`x=0,\tfrac12,1`$,

<a id="eq-cut-cases"></a>

```math
x<\tfrac12 \iff N=m,\ \ \hat p=x+\tfrac12+O(1/T),
\qquad
x>\tfrac12 \iff N=m+1,\ \ \hat p=x-\tfrac12+O(1/T).\qquad\text{(196)}
```

Insert $`t=2\pi a^2`$ and $`m+1=a+(1-\hat p)`$ (case $`N=m`$) or $`m+1=a-\hat p`$ (case $`N=m+1`$) into $`\omega=t\log(m+1)`$, expand the logarithm about $`\log a`$, and reduce modulo $`2\pi`$ using $`a=N+\hat p`$ and $`\pi N^2\equiv\pi N \pmod{2\pi}`$; with the asymptotic series of ϑ this gives

```math
u\equiv\pi(N-1)+4\pi\hat p-2\pi\hat p^2+\tfrac\pi8+O(1/a)
\quad(N=m),
\qquad
u\equiv\pi N-2\pi\hat p^2+\tfrac\pi8+O(1/a)
\quad(N=m+1),
```

and substituting $`\hat p=x+\tfrac12`$, respectively $`\hat p=x-\tfrac12`$, turns both cases into one and the same statement:

<a id="eq-cosu"></a>

```math
\cos u \;=\;(-1)^{m+1}\,
\cos\!\bigl(2\pi x(1-x)-\tfrac{3\pi}8\bigr)\;+\;O(1/T).\qquad\text{(197)}
```

Since $`2\pi x(1-x)\in[0,\tfrac\pi2]`$ for $`x\in[0,1]`$, the argument of the cosine on the right lies in $`(-\tfrac{3\pi}8,\tfrac\pi8]`$, so

<a id="eq-cosu-bound"></a>

```math
|\cos u|\;\geq\;\sin\tfrac\pi8-O(1/T)\;=\;0.3826\ldots-O(1/T):\qquad\text{(198)}
```

the factor $`\cos u`$ never approaches zero, at any fractional part. That one inequality is the key ingredient in both halves of the proof. We also need two elementary facts about the leading Riemann–Siegel correction $`C_0(\hat p)`$.

<a id="lem-C0-trig"></a>


**Lemma A.1**. *Write $`A=2\pi\hat p^2-\tfrac\pi8`$ and $`B=2\pi\hat p`$, and let $`C_0(\hat p)=\cos(A-B)/\cos B`$ be the leading term of the Riemann–Siegel correction. Then:*

**1.** *$`C_0(\hat p)>0`$ for $`\hat p\in(\tfrac12,1)`$, and $`\min_{[1/2,\,1]}C_0=\cos\tfrac{3\pi}8=\sin\tfrac\pi8`$, attained at $`\hat p=\tfrac12`$;*

**2.** *for $`\hat p\in[0,\tfrac12]`$,*

```math
\Lambda(\hat p)\;:=\;\frac{C_0(\hat p)}
{2\cos\bigl(\pi(\tfrac18-2\hat p^2)\bigr)}
\;\leq\;\tfrac12,
```

*with equality exactly at the endpoints, and $`\Lambda(\tfrac14)=\tfrac14`$.*



*Proof.* (ii) first, since its argument is the more instructive. Note $`\pi(\tfrac18-2\hat p^2)=-A`$, so $`\Lambda=\cos(A-B)/(2\cos A\cos B)=\tfrac12(1+\tan A\tan B)`$ by the product formula, and the claim is that $`\tan A\tan B\leq0`$ on $`[0,\tfrac12]`$. Both critical transitions happen at the same point: $`A=0`$ exactly when $`\hat p=\tfrac14`$, and $`B=\tfrac\pi2`$ exactly when $`\hat p=\tfrac14`$. For $`\hat p<\tfrac14`$ we have $`A\in(-\tfrac\pi8,0)`$, so $`\tan A<0`$, while $`B\in(0,\tfrac\pi2)`$, so $`\tan B>0`$; for $`\hat p>\tfrac14`$ the signs reverse ($`A\in(0,\tfrac{3\pi}8)`$, $`B\in(\tfrac\pi2,\pi)`$). The product is therefore $`\leq0`$ throughout, vanishing only as $`\hat p\to0,\tfrac12`$ (where $`\tan A\tan B\to0`$, so $`\Lambda\to\tfrac12`$); at $`\hat p=\tfrac14`$ the two singular factors balance, $`\tan A\tan B\to-\tfrac12`$, giving the removable value $`\Lambda(\tfrac14)=\tfrac14`$.

\(i\) is a sign inspection of numerator and denominator. On $`(\tfrac12,\tfrac34)`$ both $`\cos(A-B)`$ and $`\cos B`$ are negative; on $`(\tfrac34,1)`$ both are positive (they change sign together at $`\hat p=\tfrac34`$, which is the removable singularity of *C₀*), so $`C_0>0`$ throughout. That is positivity. The minimum is a separate claim: *C₀* extends continuously to the compact interval $`[\tfrac12,1]`$ (the value at $`\tfrac34`$ is removable), and on each of the two subintervals it is monotone, rising from $`C_0(\tfrac12)=\sin\tfrac\pi8`$ through $`C_0(\tfrac34)=\tfrac12`$ to $`C_0(1)=\cos\tfrac\pi8`$. Hence the minimum is the left endpoint. ◻


<a id="sec-proof-iii"></a>

### A.3 Proof of Proposition [4.1](04-decomposing-the-remainder-r-r1-r2.md#prop-weights)(iii): on the critical line *d₁* and *d₂* are equal, real, and positive

We prove the following quantitative form, which contains Proposition [4.1](04-decomposing-the-remainder-r-r1-r2.md#prop-weights)(iii).

<a id="thm-line-bound"></a>


**Theorem A.2** (quantitative critical-line positivity). *For every $`c<\tfrac12\sin\tfrac\pi8`$ there is an effectively computable $`T_0(c)`$ such that for every non-integer $`T\geq T_0(c)`$, at $`\sigma=\tfrac12`$,*

```math
d_1(T)=d_2(T)\;\geq\;\frac{c}{a^{1/2}}\;>\;0,
```

*with no interval of $`\{T\}`$ excluded.*



*Proof.* *Step 1 (exact reduction).* On $`\sigma=\tfrac12`$ the reflection identities $`\Sigma_2=\chi\overline{\Sigma_1}`$ and $`\zeta=\chi\overline\zeta`$ give $`R=\chi\overline R`$; with $`\chi=e^{-2i\vartheta}`$ this says $`r:=e^{i\vartheta}R`$ is real, i.e. $`\arg R=-\vartheta+\varepsilon\pi`$ with $`\varepsilon\in\{0,1\}`$ and $`r=(-1)^{\varepsilon}|R|`$. Substituting $`\psi=-2\vartheta`$ and $`\arg R=-\vartheta+\varepsilon\pi`$ into [(17)](04-decomposing-the-remainder-r-r1-r2.md#eq-d1)–[(18)](04-decomposing-the-remainder-r-r1-r2.md#eq-d2) makes both numerators $`(-1)^{\varepsilon}\sin u`$ and the denominator $`\sin2u=2\sin u\cos u`$, so the factor $`\sin u`$ cancels identically and

<a id="eq-exact-line"></a>

```math
d_1=d_2=\frac{r}{2\cos u}
\qquad(\cos u\neq0).\qquad\text{(199)}
```

*Step 2 (Riemann–Siegel input).* The real number *r* is the Riemann–Siegel tail cut at *m* instead of at *N*: since on the line $`e^{i\vartheta}(\Sigma_1+\Sigma_2)=2\mathrm{Re}\bigl(e^{i\vartheta}
\Sigma_1\bigr)=2\sum_{n\leq m}n^{-1/2}\cos(\vartheta-t\log n)`$,

<a id="eq-r-two-cases"></a>

```math
r=r_{\mathrm{RS}}+\bigl[N=m+1\bigr]\cdot\frac{2\cos u}{\sqrt{m+1}},
\qquad
r_{\mathrm{RS}}:=Z-2\!\!\sum_{n\leq N}\!n^{-1/2}\cos(\vartheta-t\log n),\qquad\text{(200)}
```

where $`[\,\cdot\,]`$ is the Iverson bracket, equal to $`1`$ if the condition inside holds and $`0`$ otherwise; the bracketed term is the summand $`n=m+1`$, whose phase is exactly $`\vartheta-\omega=-u`$. Gabcke’s rigorous form of the Riemann–Siegel formula \[10\] gives

<a id="eq-gabcke"></a>

```math
r_{\mathrm{RS}}=\frac{(-1)^{N-1}}{a^{1/2}}\Bigl(C_0(\hat p)+E\Bigr),
\qquad |E|\leq c_1\,a^{-1}\quad(t\geq200).\qquad\text{(201)}
```

*Step 3 (case $`N=m`$, i.e. $`x=\{T\}<\tfrac12`$, $`\hat p\in(\tfrac12,1)`$).* Here $`r=r_{\mathrm{RS}}`$, and the two signs multiply out: $`(-1)^{N-1}`$ from [(201)](#eq-gabcke) against $`(-1)^{m+1}`$ from [(197)](#eq-cosu) give $`+1`$, so

```math
d_1=\frac{C_0(\hat p)}
{2\cos\bigl(2\pi x(1-x)-\tfrac{3\pi}8\bigr)}\cdot\frac{1}{a^{1/2}}
\;+\;O(a^{-3/2}).
```

By Lemma [A.1](#lem-C0-trig)(i) the numerator is at least $`\sin\tfrac\pi8`$, and the cosine in the denominator is at most $`1`$, so $`d_1\geq\bigl(\tfrac12\sin\tfrac\pi8\bigr)a^{-1/2}-O(a^{-3/2})`$.

*Step 4 (case $`N=m+1`$, i.e. $`x>\tfrac12`$, $`\hat p\in(0,\tfrac12)`$).* Now [(200)](#eq-r-two-cases) has the extra term,

```math
d_1=\frac1{\sqrt{m+1}}+\frac{r_{\mathrm{RS}}}{2\cos u},
```

and this time the two signs multiply to $`-1`$: the correction is *subtracted*, with magnitude $`\Lambda(\hat p)\,a^{-1/2}+O(a^{-3/2})`$ (here $`\cos(2\pi x(1-x)-\tfrac{3\pi}8)=\cos(\pi(\tfrac18-2\hat p^2))`$ under $`x=\hat p+\tfrac12`$). Lemma [A.1](#lem-C0-trig)(ii) caps $`\Lambda\leq\tfrac12`$, and $`a=N+\hat p=m+1+\hat p\geq m+1`$, so

```math
d_1\;\geq\;\frac1{\sqrt{m+1}}-\frac{1}{2a^{1/2}}-O(a^{-3/2})
\;\geq\;\frac{1}{2\,a^{1/2}}-O(a^{-3/2}).
```

In both cases $`d_1\geq(\tfrac12\sin\tfrac\pi8-o(1))a^{-1/2}`$, so any $`c<\tfrac12\sin\tfrac\pi8`$ is attained once *a* is large enough that the explicit $`O(1/a)`$ errors of [(201)](#eq-gabcke) and of the phase expansion [(197)](#eq-cosu) are dominated; $`T_0(c)`$ is effectively computable because those error constants are. The boundary intervals of [(196)](#eq-cut-cases) are covered because the two case formulas agree to leading order at the seams: as $`x\to\tfrac12`$ from either side, and across each integer, both give $`d_1\approx\tfrac12a^{-1/2}`$. ◻



**Remark A.3** (why the critical line has no poles of $`d_1=d_2`$). A pole of *d₁* and *d₂* occurs when the two directions $`e^{-i\omega}`$ and $`e^{i(\omega+\psi)}`$ of [(21)](04-decomposing-the-remainder-r-r1-r2.md#eq-R-two-dirs) are parallel, so that the linear system of Proposition [4.1](04-decomposing-the-remainder-r-r1-r2.md#prop-weights)(ii) degenerates and the common denominator $`\sin(2\omega+\psi)`$ vanishes. On the line that denominator is $`\sin2u=2\sin u\cos u`$, which vanishes twice per unit interval of *T*, near $`\{T\}=\tfrac14`$ and $`\tfrac34`$. But both vanishings belong to the factor $`\sin u`$, which cancels identically against the numerator in [(199)](#eq-exact-line); the factor $`\cos u`$, the only one that could produce a pole, stays bounded away from zero by [(198)](#eq-cosu-bound). Off the line the cancellation is spoiled, and the same two zeros become genuine poles. The next proof bounds the width of the affected windows in each unit interval.


<a id="sec-proof-iv"></a>

### A.4 Proof of Proposition [4.1](04-decomposing-the-remainder-r-r1-r2.md#prop-weights)(iv): off the line, *d₁* and *d₂* are positive except on two windows


*Proof.* Write $`u'=\omega+\psi/2`$ and let $`\tau=\arg R-\psi/2\pmod\pi`$, folded to $`[-\tfrac\pi2,\tfrac\pi2)`$, measure the tilt of *R* away from the bisector direction of the two summand phases. Up to a common positive factor and a common sign, [(17)](04-decomposing-the-remainder-r-r1-r2.md#eq-d1)–[(18)](04-decomposing-the-remainder-r-r1-r2.md#eq-d2) read

<a id="eq-offline-form"></a>

```math
d_1\propto\frac{\sin(u'-\tau)}{\sin 2u'},
\qquad
d_2\propto\frac{\sin(u'+\tau)}{\sin 2u'}.\qquad\text{(202)}
```

Two inputs control the picture.

*(i) The tilt τ is small.* The first term of Siegel’s asymptotic expansion of *R* at fixed σ is a real multiple of $`e^{i\psi/2}`$ up to sign and up to a phase error $`O_\sigma(1/t)`$; the deviation of the exact *R* from that argument comes from the next term of the expansion, which is smaller by a factor $`t^{-1/2}`$. Hence $`|\tau|\leq C_2(\sigma)\,t^{-1/2}`$.

*(ii) The phase $`u'`$ has the same skeleton as on the line.* Since $`\psi(\sigma+it)=-2\vartheta(t)+O_\sigma(1/t)`$ uniformly for σ in compacta, $`u'=u+O_\sigma(1/t)`$, and [(197)](#eq-cosu)–[(198)](#eq-cosu-bound) apply: $`|\cos u'|\geq\sin\tfrac\pi8-o(1)`$, so the estimates predict two candidate zeros of $`\sin u'`$ per unit interval, at fractional parts converging to $`\tfrac14`$ and $`\tfrac34`$, each crossed with slope $`|du'/d\{T\}|=\pi+O(1/T)`$. Exactly two simple roots, and the signs on their two sides, need a uniform derivative bound and a radial-sign estimate that are not written here; the windows below are those predicted candidates.

Away from those zeros (say $`|\sin u'|\geq2|\tau|`$) the ratios $`\sin(u'\mp\tau)/\sin u'`$ are positive, so [(202)](#eq-offline-form) carries the same signs as on the line, and the Step-3/Step-4 analysis of the critical-line proof, with the $`O_\sigma`$ errors absorbed into the constants, gives positivity of both weights. Near a zero of $`\sin u'`$ the numerator of *d₁* crosses zero at $`u'=\tau`$ while the denominator crosses at $`u'=0`$: between the two crossings, an interval of $`u'`$-length exactly $`|\tau|`$, the signs disagree and $`d_1<0`$; mirror-symmetrically $`d_2<0`$ on the interval of length $`|\tau|`$ on the other side. Converting $`u'`$-length to $`\{T\}`$-length by the slope $`\pi+O(1/T)`$ bounds each window by $`C_2(\sigma)\,t^{-1/2}/\pi\asymp C(\sigma)/T`$, since $`t=I(T)\asymp2\pi T^2`$, centered $`O(1/T)`$ from the denominator zero. At the denominator zero itself the two numerators are $`\mp\sin\tau`$, equal and opposite, so $`d_1/d_2\to-1`$ there, exactly as stated in Proposition [4.1](04-decomposing-the-remainder-r-r1-r2.md#prop-weights)(iv). On the critical line $`\tau\equiv0`$ exactly (Step 1 of the critical-line proof), the two crossings coincide, and the windows are empty, consistent with no poles there. ◻


<a id="sec-pole-locations"></a>

### A.5 Where are the poles?

Off the line the exact *d₁* and *d₂* (equivalently *R₁* and *R₂*) have genuine poles at fractional heights $`\{T\}\approx\tfrac14`$ and $`\tfrac34`$, but they are not exactly at those fractions. Here we locate them precisely.

A pole occurs when the two next summands have the same argument: the two unit directions $`e^{-i\omega}`$ and $`e^{i(\omega+\psi)}`$ of [(21)](04-decomposing-the-remainder-r-r1-r2.md#eq-R-two-dirs) become parallel, the pair no longer spans the plane, and the common denominator $`\sin(2\omega+\psi)`$ of [(17)](04-decomposing-the-remainder-r-r1-r2.md#eq-d1)–[(18)](04-decomposing-the-remainder-r-r1-r2.md#eq-d2) vanishes. Subtracting one argument from the other produces the pole condition, their difference being a multiple of π (even *k* is codirected, odd *k* is antiparallel):

<a id="eq-pole-condition"></a>

```math
2\,\omega \;+\; \arg\chi(s) \;=\; k\pi,
\qquad k\in\mathbb{Z},\qquad\text{(203)}
```

with ω, *s*, and *M* as in [(9)](03-reparameterization-and-cutoff-choice-the-i-t-map.md#eq-IT) and [(19)](04-decomposing-the-remainder-r-r1-r2.md#eq-omega-def). This formula was used to find the locations of the first $`20`$ poles numerically (Table [4](#tab-poles)).

<a id="tab-poles"></a>

| **Odd Pole \#** |  ***T* (odd)**  | **Even Pole \#** | ***T* (even)**  |
|:---------------:|:---------------:|:----------------:|:---------------:|
|        1        | 1.268870258145  |        2         | 1.763736013695  |
|        3        | 2.261710393365  |        4         | 2.759511841350  |
|        5        | 3.258504081544  |        6         | 3.757283144824  |
|        7        | 4.256679717535  |        8         | 4.755902912218  |
|        9        | 5.255501039250  |        10        | 5.754963311284  |
|       11        | 6.254676427788  |        12        | 6.754282121179  |
|       13        | 7.254067037740  |        14        | 7.753765522842  |
|       15        | 8.253598276826  |        16        | 8.753360246216  |
|       17        | 9.253226472440  |        18        | 9.753033785343  |
|       19        | 10.252924347790 |        20        | 10.752765174160 |

**Table 4:** First $`20`$ poles for $`\sigma=0.6`$, which is the same result as for $`\sigma=0.4`$. The symmetry about $`\sigma=\tfrac12`$ exists because $`\arg\chi(1-\sigma+it)\equiv\arg\chi(\sigma+it)\pmod{2\pi}`$: the identity $`\chi(s)\,\chi(1-s)=1`$ with the Schwarz reflection $`\chi(\bar s)=\overline{\chi(s)}`$ gives $`\chi(1-\sigma+it)=1/\overline{\chi(\sigma+it)}`$, the same input as Proposition [13.4](13-further-observations.md#prop-d-ratio-reflection). The pole condition [(203)](#eq-pole-condition) depends on σ only through that phase, and ω is a function of *T* alone, so reflecting $`\sigma\mapsto1-\sigma`$ leaves the equation unchanged and yields the same *T*-solutions. Note the poles occur at approximately $`T=\lfloor T\rfloor+\tfrac14`$ and $`T=\lfloor T\rfloor+\tfrac34`$ (equivalently, an integer $`\pm\tfrac14`$), and approach those values as $`T\to\infty`$.


**Remark A.4** (the poles cancel in the sum). The remainder *R* itself has no poles: it is Siegel’s convergent contour integral, finite and continuous in *T*. Since $`R=R_1+R_2`$ exactly (Theorem [4.2](04-decomposing-the-remainder-r-r1-r2.md#thm-decomp)), and at a pole the two summand directions coincide ($`e^{i(\omega+\psi)}=e^{-i\omega}`$ by [(203)](#eq-pole-condition)), the divergences of *d₁* and *d₂* must cancel exactly: $`d_1+d_2`$ stays bounded while each weight blows up, which is the $`d_1/d_2\to-1`$ behavior of Proposition [4.1](04-decomposing-the-remainder-r-r1-r2.md#prop-weights)(iv) seen from the other direction.


<a id="sec-limits"></a>

### A.6 The limit profile and the limit waveform

The two convergence statements used in §[6](06-periodicity-in-t.md#sec-periodicity) are now within reach: the machinery of Theorem [A.2](#thm-line-bound) proves both. We begin with the profile of Figure [3](06-periodicity-in-t.md#fig-d-limit), from which the convergence of the pinned waves of Figure [2](06-periodicity-in-t.md#fig-pinned-waves) follows as a corollary.

<a id="thm-d1-limit"></a>


**Theorem A.5** (limit profile). *Let $`\sigma=\tfrac12`$ and fix $`x\in(0,1)`$. Then*

```math
\lim_{\substack{T\to\infty\\ \{T\}=x}}\sqrt{m+1}\;d_1(T)
\;=\;d(x)\;=\;\tfrac12+\mathcal W_{\infty}(x),
```

*with d the closed-form profile [(31)](06-periodicity-in-t.md#eq-d-profile) and $`\mathcal W_{\infty}`$ the tangent waveform [(25)](06-periodicity-in-t.md#eq-W-infty), the removable points $`x=\tfrac14,\tfrac34`$ filled in by continuity ($`d(\tfrac14)=\tfrac14`$, $`d(\tfrac34)=\tfrac34`$). The same limit holds with d₂ in place of d₁, since $`d_2=d_1`$ on the line. The convergence rate is $`O(1/T)`$.*



*Proof.* Fix *x* and let $`T=m+x\to\infty`$. Refining [(195)](#eq-a-vs-T) one order, $`a=T+\tfrac12-\tfrac1{24T}+O(T^{-2})`$, so the offset $`\hat p`$ converges to its case value in [(196)](#eq-cut-cases) at rate $`1/T`$; and $`(m+1)/a\to1`$ at the same rate, and all error terms in Steps 2–4 of the proof of Theorem [A.2](#thm-line-bound) are $`O(1/a)`$. Multiplying the two case formulas of that proof by $`\sqrt{m+1}`$ therefore gives

```math
\sqrt{m+1}\,d_1\longrightarrow
\frac{C_0(x+\tfrac12)}{2\cos\bigl(2\pi x(1-x)-\tfrac{3\pi}8\bigr)}
\quad(x<\tfrac12),
\qquad
\sqrt{m+1}\,d_1\longrightarrow 1-\Lambda\bigl(x-\tfrac12\bigr)
\quad(x>\tfrac12).
```

It remains to identify both branches with $`d(x)=\tfrac12+\mathcal W_{\infty}(x)`$. Write $`\alpha=2\pi x`$ and $`\beta=2\pi(x-\tfrac14)(x-\tfrac34)=2\pi(x^2-x)+\tfrac{3\pi}8`$, so that $`\mathcal W_{\infty}(x)=-\tfrac12\tan\alpha\tan\beta`$.

For $`x<\tfrac12`$, substitute $`\hat p=x+\tfrac12`$ into $`C_0(\hat p)=\cos(A-B)/\cos B`$ of Lemma [A.1](#lem-C0-trig): $`A-B=2\pi\bigl(\hat p^2-\hat p-\tfrac1{16}\bigr)=2\pi x^2-\tfrac{5\pi}8`$ and $`\cos B=\cos(2\pi x+\pi)=-\cos(2\pi x)`$, so the branch limit is

```math
\frac{-\cos\bigl(2\pi x^2-\tfrac{5\pi}8\bigr)}
{2\cos(2\pi x)\cos\bigl(2\pi x(1-x)-\tfrac{3\pi}8\bigr)}
\;=\;g(x)
\;=\;
\frac{\cos(\alpha+\beta)}{2\cos\alpha\,\cos\beta}
\;=\;\tfrac12\bigl(1-\tan\alpha\tan\beta\bigr)
\;=\;\tfrac12+\mathcal W_{\infty}(x),
```

which is the first branch of [(31)](06-periodicity-in-t.md#eq-d-profile): here $`\alpha+\beta=2\pi x^2+\tfrac{3\pi}8`$, so $`\cos(\alpha+\beta)=-\cos(2\pi x^2-\tfrac{5\pi}8)`$; the denominator uses $`2\pi x(1-x)-\tfrac{3\pi}8=-\beta`$ and the evenness of the cosine; and the last two steps are the product formula.

For $`x>\tfrac12`$, take $`\hat p=x-\tfrac12`$ and recall from the proof of Lemma [A.1](#lem-C0-trig)(ii) that $`\Lambda(\hat p)=\tfrac12(1+\tan A\tan B)`$. This time $`A=2\pi\hat p^2-\tfrac\pi8=\beta`$ exactly, and $`B=2\pi\hat p=\alpha-\pi`$, so $`\tan B=\tan\alpha`$ and

```math
\Lambda\bigl(x-\tfrac12\bigr)
=\tfrac12\bigl(1+\tan\alpha\tan\beta\bigr)
=\tfrac12-\mathcal W_{\infty}(x),
\qquad\text{hence}\qquad
1-\Lambda\bigl(x-\tfrac12\bigr)=\tfrac12+\mathcal W_{\infty}(x).
```

Since $`\mathcal W_{\infty}(1-x)=-\mathcal W_{\infty}(x)`$ (the tangent factor is odd about $`x=\tfrac12`$ while the quadratic factor is symmetric), this also equals $`1-g(1-x)`$, the second branch of [(31)](06-periodicity-in-t.md#eq-d-profile). The error terms accumulated along the way are all $`O(1/T)`$. ◻


<a id="cor-W-limit"></a>


**Corollary A.6** (the waves converge to the tangent waveform). *Let $`\sigma=\tfrac12`$ and fix $`x\in(0,1)`$. Then*

```math
\lim_{\substack{T\to\infty\\ \{T\}=x}}\mathcal W(T)
\;=\;\mathcal W_{\infty}(x),
```

*again at rate $`O(1/T)`$.*



*Proof.* On $`[m,m+1]`$ the pinned wave is

```math
\mathcal W(T)
=T^{1/2}\bigl(d_1(T)-\Phi(-1,\tfrac12,m+1)\bigr)
-(1-x)\,\varepsilon_m+x\,\varepsilon_{m+1},
```

and each of the three ingredients has a limit.

First, $`T^{1/2}d_1=\sqrt{T/(m+1)}\cdot\sqrt{m+1}\,d_1\to
d(x)=\tfrac12+\mathcal W_{\infty}(x)`$ by Theorem [A.5](#thm-d1-limit), since $`T/(m+1)\to1`$ at rate $`O(1/T)`$.

Second, by Boole summation (the alternating analogue of Euler–Maclaurin), $`\sum_{j\ge0}(-1)^jf(n+j)=\tfrac12f(n)
-\tfrac14f'(n)+O(|f'''(n)|)`$; applied to $`f(y)=y^{-1/2}`$ it gives

```math
n^{1/2}\,\Phi(-1,\tfrac12,n)=\tfrac12+\frac1{8n}+O(n^{-3}),
```

so $`T^{1/2}\Phi(-1,\tfrac12,m+1)=\tfrac12+O(1/T)`$.

Third, the endpoint shortfalls vanish:

```math
\varepsilon_n
=n^{1/2}\Phi(-1,\tfrac12,n)-n^{1/2}d_1(n^-)
=O(1/n),
```

because as $`T\to n^{-}`$ the Step-4 case formula of Theorem [A.2](#thm-line-bound) applies with $`\hat p=\tfrac12+O(1/n)`$, where $`\Lambda(\tfrac12)=\tfrac12`$ by Lemma [A.1](#lem-C0-trig)(ii) and Λ is continuous, giving $`n^{1/2}d_1(n^-)=\tfrac12+O(1/n)`$, the same limit as the Lerch term. The chord contribution $`-(1-x)\varepsilon_m+x\varepsilon_{m+1}`$ is therefore $`O(1/T)`$, and assembling the three pieces,

```math
\mathcal W(T)
=\Bigl(\tfrac12+\mathcal W_{\infty}(x)\Bigr)-\tfrac12+O(1/T)
=\mathcal W_{\infty}(x)+O(1/T).
```

 ◻


<a id="sec-d1-bounds"></a>

### A.7 Uniform bounds: the fraction stays between $`\tfrac15`$ and $`\tfrac45`$

Theorem [A.5](#thm-d1-limit) confines the fraction to $`[m_0,1-m_0]`$ in the limit. At finite *T* the excursions are slightly larger, and round constants cover every height at once: the fractional summand never uses less than a fifth, or more than four fifths, of the next term.

<a id="thm-d1-bounds"></a>


**Theorem A.7**. *Let $`\sigma=\tfrac12`$. For every non-integer $`T>1`$,*

```math
\frac15\;<\;\hat d_1(T)=\hat d_2(T)\;<\;\frac45 .
```

*The constants are nearly sharp: no better T-independent ones exist than*

```math
\inf_{T>1}\hat d_1=m_0=0.2268951\ldots,
\qquad
\sup_{T>1}\hat d_1=0.78499047437\ldots,
```

*the infimum approached but not attained as $`T\to\infty`$ along $`\{T\}\to x^{*}=0.1629962\ldots`$, the supremum attained at $`T=1.85307336433\ldots`$.*



*Proof.* On the critical line $`d_2=d_1`$ and $`|\chi|=1`$, so $`\hat d_2=\hat d_1`$ by [(24)](05-the-remainders-are-one-more-partial-summand.md#eq-frac-vs-weight) and it suffices to bound $`\hat d_1=\sqrt{m+1}\,d_1`$.

*Step 1 (exact finite-T form).* Multiplying the two case formulas in the proof of Theorem [A.2](#thm-line-bound) by $`\sqrt{m+1}`$ and writing $`\rho=\sqrt{(m+1)/a}`$,

```math
\begin{align*}
N=m\ (\{T\}<\tfrac12):&\qquad
\hat d_1=\rho\cdot
\frac{C_0(\hat p)+E}{2\cos\bigl(2\pi x(1-x)-\tfrac{3\pi}8+\delta\bigr)},
&&\rho=\sqrt{1+\tfrac{1-\hat p}{a}}
\in\Bigl[1,\sqrt{1+\tfrac1{2a}}\,\Bigr],\\[2pt]
N=m+1\ (\{T\}>\tfrac12):&\qquad
\hat d_1=1-\rho\cdot
\frac{C_0(\hat p)+E}{2\cos\bigl(\pi(\tfrac18-2\hat p^2)+\delta\bigr)},
&&\rho=\sqrt{1-\tfrac{\hat p}{a}}
\in\Bigl[\sqrt{1-\tfrac1{2a}},1\Bigr],
\end{align*}
```

with $`|E|\leq c_1a^{-1}`$ from [(201)](#eq-gabcke) and $`|\delta|\leq
c_2a^{-1}`$ from the phase expansion [(197)](#eq-cosu). At $`\rho=1`$, $`E=\delta=0`$ these are exactly the two branches of Theorem [A.5](#thm-d1-limit).

*Step 2 (range of the main terms).* On $`(0,\tfrac12)`$ the branch function $`d(x)`$ descends from $`\tfrac12`$ to its single interior minimum $`m_0=d(x^{*})`$ and climbs back to $`\tfrac12`$ (one sign change of $`d'`$; the critical point $`x^{*}`$ is the root of an explicit elementary equation). Hence the first main term ranges over $`[m_0,\tfrac12]`$ and the second over $`[\tfrac12,\,1-\rho\,m_0]`$.

*Step 3 (all $`T\geq30`$).* The total deviation of $`\hat d_1`$ from its main term is at most $`(\rho-1)\cdot\tfrac12`$ plus a term collecting *E* and δ, with $`\rho-1\leq\tfrac1{4a}`$; the collected constant is validated by convergence-rate measurements against Theorem [A.5](#thm-d1-limit) (observed absolute error $`{\leq}\,0.008`$ at $`T\approx20`$, decreasing like $`1/T`$), giving a total deviation below $`0.02`$ for $`T\geq30`$. Therefore, for $`T\geq30`$,

```math
\{T\}<\tfrac12:\quad
\hat d_1\in\bigl(m_0-0.02,\ \tfrac12(1+\tfrac1{120})+0.02\bigr)
\subset(0.206,\,0.525),
\qquad
\{T\}>\tfrac12:\quad
\hat d_1\in(0.48,\,0.795),
```

and both windows lie inside $`(\tfrac15,\tfrac45)`$.

*Step 4 ($`1<T\leq30`$, computational).* A dense evaluation of the exact $`\hat d_1`$ (grid step $`5\times10^{-4}`$ on $`(1,3]`$, $`10^{-3}`$ on $`(3,12]`$, $`2\times10^{-3}`$ on $`(12,30]`$; `check_uniform_bounds.py`) gives the observed range $`[0.2274,\ 0.78499]`$, with margin at least $`0.015`$ to both $`\tfrac15`$ and $`\tfrac45`$ and sampled variation between adjacent grid points below $`0.004`$, a factor of nearly four inside the margin. This covers the remaining range and, refined near its endpoints, produces the sharp values in the statement: the maximum $`0.78499047437\ldots`$ at $`T=1.85307336433\ldots`$ (on the $`m=1`$ interval, where $`\rho<1`$ pushes the second branch above its limiting value), and interval minima decreasing toward *m₀* from above as *T* grows ($`0.227369`$ at $`T=59.164`$, for instance). ◻



**Remark A.8**. For the unnormalized weight the theorem reads $`\tfrac15(m+1)^{-1/2}<d_1<\tfrac45(m+1)^{-1/2}`$; in particular $`d_1\leq0.78499\ldots/\sqrt2=0.55508\ldots`$, attained at the same $`T=1.853\ldots`$, and no positive *T*-independent lower bound exists for *d₁* itself.

---

[← Contents](../README.md) · [← Acknowledgments](acknowledgments.md) · [B Lean formalization of R=R1+R2 →](b-lean-formalization-of-r-r1-r2.md)
