[← Contents](../README.md) · [← 12 ϑ₁, ϑ₂ and the zero-counting function](12-theta1-theta2-and-the-zero-counting-function.md) · [14 Prior literature →](14-prior-literature.md)

---

<a id="sec-consequences"></a>

## 13 Further observations

We have made other observations of the zeta function, mostly from a geometric perspective, and have listed some of them in this final section:

1.  we examine the ratio of the lengths of the two partial sums beside the ratio of the two partial summand remainders (§[13.1](#sec-length-ratios));

2.  we look at the envelope of ζ on the half-line from a *B₁* and a $`B_1^{\ast}`$ perspective (§[13.2](#sec-envelope));

3.  since we now have three remainders, we look at their collinearity, which we could not do when we had just two, because any two points already lie on a line (§[13.3](#sec-colinearity));

4.  and since looking at the links separately, each in its own coordinate frame, was fruitful (it led to the general partial summand formula for ζ of §[11.6](11-conjecture-there-is-a-yin-yang-d1-d2-for-every-l.md#sec-cut-any-link)), here we look at the joint angles (§[13.4](#sec-joint-angles)).

<a id="sec-length-ratios"></a>

### 13.1 Length ratios: Σ₁ to Σ₂, and *R₁* to *R₂*

The four terms of [(22)](04-decomposing-the-remainder-r-r1-r2.md#eq-zeta-ps) come in two natural pairs: the two partial sums, and the two fractional links. Within each pair the two lengths are equal on the critical line, and what follows records what their ratio does off it. The pairs behave quite differently, and in both cases the ratio obeys the same reflection law about $`\sigma=\tfrac12`$.

<a id="rem-leg-ratio"></a>


**Remark 13.1** (regarding the ratio of the lengths of Σ₁ and Σ₂). On the critical line $`\sigma=\tfrac12`$ we have $`|\chi|=1`$, so the Σ₂ links have the same lengths $`(n+1)^{-1/2}`$ as the Σ₁ links; each link is then a rotation composed with a uniform link-length shrink $`\sqrt{n/(n+1)}`$, and $`\arg\chi=-2\vartheta(t)`$, with ϑ the Riemann–Siegel theta function. The two chains are thus congruent link for link there, so their end-to-end displacements agree. Away from the critical line they do not, and the discrepancy has a closed form. Write $`\ell_{\Sigma_1}=|\Sigma_1|`$ and $`\ell_{\Sigma_2}=|\Sigma_2|`$ for the lengths of the net displacements of the two chains, and put $`\Sigma_m(z)=\sum_{n\le m}n^{-z}`$. Since $`\sum_{n\le m}n^{\,s-1}=\overline{\Sigma_m\bigl((1-\sigma)+it\bigr)}`$, the second leg is the first one read at the reflected abscissa $`1-\sigma`$, scaled by $`|\chi|`$:

<a id="eq-leg-ratio"></a>

```math
\frac{\ell_{\Sigma_1}}{\ell_{\Sigma_2}}
=
\frac{\bigl|\Sigma_m(\sigma+it)\bigr|}
     {\bigl|\chi(\sigma+it)\bigr|\;
      \bigl|\Sigma_m\bigl((1-\sigma)+it\bigr)\bigr|}.\qquad\text{(171)}
```


<a id="prop-leg-ratio-reflection"></a>


**Proposition 13.2**. *At fixed T (hence fixed $`t=I(T)`$ and $`m=\lfloor T\rfloor`$), at every σ for which all four lengths are nonzero,*

<a id="eq-leg-ratio-symmetry"></a>

```math
\frac{\ell_{\Sigma_1}(\sigma)}{\ell_{\Sigma_2}(\sigma)}
\cdot
\frac{\ell_{\Sigma_1}(1-\sigma)}{\ell_{\Sigma_2}(1-\sigma)}
=
1.\qquad\text{(172)}
```


Write [(171)](#eq-leg-ratio) at σ and at $`1-\sigma`$ and multiply. The two partial-sum moduli cancel, leaving $`1\big/\bigl(\lvert\chi(\sigma+it)\rvert\,
\lvert\chi((1-\sigma)+it)\rvert\bigr)`$. From $`\chi(s)\chi(1-s)=1`$ and the Schwarz reflection $`\chi(\bar s)=\overline{\chi(s)}`$ one has $`\chi(1-\sigma+it)=1/\overline{\chi(\sigma+it)}`$, so the product of the moduli is $`1`$. The ratio is therefore reciprocal-symmetric about $`\sigma=\tfrac12`$: whatever it does on the right half of the strip, it does the reciprocal of on the left, with the value pinned to $`1`$ at the center by the link-for-link congruence of Remark [13.1](#rem-leg-ratio).

<a id="rem-d-ratio"></a>


**Remark 13.3** (regarding the ratio of the lengths of *R₁* and *R₂*). The same question for the two fractional links has a shorter answer, because in the quotient of [(17)](04-decomposing-the-remainder-r-r1-r2.md#eq-d1) and [(18)](04-decomposing-the-remainder-r-r1-r2.md#eq-d2) both $`|R|`$ and the common denominator $`\sin(2\omega+\psi)`$ cancel:

<a id="eq-d-ratio"></a>

```math
\frac{d_1}{d_2}
\;=\;
\frac{\sin(\omega+\psi-\arg R)}{\sin(\omega+\arg R)},
\qquad
\frac{|R_1|}{|R_2|}
\;=\;
\Bigl|\frac{d_1}{d_2}\Bigr| .\qquad\text{(173)}
```

The signed quotient is the one that carries the information; the two moduli see only its absolute value, and $`d_1/d_2`$ does go negative off the line, as the fourth point below records. This ratio is pure angle data, carrying no length scale at all: it is the law of sines in the triangle of Figure [9](07-summands-as-links-and-joints.md#fig-remainder-zoom), recording how the direction of *R* divides the wedge spanned by the two link directions $`e^{-i\omega}`$ and $`e^{\,i(\omega+\psi)}`$. Four consequences are worth recording. First, on the critical line $`\arg R=\tfrac{\psi}{2}`$, the two sines coincide and the ratio is $`1`$, which is Proposition [4.1](04-decomposing-the-remainder-r-r1-r2.md#prop-weights)(iii) again. Second, the ratio at σ is the reciprocal of the ratio at $`1-\sigma`$:

<a id="prop-d-ratio-reflection"></a>


**Proposition 13.4**. *At fixed T, at every σ for which $`d_2(\sigma)`$ and $`d_2(1-\sigma)`$ are nonzero, so that both ratios are finite,*

<a id="eq-d-ratio-symmetry"></a>

```math
\frac{d_1(\sigma)}{d_2(\sigma)}
\cdot
\frac{d_1(1-\sigma)}{d_2(1-\sigma)}
=
1.\qquad\text{(174)}
```


The turn ω depends only on *T*. As above, one has $`\chi(1-\sigma+it)=1/\overline{\chi(\sigma+it)}`$, so ψ is the same at both abscissae. From [(7)](02-siegel-s-1932-formula.md#eq-siegel-named) and $`\zeta(s)=\chi(s)\zeta(1-s)`$ the remainder satisfies $`R(1-s)=\chi(1-s)R(s)`$; Schwarz reflection $`R(\bar z)=\overline{R(z)}`$ then gives

<a id="eq-R-reflect"></a>

```math
R(1-\sigma,T)
\;=\;
\chi(1-\sigma+it)\,\overline{R(\sigma,T)},\qquad\text{(175)}
```

hence $`\arg R(1-\sigma)=\psi-\arg R(\sigma)`$. The two sines of [(173)](#eq-d-ratio) therefore exchange, and the product is $`1`$. On the critical line [(175)](#eq-R-reflect) is $`R=\chi\overline{R}`$, which is the first point again.

Third, because the scale cancels, this ratio is far tamer than [(171)](#eq-leg-ratio): sampled on a grid over $`1<T<20`$ and the whole strip it runs from $`0.387`$ to $`2.583`$ (a reciprocal pair, as the second point requires). Those are not bounds. A grid steps over the isolated loci of the fourth point below, where the ratio is negative, or $`0`$, or infinite; what the sample shows is that away from them the ratio stays within a factor of three of $`1`$, whereas $`\ell_{\Sigma_1}/\ell_{\Sigma_2}`$ ranges over several orders of magnitude there. Fourth, the parallel-link poles of §[A.5](a-proof-of-proposition-4-1-reality-and-positivity.md#sec-pole-locations) cancel out of it: where $`2\omega+\psi=k\pi`$, [(173)](#eq-d-ratio) gives $`d_1/d_2=(-1)^{k+1}`$, exactly $`\pm1`$, even though *d₁* and *d₂* separately diverge (at $`\sigma=\tfrac1{10}`$, $`T=4.256594`$ we compute $`d_1=-d_2\approx-4.07\times10^{36}`$). A negative value is off-line news of a different kind: it says *R* has left the wedge, which happens in a narrow window around each pole. The ratio does reach $`0`$ and ∞, but only on the isolated loci where *R* is exactly parallel to one of the two link directions; for instance $`d_1=0`$ at $`\sigma=\tfrac1{10}`$, $`T=4.2607679`$, whose mirror at $`\sigma=\tfrac9{10}`$ has $`d_2=0`$. Off the critical line the locus $`d_1=d_2`$ is the family of ovals plotted in Figure [24](09-the-geometry-behind-the-result-experimental-math.md#fig-leg-imbalance).


<a id="sec-envelope"></a>

### 13.2 The envelope of $`\left|\zeta\!\left(\tfrac12+it\right)\right|`$

On the critical line the chain is isosceles for every reflection-symmetric split, by Corollary [9.1](09-the-geometry-behind-the-result-experimental-math.md#cor-equal-legs), so its two legs share one length $`L_1=|B_1|=|B_2|`$ and the base is the chord they subtend across the fold angle of the legs ϑ₂ of §[9.2](09-the-geometry-behind-the-result-experimental-math.md#sec-legs). From $`\zeta=B_1(1+e^{i\vartheta_2})`$,

<a id="eq-zeta-chord"></a>

```math
\bigl|\zeta\bigl(\tfrac12+it\bigr)\bigr|
=2L_1\bigl|\cos\tfrac{\vartheta_2}{2}\bigr| ,\qquad\text{(176)}
```

so the modulus of ζ splits into a length carried by the links and an angle read at the joint between the legs. Bounding the angular factor bounds ζ. Write $`u=\vartheta_2/\pi`$ reduced to $`[0,2)`$. Then $`\bigl|\cos\tfrac{\pi u}{2}\bigr|\leq1`$ at once, and since $`\cos\tfrac{\pi u}{2}`$ is concave on $`0\leq u\leq1`$ it stays above the chord joining its endpoints there, giving $`\bigl|\cos\tfrac{\pi u}{2}\bigr|\geq|1-u|`$ on the whole of $`[0,2)`$ by the reflection $`u\mapsto2-u`$, with equality only at $`u=0,1,2`$. Hence

<a id="eq-env-bounds"></a>

```math
2L_1\bigl|1-u\bigr|
\;\leq\;\bigl|\zeta\bigl(\tfrac12+it\bigr)\bigr|\;\leq\;2L_1 ,
\qquad
u\equiv\frac{\vartheta_2}{\pi}\ (\mathrm{mod}\ 2),\quad 0\leq u<2 .\qquad\text{(177)}
```

The reduction matters: ϑ₂ is the continuous lift whose turns do the counting in §[12](12-theta1-theta2-and-the-zero-counting-function.md#sec-counting), so $`\vartheta_2/\pi`$ itself grows without bound and would make the left side exceed the right. The upper envelope is attained where the two legs point the same way; the lower one is attained at every ordinate, where $`u=1`$ and both sides vanish, and again where *u* reaches $`0`$ or $`2`$ and the two envelopes meet. The triangular factor $`|1-u|`$ is the same sawtooth whose passages through zero do the counting in §[12](12-theta1-theta2-and-the-zero-counting-function.md#sec-counting), appearing here with an amplitude on it. Over $`6\leq T\leq13`$, which is $`264.9\leq t\leq1144.6`$, we confirm [(176)](#eq-zeta-chord) to $`1.7\times10^{-20}`$ and both inequalities of [(177)](#eq-env-bounds) at every one of $`2001`$ sample points, the two legs agreeing to $`2.0\times10^{-20}`$.

Which split to use is settled by how often the upper envelope is reached. Equation [(156)](12-theta1-theta2-and-the-zero-counting-function.md#eq-B1-rotated) gives $`2L_1=\sqrt{Z^2+4h^2}`$, so $`|\zeta|=2L_1`$ exactly where the offset *h* vanishes. For the split at the partial summand *h* changes sign inside a gap exactly when its two ends carry opposite *h*, which is the alternation that the count of §[12](12-theta1-theta2-and-the-zero-counting-function.md#sec-counting) needs and that fails at a retrograde ordinate, so the envelope is reached in some gaps and missed in others: $`3`$ of the $`7`$ gaps of $`6.125\leq T\leq6.275`$, and $`7`$ of the $`13`$ gaps of $`12.5\leq T\leq12.6`$. Those are counts of sign changes; a gap whose two ends agree could in principle still hold an even number of zeros of *h*, which would only add touches to the tally. The velocity split has no such gaps. Its offset $`h^{\ast}=-Z'/2\vartheta'`$ vanishes at every extremum of *Z*, so

<a id="eq-env-star"></a>

```math
2L_1^{\ast}=\sqrt{Z^2+\Bigl(\frac{Z'}{\vartheta'}\Bigr)^2}
\;\geq\;|Z|=\bigl|\zeta\bigl(\tfrac12+it\bigr)\bigr| ,\qquad\text{(178)}
```

with equality on every hump: $`7`$ touches in $`7`$ gaps and $`13`$ in $`13`$ in those two windows, matched to $`10^{-25}`$ (Figure [57](#fig-envelope)). This is the familiar envelope of an oscillation of instantaneous frequency $`\vartheta'`$, with $`Z'/\vartheta'`$ as the quadrature companion of *Z*, and it is tighter on average as well, the mean of $`|\zeta|/2L_1`$ over $`6\leq T\leq13`$ being $`0.635`$ against $`0.586`$ for the split at the partial summand.

Both readings are polar coordinates of one function. The rotated bisector point $`W=e^{i\vartheta}B_1^{\ast}=\tfrac12Z-\tfrac{iZ'}{2\vartheta'}`$ of [(161)](12-theta1-theta2-and-the-zero-counting-function.md#eq-h-star) has modulus $`L_1^{\ast}`$ and argument $`\pi\bigl(N_{\ast}-\tfrac32\bigr)`$ by [(162)](12-theta1-theta2-and-the-zero-counting-function.md#eq-N-star), and $`Z=2\mathrm{Re}W`$, so

<a id="eq-Z-polar"></a>

```math
Z(t)=-2\,|W|\,\sin\bigl(\pi N_{\ast}(T)\bigr),\qquad\text{(179)}
```

which we confirm to $`6\times10^{-13}`$, the precision of the counting curve itself. This is a restatement rather than a new fact, but it puts the two subsections together: the amplitude of the velocity split is the envelope of ζ and its phase is the counting curve, so the zeros are the moments when the phase passes an integer and the extrema are the moments when the amplitude is attained. Remark [12.5](12-theta1-theta2-and-the-zero-counting-function.md#rem-nstar-slope) reads the rate of that phase; the envelope [(178)](#eq-env-star) reads its amplitude. Verified in `check_envelope.py`.

<a id="fig-envelope"></a>

<p align="center"><img src="../figures/fig_envelope.png"></p>

**Figure 57:** The two envelopes of [(177)](#eq-env-bounds), at $`\sigma=\tfrac12`$, over $`12.5\leq T\leq12.6`$, which is $`1061.3\leq t\leq1077.7`$ and holds $`14`$ ordinates. In each panel $`|\zeta|`$ is black, the upper envelope $`2L_1`$ red, the lower envelope $`2L_1|1-\vartheta_2/\pi|`$ a teal sawtooth, and the gray band between them is where $`|\zeta|`$ is confined. Red dots on the axis are the ordinates, where the lower envelope touches zero along with $`|\zeta|`$, and the open circles are the touches of the upper envelope, one for each vanishing of the offset *h*. *Left:* the split at the partial summand, $`B_1=\Sigma_1+R_1`$, whose *h* fails to alternate at a retrograde ordinate, so it reaches its bound in only $`7`$ of the $`13`$ gaps and several humps rise nowhere near it. *Right:* the velocity split, whose $`h^{\ast}`$ vanishes at every extremum of *Z*, so the upper envelope is touched in every gap. Generated by `fig_envelope.py`.

<a id="rem-large-values"></a>


**Remark 13.5** (regarding hunting for large values with the first few links). Neither the envelope nor the slope of Remark [12.5](12-theta1-theta2-and-the-zero-counting-function.md#rem-nstar-slope) can be used to scout, since $`2L_1`$ needs $`R=\zeta-\Sigma_1-\Sigma_2`$ and $`2L_1^{\ast}`$ needs *Z* and $`Z'`$, so both are functions of ζ at a point one has already evaluated. What can be computed without ζ is the reason the envelope grows. Leg 1 is mostly the link sum, so the size of $`2L_1`$ is a question of how well the link phases $`t\log n`$ align, and the ceiling is the aligned case,

<a id="eq-link-ceiling"></a>

```math
\bigl|\zeta\bigl(\tfrac12+it\bigr)\bigr|\;\leq\;2L_1\;\leq\;
2\sum_{n\leq m}n^{-1/2}+2|R_1|\;\leq\;4\sqrt{m}\;\leq\;4\sqrt{T}
\;<\;4\Bigl(\frac{t}{2\pi}\Bigr)^{1/4}
=\frac{4}{(2\pi)^{1/4}}\,t^{1/4}\;<\;2.54\,t^{1/4},\qquad\text{(180)}
```

a bound that costs nothing to evaluate. Every step is an inequality. The middle one uses $`\sum_{n\leq m}n^{-1/2}\leq2\sqrt m-1`$, which follows by induction from $`(m+1)^{-1/2}\leq2\sqrt{m+1}-2\sqrt m`$, together with $`|R_1|=\hat d_1M^{-1/2}\leq1`$, so the fractional link is paid for by the $`-1`$ and does not disappear. The last inequality in *T* is $`t>2\pi T^2`$, which holds for every $`T>0`$ because [(9)](03-reparameterization-and-cutoff-choice-the-i-t-map.md#eq-IT) makes it $`2x+x^2>2\log(1+x)`$ at $`x=1/T`$. Read in *t* it is nothing new: the exponent $`\tfrac14`$ is the convexity, or trivial, bound $`\mu(\tfrac12)\le\tfrac14`$ of Lindelöf \[16\], where $`\mu(\sigma)=\inf\{a:\zeta(\sigma+it)=O(t^a)\}`$, and [(180)](#eq-link-ceiling) recovers it with an explicit constant. Nor can this path do better. The last step is the triangle inequality, which keeps only the aligned case and so discards every cancellation among the phases $`t\log n`$; in the geometry of this paper $`4\sqrt T`$ is the arc length of the chain laid out straight, while $`|\zeta|`$ is the distance between its endpoints once it has curled into its spirals. Every improvement past $`\tfrac14`$ comes from that discarded cancellation, beginning with the $`\tfrac16`$ that Hardy and Littlewood obtained by Weyl’s method on this same sum and standing today at $`\tfrac{13}{84}`$ \[4\]; the Lindelöf hypothesis is $`\mu(\tfrac12)=0`$. Two things follow, both drawn in Figure [58](#fig-large-values). First, the alignment can be read from a truncation. Scoring an interval by $`S_K(t)=\bigl|\sum_{n\leq K}n^{-1/2}e^{-it\log n}\bigr|`$ and then evaluating *Z* only at the strongest peaks of that score recovers most of the interval’s largest $`|Z|`$: averaged over the $`19`$ unit intervals $`5\leq T\leq24`$, which is $`190\leq t\leq3771`$, the three strongest peaks of the five-link score reach $`0.967`$ of it and the single strongest peak of the ten-link score reaches $`0.961`$. The point is not the saving at these heights but that *K* need not grow with *t* while *m* does. Second, the largest sampled values in the intervals are themselves nearly regular: $`\max|Z|`$ over $`[T,T+1]`$, taken on a grid of eight points per mean zero spacing and so liable to sit a percent or two under the true crest, fits $`2.93\,T^{0.485}`$, its ratio to $`\sqrt{T}`$ has mean $`2.823`$ and standard deviation $`0.123`$ across those intervals, and it holds a fraction of the ceiling [(180)](#eq-link-ceiling) that ranges from $`0.97`$ down to $`0.76`$, the two extremes falling at $`T=9`$ and $`T=22`$. Most of that spread is the ceiling rather than the maxima: the exact sum $`\sum_{n\leq m}n^{-1/2}=2\sqrt m+\zeta(\tfrac12)+o(1)`$ climbs toward its own asymptote $`2\sqrt m`$ across the range, from $`0.72`$ of $`4\sqrt T`$ at $`T=5`$ to $`0.86`$ at $`T=23`$, since $`\zeta(\tfrac12)=-1.4604`$ still weighs heavily at $`m=5`$. Against $`\sqrt T`$ itself the maxima are flat, $`2.711`$ at $`T=5`$ and $`2.670`$ at $`T=23`$, which is the same fact as the fitted exponent $`0.485`$ being essentially the ceiling’s $`\tfrac12`$: at these heights the maxima simply ride the trivial bound. In these coordinates the Lindelöf hypothesis is precisely the statement that they eventually stop, that $`\max|Z|/\sqrt T`$ falls like $`T^{-1/2+\varepsilon}`$, the chain curling up so efficiently that the distance between its endpoints grows more slowly than every positive power of *T* while its arc length grows like $`\sqrt T`$. That distance is not bounded, and is not claimed to be: $`|\zeta(\tfrac12+it)|`$ is known to be unbounded. Nothing of that is visible over $`19`$ intervals with $`m\leq23`$ links, and nothing here bears on it either way. So the answer to whether the next unit of the index will beat the last is yes by default, which it is in $`13`$ of the $`18`$ consecutive comparisons, and the exceptions are what needs predicting: on the maxima divided by $`\sqrt{T}`$ the peak of the ten-link score ranks the intervals at $`+0.72`$, while the three-link score, whose peak is nearly the same in every interval, carries nothing at $`-0.11`$. That last figure rests on $`19`$ intervals at modest height and should be read as an indication only. Verified in `check_large_values.py`.


<a id="fig-large-values"></a>

<p align="center"><img src="../figures/fig_large_values.png"></p>

**Figure 58:** Reading large values off the links, over the $`19`$ unit intervals $`5\leq T\leq24`$. *Left:* the fraction of an interval’s largest $`|Z|`$ found by evaluating *Z* only at the strongest one, three or five peaks of the *K*-link score $`S_K`$, averaged over the intervals, with the shading reaching down to the worst single interval. With seven links a single candidate captures $`95.9\%`$ on average, while the worst sampled interval captures $`71.2\%`$. *Right:* the interval maximum against $`\sqrt{T}`$, on which it is nearly straight, with the link ceiling of [(180)](#eq-link-ceiling) above it and the fitted power law through it. The gap between the two curves is the alignment the links never quite achieve. Generated by `fig_large_values.py`.

<a id="sec-colinearity"></a>

### 13.3 Collinearity of the three first-half remainders

Since all the remainders are relative to the same point, namely Σ₁, and since there are three of them, we decided to investigate their collinearity, which we could not do when there was just one remainder split (say $`R/2`$) or two (say $`R_{1ak}`$), because any two points already lie on a line.

Collinearity of three points is unchanged by a common translation. The three points $`B_{1ps}`$, $`B_{1rs}`$, and $`B_{1ak}`$ of §[9.3](09-the-geometry-behind-the-result-experimental-math.md#sec-ps-ak-r2) are all relative to the same Σ₁, so that shared Σ₁ cancels, and the three remainder vectors $`R_{1ps}=R_1`$, $`R_{1rs}=\tfrac12 R`$, and $`R_{1ak}`$ can be compared directly as points in the plane. Figure [59](#fig-colinearity-strip) plots two independent, scale-invariant measures of how far these three points are from lying on a common line. The first is the triangle flatness

<a id="eq-flatness"></a>

```math
F
\;=\;
\frac{2\,\lvert\mathrm{area}\rvert}{\mathrm{diam}^2},\qquad\text{(181)}
```

where the area is that of the triangle with the three points as vertices and the diameter is the largest of the three pairwise distances. The second is the aspect ratio $`\lambda_{\min}/\lambda_{\max}`$ of the covariance matrix of the three points (a principal-component measure). Both quantities are zero exactly when the points are collinear, and both are invariant under translation, rotation, and rescaling, so the shrinking of the remainders with growing *T* cannot masquerade as collinearity. Each panel is a grid of $`1501`$ σ-samples by $`1801`$ *T*-rows over $`0\le\sigma\le1`$, $`3.9\le T\le5.1`$, computed from the exact remainder formulas, with the σ-sample nearest $`\tfrac12`$ snapped exactly onto the critical line. The color scale is logarithmic, and that is what separates residuals at the double-precision floor, $`10^{-16}`$ to $`10^{-12}`$, from the merely small values, $`10^{-4}`$ to $`10^{-1}`$, that fill the rest of the strip. Exact collinearity on the critical line is the proposition below, not the heatmap; the heatmap shows that the residual sits at the floor there and nowhere else in the sampled window.

<a id="fig-colinearity-strip"></a>

<p align="center"><img src="../figures/fig_colinearity_3p9_5p1.png"></p>

**Figure 59:** Two ways of displaying the same collinearity information for the three first-half remainders $`R_{1ps}`$, $`R_{1rs}=\tfrac12 R`$, $`R_{1ak}`$ (dark $`=`$ collinear). The panel on the left uses the flatness measure [(181)](#eq-flatness) of the triangle formed by the three points, and the one on the right uses the PCA aspect ratio $`\lambda_{\min}/\lambda_{\max}`$. Horizontal axis $`\sigma\in[0,1]`$; vertical axis the spiral index $`T\in[3.9,5.1]`$. Both panels use a log color scale; green markers are zeta zeros at $`\sigma=\tfrac12`$. The dark column pinned at the numerical floor along $`\sigma=\tfrac12`$ shows the three points are exactly collinear everywhere on the critical line; off the line collinearity occurs only along the isolated dark horizontal bands. Generated by `fig_colinearity_zoom.py` from data produced by `remainder-colinearity-heatmap-zoom.mjs`.

Both panels show the same two facts. First, the column $`\sigma=\tfrac12`$ sits at the numerical floor at every *T*: on the critical line the three first-half remainders are exactly collinear, not just approximately (Proposition [13.6](#prop-colinear-line)). Second, off the line the measures are many orders of magnitude larger everywhere except along isolated dark horizontal bands (near $`T\approx4.03`$, $`4.62`$, $`4.80`$, and $`5.03`$ in this window), where the triangle momentarily passes through a flat configuration as its signed area changes sign. The measured values are symmetric under $`\sigma\mapsto1-\sigma`$, a reflection of the functional equation.

The same pattern appears, in the sampled data, across $`0\le\sigma\le1`$ for $`0<T\le20`$. Figure [60](#fig-colinearity-four-panel) repeats the four-panel layout of Figure [24](09-the-geometry-behind-the-result-experimental-math.md#fig-leg-imbalance) (two windows spanning the unit cells $`5.95\le T\le7.05`$ and $`10.95\le T\le12.05`$, a third band straddling the integer $`T=17`$, and the same full strip $`0\le T\le20`$), with the PCA aspect ratio as the plotted color map. As in the leg-imbalance panels, the dark column on $`\sigma=\tfrac12`$ runs unbroken through every window, while off the line the only dark features are the isolated horizontal collinearity bands. The bands do not sit at integer *T*: crossing an integer the three remainder formulas jump (Σ₁ gains a summand and the sign $`(-1)^{\lfloor T\rfloor}`$ flips), the signed area of the triangle changes sign in that jump and lands very close to zero, and the area then crosses zero a short distance above the integer. The third panel shows one full unit interval, $`16.95\le T\le18.05`$: the light-to-dark break at the integer $`T=17`$ itself, a nearly flat strip at every σ just above it, and then the five collinearity bands of the cell, at $`T\approx17.011`$, $`17.252`$, $`17.612`$, $`17.752`$, and $`17.796`$, before the pattern repeats across the next break at $`T=18`$. Numerically the bands come five to a unit interval, near $`\{T\}\approx0.011`$, $`0.252`$, $`0.612`$, $`0.752`$, $`0.796`$ at this height, with the second and fourth tracking the pole heights $`\{T\}=\tfrac14,\tfrac34`$ of *d₁* (§[A.5](a-proof-of-proposition-4-1-reality-and-positivity.md#sec-pole-locations)): near a pole $`R_{1ps}`$ runs off to infinity along the fixed direction of the next summand, so the triangle is dragged through a flat configuration nearby. The band positions are almost independent of σ (they move by less than $`10^{-4}`$ between $`\sigma=0.2`$ and $`\sigma=0.35`$), which is why the bands are horizontal.

<a id="fig-colinearity-four-panel"></a>

<p align="center"><img src="../figures/colinearity_four_panel.png"></p>

**Figure 60:** PCA aspect ratio $`\lambda_{\min}/\lambda_{\max}`$ of the three first-half remainders $`(R_{1ps},R_{1rs},R_{1ak})`$ (dark purple $`=`$ collinear), in the four-panel layout of Figure [24](09-the-geometry-behind-the-result-experimental-math.md#fig-leg-imbalance). Horizontal axis $`\sigma\in[0,1]`$; vertical axis the spiral index *T*. Color is on a log scale. The rightmost panel is the full strip $`0\le T\le20`$; the first three panels are zooms of the outlined bands ($`5.95\le T\le7.05`$, $`10.95\le T\le12.05`$, $`16.95\le T\le18.05`$). The dark vertical band on $`\sigma=\tfrac12`$ is the exact collinearity of the three first-half remainders on the critical line; the dark horizontal bands are the isolated off-line collinearity events. Generated by `plot_colinearity_four_panel.py`.

Why can this collinearity not be used like the two routes of §[9.4](09-the-geometry-behind-the-result-experimental-math.md#sec-toward-proof)? Because collinearity is *not* forced at a zero. For $`\zeta\neq0`$ the equal-leg condition for a split says precisely that *B₁* is equidistant from *O* and ζ, i.e. that *B₁* lies on the perpendicular bisector of the chord from *O* to ζ; if all three splits had equal legs at a point where $`\zeta\neq0`$, all three bisector points would lie on that single line and the three first-half remainders would be collinear. But at a zero the chord degenerates: $`\zeta=O`$, every point of the plane is equidistant from the two endpoints, and the (now automatic) equal-leg conditions carry no collinearity information at all. All three leg pairs are equal at a zero, as they must be, while the three points can remain in general position. So a zero implies equal legs for all three splits, but not collinearity, and the three points need not line up at an off-line zero.

<a id="prop-colinear-line"></a>


**Proposition 13.6**. *On $`\sigma=\tfrac12`$ the three first-half remainders $`R_{1ps}`$, $`R_{1rs}=\tfrac12 R`$, and $`R_{1ak}`$ are collinear at every height T, zeros included.*


The three points $`B_{1ps}`$, $`B_{1rs}`$, and $`B_{1ak}`$ are those remainders translated by the common Σ₁, so it is the same to prove the *B₁* collinear. On the critical line write ϑ for the Riemann–Siegel theta function, so $`\chi=e^{-2i\vartheta}`$ and $`Z=e^{i\vartheta}\zeta`$ is real. Any split $`\zeta=B_1+B_2`$ that satisfies the reflection $`B_2=\chi\overline{B_1}`$ then has

<a id="eq-B1-line"></a>

```math
e^{i\vartheta}B_1
\;=\;
\tfrac12 Z+ih,
\qquad h\in\mathbb R.\qquad\text{(182)}
```

Indeed $`e^{i\vartheta}B_2=\overline{e^{i\vartheta}B_1}`$, so $`e^{i\vartheta}\zeta=e^{i\vartheta}B_1+\overline{e^{i\vartheta}B_1}
=2\Re(e^{i\vartheta}B_1)`$, and the left side is the real number *Z*. Thus every such *B₁* has the same real part $`Z/2`$ in the ϑ-frame: all of them lie on the single vertical line $`\Re(e^{i\vartheta}z)=Z/2`$, which is the perpendicular bisector of the segment from *O* to ζ when $`\zeta\neq0`$, and the imaginary axis of that frame when $`\zeta=0`$. The three named splits are of this kind. For the $`ps`$ split, $`B_2=\chi\overline{B_1}`$ is Corollary [9.1](09-the-geometry-behind-the-result-experimental-math.md#cor-equal-legs). For the $`rs`$ split the same reflection is the identity recorded in §[9.3](09-the-geometry-behind-the-result-experimental-math.md#sec-ps-ak-r2): $`\Sigma_2=\chi\overline{\Sigma_1}`$ and $`R=\chi\overline{R}`$, so $`\chi\overline{B_{1rs}}=\Sigma_2+\tfrac12 R=\zeta-B_{1rs}`$. For the $`ak`$ split, Siegel’s contour integral *f* of [(62)](08-other-remainders.md#eq-siegel-58) gives the exact pairing $`\zeta(s)=f(s)+\chi(s)f(1-s)`$ \[21\], and on the line $`f(1-s)=\overline{f(s)}`$, so $`B_{1ak}=f(s)`$ satisfies the same reflection; the numerical $`R_{1ak}`$ of [(60)](08-other-remainders.md#eq-Rak-split) is the Dirichlet-sum truncation of that identity, which is why the heatmaps sit at the double-precision floor rather than at a symbolic zero. Equation [(182)](#eq-B1-line) does not use $`\zeta\neq0`$, so the three points remain collinear at a critical-line zero as well: there $`Z=0`$ and they lie on $`\Re(e^{i\vartheta}z)=0`$.

A proof through collinearity therefore still needs a bridge that the routes of §[9.4](09-the-geometry-behind-the-result-experimental-math.md#sec-toward-proof) do not. The first step of that bridge is the identity just proved. What remains is to prove that off the line collinearity fails outside isolated curves like the dark bands of Figure [59](#fig-colinearity-strip), and to connect a hypothetical off-line zero to that structure, for instance through nearby off-line points with $`\zeta\neq0`$ at which all three splits have equal legs, which by the perpendicular-bisector argument above would force a collinearity that the off-line geometry forbids. Those two steps would turn collinearity into a characterization of the critical line and then into a statement about zeros; both remain unproved.

<a id="sec-joint-angles"></a>

### 13.4 Joint angles

In our numerical explorations of observing the links in their own coordinate frames, which led to [(146)](11-conjecture-there-is-a-yin-yang-d1-d2-for-every-l.md#eq-zeta-any-cut), we decided to look at the joint angles too. So we plotted them, and noticed a pattern emerge at the Farey fractions. This section is the result of that investigation.

The joint angles of the forward chain can be read on their own, without the chain visualization, using one dot per joint with the turning angle on the vertical axis, the joint index along the horizontal. The turning angle at joint *n* is the continuous joint angle [(89)](10-geometric-origins-of-the-i-t-and-yin-and-yang-fu.md#eq-jangle) evaluated at an integer joint,

<a id="eq-theta-joint"></a>

```math
\theta_n \;=\; -I(T)\,\log\tfrac{n}{n-1}
\qquad\text{(reduced to }[-\pi,\pi]\text{)},
\qquad
\nu(n) \;=\; \frac{I(T)}{2\pi\,n(n-1)},\qquad\text{(183)}
```

where ν, the derivative of the unwrapped angle divided by $`2\pi`$, is the local frequency of the strip in cycles per joint. Two features organize the picture, both consequences of $`I(T)`$. First, at the bisector joint $`n=\lfloor T\rfloor+1`$ the frequency is $`\nu=1+\frac{1}{6T(T+1)}`$, one full turn per joint to nine decimals at $`T=13000`$, and the angle there is $`-\pi`$ exactly: that is [(90)](10-geometric-origins-of-the-i-t-and-yin-and-yang-fu.md#eq-jangle-count), the bisector joint of §[10.1](10-geometric-origins-of-the-i-t-and-yin-and-yang-fu.md#sec-IT-origin), seen as the right edge of the strip. The joints just behind it inherit almost the same angle, $`3.141109`$, $`3.139659`$, $`3.137242`$ at $`n=T,T-1,T-2`$, which is the same near-stationarity that makes the bisector frame of Figure [31](10-geometric-origins-of-the-i-t-and-yin-and-yang-fu.md#fig-bisector-frame) repeat. Second, since $`\nu(n)\approx T^2/n^2`$ falls from ν of order $`10^8`$ at $`n=2`$ to $`1`$ at that bisector joint, the strip is a sampled chirp, and it is stratified by the joints where ν is the reciprocal of a rational. Writing that rational as a Farey fraction $`f=p/q`$ in $`(0,1]`$, its *caustic joint* is the solution of $`n(n-1)=f\,I(T)/2\pi`$, that is $`\nu=1/f`$, so

<a id="eq-caustic-joint"></a>

```math
n_f\;=\;\tfrac12\Bigl(1+\sqrt{1+2f\,I(T)/\pi}\,\Bigr)\;\approx\;T\sqrt{f},\qquad\text{(184)}
```

and there the joints fall into exactly *p* strands, the denominator of $`\nu=q/p`$, each a parabola of curvature $`4\pi\nu/n`$ per joint squared because the unwrapped angle is locally quadratic (exactly $`|\widetilde\theta''(n_f)|`$ of [(186)](#eq-caustic-derivs) below). Small denominators give the spines visible in Figure [61](#fig-joint-angles), drawn at the integer index $`T=13000`$, where $`t=I(T)=1{,}061{,}939{,}999.369541`$: there the fractions $`\tfrac14,\tfrac13,\tfrac12,\tfrac23,\tfrac34`$ sit at $`n=6501,7506,9193,10615,11259`$, and $`f=1`$ is the bisector joint itself. The parabolic strands are the same local quadratic phase that produces the Cornu-like arcs of the curlicue literature of §[14.3](14-prior-literature.md#sec-curlicues), here read off the joints rather than the partial sums.

<a id="fig-joint-angles"></a>

<p align="center"><img src="../figures/fig_joint_angles.png"></p>

**Figure 61:** The joint-angle strip at $`T=13000`$, where $`t=I(T)=1{,}061{,}939{,}999.369541`$, one dot per joint of the forward chain, $`n=2,\dots,\lfloor T\rfloor+1`$, with $`\theta_n`$ of [(183)](#eq-theta-joint) on the vertical axis. The two edges $`\pm\pi`$ are identified, so the strip is a cylinder. *Top:* all $`13000`$ joints, carrying three horizontal scales: the Farey fractions $`f=p/q`$ with $`q\le7`$ above, each at its caustic joint [(184)](#eq-caustic-joint) and staggered in two rows where they crowd; the normalized joint fraction $`u=(n-1)/\lfloor T\rfloor`$ below, so the bisector joint sits at $`u=1`$; and the joint index *n* below that. The red circle at the right edge is the bisector joint $`n=\lfloor T\rfloor+1`$, where $`\theta=-\pi`$ exactly. *Bottom left:* a window at $`f=\tfrac25`$, showing its $`p=2`$ parabolic strands as dots, each with its fitted arc [(188)](#eq-fitted-arc) drawn through them; the two arcs sit half a turn apart, so strand $`1`$ has its vertex wrapped to the opposite edge. *Bottom right:* the last tenth of the strip, where the strands steepen and run into that bisector joint on the right in the figure. Dashed lines carry each window back to the stretch of the joint-*n* scale it magnifies, marked there by a bracket. Generated by `fig_joint_angles.py`.

<a id="the-fitted-curve-"></a>

##### The fitted curve.

The strands are more than parabola-like: they can be written down. Let $`\widetilde\theta(n)=-I(T)\log\frac{n}{n-1}`$ be the unwrapped angle, so $`\theta_n`$ is $`\widetilde\theta(n)`$ reduced to $`[-\pi,\pi]`$, and differentiate it three times:

<a id="eq-jangle-derivs"></a>

```math
\widetilde\theta'(n)=\frac{I(T)}{n(n-1)},\qquad
\widetilde\theta''(n)=-\frac{I(T)\,(2n-1)}{[\,n(n-1)\,]^2},\qquad
\widetilde\theta'''(n)=\frac{2\,I(T)\,(3n^2-3n+1)}{[\,n(n-1)\,]^3}.\qquad\text{(185)}
```

At a caustic these have closed forms in the fraction alone, since [(184)](#eq-caustic-joint) fixes $`n_f(n_f-1)=f\,I(T)/2\pi`$ and $`2n_f-1=\sqrt{1+2f\,I(T)/\pi}`$ exactly:

<a id="eq-caustic-derivs"></a>

```math
\begin{aligned}
\widetilde\theta'(n_f)&=\frac{2\pi}{f}=\frac{2\pi q}{p},
\qquad
\widetilde\theta''(n_f)=-\frac{4\pi^2}{f^2I(T)}
\sqrt{1+\frac{2f\,I(T)}{\pi}}\;\approx\;-\frac{4\pi}{f^{3/2}T},\\[2pt]
\widetilde\theta'''(n_f)&=\frac{16\pi^3}{f^3I(T)^2}
\Bigl(1+\frac{3f\,I(T)}{2\pi}\Bigr)\;\approx\;\frac{12\pi}{f^2T^2}.
\end{aligned}\qquad\text{(186)}
```

Write $`\delta=n-n_f`$ for the offset in joints from the caustic. The linear term $`\widetilde\theta'(n_f)\,\delta=(2\pi q/p)\,\delta`$ is a carrier sweeping several radians per joint, and it is what interleaves the dots into strands in the first place. Along one strand, though, δ advances by *p* at a time, and $`(2\pi q/p)\,pm=2\pi q\,m`$ drops out: the carrier contributes nothing but a constant. Absorbing it together with $`\widetilde\theta(n_f)`$, strand *j* carries the phase constant

<a id="eq-caustic-Cj"></a>

```math
C_j\;=\;\widetilde\theta(n_f)+\frac{2\pi q}{p}\bigl([n_f]+j-n_f\bigr),
\qquad j=0,\dots,p-1,\qquad\text{(187)}
```

with $`[\,\cdot\,]`$ the nearest integer, and the strand itself is that cubic reduced to $`[-\pi,\pi]`$

<a id="eq-fitted-arc"></a>

```math
\rho_j(\delta)\;=\; C_j
+\tfrac12\widetilde\theta''(n_f)\,\delta^2
+\tfrac16\widetilde\theta'''(n_f)\,\delta^3
\qquad\text{(reduced to }[-\pi,\pi]\text{)}.\qquad\text{(188)}
```

Because $`\gcd(p,q)=1`$ the constants $`C_j`$ run through all *p* residues of $`2\pi/p`$, so the *p* arcs are one parabola stacked at equal spacing around the cylinder. Third order is the right order: the second derivative supplies the parabola, the third its visible skew, and the fourth is smaller by a further $`\delta/n_f\sim T^{-1/2}`$.

The arcs drawn in Figure [61](#fig-joint-angles) are [(188)](#eq-fitted-arc) at $`f=\tfrac25`$ and $`T=13000`$, where $`n_f=8222.74`$, $`\widetilde\theta''(n_f)=-3.8208\times10^{-3}`$ and $`\widetilde\theta'''(n_f)=1.3941\times10^{-6}`$ radians per joint squared and cubed, and the carrier is $`2\pi q/p=5\pi\equiv\pi`$, which is why the two strands sit half a turn apart. Over the $`\pm30`$ joints shown they track the dots to $`2.2\times10^{-5}`$ radians, that being the fourth-order term. Nothing is fitted in the statistical sense, and [(188)](#eq-fitted-arc) is evaluated exactly. Two limits stand out. Toward small *f* the parabola stiffens like $`f^{-3/2}`$, which is why the left end of the strip looks like noise at this scale: consecutive joints there are many turns apart and only the caustics of very small *f* remain resolved. At the other end $`f=1`$ closes the family, with $`p=q=1`$: a single strand, a carrier of one full turn per joint, and $`C_0=-\pi`$. That is the bisector joint of [(90)](10-geometric-origins-of-the-i-t-and-yin-and-yang-fu.md#eq-jangle-count) again, so the bisector joint this paper is built on is the last caustic of the sequence, and the right-hand panel of Figure [61](#fig-joint-angles) is the run of the high-denominator caustics into it.

<a id="sec-incremental"></a>

##### Incremental change.

The strip is a snapshot. Advance the index and every dot moves, though not by the same amount. Differentiating the unwrapped angle in *T* at a fixed joint,

<a id="eq-jangle-drift"></a>

```math
\begin{aligned}
\frac{\partial\widetilde\theta}{\partial T}(n)&=-\,I'(T)\log\frac{n}{n-1},
\qquad L=\log\Bigl(1+\tfrac1T\Bigr),\\[2pt]
I'(T)&=\frac{\pi}{L^2}\Bigl(2L+\frac{2T+1}{T(T+1)}\Bigr)
=4\pi T+2\pi+O(T^{-1}),
\end{aligned}\qquad\text{(189)}
```

which in cycles is a drift rate

<a id="eq-jangle-drift-cycles"></a>

```math
\mu(n)\;=\;\frac{I'(T)}{2\pi}\log\frac{n}{n-1}
\;\approx\;\frac{2T+1}{n-\tfrac12}\;\approx\;\frac{2}{u},
\qquad u=\frac{n-1}{\lfloor T\rfloor}.\qquad\text{(190)}
```

A value of μ is easiest to read as a lap count: $`\mu(n)=3`$ means that dot laps the strip three times, falling from $`+\pi`$ to $`-\pi`$, wrapping, and repeating, while you advance *T* by one. Nothing here needs differencing: $`I'(T)`$ is available in closed form as $`\pi\bigl(2L+(2T+1)/T(T+1)\bigr)/L^2`$ with $`L=\log(1+1/T)`$, which is $`4\pi T+2\pi`$ to leading order, about $`163{,}369`$ at $`T=13000`$.

The sign is the same everywhere, so the whole strip drifts downward; the magnitude is not, and that is the point. Since $`\mu(n)\approx(2T+1)/(n-\tfrac12)\approx2/u`$, the rate is essentially a $`1/u`$ hyperbola, equal to exactly $`2`$ at the bisector joint $`u=1`$ and growing leftward to $`1.8\times10^4`$ cycles per unit index at $`n=2`$. Incidentally, the $`2/u`$ form is no longer any good there, reading $`26{,}000`$, since $`\log\frac{n}{n-1}`$ and $`1/(n-\tfrac12)`$ part company at the first few joints. The strip does not translate as the index advances, it shears. Read the other way, $`1/\mu(n)`$ is the index step that returns joint *n* to the same angle: a dot at $`u=\tfrac12`$ comes back around every $`\Delta T=0.25`$, one at $`u=0.1`$ every $`\Delta T=0.05`$, and one at the bisector joint every half unit.

At the right edge the value is exact and already familiar: the middle expression of [(190)](#eq-jangle-drift-cycles) at $`n=\lfloor T\rfloor+1`$ is $`(2T+1)/(T+\tfrac12)=2`$, and the exact rate is $`2.000000001`$ at $`T=13000`$. Two cycles per unit index is one more than [(90)](10-geometric-origins-of-the-i-t-and-yin-and-yang-fu.md#eq-jangle-count) reports for the joint angle, and the discrepancy is the joint itself moving: the bisector joint sits at $`n=\lfloor T\rfloor+1`$, which advances one joint per unit index, and one joint there is worth $`\nu=1`$ turn, so an observer riding the bisector joint sees $`\mu-\nu=1`$ cycle, namely $`\frac{d}{dT}\pi(2T+1)=2\pi`$. The two statements differ only in whether one rides the bisector joint or stands at a fixed joint.

The pattern the dots drift through, by contrast, hardly moves at all. Differentiating [(184)](#eq-caustic-joint) gives $`dn_f/dT=f\,I'(T)\big/2\pi(2n_f-1)\approx\sqrt f`$, so a caustic creeps outward by a fraction of a joint per unit index, and its normalized position $`u_f=(n_f-1)/\lfloor T\rfloor\approx\sqrt f`$ does not depend on *T* at all: the spines stand still while the joints stream through them. Their drift rate follows from pairing [(190)](#eq-jangle-drift-cycles) with the cycles per joint $`\nu=I(T)/2\pi n(n-1)`$ of [(183)](#eq-theta-joint), which gives $`\mu\approx2\sqrt\nu`$: at the caustic of Farey fraction *f*, where $`\nu=1/f`$, the dots slide at $`2/\sqrt f`$ cycles per unit index, four at $`f=\tfrac14`$ and two at $`f=1`$. Only at an integer index does the frame change, when a new link is appended, a new joint appears at the right edge with $`\theta=-\pi`$, and *u* rescales by one part in $`\lfloor T\rfloor`$.

Figure [62](#fig-incremental-change) shows one step, $`\Delta T=0.02`$, which advances *t* by $`\Delta I=3267.38`$. The travel is $`0.04/u`$ cycles: $`14.4^{\circ}`$ at the bisector joint, $`28.8^{\circ}`$ at $`u=\tfrac12`$, $`143.9^{\circ}`$ at $`u=0.1`$, half a turn at $`u=0.0800`$, joint $`n=1041`$, and a full turn at $`u=0.0400`$, joint $`n=521`$. Since the motion is downward everywhere, the arrows in the figure are drawn downward and wrapped at the lower edge, which is where they land for joints left of $`n=1041`$. Left of $`n=521`$ the joint has gone round at least once, and rather than draw what is left over the arrow there sweeps the whole strip from π to $`-\pi`$; at $`n=2`$ the travel is $`2264`$ radians, some $`360`$ turns. This is the sense in which the left end of the strip is a chirp in the index as well as in the joint number: it is not only that neighboring joints are many turns apart at fixed *T*, but that one joint sweeps many turns over a step in *T* too small to move the bisector joint by a quarter of a radian. The bottom panel of Figure [62](#fig-incremental-change) is μ on a logarithmic axis, and the middle panel is a picture of the same quantity at $`\Delta T=0.02`$.

<a id="fig-incremental-change"></a>

<p align="center"><img src="../figures/fig_incremental_change.png"></p>

**Figure 62:** One increment of the index, at $`T=13000`$. *Top:* the whole joint-angle strip as in Figure [61](#fig-joint-angles), with the shaded first half magnified below. *Middle:* that half twice over, gray at $`T=13000`$ and red at $`T=13000.02`$, every dot having drifted downward by $`\mu(n)\,\Delta T\approx0.04/u`$ cycles of [(190)](#eq-jangle-drift-cycles). Fifty joints spaced evenly across the panel are circled in both colors, with an arrow along the path traveled; since the drift is downward at every joint the arrows run downward and wrap at the lower edge, and where the travel exceeds a full turn the arrow sweeps the whole strip, from π to $`-\pi`$. The travel lengthens leftward like $`1/u`$, passing half a turn at $`n=1041`$ and a full turn at $`n=521`$, marked by the dotted vertical line. Both strips carry the Farey fractions $`f=p/q`$, $`q\le7`$, each at its caustic joint [(184)](#eq-caustic-joint); only $`f\le\tfrac14`$ falls in the magnified half, since $`u_f\approx\sqrt f`$. *Bottom:* the drift rate itself on a logarithmic axis: exact (blue) against the $`2/u`$ form (gray), the two separating only at the first few joints, with the dashed line at one full turn per $`\Delta T=0.02`$. Generated by `fig_incremental_change.py`.

---

[← Contents](../README.md) · [← 12 ϑ₁, ϑ₂ and the zero-counting function](12-theta1-theta2-and-the-zero-counting-function.md) · [14 Prior literature →](14-prior-literature.md)
