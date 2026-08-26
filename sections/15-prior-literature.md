[← Contents](../README.md) · [← 14 Further observations](14-further-observations.md) · [16 Statements left unproved →](16-statements-left-unproved.md)

---

<a id="sec-prior-lit"></a>

## 15 Prior literature

<a id="sec-nickel"></a>

### 15.1 Nickel’s Argand-diagram geometry

Nickel \[16\], with a condensed sequel \[17\], starts from the same object this paper starts from, the Argand diagram of the steps $`n^{-s}`$, and reaches a construction close enough to ours that the two are worth setting side by side. They agree in shape, and they differ in the one respect this paper is about.

<a id="dictionary-"></a>

##### Dictionary.

His center of symmetry is the step $`n_p=[\sqrt{t/2\pi}\,]`$, with fractional part $`p=\sqrt{t/2\pi}-n_p`$. Since $`\sqrt{t/2\pi}\approx T+\tfrac12`$ (§[10.1](10-i-t-functions.md#sec-IT-origin)), his index is $`n_p\approx\lfloor T+\tfrac12\rfloor`$ and $`p\approx\{T+\tfrac12\}`$, so it agrees with our $`m=\lfloor T\rfloor`$ on the first half of each unit interval and exceeds it by one on the second half: the same half-unit offset already recorded for Siegel’s cutoff in §[7.1](07-other-remainders.md#sec-kuznetsov). His factor $`Q(s)`$, defined by $`\zeta(s)=Q(s)\zeta(1-s)`$, is our $`\chi(s)`$; the displayed form $`Q=n_p^{1-2s}e^{i(t+\pi/4)}`$ is the familiar $`e^{-2i\vartheta(t)}`$ asymptotic, which reproduces χ to a relative $`1.5\times10^{-5}`$ at $`T=20.3`$ and $`1.6\times10^{-7}`$ at $`T=200.3`$ once the smooth $`\sqrt{t/2\pi}`$ is used in place of the rounded $`n_p`$. His symmetry angle Θ is our $`\tfrac{\psi}{2}=\tfrac12\arg\chi`$.

<a id="what-matches-"></a>

##### What matches.

Under that dictionary his Riemann–Siegel equation $`\zeta=P(s)+Q(s)P(1-s)`$ is our two-leg decomposition $`\zeta=B_1+B_2`$ with $`B_2=\chi\,\overline{B_1}`$ (Appendix [B](a-lean-formalization-of-r-r1ps-r2ps.md#app-lean-critical)); his polar form $`\zeta=2\cos(\phi-\Theta)\,\mathsf{P}e^{i\Theta}`$ is the shape of our $`R=2d_1\cos(\omega+\tfrac{\psi}{2})e^{i\psi/2}`$; and his observation that the two magnitudes are equal exactly when $`\sigma=\tfrac12`$ is Corollary [9.1](09-the-geometry-behind-the-result-experimental-math.md#cor-equal-legs). He also writes the classical remainder as $`R=2\mathsf{L}\cos(\theta_L-\Theta)`$, where $`L=\mathsf{L}e^{i\theta_L}`$ runs from the joint at step $`n_p`$ to his center: that is exactly the role played here by the pair $`(d_1,-\omega)`$. Where his index agrees with ours the two projected remainders converge, the ratio $`2\mathsf{L}\cos(\theta_L-\Theta)\,/\,2d_1\cos(\omega+\tfrac{\psi}{2})`$ falling through $`2.24`$, $`1.34`$, $`1.11`$, $`1.03`$, $`1.01`$ at $`T=6.3,\,20.3,\,60.3,\,200.3,\,600.3`$.

<a id="two-centers-one-line-"></a>

##### Two centers, one line.

His $`P(s)`$ and our *B₁* are not the same point, and they are not meant to be. The difference lies almost entirely along the direction in which ζ cannot see it: at $`T=600.3`$ we find $`|P-B_1|=0.064`$, of which only $`1.2\times10^{-4}`$ lies along $`e^{i\psi/2}`$. That is his own remark that ζ is unchanged when $`P(s)`$ is translated along the symmetry axis. In the notation of §[9.2](09-the-geometry-behind-the-result-experimental-math.md#sec-legs) the admissible centers are the solutions *X* of $`\zeta-X=\chi\overline{X}`$, a line in the plane, and every one of them projects onto $`\zeta/2`$, which is Corollary [9.2](09-the-geometry-behind-the-result-experimental-math.md#cor-bisector-proj). The freedom he notes and the projection we prove are the same fact.

<a id="the-sequel-"></a>

##### The sequel.

Two things in \[17\] touch this paper further. It traces $`P(s)`$ and $`\zeta(s)`$ as two curves over a range of *t*, joined at regularly spaced values of *t* to show the two segments, which is the figure the conveyor belt draws with his pendant center in place of *B₁*. And it counts zeros: it reads the count off Θ through the Gram points and tests that reading against the first $`100{,}000`$ ordinates, finding one zero per Gram point on average with the zeros grouping between successive Gram points. The count there is the classical one, exact in the mean and never landing on an ordinate; the curves of §[13](13-theta1-theta2-and-the-zero-counting-function.md#sec-counting) land on every one.

<a id="what-differs-"></a>

##### What differs.

The correction itself. Nickel’s is a lowest-order determination, carrying a factor $`1/(2n_p^{\sigma}\cos 2\pi p)`$ that grows without bound as $`\cos2\pi p\to0`$, and he is explicit that its error matters for the distribution of $`P(s)`$ even though it cancels in ζ; its direction, $`e^{-i(t\ln n_p+2\pi p)}`$, is the step direction at $`n_p`$ turned by the fractional offset $`2\pi p`$, not a summand direction of the chain. Our $`R_{1ps}`$ and $`R_{2ps}`$ are exact, and their directions are exactly those of the $`(m+1)`$st summand of each chain. That is what lets the serial chain of §[6.2](06-summands-as-links-and-joints.md#sec-product-form) close on ζ identically rather than asymptotically, and it is the content of the “one more partial summand” reading: the correction is not merely near the next link, it lies along it.

<a id="sec-levinson"></a>

### 15.2 Levinson’s *G*

The companion $`B_1^{\ast}=\zeta+\zeta'/2\vartheta'`$ of [(190)](13-theta1-theta2-and-the-zero-counting-function.md#eq-vel-split), whose argument carries the counting curve $`N_{\ast}`$ of §[13.2](13-theta1-theta2-and-the-zero-counting-function.md#sec-counting-star), is the function Levinson \[14\] calls *G*. That is the paper in which he proves that more than a third of the zeros of ζ are on $`\sigma=\tfrac12`$. Figure [64](#fig-b1-star-path) draws the function itself on the critical line, in the plane and in the frame where its winding is the count.

<a id="fig-b1-star-path"></a>

<p align="center"><img src="../figures/fig_b1_star_path.png"></p>

**Figure 64:** Levinson’s *G*, which is the companion $`B_1^{\ast}=\zeta+\zeta'/2\vartheta'`$ of [(190)](13-theta1-theta2-and-the-zero-counting-function.md#eq-vel-split), drawn as a path in the plane on the critical line. *Left:* the whole of $`1\leq T\leq10`$, that is $`13.6\leq t\leq692.2`$, the color running with *T*: $`408`$ loops, one for each ordinate of the range. The path never reaches the origin, which is what lets $`\arg G`$ carry a count, and its closest approach, $`|G|=0.048`$ at $`T=9.523`$, falls at the tightest pair of ordinates in the range, γ₃₆₃ and γ₃₆₄, whose gap is $`0.24`$ of the mean spacing. There $`Z'=0`$ and $`|G|=\tfrac12|Z|`$: it is a Lehmer-style near-miss, not a small value of ζ on its own, that brings the curve in. *Middle:* one unit of the index, $`6\leq T\leq7`$, in the same plane, with its $`55`$ ordinates marked. *Right:* the same unit rotated by $`e^{i\vartheta}`$, the frame of [(192)](13-theta1-theta2-and-the-zero-counting-function.md#eq-h-star) in which the real part is $`\tfrac12Z`$ and the imaginary part is the offset $`h^{\ast}`$. Every loop encircles the origin once and crosses the imaginary axis exactly at an ordinate. Counting those crossings is Levinson’s reading of the angle; following the turn continuously is $`N_{\ast}`$. Computed from $`e^{i\vartheta}G=\tfrac12Z-iZ'/2\vartheta'`$, which agrees with $`\zeta+\zeta'/2\vartheta'`$ to $`18`$ digits. Generated by `fig_b1_star_path.py`.

<a id="dictionary--1"></a>

##### Dictionary.

He writes the gamma factor as $`h(s)=\pi^{-s/2}\Gamma(s/2)=e^{f(s)}`$, so the functional equation reads $`h(s)\zeta(s)=h(1-s)\zeta(1-s)`$. Differentiating it and using it again to remove $`\zeta(1-s)`$ leaves him with the argument of

<a id="eq-levinson-G"></a>

```math
G(s)=\zeta(s)+\frac{\zeta'(s)}{f'(s)+f'(1-s)}\qquad\text{(222)}
```

to control, which is his (1.9). His weight is ours, in two steps. From $`f(s)=-\tfrac{s}{2}\log\pi+\log\Gamma(s/2)`$,

```math
f'(s)=-\tfrac12\log\pi
+\tfrac12\frac{\Gamma'}{\Gamma}\Bigl(\frac{s}{2}\Bigr),
```

and $`\chi=h(1-s)/h(s)`$ has $`\log\chi=f(1-s)-f(s)`$, so differentiating in *s* gives

<a id="eq-levinson-weight"></a>

```math
\frac{\chi'}{\chi}(s)=-f'(1-s)-f'(s),
\qquad\text{that is}\qquad
f'(s)+f'(1-s)=-\frac{\chi'}{\chi}(s),\qquad\text{(223)}
```

at every *s*. That is the weight of the off-line form [(196)](13-theta1-theta2-and-the-zero-counting-function.md#eq-vel-split-offline), so $`G=B_1^{\ast}`$ in the whole plane. On the critical line the same weight turns real: with $`s=\tfrac12+it`$ we have $`1-s=\bar{s}`$ and $`f'(1-s)=\overline{f'(s)}`$, so the sum is twice a real part,

```math
f'(s)+f'(1-s)=2\mathrm{Re}f'\bigl(\tfrac12+it\bigr)
=\mathrm{Re}\frac{\Gamma'}{\Gamma}
\Bigl(\tfrac14+\tfrac{it}{2}\Bigr)-\log\pi
=2\vartheta'(t),
```

the last equality being the exact $`\vartheta'`$ recorded above [(190)](13-theta1-theta2-and-the-zero-counting-function.md#eq-vel-split). Substituting that into [(222)](#eq-levinson-G) returns $`\zeta+\zeta'/2\vartheta'`$, which is [(190)](13-theta1-theta2-and-the-zero-counting-function.md#eq-vel-split). So the two are the same function and not two versions of one: at $`t=20`$, to take one height, the two weights are both $`1.157750994844834`$ and the two companions agree to the forty digits carried. Levinson himself trades the weight for $`\log(t/2\pi)`$ at his (1.4), which costs $`O(1/t)`$; we keep the exact $`2\vartheta'`$. In the language of §[9.2](09-the-geometry-behind-the-result-experimental-math.md#sec-legs), *G* is a leg: the first leg of the split whose second leg $`\zeta-G`$ is the velocity of the endpoint of the chain along the line, quarter-turned and halved by the local rate of the phase.

<a id="the-same-angle-"></a>

##### The same angle.

His (1.8) locates the ordinates by the condition $`\arg\bigl(h(s)G(s)\bigr)\equiv\tfrac{\pi}{2}\pmod\pi`$, and on the critical line $`\arg h`$ is exactly the Riemann–Siegel phase, $`\arg h(\tfrac12+it)=\arg\Gamma(\tfrac14+\tfrac{it}{2})-\tfrac{t}{2}\log\pi
=\vartheta(t)`$. So the angle he watches is the one [(193)](13-theta1-theta2-and-the-zero-counting-function.md#eq-N-star) is built from,

```math
\arg\bigl(hG\bigr)=\vartheta+\arg B_1^{\ast}
=\pi\bigl(N_{\ast}-\tfrac32\bigr)\pmod{2\pi},
```

and his condition on it is precisely the statement that $`N_{\ast}`$ is an integer. The two readings of the same angle differ in what is asked of it. Levinson needs only how often the condition holds, so what he must control is how far $`\arg G`$ can move: he counts zeros of *G* in a rectangle with the critical line for its left edge and $`\sigma=3`$ for its right, where $`|G-1|<\tfrac13`$ pins the argument down, and a mollifier and Littlewood’s lemma bound the count in between. His remark that ζ would have essentially all of its zeros on the line if $`\arg G`$ never moved at all is the extreme case of the same reading. Here the angle is wanted between the ordinates as well as at them. The exact weight gives $`\mathrm{Re}\bigl(e^{i\vartheta}G\bigr)=\tfrac12Z`$ by [(192)](13-theta1-theta2-and-the-zero-counting-function.md#eq-h-star), so the angle advances by exactly π from one ordinate to the next, and $`N_{\ast}`$ is a continuous curve, integer-valued at the ordinates and nowhere else, carrying in its slope the size of $`|Z|`$ (Remark [13.5](13-theta1-theta2-and-the-zero-counting-function.md#rem-nstar-slope)). One further consequence of [(222)](#eq-levinson-G) is common to both readings, the corollary Levinson credits to Montgomery: a zero of ζ of multiplicity *m* leaves *G* a zero of multiplicity $`m-1`$.

<a id="sec-curlicues"></a>

### 15.3 Spirals of exponential sums

For quadratic phases this geometry is rigorous ground. The partial sums $`S_N(\tau)=\sum_{n\le N}e^{i\pi\tau n^2}`$ draw what Berry and Goldberg \[2\] call curlicues: replacing the sum by an integral produces the Cornu spiral exactly, and a renormalization then carries the whole pattern onto a magnified and rotated copy of a shorter sum of the same kind. Coutsias and Kazarinoff \[4, 5\] work that picture the way this paper works ours. They give the polyline a discrete radius of curvature

<a id="eq-ck-curvature"></a>

```math
R_N=\tfrac12\bigl|\csc(\psi_N/2)\bigr|,
\qquad \psi_N=\pi\tau(2N+1),\qquad\text{(224)}
```

$`\psi_N`$ being the turn between consecutive terms, so that inflections of the pattern sit where $`\psi_N`$ is nearest a multiple of $`2\pi`$ and cusps where it turns around. They then cut the sum *at an inflection*, and replace each whole spiral of the first sum by a single vector carrying a scale and a phase, the Fresnel length $`\sqrt{|\tau|}`$ at $`\pi/4`$ to the spiral’s mid-vector. What comes out is Hardy and Littlewood’s approximate functional formula for the theta function, sharpened to an error uniform in τ and stated as a Diophantine inequality that contains Gauss’s sum formula. Cutting at the bisector and standing one link in for a whole spiral is the reading of §[4](04-decomposing-the-remainder-r-r1ps-r2ps.md#sec-decomp); their $`e^{i\pi/4}`$ is the Gaussian integral’s, the same factor that leaves the $`-\pi/8`$ in ϑ; and [(224)](#eq-ck-curvature) is the bisector construction of §[9.1](09-the-geometry-behind-the-result-experimental-math.md#sec-bisector) for unit links, the distance from a step to the meeting of the angle bisectors at its two ends, which is Nickel’s *L* once the length $`n^{-\sigma}`$ is restored.

The arithmetic is what does not carry over. Their turn $`\psi_N`$ is linear in *N*, so the second difference is the constant $`2\pi\tau`$, the arcs are Cornu spirals outright, and the theory turns on the continued fraction of τ: the pattern is a self-similar hierarchy of curlicues within curlicues. Our turn is $`\theta_n=-t\log\bigl(1+\tfrac1n\bigr)`$ and its second difference falls like $`t/n^2`$, passing $`2\pi`$ once. That is why the chain has a single distinguished inflection, at $`n\approx\sqrt{t/2\pi}`$, instead of a hierarchy of them, and why its arcs are Cornu spirals only locally. The geometric machinery transfers; the renormalization does not.

One further reading of the same diagram deserves mention. Kapitonets \[11\] draws his axis of symmetry through the *midpoint* of the remainder vector at $`\sigma=\tfrac12`$, observes that the remainder is then perpendicular to that axis, and concludes both that $`\arg\zeta`$ is the normal direction and that the two chains project onto the axis with canceling sums. That is the half-split of §[7.2](07-other-remainders.md#sec-remainders-summary) together with Corollary [9.2](09-the-geometry-behind-the-result-experimental-math.md#cor-bisector-proj), read off the picture. His other construction, recovering ζ by repeatedly replacing a polygon of partial sums by the polygon of their midpoints, is unrelated to the bisector point: iterated midpointing is the binomial transform, and the limit is Cesàro summation of the Dirichlet series, as he says himself.

---

[← Contents](../README.md) · [← 14 Further observations](14-further-observations.md) · [16 Statements left unproved →](16-statements-left-unproved.md)
