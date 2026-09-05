[← Contents](../README.md) · [← 7 Summands as links and joints](07-summands-as-links-and-joints.md) · [9 The geometry behind the result (experimen… →](09-the-geometry-behind-the-result-experimental-math.md)

---

<a id="sec-other-remainders"></a>

## 8 Other remainders

The split $`R=R_1+R_2`$ of §[4](04-decomposing-the-remainder-r-r1-r2.md#sec-decomp) is not the only way to dissect Siegel’s remainder in two. This section introduces two others, so that three splits are in play, all reassembling the same *R*: exactly in two of the three cases and to high accuracy in the third. We first name the three, then drill down on the newest of them, Kuznetsov’s; a closing subsection (§[8.3](#sec-remainder-scaling)) records a scaling observation. The remainder figures at different heights are nearly scaled copies, with the residual amplitude discrepancy tending toward zero as *T* grows.

<a id="sec-remainders-summary"></a>

### 8.1 The three splits and their names

To keep the remainders straight we name them with subscripts. Siegel’s remainder integral is written *R* when unsplit; each named split below recovers that same *R* (exactly, or approximately for the Kuznetsov form):

**1.** **Riemann–Siegel half-split.**

```math
R \;=\; R_{rs} \;=\; R_{1rs}+R_{2rs},
\qquad
R_{1rs}=R_{2rs}=\tfrac12 R.
```

Here $`R_{1rs}`$ is simply half the remainder integral.

**2.** **Partial-summand split** (§[4](04-decomposing-the-remainder-r-r1-r2.md#sec-decomp)–§[5](05-the-remainders-are-one-more-partial-summand.md#sec-summand)), the split of this paper.

```math
R \;=\; R_{ps} \;=\; R_{1ps}+R_{2ps}.
```

Here $`R_{1ps}`$ is a partial next summand: the next Dirichlet term after Σ₁ stops, the *M*-th, shortened to length *d₁*. The unsubscripted $`R_1,R_2`$ used everywhere else in this paper are exactly $`R_{1ps},R_{2ps}`$; we attach the $`ps`$ subscript only where several splits stand side by side, as in this section and §[9](09-the-geometry-behind-the-result-experimental-math.md#sec-geometry).

**3.** **Kuznetsov / Siegel *f* split** (§[8.2](#sec-kuznetsov)).

```math
R \;\approx\; R_{ak} \;=\; R_{1ak}+R_{2ak}.
```

Here $`R_{1ak}`$ is, to high accuracy, Siegel’s $`f(s)`$ minus the first partial sum, $`R_{1ak}\approx f(s)-\Sigma_1`$, with equality if this is taken as the definition (§[8.2](#sec-kuznetsov)).

All three are measured from the same pair of joints, both at index $`m=\lfloor T\rfloor`$: each $`R_{1\bullet}`$ leaves joint *m* of the Σ₁ chain of §[7](07-summands-as-links-and-joints.md#sec-matrix-product), which is the partial sum Σ₁ itself, and each $`R_{2\bullet}`$ arrives at joint *m* of the Σ₂ chain, which is the point $`\Sigma_1+R`$. A split therefore chooses nothing but the point $`\Sigma_1+R_{1\bullet}`$ at which the two halves meet (for the $`ps`$ split this meeting point is the *B₁* of §[7](07-summands-as-links-and-joints.md#sec-matrix-product)); the anchoring joints are common to all three. Named for their splits, the three such points are

<a id="eq-B1-three"></a>

```math
B_{1rs}=\Sigma_1+\tfrac12R,
\qquad
B_{1ps}=\Sigma_1+R_{1ps}=B_1,
\qquad
B_{1ak}=\Sigma_1+R_{1ak}\approx f(s).\qquad\text{(58)}
```

<a id="sec-kuznetsov"></a>

### 8.2 Kuznetsov’s remainders

It is worth contrasting our remainders $`R_{1ps},R_{2ps}`$ with the remainder of Alexey Kuznetsov \[13\], whose paper appeared on the arXiv in March 2025 and in print in 2026. It gives a simple and accurate algorithm for computing ζ, which we have found useful in our own numerical work. There are two differences. The first is one of *kind*: Kuznetsov’s remainder is an *approximation* to *R*, whereas $`R_{1ps}+R_{2ps}=R`$ is an *exact* identity (Theorem [4.2](04-decomposing-the-remainder-r-r1-r2.md#thm-decomp)), though, as we shall see below, if $`R_{1ak}`$ is read as $`f(s)-\Sigma_1`$ the $`ak`$ split is exact too, the approximation moving into the numerical evaluation of *f*. The second is one of *direction*: neither of his two halves lies along the next summand of its Dirichlet sum, while each of ours is exactly that summand, shortened.

Where his pair comes from is worth a word, since Siegel has one remainder and Kuznetsov has two. Siegel’s §2 opens at his equation 8, one Dirichlet sum plus one contour integral, and the residue theorem carries that into his equation 13, our [(1)](02-siegel-s-1932-formula.md#eq-siegel13): still one integral, now standing beside both sums. One integral, one remainder, and that single *R* is what we split in two. Kuznetsov opens instead at the symmetric formula of Siegel’s §3, Siegel’s equation 56, the one he says makes the functional equation evident. It carries two integrals, one in *s* and its reflection in $`1-s`$ weighted by χ, so his two halves arrive with the starting point rather than from a later choice. Gabcke’s rederivation \[10\] begins in the same place, and Kuznetsov reaches it through the quadrature forms of Galway \[11\] and Arias de Reyna \[1\] rather than from Siegel directly.

Writing Kuznetsov’s approximate remainder as $`R_{ak}`$ (the subscript “$`ak`$” for Alexey Kuznetsov, and to distinguish it from Siegel’s exact, unsubscripted *R*), his method gives

<a id="eq-Rak"></a>

```math
R \;\approx\; R_{ak}
\;=\; -\tfrac12(-1)^m
\Bigl(I_1 + \chi(s)\,I_2\Bigr),\qquad\text{(59)}
```

where $`I_1,I_2`$ are the two integrals of Kuznetsov’s construction, each evaluated as a short finite series in precomputed coefficients $`\omega_0,\omega_1[n],\lambda[n]`$ (his notation; this ω₀ is unrelated to the direction angle ω of [(19)](04-decomposing-the-remainder-r-r1-r2.md#eq-omega-def)); in some of our calculations we use $`8`$ such coefficients, which already gives a dozen or more digits of accuracy across the range of interest. Just as we split *R* into two pieces, the two terms of [(59)](#eq-Rak) define Kuznetsov’s two half-remainders

<a id="eq-Rak-split"></a>

```math
R_{ak}=R_{1ak}+R_{2ak},\qquad
R_{1ak}=-\tfrac12(-1)^mI_1,\qquad
R_{2ak}=-\tfrac12(-1)^m\chi\,I_2,\qquad\text{(60)}
```

so that, in parallel with [(22)](04-decomposing-the-remainder-r-r1-r2.md#eq-zeta-ps),

```math
\zeta \;\approx\; \Sigma_1 + R_{1ak} + \Sigma_2 + R_{2ak}.
```

The split [(60)](#eq-Rak-split) mirrors the functional equation: $`R_{1ak}`$ pairs with the first Dirichlet sum Σ₁ and $`R_{2ak}`$ carries the functional-equation factor χ alongside Σ₂. Figure [11](#fig-kuznetsov-zoom) compares the two routes from Σ₁ to $`\Sigma_1+R`$: the exact fractional links on one side and Kuznetsov’s dashed pair on the other.

<a id="fig-kuznetsov-zoom"></a>

<p align="center"><img src="../figures/fig4_kuznetsov_zoom.png"></p>

**Figure 11:** Exact versus Kuznetsov remainders, in the same zoom region as Figure [9](07-summands-as-links-and-joints.md#fig-remainder-zoom). The exact fractional summands $`R_{1ps}`$ (red) and $`R_{2ps}`$ (orange) run from Σ₁ to $`\Sigma_1+R`$ on one side of the resultant *R* (purple); Kuznetsov’s approximate half-remainders $`R_{1ak},R_{2ak}`$ are drawn as the orange dashed pair. Since $`R_{1ak}+R_{2ak}\approx R`$ (here to within $`10^{-14}`$), the dashed path lands on $`\Sigma_1+R`$; unlike the exact links, the $`ak`$ links do not lie along a summand direction. Computed with $`8`$ Kuznetsov coefficients and generated by `fig4_kuznetsov_zoom.py`.

This pairing is exactly Siegel’s: in his 1932 paper \[21\] Siegel writes ζ as $`f(s)`$ plus its reflected counterpart, and the first side is

<a id="eq-siegel-f"></a>

```math
f(s) \;\approx\; \Sigma_1 + R_{1ak},\qquad\text{(61)}
```

i.e. the first partial sum completed by an approximation to the first half of the remainder. The sign is $`\approx`$ rather than $`=`$ because $`R_{1ak}`$ is the quantity $`-\tfrac12(-1)^mI_1`$ of [(60)](#eq-Rak-split), with *I₁* evaluated as a truncated series; read the other way round, as the *definition* $`R_{1ak}:=f(s)-\Sigma_1`$, the relation is an identity and the approximation moves into the numerical evaluation of $`R_{1ak}`$.

The form of [(61)](#eq-siegel-f) is Siegel’s own, and it is worth recording where in his paper to look for it. He defines *f* in his §3, equation 58, as the contour integral

<a id="eq-siegel-58"></a>

```math
f(s)
\;=\;
\int_{0\swarrow 1}
\frac{x^{-s}\,e^{\pi i x^2}}{e^{\pi i x}-e^{-\pi i x}}\,\mathrm{d}x ,\qquad\text{(62)}
```

where his symbol $`0\swarrow 1`$ marks a straight path crossing the real axis between $`0`$ and $`1`$, running from upper right to lower left parallel to the bisector of the first and third quadrants; it is the reflection in the real axis of the path $`0\nwarrow 1`$ carrying the integral Φ of his §1. The Gaussian factor $`e^{\pi i x^2}`$ decays in both directions along that line, so [(62)](#eq-siegel-58) converges. Siegel then develops *f* asymptotically in his §4, where his equation 84 reads

<a id="eq-siegel-84"></a>

```math
f(s)
\;=\;
\sum_{n=1}^{m_1} n^{-s}
\;+\;
O\!\bigl((\lvert s\rvert/2\pi e)^{-\sigma/2}\bigr)
\qquad (\sigma\ge 0,\; t>0),\qquad\text{(63)}
```

with $`m_1=[\Re\eta_1-\Im\eta_1]`$ and $`\eta_1=\sqrt{s/2\pi i}`$, which to leading order is Siegel’s cutoff $`\lfloor\sqrt{t/2\pi}\rfloor`$ of [(8)](02-siegel-s-1932-formula.md#eq-siegel-m). Earlier in the same section he states it in words as well: developing *f* asymptotically yields “as a principal term a sum of $`[\sqrt{t/2\pi}\,]`$ summands, that is $`\sum_{n=1}^mn^{-s}`$”. So “first partial sum plus a remainder” is Siegel’s own description of *f*, and it shows the remainder is genuinely needed: at $`\sigma=\tfrac12`$ the bare partial sum misses *f* by $`O(t^{-1/4})`$, the gap that $`R_{1ak}`$ closes. One caution on the cutoff: because $`\sqrt{t/2\pi}=T+\tfrac12-\tfrac1{24T}+O(T^{-2})`$ by Remark [3.1](03-reparameterization-and-cutoff-choice-the-i-t-map.md#rem-T-vs-a), while $`\Re\eta_1-\Im\eta_1=\sqrt{t/2\pi}+\tfrac{\sigma}{4\pi T}+O(T^{-2})`$, Siegel’s *m₁* is one more than our $`m=\lfloor T\rfloor`$ whenever $`\{T\}>\tfrac12+\tfrac1{24T}-\tfrac{\sigma}{4\pi T}`$; at $`\sigma=\tfrac12`$ the two corrections nearly cancel, the coefficient $`\tfrac1{24}-\tfrac1{8\pi}`$ being about $`0.0019`$. This does not disturb [(61)](#eq-siegel-f), since $`R_{1ak}`$ carries the cutoff as a parameter and re-centers with it. Siegel’s choice aligns the cutoff with the saddle and yields the asymptotic remainder stated above. Equation numbers cited here are those of Siegel’s paper as reprinted in his collected works, the numbering carried over by the Barkan–Sklar translation \[2\].[^6]

Neither Siegel nor Kuznetsov names the other side, but it is $`\Sigma_2+R_{2ak}`$, and adding the two recovers ζ to the same accuracy. The contrast with our result is that $`\Sigma_1+R_{1ps}`$ and $`\Sigma_2+R_{2ps}`$ are exact however they are read, and each remainder there is a single fractional summand (§[5](05-the-remainders-are-one-more-partial-summand.md#sec-summand)).

<a id="sec-remainder-scaling"></a>

### 8.3 Scaling the remainders with the fractional part of *T* unchanged

This subsection is a diversion into an observation we made about the three remainders just discussed. At a fixed fractional part $`\{T\}`$, the remainder figures at different heights are nearly scaled copies, with the residual amplitude discrepancy tending toward zero as *T* grows. This scaling is the unit-*T* periodicity of the yin and yang curves (§[6.5](06-periodicity-in-t.md#sec-yinyang-general)) expressed in the raw remainders: the frame map there multiplies by $`M^s`$, which removes exactly the $`M^{-\sigma}`$ size factor and the ω rotation observed here, so a figure that repeats with $`\{T\}`$ in that frame must reappear here as a nearly scaled copy at each $`\{T\}`$; and since all three splits assemble the same *R*, the copy carries all three. Nothing in the rest of the paper uses this observation.

Write $`T=\lfloor T\rfloor+\{T\}`$ for the integer and fractional parts of the index. Empirically, the *shape* of the remainder figure depends almost entirely on the fractional part $`\{T\}`$. By shape we mean the relative angles among *R*, $`R_{1ps}`$, $`R_{2ps}`$, $`R_{1ak}`$, and $`R_{2ak}`$ once the configuration is rotated into the frame in which *R* lies along the positive real axis. The integer part $`\lfloor T\rfloor`$ mainly retunes the overall size: the lengths scale like $`M^{-\sigma}`$ times a slowly varying amplitude. Figure [12](#fig-remainder-scale-grid) makes this visible. Each panel shows only the remainders, drawn in the *R*-frame (rotated so *R* lies on the real axis and translated so the midpoint of *R* sits at the origin), with a common axis scale. The top row holds $`\{T\}=0.18`$ at $`T=6.18`$, $`50.18`$, and $`100.18`$; the bottom row holds $`\{T\}=0.72`$ at $`T=6.72`$, $`50.72`$, and $`100.72`$. Across a row the figure shrinks but keeps its shape; across a column (same $`\lfloor T\rfloor`$, different $`\{T\}`$) the shape changes.

<a id="fig-remainder-scale-grid"></a>

<p align="center"><img src="../figures/fig_remainder_scale_grid.png"></p>

**Figure 12:** Remainders in the *R*-frame at fixed fractional part $`\{T\}`$, varying $`\lfloor T\rfloor`$. The frame is centered on the midpoint of *R* (so *R* runs from $`-\lvert R\rvert/2`$ to $`+\lvert R\rvert/2`$ on the real axis). Top row: $`\{T\}=0.18`$ at $`T=6.18`$, $`50.18`$, $`100.18`$. Bottom row: $`\{T\}=0.72`$ at $`T=6.72`$, $`50.72`$, $`100.72`$. Colors match Figure [11](#fig-kuznetsov-zoom): $`R_{1ps}`$ red, $`R_{2ps}`$ orange, *R* purple, $`R_{1ak}`$ and $`R_{2ak}`$ orange dashed. The large open circle marks the left endpoint of *R*, which is the anchoring joint Σ₁ at $`m=\lfloor
T\rfloor`$ that all three splits leave from. All six panels share the same axis scale. Generated by `fig_remainder_scale_panels.py`.

That figure holds $`\{T\}`$ fixed and climbs the strip. The complementary view holds the chain fixed and lets *T* sweep a whole unit, which is Figure [13](#fig-remainder-frame-sweep): the same *R*-frame in sixteen snapshots from $`T=4`$ to $`T=5`$ at $`m=4`$. Two things show up there that a fixed $`\{T\}`$ cannot show. First, as *T* sweeps, both apexes stay pinned to the perpendicular bisector of *R*: on the critical line $`|R_{1ps}|=|R_{2ps}|`$ exactly (by Proposition [4.1](04-decomposing-the-remainder-r-r1-r2.md#prop-weights)(iii), since $`d_1=d_2`$ and the two directions are unit), likewise for the $`ak`$ pair, and this holds at every instant of the motion, so the state of a split is at all times the single number giving the height of its apex above the chord. Second, the two splits move quite differently: the $`ak`$ apex marches steadily from below *R* to well above it, while the $`ps`$ apex swings down onto the chord, crosses to the far side, and comes back, touching the chord exactly at the two heights where $`\sin(2\omega+\arg\chi)`$ vanishes (Appendix [A.5](a-proof-of-proposition-4-1-reality-and-positivity.md#sec-pole-locations)). There the two unit directions of [(21)](04-decomposing-the-remainder-r-r1-r2.md#eq-R-two-dirs) have become parallel and no longer span the plane, and on the critical line the split collapses into the plain halving $`R_{1ps}=R_{2ps}=\tfrac12R`$: the *d₁* pole of [(17)](04-decomposing-the-remainder-r-r1-r2.md#eq-d1) is removable at $`\sigma=\tfrac12`$, its numerator vanishing with its denominator, which is why the sweep passes through those heights smoothly. Off the line it is a genuine pole: at $`\sigma=0.6`$ and $`\sigma=0.75`$, *d₁* runs through infinity and changes sign there, and that is what the windows of Appendix [A.5](a-proof-of-proposition-4-1-reality-and-positivity.md#sec-pole-locations) are.

<a id="fig-remainder-frame-sweep"></a>

<p align="center"><img src="../figures/fig_remainder_frame_sweep.png"></p>

**Figure 13:** The remainder splits in the *R*-frame as *T* sweeps one unit, $`T=4\to5`$ at $`\sigma=\tfrac12`$. Frame and colors as in Figure [12](#fig-remainder-scale-grid): *R* purple along the real axis, midpoint at the origin; $`R_{1ps}`$ red and $`R_{2ps}`$ orange from the Σ₁ joint (open circle) to the far end of *R*; $`R_{1ak}`$, $`R_{2ak}`$ orange dashed; all panels to one scale, $`|R|`$ given in each. The chain length is held at $`m=4`$ throughout, so $`T=5`$ is the handoff. Dotted arrows trace the midpoints of $`R_{1ps}`$ and $`R_{2ps}`$ from each panel to the next. The $`ps`$ apex crosses the chord between panels four and five and again between twelve and thirteen, the two heights of [(203)](a-proof-of-proposition-4-1-reality-and-positivity.md#eq-pole-condition) where the split is the plain halving; the $`ak`$ apex crosses once, between ten and eleven. Generated by `fig_remainder_frame_sweep.py`.

To make the scaling precise, factor out the leading $`M^{-\sigma}`$ from each half-remainder length by writing

```math
|R_{1\bullet}| \;=\; \kappa_{1\bullet}\,M^{-\sigma}
```

for the three first halves $`R_{1\bullet}\in\{R_{1rs},\,R_{1ps},\,R_{1ak}\}`$ of §[8.1](#sec-remainders-summary). Each split is then on the same footing: $`R=R_{1rs}+R_{2rs}=R_{1ps}+R_{2ps}\approx R_{1ak}+R_{2ak}`$, and for the $`rs`$ half-split one has $`R_{1rs}=R_{2rs}=\tfrac12 R`$ so $`\kappa_{2rs}=\kappa_{1rs}`$. The three amplitudes admit the forms

<a id="eq-kappa"></a>

```math
\begin{aligned}
\kappa_{1rs}
&=
\tfrac12\,M^{\sigma}\,|R|
\;\approx\;
\tfrac14\,M^{\sigma}\,\bigl|I_1+\chi(s)\,I_2\bigr|,
\\[4pt]
\kappa_{1ps}
&=
|d_1|\,M^{\sigma}
=
2\kappa_{1rs}\,
\left|
\frac{\sin(\omega-\arg R+\psi)}{\sin(2\omega+\psi)}
\right|,
\\[4pt]
\kappa_{1ak}
&=
\tfrac12\,M^{\sigma}\,|I_1|,
\end{aligned}\qquad\text{(64)}
```

with $`\psi=\arg\chi(s)`$ and $`I_1,I_2`$ the Kuznetsov integrals of §[8.2](#sec-kuznetsov); the “$`\approx`$” in the first line holds when *R* is evaluated by Kuznetsov’s method [(59)](#eq-Rak), and the second equality in the $`\kappa_{1ps}`$ line is exact with $`\kappa_{1rs}`$ read as $`\tfrac12 M^{\sigma}|R|`$. Note that $`\kappa_{1ps}=|\hat d_1|`$ is a nonnegative normalized length. The signed normalized coefficient remains $`\hat d_1=d_1M^{\sigma}`$, as in [(24)](05-the-remainders-are-one-more-partial-summand.md#eq-frac-vs-weight). Consequently, at fixed σ and fixed $`\{T\}=f`$, the passage from $`T_1=N_1+f`$ to $`T_2=N_2+f`$ (write $`M_i=N_i+1`$) multiplies every half-remainder length by

<a id="eq-remainder-scale"></a>

```math
\frac{|R_{1\bullet}|_{T_2}}{|R_{1\bullet}|_{T_1}}
=
\Bigl(\frac{M_1}{M_2}\Bigr)^{\sigma}
\frac{\kappa_{1\bullet}(T_2)}{\kappa_{1\bullet}(T_1)}.\qquad\text{(65)}
```

When the fractional part is held fixed the ratio of κ’s is nearly $`1`$, so the leading factor $`\bigl(M_1/M_2\bigr)^{\sigma}`$ already accounts for almost all of the size change. Figure [14](#fig-remainder-scale-match) checks this in the *R*-frame: the left panel is $`T=6.18`$; the right panel is $`T=50.18`$ with all remainder vectors scaled by the single factor $`\lambda=|R|_{6.18}/|R|_{50.18}`$, the $`rs`$ instance $`\bigl(M_2/M_1\bigr)^{\sigma}\,\kappa_{1rs}(T_1)/\kappa_{1rs}(T_2)`$ of [(65)](#eq-remainder-scale). Scaling by λ makes the two *R*’s match by construction; the test is that the split halves nearly coincide too, and they do, $`|R_{1ps}|`$ agreeing to about $`0.3\%`$.

<a id="fig-remainder-scale-match"></a>

<p align="center"><img src="../figures/fig_remainder_scale_match.png"></p>

**Figure 14:** Same fractional part $`\{T\}=0.18`$: *R*-frame remainders at $`T=6.18`$ (left) and at $`T=50.18`$ after scaling by $`\lambda=\bigl(M_2/M_1\bigr)^{\sigma}\,\kappa_{1rs}(T_1)/\kappa_{1rs}(T_2)`$ (right). The scaled figure matches the reference to high accuracy ($`|R_{1ps}|`$ agrees to about $`0.3\%`$). Generated by `fig_remainder_scale_panels.py`.

If one wants exactness rather than a close empirical match, divide by *R* itself. By [(17)](04-decomposing-the-remainder-r-r1-r2.md#eq-d1) the modulus of *R* cancels identically, leaving

<a id="eq-R1ps-over-R"></a>

```math
\frac{R_{1ps}}{R}
\;=\;
\frac{\sin\bigl(\omega-\arg R+\arg\chi\bigr)}
     {\sin\bigl(2\omega+\arg\chi\bigr)}\;
e^{-i(\omega+\arg R)},\qquad\text{(66)}
```

a function of the angles alone, exact at every *T* and every σ (off the line $`\arg R`$ must itself be computed; on the line it is $`-\vartheta`$ modulo π): the size is then gone exactly, not almost. On the critical line the equal weights of Proposition [4.1](04-decomposing-the-remainder-r-r1-r2.md#prop-weights)(iii) force $`\mathrm{Re}(R_{1ps}/R)=\tfrac12`$, so the shape is carried by the single number $`\mathrm{Im}(R_{1ps}/R)`$, and that number is a function of $`\{T\}`$ up to $`O(1/T)`$, which is the content of Theorem [A.5](a-proof-of-proposition-4-1-reality-and-positivity.md#thm-d1-limit).

<a id="fig-ratio-shape"></a>

<p align="center"><img src="../figures/fig_ratio_shape.png"></p>

**Figure 15:** The split after division by *R*, on the critical line. Top: $`\mathrm{Im}(R_{1ps}/R)`$ against $`x=\{T\}`$ at $`\lfloor T\rfloor=6,20,60,200`$, each computed through ζ and the Cramer solution [(17)](04-decomposing-the-remainder-r-r1-r2.md#eq-d1), laid over the limit $`\tfrac12\tan\bigl(2\pi(x-\tfrac14)(x-\tfrac34)\bigr)`$ (thick orange). The limit falls from $`(1+\sqrt2)/2`$ at the integers to $`(1-\sqrt2)/2`$ at $`x=\tfrac12`$, a swing of exactly $`\sqrt2`$, and vanishes at the two parallel-link instants (circles; $`x=0.250156`$ and $`0.750155`$ at $`\lfloor T\rfloor=200`$), where $`R_{1ps}=R_{2ps}=\tfrac12R`$. Bottom: distance from the limit, $`O(1/T)`$ in general and $`O(1/T^2)`$ at $`x=\tfrac12`$. Generated by `fig_ratio_shape.py`.

Figure [15](#fig-ratio-shape) dissects that single number. On the critical line $`\arg R=\tfrac12\arg\chi`$ and $`\chi=e^{-2i\vartheta}`$, with ϑ the Riemann–Siegel theta function of Appendix [A.2](a-proof-of-proposition-4-1-reality-and-positivity.md#sec-phase-bound), so $`\omega-\arg R+\arg\chi=\omega-\vartheta`$ and $`2\omega+\arg\chi=2(\omega-\vartheta)`$, the π ambiguity in $`\arg R`$ flipping the sine and the exponential of [(66)](#eq-R1ps-over-R) together. That equation therefore collapses to

<a id="eq-ratio-tangent"></a>

```math
\frac{R_{1ps}}{R}
\;=\;
\frac{e^{-i(\omega-\vartheta)}}{2\cos(\omega-\vartheta)}
\;=\;
\frac12-\frac{i}{2}\tan(\omega-\vartheta),\qquad\text{(67)}
```

which is the exact critical-line form $`d_1=r/(2\cos u)`$ of [(199)](a-proof-of-proposition-4-1-reality-and-positivity.md#eq-exact-line) divided by *R*. Three things follow, and Figure [15](#fig-ratio-shape) shows all three. First, the real part is $`\tfrac12`$ identically, which is Proposition [4.1](04-decomposing-the-remainder-r-r1-r2.md#prop-weights)(iii) once more; the plotted values were computed the long way, through ζ and [(17)](04-decomposing-the-remainder-r-r1-r2.md#eq-d1), and at all $`964`$ samples their real parts agree with $`\tfrac12`$ to thirty digits. Second, everything that is left is the one angle $`\omega-\vartheta`$ modulo π, and that angle tends to $`-\beta`$, where $`\beta=2\pi(x-\tfrac14)(x-\tfrac34)`$ and $`x=\{T\}`$; this is the same reduction that turns $`2\cos(\omega-\vartheta)`$ into $`2\cos\beta`$ in the proof of Theorem [A.5](a-proof-of-proposition-4-1-reality-and-positivity.md#thm-d1-limit). So $`\mathrm{Im}(R_{1ps}/R)\to\tfrac12\tan\beta`$, which is the second of the two tangent factors in the limit waveform [(25)](06-periodicity-in-t.md#eq-W-infty): that waveform is $`-\tan(2\pi x)`$ times this very quantity. The four curves lie within $`9.3\times10^{-3}`$, $`2.8\times10^{-3}`$, $`9.4\times10^{-4}`$ and $`2.8\times10^{-4}`$ of the limit at $`\lfloor T\rfloor=6,20,60,200`$, shrinking in proportion to the index, which is the $`O(1/T)`$ rate of the theorem seen directly. Third, the range is fixed by β, which runs from $`\tfrac{3\pi}{8}`$ at the integers to $`-\tfrac{\pi}{8}`$ at $`x=\tfrac12`$: the curve therefore lies between $`(1+\sqrt2)/2`$ and $`(1-\sqrt2)/2`$, swinging by exactly $`\sqrt2`$, and the tangent stays $`\tfrac{\pi}{8}`$ clear of its pole at $`\tfrac{\pi}{2}`$, which is the boundedness of *d₁* on the line read as an angle. It crosses zero where β does, at the parallel-link instants, where the split is the plain halving as above.

---

[^6]: One incidental finding while checking [(61)](#eq-siegel-f) against the source: the translation’s equation 83 prints the sum as $`\sum n^{s-1}`$, while equation 84, derived from it, has $`\sum n^{-s}`$. The numerics say $`n^{-s}`$ is correct, so equation 83 carries a typo in the Barkan–Sklar translation.

---

[← Contents](../README.md) · [← 7 Summands as links and joints](07-summands-as-links-and-joints.md) · [9 The geometry behind the result (experimen… →](09-the-geometry-behind-the-result-experimental-math.md)
