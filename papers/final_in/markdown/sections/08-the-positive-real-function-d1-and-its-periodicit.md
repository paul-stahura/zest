[← Contents](../README.md) · [← 7 Other remainders](07-other-remainders.md) · [9 The geometry behind the result (experimen… →](09-the-geometry-behind-the-result-experimental-math.md)

---

<a id="sec-d1-function"></a>

## 8 The positive real function *d₁* and its periodicity

In this section we show the periodicity and positivity of *d₁* and *d₂*. The proofs are long and technical; the reader may want to skip this section on a first reading.

The weights *d₁* and *d₂* of §[4](04-decomposing-the-remainder-r-r1ps-r2ps.md#sec-decomp) are the quantitative heart of the two remainders: $`R_{1ps}=d_1e^{-i\omega}`$ and $`R_{2ps}=d_2e^{\,i(\omega+\arg\chi)}`$ are fixed in direction, so everything the remainders do is carried by the two real functions $`d_1(\sigma,T)`$ and $`d_2(\sigma,T)`$. This section studies *d₁* as a function of the index *T*, and its first half is one long act of normalization, in which *d₁* is periodic at every step and the steps remove everything else. As it stands, *d₁* repeats an arch on every unit of *T*, but the arches decay with the shrinking links. Reading the fraction of the link instead of the distance takes out the decay, yet jumps remain at the integer handoffs, because there the fraction is re-measured along the next link, which is shorter than the last and oriented the other way. The fold relation $`d_1^-+d_1^+=n^{-\sigma}`$ is exact, and that exactness absorbs the jumps: measured in one fixed unit, the coordinate *h* of [(54)](#eq-h-cont) has no jumps at all, at the price of flattening again. Re-zooming smoothly gives *p* of [(55)](#eq-p-cont), continuous with steady amplitude, whose arches alternate, each nearly the vertical flip of its neighbor. Flipping alternate arches and pinning each to begin and end at zero yields the pinned waveform [(60)](#eq-pinned-waveform), one continuous periodic curve. With the normalization in hand we approximate: *d₁* on the critical line (§[8.2](#sec-d1-approx-critical)), then off it (§[8.3](#sec-d1-approx-general)), where a new feature appears, the poles of *d₁* and *d₂*, located in §[8.4](#sec-pole-locations). The numerics then become theorems: *d₁* and *d₂* are positive, on the critical line without exception and off it outside the narrow pole windows of $`\{T\}`$ (§[8.5](#sec-d1-positive)); the pinned waveform has an exact closed form in the limit (§[8.6](#sec-d1-limit)); and uniform two-sided bounds hold at every height (§[8.7](#sec-d1-bounds)).

<a id="sec-d1-exact"></a>

### 8.1 The exact formulas

<a id="cor-equal"></a>


**Corollary 8.1**. *When $`\sigma=\tfrac12`$ the two fractional weights coincide, $`d_1=d_2`$, and hence $`|R_{1ps}| = |R_{2ps}|`$: the two fractional summands are always equal in length on the critical line.*


This follows from the definitions [(19)](04-decomposing-the-remainder-r-r1ps-r2ps.md#eq-d1)–[(20)](04-decomposing-the-remainder-r-r1ps-r2ps.md#eq-d2) together with the functional symmetry of χ on the critical line. Explicitly, when $`\sigma=\tfrac12`$ the functional equation forces $`|\chi|=1`$ and $`\arg R = \tfrac12\arg\chi`$ modulo π (proved in Appendix [B](a-lean-formalization-of-r-r1ps-r2ps.md#app-lean-critical)). Writing $`\psi=\arg\chi`$ and substituting $`\arg R = \tfrac{\psi}{2}`$ into [(19)](04-decomposing-the-remainder-r-r1ps-r2ps.md#eq-d1)–[(20)](04-decomposing-the-remainder-r-r1ps-r2ps.md#eq-d2), the two numerators collapse to the *same* value:

<a id="autoeq-7"></a>

```math
d_1 = |R|\,\frac{\sin\!\bigl(\omega - \tfrac{\psi}{2} + \psi\bigr)}{\sin(2\omega+\psi)}
    = |R|\,\frac{\sin\!\bigl(\omega + \tfrac{\psi}{2}\bigr)}{\sin(2\omega+\psi)},
\qquad
d_2 = |R|\,\frac{\sin\!\bigl(\omega + \tfrac{\psi}{2}\bigr)}{\sin(2\omega+\psi)},\qquad\text{(52)}
```

so $`d_1 = d_2`$. Equivalently, setting $`d_1=d_2`$ in [(23)](04-decomposing-the-remainder-r-r1ps-r2ps.md#eq-R-as-cone) gives $`R = d_1\bigl(e^{-i\omega}+e^{i(\omega+\psi)}\bigr)
   = 2d_1\cos\!\bigl(\omega+\tfrac{\psi}{2}\bigr)\,e^{\,i\psi/2}`$, which indeed has argument $`\tfrac{\psi}{2}`$ (or $`\tfrac{\psi}{2}+\pi`$, where the cosine is negative), consistent with $`\arg R=\tfrac12\arg\chi`$ modulo π. We have verified this in Lean; the proof is recorded in Appendix [B](a-lean-formalization-of-r-r1ps-r2ps.md#app-lean-critical). We stress that this critical-line equality is a pleasant consequence of the decomposition, not its motivation.

Since $`d_1=d_2`$ on the critical line, a single curve there tells the whole story of both remainders, and it is worth drawing. Figure [10](#fig-d1-critical) plots $`d_1(\tfrac12,T)`$ for $`1\le T\le7`$, and the graph is unexpectedly tame: as a function of the height *t* the zeta landscape is famously erratic, but viewed through the index *T* the weight *d₁* oscillates once per unit of *T*, every unit interval the same shape, with only two blemishes: the amplitude decays slowly, and the curve jumps at each integer *T*, where $`m=\lfloor T\rfloor`$ increments and the fractional summands hand off to the next link. The bottom panel shows that a single normalization (by the length of the link that carries *d₁*) removes the decay and most of the jumps at once, leaving a curve that looks nearly *periodic* in *T*. That is a strong hint that *d₁* is, at heart, a fixed waveform in the fractional part of *T* dressed up by the link geometry. The rest of this section chases that hint down, first by removing the jumps exactly, then by identifying the waveform in closed form.

<a id="fig-d1-critical"></a>

<p align="center"><img src="../figures/fig_d1_critical.png"></p>

**Figure 10:** Top: the common fractional weight $`d_1=d_2`$ on the critical line, plotted against the index *T* for $`1\le T\le 7`$. The curve oscillates once per unit of *T* and jumps at each integer *T*, where $`m=\lfloor T\rfloor`$ increments and the fractional summands hand off to the next link; the amplitude decays slowly as *T* grows. The gray step is the length $`\lceil T\rceil^{-\sigma}`$ of the link that carries the fractional summand, which *d₁* never exceeds; the panel keeps its original top, so the steps for $`1\le T<3`$ lie at or above the frame. The double-headed arrow on $`6<T<7`$ spans that link length. Bottom: the same formula for *d₁* normalized by the length $`\lceil T\rceil^{-\sigma}`$ of link *m*, which carries it: the *normalized distance from joint* $`\lceil T\rceil^{\sigma}d_1`$, the crossing fraction along link *m* at which the point $`B_1=\Sigma_1+R_{1ps}`$ sits (cf. §[11](11-the-yin-and-yang-curves.md#sec-yinyang)). The panel is drawn on the full scale $`0`$ to $`1`$ of the normalized link, so $`0`$ is joint *m* and $`1`$ is joint $`m+1`$; the double-headed arrow, at the same *T* as the one above, marks that same link seen at unit length. The normalization removes both the decay and (nearly) the jumps: the fraction sweeps the same range $`\approx[0.23,\,0.78]`$ in every unit interval, staying clear of both ends of the link (made exact in §[8.6](#sec-d1-limit)–§[8.7](#sec-d1-bounds)). So the normalized curve converges to a periodic waveform: sampled at matched fractional parts of *T*, its values agree to $`{\approx}\,2\times10^{-3}`$ by $`T=20`$, and the residual discrepancy halves with each doubling of *T*, the rate set by the link-length mismatch $`(1+1/\lfloor T\rfloor)^{\sigma}\to1`$ of [(53)](#eq-fold) below. Computed exactly (mpmath) via the Cramer solution of [(23)](04-decomposing-the-remainder-r-r1ps-r2ps.md#eq-R-as-cone). Generated by `fig_d1_critical.py`.

<a id="removing-the-jumps-exactly-"></a>

##### Removing the jumps exactly.

The normalization in the bottom panel of Figure [10](#fig-d1-critical) nearly removes the jumps, and the residue can be traced to a single exact relation. At a handoff $`T=n`$ the outgoing link ($`m=n-1`$) and the incoming link ($`m=n`$) fold back onto one another, and

<a id="eq-fold"></a>

```math
d_1^{+} \;=\; n^{-\sigma} \;-\; d_1^{-},\qquad\text{(53)}
```

where $`d_1^{-}`$ and $`d_1^{+}`$ are the limits from the left and from the right. Figure [12](#fig-fold-handoff) draws the configuration at $`n=7`$.

Both the fold and [(53)](#eq-fold) are exact. Write $`u_1=e^{-i\omega}`$ and $`u_2=e^{\,i(\omega+\psi)}`$ for the two unit directions of [(23)](04-decomposing-the-remainder-r-r1ps-r2ps.md#eq-R-as-cone) on the outgoing side, where $`\omega=t\log n`$. The turn at the handoff is $`I(n)\log\frac{n+1}{n}=\pi(2n+1)`$ by [(99)](10-i-t-functions.md#eq-IT-derived), an odd multiple of π, so both directions reverse and the incoming frame is $`-u_1,-u_2`$. Crossing the handoff also moves $`n^{-s}`$ out of Σ₁ and $`\chi\,n^{s-1}`$ out of Σ₂, so

```math
R^{-}-R^{+} \;=\; n^{-s}+\chi\,n^{s-1}
\;=\; n^{-\sigma}u_1+|\chi|\,n^{\sigma-1}u_2 ,
```

while the two decompositions themselves give $`R^{-}=d_1^{-}u_1+d_2^{-}u_2`$ and $`R^{+}=-\bigl(d_1^{+}u_1+d_2^{+}u_2\bigr)`$, whence $`R^{-}-R^{+}=(d_1^{-}+d_1^{+})u_1+(d_2^{-}+d_2^{+})u_2`$. Wherever the Cramer determinant $`\sin(2\omega+\psi)`$ is nonzero the two directions are independent over $`\mathbb{R}`$ (§[8.4](#sec-pole-locations)), so the coefficients may be compared: that is [(53)](#eq-fold), together with $`d_2^{-}+d_2^{+}=|\chi|\,n^{\sigma-1}`$, the two right-hand sides agreeing on the critical line where $`|\chi|=1`$. Putting [(53)](#eq-fold) back into $`B_1=\Sigma_1+R_{1ps}`$ shows what it says about the point itself. On the incoming side the sum has gained $`n^{-s}=n^{-\sigma}u_1`$ and the direction has reversed, so with $`\Sigma_1^{-}`$ the sum through $`n-1`$,

```math
B_1^{+} \;=\; \Sigma_1^{-}+n^{-s}+d_1^{+}(-u_1)
\;=\; \Sigma_1^{-}+\bigl(n^{-\sigma}-d_1^{+}\bigr)u_1
\;=\; \Sigma_1^{-}+d_1^{-}u_1 \;=\; B_1^{-} .
```

Continuity of *B₁* in the plane is therefore a consequence of the fold rather than an assumption behind it: there is a single bisector point, and at the instant the links fold it lies on both of them.

In terms of the plotted fraction $`f=\lceil T\rceil^{\sigma} d_1`$ this reads $`f^{+}=(1+\tfrac1n)^{\sigma}(1-f^{-})`$: an orientation flip $`f\mapsto 1-f`$ (after the handoff the fraction is measured from the other end of the link) composed with a unit mismatch (the new link is shorter than the old by the factor $`(1+\tfrac1n)^{-\sigma}`$). The mismatch factor tends to $`1`$, which is why the jumps in the bottom panel shrink as *T* grows; the replacement $`f\mapsto 1-f`$ also contributes less and less, because the curve happens to cross the integers near $`f\approx\tfrac12`$, where $`1-f\approx f`$.

Because [(53)](#eq-fold) is exact, the unit intervals can be glued into a coordinate with no jumps at all: measure the position of *B₁* along the link chain in one *fixed* unit (the first link, of length $`1`$), flipping the orientation and absorbing the constant $`n^{-\sigma}`$ at each handoff of the bisector point from one link to the next (see §[10.1](10-i-t-functions.md#sec-IT-origin) for more on these handoffs). Unrolling the recursion gives

<a id="eq-h-cont"></a>

```math
h(T) \;=\; \sum_{k=2}^{\lfloor T\rfloor} (-1)^k\,k^{-\sigma}
\;+\; (-1)^{\lfloor T\rfloor+1}\, d_1(T),\qquad\text{(54)}
```

and at every integer the term entering the sum cancels the jump of *d₁* identically, so *h* is continuous everywhere. The price is that *h* *flattens*: in a fixed unit the links themselves shrink, so the oscillating part $`d_1=O(T^{-\sigma})`$ decays, while the accumulated constants are the partial sums of the convergent alternating series $`2^{-\sigma}-3^{-\sigma}+4^{-\sigma}-\cdots = 1-\eta(\sigma)`$, with η the Dirichlet eta function. Hence $`h(T)\to 1-\eta(\sigma)`$, which at $`\sigma=\tfrac12`$ is $`{\approx}\,0.3951`$.

Continuity and a non-decaying amplitude can be had at once by re-zooming *smoothly*, with $`T^{\sigma}`$, instead of with the step function $`\lceil T\rceil^{\sigma}`$ (whose abrupt changes at the integers are exactly what created the residual jumps):

<a id="eq-p-cont"></a>

```math
p(T) \;=\; T^{\sigma}\,\Bigl( h(T) - \bigl(1-\eta(\sigma)\bigr) \Bigr).\qquad\text{(55)}
```

As a product of continuous functions *p* is exactly continuous, and since $`h(T)-(1-\eta(\sigma)) = O(T^{-\sigma})`$ (the decaying *d₁* plus the tail of the alternating series), the factor $`T^{\sigma}`$ restores a bounded oscillation. Figure [11](#fig-h-p-continuous) compares the two coordinates: both are continuous, with only kinks (no jumps) at the integers, while *h* contracts toward its limit $`1-\eta(\tfrac12)`$ and *p* keeps a steady amplitude. The red curve is computed from the simplified local form [(62)](#eq-p-simplified), derived below, which agrees with [(55)](#eq-p-cont) to machine precision.

<a id="fig-h-p-continuous"></a>

<p align="center"><img src="../figures/fig_h_p_continuous.png"></p>

**Figure 11:** The two exactly continuous coordinates of the point *B₁* on the critical line, $`1\le T\le 7`$, in a single panel for comparison. Blue: $`h(T)`$ of [(54)](#eq-h-cont), the position along the link in a fixed unit; it has no jumps at the integers, only kinks where the links fold back and handoff the bisector point to the next link, and its oscillation contracts toward the limit $`1-\eta(\tfrac12)\approx
0.3951`$ (dashed line): the swing shrinks from $`{\approx}\,0.40`$ on the first interval to $`{\approx}\,0.24`$ by $`T=7`$. Red: $`p(T)`$, the same coordinate re-zoomed smoothly by $`T^{\sigma}`$, computed from the simplified local form [(62)](#eq-p-simplified); it is equally continuous but its amplitude holds steady ($`{\approx}\,0.53`$ peak to peak) instead of flattening. Continuity was verified numerically at each integer (mismatch $`{\sim}\,10^{-7}`$ at offsets of $`10^{-6}`$). Generated by `fig_h_p_continuous.py`.

<a id="a-pinned-waveform-"></a>

##### A pinned waveform.

Each arch of *p* in Figure [11](#fig-h-p-continuous) is nearly the vertical flip of its neighbors, but the arches do not begin and end at zero, so flipping alternate intervals would not make them line up. Pinning is the fix: we force each arch to begin and end at zero, on the *T* axis, so that the flipped arches glue into one continuous waveform. Taking one-sided limits at an integer *n* (where $`\lfloor T\rfloor=n-1`$ on the left) gives the endpoint value exactly, in terms of the Lerch transcendent

<a id="eq-lerch"></a>

```math
\Phi(-1,\sigma,a)=\sum_{j=0}^{\infty}\frac{(-1)^j}{(a+j)^{\sigma}},\qquad\text{(56)}
```

the alternating sum of all the link lengths from *a* onward:

<a id="eq-eps-n"></a>

```math
p(n)=(-1)^nn^{\sigma}\bigl(d_1(n^-)-\Phi(-1,\sigma,n)\bigr)
=(-1)^{n+1}\varepsilon_n,
\qquad
\varepsilon_n:=n^{\sigma}\bigl(\Phi(-1,\sigma,n)-d_1(n^-)\bigr)>0,\qquad\text{(57)}
```

so $`\varepsilon_n`$ is the shortfall of the distance when the links are folded back. What they fall short of is the alternating-tail center

<a id="eq-alt-tail-center"></a>

```math
n^{\sigma}\Phi(-1,\sigma,n)
=\tfrac12+\frac{\sigma}{4n}-\frac{\sigma(\sigma+1)(\sigma+2)}{48\,n^3}
+O(n^{-5})
=\tfrac12+\frac{1}{8n}-\frac{5}{128\,n^3}+O(n^{-5})
\quad\text{at }\sigma=\tfrac12,\qquad\text{(58)}
```

by Boole summation,[^4] $`\sum_{j\ge0}(-1)^jf(n+j)=\tfrac12f(n)-\tfrac14f'(n)
+\tfrac1{48}f'''(n)-\cdots`$, whose even derivatives drop out, so there is no $`n^{-2}`$ term. On the critical line the ends approach zero on the order of $`T^{-2}`$, without ever reaching it at finite *T*.

<a id="fig-fold-handoff"></a>

<p align="center"><img src="../figures/fig_fold_handoff.png"></p>

**Figure 12:** The geometry behind the fold relation [(53)](#eq-fold) and the shortfall [(57)](#eq-eps-n), at $`T=6.99`$ on the critical line. *(a)* The outgoing link 6, carrying summand 7, and the incoming link 7, carrying summand 8. The turn between them is $`172.8^{\circ}`$ here and exactly $`180^{\circ}`$ at $`T=7`$, so at the handoff link 7 lies back along link 6 and the single point *B₁* is on both at once. *(b)* The boxed stretch, link 6 read as $`[0,1]`$: the alternating-tail center [(58)](#eq-alt-tail-center) sits at $`0.5177`$ and *B₁* has run past it to $`\hat d_1=0.5787`$; the gap is *P* of [(59)](#eq-p-flipped) below, and subtracting the chord leaves $`\mathcal{W}=-0.0630`$ of [(60)](#eq-pinned-waveform). *(c)* The same stretch magnified about six times: by $`T=7`$ the point has swung back to $`0.5156`$, short of the center by $`\varepsilon_7=0.0022`$, and at the far end $`\varepsilon_6=0.0029`$. Generated by `fig_fold_handoff.py`.

<a id="fig-pinned-waveform"></a>

<p align="center"><img src="../figures/fig_pinned_waveform.png"></p>

**Figure 13:** The flipped arches of *p* on the critical line, $`1\le T\le7`$. *Top:* the unpinned flip *P* of [(59)](#eq-p-flipped) (pale blue), which jumps by $`2\varepsilon_n`$ at each integer (inset, at $`T=2`$); the chord-pinned $`\mathcal{W}`$ of [(60)](#eq-pinned-waveform) (red), which is zero there exactly; and the Hermite-pinned variant (dashed green), which also matches the end slopes but inflates the arch. *Bottom:* the six pinned arches drawn against the fractional part $`q=\{T\}`$, with the tangent limit $`\mathcal{W}_{\infty}`$ dashed; the deviation falls from $`0.087`$ on $`[1,2]`$ to $`0.025`$ on $`[6,7]`$. Generated by `fig_pinned_waveform.py`.

Flipping alternate intervals costs nothing: it simply deletes the alternating sign from [(62)](#eq-p-simplified), since with $`m=\lfloor T\rfloor`$

<a id="eq-p-flipped"></a>

```math
P(T)\;:=\;(-1)^mp(T)\;=\;T^{\sigma}\bigl(\Phi(-1,\sigma,m+1)-d_1(T)\bigr),\qquad\text{(59)}
```

whose two ends on $`[m,m+1]`$ are exactly $`-\varepsilon_m`$ and $`+\varepsilon_{m+1}`$ by [(57)](#eq-eps-n), so *P* still jumps by $`2\varepsilon_n`$ at each integer. Subtracting the chord between those two values removes the jumps and pins both ends at zero: with $`x=T-m`$,

<a id="eq-pinned-waveform"></a>

```math
\mathcal{W}(T)\;:=\;T^{\sigma}\bigl(\Phi(-1,\sigma,m+1)-d_1(T)\bigr)
\;+\;(1-x)\,\varepsilon_m\;-\;x\,\varepsilon_{m+1},\qquad\text{(60)}
```

a single formula covering the intervals $`[1,2],[3,4],\dots`$ and $`[2,3],[4,5],\dots`$ with the second family already flipped. Figure [13](#fig-pinned-waveform) draws it: $`\mathcal{W}`$ vanishes at every integer, is continuous on $`[1,\infty)`$ with no sign alternation left, and converges like $`1/T`$ to the tangent waveform

<a id="eq-W-infty"></a>

```math
\mathcal{W}_{\infty}(q):=\tfrac12\tan(2\pi q)\,
\tan\bigl(2\pi(q-\tfrac14)(q-\tfrac34)\bigr),
\qquad q=\{T\},\qquad\text{(61)}
```

which is the $`T\to\infty`$ form of the Riemann–Siegel first term [(63)](#eq-d1-rs) below and does vanish at $`q=0,1`$ exactly. (§[8.6](#sec-d1-limit) proves the convergence and shows that the same waveform, recentered at $`\tfrac12`$ and flipped, is the exact limit profile of the normalized weight $`\hat d_1`$ itself.) Continuity is had exactly; $`C^1`$ only in the limit. The one-sided slopes at $`T=n`$ are $`7.515`$ and $`6.920`$ at $`n=2`$ and $`7.482`$ and $`7.309`$ at $`n=8`$, both approaching $`\mathcal{W}_{\infty}'(0)=\mathcal{W}_{\infty}'(1)=\pi\tan\tfrac{3\pi}{8}
=7.5845`$, so a corner of size $`O(1/T)`$ survives at each integer. Replacing the chord in [(60)](#eq-pinned-waveform) by the cubic Hermite that also matches the end slopes[^5] removes the corner exactly, at the cost of inflating each arch by about $`0.03`$; and since $`\mathcal{W}_{\infty}''(0)=-\mathcal{W}_{\infty}''(1)`$, no pinning can do better than $`C^1`$ in any case.

<a id="sec-d1-approx-critical"></a>

### 8.2 Approximation of *d₁* when $`\sigma=\tfrac12`$

Two things happen here, in order: *p* is first put into a purely local form, in which the continuous coordinate is nothing but the deviation of *d₁* from a reference value, and then, on the critical line, *d₁* itself is given a zeta-free closed form.

Distributing $`T^{\sigma}`$ and substituting [(54)](#eq-h-cont) simplifies *p* considerably: the partial sum inside *h* cancels the first terms of the sum $`1-\eta(\sigma)=\sum_{k=2}^{\infty}(-1)^kk^{-\sigma}`$ term by term, leaving only the remaining terms, and the common sign $`(-1)^{\lfloor T\rfloor+1}`$ factors out:

<a id="eq-p-simplified"></a>

```math
p(T) \;=\; (-1)^{\lfloor T\rfloor+1}\, T^{\sigma}
\Bigl[\, d_1(T) \;-\; \Phi\bigl(-1,\sigma,\lfloor T\rfloor+1\bigr) \Bigr],\qquad\text{(62)}
```

with Φ as in [(56)](#eq-lerch). In this form all the accumulated history of [(54)](#eq-h-cont) has disappeared and *p* is *local*: it is just the deviation of *d₁* from a reference value, the alternating sum of all the remaining link lengths $`(\lfloor T\rfloor+1)^{-\sigma}-(\lfloor T\rfloor+2)^{-\sigma}+\cdots`$. An alternating series is roughly half its first term, $`\Phi(-1,\sigma,\lfloor T\rfloor+1)\approx\tfrac12(\lfloor T\rfloor+1)^{-\sigma}`$, which is half the length of link *m*, so asymptotically

```math
p(T) \;\approx\; (-1)^{\lfloor T\rfloor+1}
\Bigl( \lceil T\rceil^{\sigma} d_1 - \tfrac12 \Bigr),
```

which is the normalized fraction of Figure [10](#fig-d1-critical), recentered at $`\tfrac12`$ and given alternating orientation. This is also why that fraction crosses the integers near $`\tfrac12`$: continuity of *p* pins the fraction, at each integer, near the alternating-tail center, which is close to $`\tfrac12`$.

On the critical line the substitution can be pushed all the way: *d₁* itself acquires a zeta-free closed form. When $`\sigma=\tfrac12`$ we have $`\arg R=\tfrac12\arg\chi`$, so the Cramer solution [(19)](04-decomposing-the-remainder-r-r1ps-r2ps.md#eq-d1) reduces to

```math
d_1 \;=\; \frac{\widetilde R}{2\cos\bigl(\omega+\tfrac{\psi}{2}\bigr)},
\qquad
\widetilde R = e^{-i\psi/2} R \ \ \text{(real)},
```

the two-equal-vector form of *R* seen in the proof of Corollary [8.1](#cor-equal). For $`\widetilde R`$ we substitute the saddle-point evaluation of Siegel’s integral, which is the first correction term of the Riemann–Siegel formula,

```math
\widetilde R
= (-1)^{N-1}\Bigl(\tfrac{2\pi}{t}\Bigr)^{1/4} C_0(\hat p)
+ O\bigl(t^{-3/4}\bigr),
\qquad
C_0(\hat p) =
\frac{\cos\bigl(2\pi(\hat p^2-\hat p-\tfrac{1}{16})\bigr)}{\cos(2\pi \hat p)},
\qquad \sqrt{t/2\pi} = N + \hat p .
```

Every quantity on the right is an elementary function of $`t=I(T)`$, kept exact throughout:

```math
z=\sqrt{t/2\pi},\qquad N=\lfloor z\rfloor,\qquad \hat p = z-N,\qquad
\omega = t\ln(m+1),\qquad m=\lfloor T\rfloor .
```

On the line $`\chi=e^{-2i\vartheta(t)}`$ with ϑ the Riemann–Siegel theta function, so $`\widetilde R`$ is $`e^{i\vartheta}R`$ up to a sign that cancels against the cosine, and $`d_1 = e^{i\vartheta}R\,/\,2\cos(\omega-\vartheta)`$ *exactly*. Substituting the Riemann–Siegel first term for $`e^{i\vartheta}R`$ gives

<a id="eq-d1-rs"></a>

```math
d_1\bigl(\tfrac12,T\bigr) \;\approx\;
\bigl[N=m{+}1\bigr]\,(m{+}1)^{-1/2}
\;+\;
(-1)^{N-1}\Bigl(\tfrac{2\pi}{t}\Bigr)^{1/4}
\frac{C_0(\hat p)}{2\cos\bigl(\omega-\vartheta(t)\bigr)},\qquad\text{(63)}
```

where the Iverson bracket adds one full link length when $`N=m+1`$, that is, when the Riemann–Siegel main sum carries one more summand pair than our $`\Sigma_1,\Sigma_2`$, which happens (roughly) when $`\mathrm{frac}(T)>\tfrac12`$. The formula is elementary and zeta-free: ϑ may be replaced by its asymptotic $`\vartheta(t)=\tfrac t2\ln\tfrac{t}{2\pi}-\tfrac t2-\tfrac\pi8+\tfrac1{48t}`$ at no cost (the two agree here to $`4\times10^{-7}`$ even at $`T=1`$). Its maximum error is $`0.006`$ on $`[1,2)`$, $`0.002`$ on $`[3,4)`$, $`0.0009`$ on $`[6,7)`$ and $`0.0002`$ on $`[20,21)`$. That is about $`1\%`$ of the swing of *d₁* at the start, decaying like $`T^{-3/2}`$ and spread flat across each unit interval (Figure [14](#fig-d1-rs-phases)). The error is purely the Riemann–Siegel truncation, $`O(t^{-3/4})`$; the next correction term of that formula would push further. And since $`R = 2d_1\cos(\omega+\tfrac{\psi}{2})\,e^{i\psi/2}`$ on the line, [(63)](#eq-d1-rs) is effectively a closed-form approximation of Siegel’s remainder there as well.

<a id="fig-d1-rs-phases"></a>

<p align="center"><img src="../figures/fig_d1_rs_phases.png"></p>

**Figure 14:** The closed form [(63)](#eq-d1-rs): the Riemann–Siegel first term with the phases kept exact through $`t=I(T)`$, no zeta input. Top: exact *d₁* (blue) against [(63)](#eq-d1-rs) (black dashed), visually indistinguishable, $`1\le T\le 7`$. Bottom: $`|`$error$`|`$ on a log scale, with maximum $`0.006`$ on $`[1,2)`$, decaying like $`T^{-3/2}`$, spread flat in the fractional part. Generated by `fig_d1_rs_phases.py`.

<a id="sec-d1-approx-general"></a>

### 8.3 Approximation of *d₁* and *d₂* when $`\sigma\neq\tfrac12`$

There is a general-σ approximation as well, and it needs no new machinery beyond what is already in the paper. Off the critical line the remainder *R* is genuinely complex (no single rotation makes it real), so approximating it means approximating two real degrees of freedom, and those two degrees of freedom are exactly the pair $`(d_1,d_2)`$.

Siegel’s saddle-point analysis was never restricted to the critical line; the first term for the remainder at general $`s=\sigma+it`$ splits into one piece per chain:

<a id="eq-R-general"></a>

```math
R(s) \;\approx\; (-1)^{N-1}\,\frac{C_0(\hat p)}{2}
\Bigl[\,a^{-\sigma}\,e^{-i\tilde\vartheta(t)}
\;+\; \chi(s)\,a^{\sigma-1}\,e^{+i\tilde\vartheta(t)}\Bigr],
\qquad a=\sqrt{t/2\pi},\qquad\text{(64)}
```

with $`t=I(T)`$ exact, $`N=\lfloor a\rfloor`$, $`\hat p=a-N`$, the same universal $`C_0(\hat p)`$ of §[8.2](#sec-d1-approx-critical), and the elementary phase $`\tilde\vartheta(t)=\tfrac t2\ln\tfrac{t}{2\pi}-\tfrac t2-\tfrac\pi8`$. When $`N=m+1`$ the extra summand pair $`(m+1)^{-s}+\chi\,(m+1)^{s-1}`$ is added, exactly as in [(63)](#eq-d1-rs). Feeding this approximate *R* to the Cramer solution [(19)](04-decomposing-the-remainder-r-r1ps-r2ps.md#eq-d1)–[(20)](04-decomposing-the-remainder-r-r1ps-r2ps.md#eq-d2) with the exact $`\omega=t\ln(m+1)`$ and $`\psi=\arg\chi`$ then yields *both* *d₁* and *d₂* at once, still with no zeta input (χ is Gamma factors). The two bracket pieces are the per-chain remainders, with the same structure as the Kuznetsov split of §[7.1](07-other-remainders.md#sec-kuznetsov), and at $`\sigma=\tfrac12`$, where $`\chi=e^{-2i\vartheta}`$, the bracket collapses to $`2e^{-i\vartheta}`$: [(64)](#eq-R-general) reduces exactly to [(63)](#eq-d1-rs). We verified this numerically digit for digit, which pins down all the sign conventions.

Because the Cramer solution is linear in *R*, the solve can be carried out once and for all: substituting [(64)](#eq-R-general) into [(19)](04-decomposing-the-remainder-r-r1ps-r2ps.md#eq-d1)–[(20)](04-decomposing-the-remainder-r-r1ps-r2ps.md#eq-d2) gives the general-σ analogue of [(63)](#eq-d1-rs) in closed form,

<a id="eq-d1-general"></a>

<a id="eq-d2-general"></a>

```math
\begin{align}
d_1(\sigma,T) &\approx
\bigl[N=m{+}1\bigr]\,(m{+}1)^{-\sigma}
\notag\\&\quad
+ (-1)^{N-1}\,\frac{C_0(\hat p)}{2\sin(2\omega+\psi)}
\Bigl[\,a^{-\sigma}\sin\bigl(\omega+\psi+\tilde\vartheta\bigr)
+ |\chi|\,a^{\sigma-1}\sin\bigl(\omega-\tilde\vartheta\bigr)\Bigr],
\\[6pt]
d_2(\sigma,T) &\approx
\bigl[N=m{+}1\bigr]\,|\chi|\,(m{+}1)^{\sigma-1}
\notag\\&\quad
+ (-1)^{N-1}\,\frac{C_0(\hat p)}{2\sin(2\omega+\psi)}
\Bigl[\,a^{-\sigma}\sin\bigl(\omega-\tilde\vartheta\bigr)
+ |\chi|\,a^{\sigma-1}\sin\bigl(\omega+\psi+\tilde\vartheta\bigr)\Bigr],
\end{align}\qquad\text{(66)}
```

with $`\tilde\vartheta=\tilde\vartheta(t)`$, $`\psi=\arg\chi`$, and $`|\chi|=|\chi(\sigma+it)|`$ as before. The Iverson terms are now whole link lengths on each side separately, because the extra summand pair lies exactly along the two unit directions: $`(m{+}1)^{-s}`$ along $`e^{-i\omega}`$ and $`\chi\,(m{+}1)^{s-1}`$ along $`e^{i(\omega+\psi)}`$. Note the symmetry: swapping the two coefficients $`a^{-\sigma}\leftrightarrow|\chi|\,a^{\sigma-1}`$ swaps *d₁* and *d₂*. At $`\sigma=\tfrac12`$, where $`|\chi|=1`$ and $`\psi=-2\vartheta`$, the two sine brackets coincide and each formula collapses to [(63)](#eq-d1-rs), since $`\sin(\omega-\vartheta)/\sin\bigl(2(\omega-\vartheta)\bigr)
= 1/\,2\cos(\omega-\vartheta)`$ and $`a^{-1/2}=(2\pi/t)^{1/4}`$. We verified that [(65)](#eq-d1-general)–[(66)](#eq-d2-general) reproduce the Cramer-solve route to machine precision; they are the same computation written out.

The accuracy across the strip (maximum $`|d_1|`$ error away from the pole windows described below):


|    σ    | $`[1,2)`$ | $`[6,7)`$  | $`[20,21)`$ |
|:-------:|:---------:|:----------:|:-----------:|
| $`0.1`$ | $`0.076`$ | $`0.016`$  | $`0.0046`$  |
| $`0.3`$ | $`0.035`$ | $`0.0057`$ | $`0.0013`$  |
| $`0.5`$ | $`0.006`$ | $`0.0009`$ | $`0.0002`$  |
| $`0.7`$ | $`0.025`$ | $`0.0024`$ | $`0.0004`$  |
| $`0.9`$ | $`0.045`$ | $`0.0032`$ | $`0.0004`$  |


The measured decay exponents match $`O(T^{-\sigma-1})`$ almost perfectly ($`1.07`$ at $`\sigma=0.1`$, $`1.5`$ at $`\sigma=0.5`$, $`1.8`$ at $`\sigma=0.9`$), and since *d₁* itself scales like $`T^{-\sigma}`$, the *relative* error is $`O(1/T)`$ uniformly across the strip. The critical line is where the formula is at its absolute best, fittingly. And *d₂* comes for free: the Cramer solve produces both components simultaneously from the same approximate *R*, and its errors are essentially identical to *d₁*’s (e.g. $`0.031`$ vs $`0.035`$ at $`\sigma=0.3`$ on $`[1,2)`$), so no separate derivation is needed. Figure [15](#fig-d1-d2-general) shows both components at $`\sigma=0.3`$ and $`\sigma=0.7`$.

Two caveats. First, off the line the exact *d₁* and *d₂* have genuine narrow poles at the parallel-link heights $`q\approx\tfrac14,\tfrac34`$ (the bands of Figure [21](09-the-geometry-behind-the-result-experimental-math.md#fig-equal-legs-strips)); the first-term approximation smooths through those spikes, so within about $`\pm0.05`$ of them the error is locally large (relative error $`{\sim}\,40\%`$ right at the shoulder). Everywhere else the table applies. Second, the formula is not limited to the strip: it works for any σ with relative error $`O(1/T)`$. For $`\sigma>1`$ it is excellent, while for $`\sigma\le0`$ the absolute error $`T^{-\sigma-1}`$ decays ever more slowly (at $`\sigma=-\tfrac12`$ it is still $`{\approx}\,0.06`$ at $`T=20`$), so “any σ, relative error $`1/T`$” is the honest statement, with the strip as the sweet spot.

<a id="fig-d1-d2-general"></a>

<p align="center"><img src="../figures/fig_d1_d2_general_sigma.png"></p>

**Figure 15:** *d₁* (red) and *d₂* (green) across the strip at $`\sigma=0.3`$ (top) and $`\sigma=0.7`$ (bottom), $`1\le T\le 7`$: exact values (solid) against the first-term approximation [(64)](#eq-R-general) fed through the Cramer solution (dashed, in the color of its exact counterpart). The narrow spikes leaving the frame near fractional heights $`\tfrac14`$ and $`\tfrac34`$ are the genuine off-the-critical-line poles of *d₁* and *d₂* (parallel links); the approximation smooths through them. Generated by `fig_d1_d2_general_sigma.py`.

<a id="sec-pole-locations"></a>

### 8.4 Where are the *d₁* and *d₂* poles?

The poles of *d₁* and *d₂* (equivalently of $`R_{1ps}`$ and $`R_{2ps}`$) appear to be at fractional heights $`\tfrac14`$ and $`\tfrac34`$, but they are not exactly there. Here we delve into where they are.

A pole occurs when the two bisector links are parallel; these are link $`m=\lfloor T\rfloor`$ of each chain, each carrying summand $`\lceil T\rceil`$, the summand just after the last one included in the partial sum. In other words, a pole occurs when the two next summands have the same argument, so that the cone spanned by the two unit directions $`e^{-i\omega}`$ and $`e^{i(\omega+\arg\chi)}`$ of [(23)](04-decomposing-the-remainder-r-r1ps-r2ps.md#eq-R-as-cone) degenerates to a line and the common denominator $`\sin(2\omega+\arg\chi)`$ of [(19)](04-decomposing-the-remainder-r-r1ps-r2ps.md#eq-d1)–[(20)](04-decomposing-the-remainder-r-r1ps-r2ps.md#eq-d2) vanishes. Subtracting the two arguments from each other produces a formula that is zero at the poles:

<a id="eq-pole-locations"></a>

```math
2\,\omega(T) \;+\; \arg\chi\bigl(\sigma+i\,I(T)\bigr) \;=\; 2\pi k,
\qquad k\in\mathbb{Z},\qquad\text{(67)}
```

with $`\omega(T)=I(T)\log\lfloor T+1\rfloor`$ as in §[4](04-decomposing-the-remainder-r-r1ps-r2ps.md#sec-decomp). This formula was used to find the locations of the first $`20`$ poles numerically (Table [2](#tab-poles)).

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

First $`20`$ poles for $`\sigma=0.6`$, which is the same result as for $`\sigma=0.4`$. The symmetry about $`\sigma=\tfrac12`$ exists because $`\arg\chi(\sigma+it)=-\arg\chi(1-\sigma+it)`$ by the identity $`\chi(s)\,\chi(1-s)=1`$, and the pole condition [(67)](#eq-pole-locations) uses $`\arg\chi`$ only as a phase offset; reflecting $`\sigma\mapsto1-\sigma`$ therefore yields the same *T*-solutions. Note the poles occur at approximately $`T=\lfloor T\rfloor+\tfrac14`$ and $`T=\lfloor T\rfloor+\tfrac34`$ (equivalently, an integer $`\pm\tfrac14`$), and approach those values as $`T\to\infty`$. {#tab:poles}

<a id="sec-d1-positive"></a>

### 8.5 The weights $`d_1,d_2`$ are positive outside narrow windows of $`\{T\}`$

So far positivity has rested on numerical evidence: the note after [(23)](04-decomposing-the-remainder-r-r1ps-r2ps.md#eq-R-as-cone) records a dense verification on the critical line, and §[8.4](#sec-pole-locations) locates the off-line poles where the property fails. Everything needed for a proof is now on the table: the exact critical-line reduction of §[8.2](#sec-d1-approx-critical), the Riemann–Siegel first term made rigorous by Gabcke’s error bound, and one elementary phase expansion carried out below. This subsection gives the proofs, first on the critical line, where no fractional parts need to be excluded at all, then across the strip, where positivity holds outside two windows of width $`O(1/T)`$ around the poles of §[8.4](#sec-pole-locations).

We keep the notation of §[8.2](#sec-d1-approx-critical): $`a=\sqrt{t/2\pi}`$, $`N=\lfloor a\rfloor`$, $`\hat p=a-N`$, and $`u=\omega-\vartheta(t)`$. Expanding $`\log(1+\tfrac1T)`$ in $`t=I(T)`$ gives

<a id="eq-a-vs-T"></a>

```math
\frac{t}{2\pi}=\Bigl(T+\tfrac12\Bigr)^2+O\!\Bigl(\tfrac1T\Bigr),
\qquad\text{hence}\qquad
a=T+\tfrac12+O\!\Bigl(\tfrac1{T}\Bigr),\qquad\text{(68)}
```

so, apart from boundary slivers of width $`O(1/T)`$ in the fractional part $`x=\{T\}`$ near $`x=0,\tfrac12,1`$,

<a id="eq-cut-cases"></a>

```math
x<\tfrac12 \iff N=m,\ \ \hat p=x+\tfrac12+O(1/T),
\qquad
x>\tfrac12 \iff N=m+1,\ \ \hat p=x-\tfrac12+O(1/T).\qquad\text{(69)}
```

Taylor expansion of $`\omega=t\log(m+1)`$ about $`\log a`$, using $`t=2\pi a^2`$ and the asymptotic series of ϑ, gives the phase *u* modulo $`2\pi`$ in closed form, and in both cases of [(69)](#eq-cut-cases) the result is one and the same statement:

<a id="eq-cosu"></a>

```math
\cos u \;=\;(-1)^{m+1}\,
\cos\!\bigl(2\pi x(1-x)-\tfrac{3\pi}8\bigr)\;+\;O(1/T).\qquad\text{(70)}
```

Since $`2\pi x(1-x)\in[0,\tfrac\pi2]`$ for $`x\in[0,1]`$, the argument of the cosine on the right lies in $`(-\tfrac{3\pi}8,\tfrac\pi8]`$, so

<a id="eq-cosu-bound"></a>

```math
|\cos u|\;\geq\;\sin\tfrac\pi8-O(1/T)\;=\;0.3826\ldots-O(1/T):\qquad\text{(71)}
```

the factor $`\cos u`$ never approaches zero, at any fractional part. That one inequality is the heart of both positivity theorems. We also need two elementary facts about the Riemann–Siegel amplitude *C₀* of §[8.2](#sec-d1-approx-critical).

<a id="lem-C0-trig"></a>


**Lemma 8.2**. *Write $`A=2\pi\hat p^2-\tfrac\pi8`$ and $`B=2\pi\hat p`$, so that $`C_0(\hat p)=\cos(A-B)/\cos B`$. Then:*

**1.** *$`C_0(\hat p)>0`$ for $`\hat p\in(\tfrac12,1)`$, and $`\min_{[1/2,\,1]}C_0=\cos\tfrac{3\pi}8=\sin\tfrac\pi8`$, attained at $`\hat p=\tfrac12`$;*

**2.** *for $`\hat p\in[0,\tfrac12]`$,*

```math
\Lambda(\hat p)\;:=\;\frac{C_0(\hat p)}
{2\cos\bigl(\pi(\tfrac18-2\hat p^2)\bigr)}
\;\leq\;\tfrac12,
```

*with equality exactly at the endpoints, and $`\Lambda(\tfrac14)=\tfrac14`$.*



*Proof.* (ii) first, since it is the prettier half. Note $`\pi(\tfrac18-2\hat p^2)=-A`$, so $`\Lambda=\cos(A-B)/(2\cos A\cos B)=\tfrac12(1+\tan A\tan B)`$ by the product formula, and the claim is that $`\tan A\tan B\leq0`$ on $`[0,\tfrac12]`$. Both critical transitions happen at the same point: $`A=0`$ exactly when $`\hat p=\tfrac14`$, and $`B=\tfrac\pi2`$ exactly when $`\hat p=\tfrac14`$. For $`\hat p<\tfrac14`$ we have $`A\in(-\tfrac\pi8,0)`$, so $`\tan A<0`$, while $`B\in(0,\tfrac\pi2)`$, so $`\tan B>0`$; for $`\hat p>\tfrac14`$ the signs reverse ($`A\in(0,\tfrac{3\pi}8)`$, $`B\in(\tfrac\pi2,\pi)`$). The product is therefore $`\leq0`$ throughout, vanishing only as $`\hat p\to0,\tfrac12`$ (where $`\tan A\tan B\to0`$, so $`\Lambda\to\tfrac12`$); at $`\hat p=\tfrac14`$ the two singular factors balance, $`\tan A\tan B\to-\tfrac12`$, giving the removable value $`\Lambda(\tfrac14)=\tfrac14`$.

\(i\) is a sign inspection of numerator and denominator. On $`(\tfrac12,\tfrac34)`$ both $`\cos(A-B)`$ and $`\cos B`$ are negative; on $`(\tfrac34,1)`$ both are positive (they change sign together at $`\hat p=\tfrac34`$, which is the removable singularity of *C₀*), so $`C_0>0`$ throughout. The minimum location was found numerically ($`10^4`$-point grid, minimum $`0.38268\ldots=\cos\tfrac{3\pi}8`$ at $`\hat p=\tfrac12`$, the left endpoint, where $`C_0(\tfrac12)=-\cos\tfrac{5\pi}8`$ exactly). ◻


<a id="thm-d1-positive-line"></a>


**Theorem 8.3**. *There is an effectively computable T₀ such that for every non-integer $`T\geq T_0`$, at $`\sigma=\tfrac12`$,*

```math
d_1(T)=d_2(T)\;\geq\;\frac{c}{\,a^{1/2}}\;>\;0,
\qquad c=\tfrac12\sin\tfrac\pi8-o(1).
```

*No interval of $`\{T\}`$ is excluded. Together with the dense numerical verification of §[4](04-decomposing-the-remainder-r-r1ps-r2ps.md#sec-decomp) covering $`1\leq T\leq30`$, the weights are positive at every non-integer $`T\geq1`$ on the critical line.*



*Proof.* *Step 1 (exact reduction).* On $`\sigma=\tfrac12`$ the reflection identities $`\Sigma_2=\chi\overline{\Sigma_1}`$ and $`\zeta=\chi\overline\zeta`$ give $`R=\chi\overline R`$; with $`\chi=e^{-2i\vartheta}`$ this says $`r:=e^{i\vartheta}R`$ is real, and, as recorded in §[8.2](#sec-d1-approx-critical) (and formalized in Appendix [B](a-lean-formalization-of-r-r1ps-r2ps.md#app-lean-critical)),

<a id="eq-exact-line"></a>

```math
d_1=d_2=\frac{r}{2\cos u}
\qquad(\cos u\neq0),\qquad\text{(72)}
```

the common factor $`\sin u`$ having canceled between the numerators of [(19)](04-decomposing-the-remainder-r-r1ps-r2ps.md#eq-d1)–[(20)](04-decomposing-the-remainder-r-r1ps-r2ps.md#eq-d2) and the denominator $`\sin2u=2\sin u\cos u`$.

*Step 2 (Riemann–Siegel input).* The real number *r* is the Riemann–Siegel tail cut at *m* instead of at *N*: writing $`Z=e^{i\vartheta}\zeta`$,

<a id="eq-r-two-cases"></a>

```math
r=r_{\mathrm{RS}}+\bigl[N=m+1\bigr]\cdot\frac{2\cos u}{\sqrt{m+1}},
\qquad
r_{\mathrm{RS}}:=Z-2\!\!\sum_{n\leq N}\!n^{-1/2}\cos(\vartheta-t\log n),\qquad\text{(73)}
```

the bracketed term being the summand $`n=m+1`$, whose phase is exactly $`\vartheta-\omega=-u`$; this is the same Iverson bookkeeping as in [(63)](#eq-d1-rs). Gabcke’s rigorous form of the Riemann–Siegel formula \[9\] gives

<a id="eq-gabcke"></a>

```math
r_{\mathrm{RS}}=\frac{(-1)^{N-1}}{a^{1/2}}\Bigl(C_0(\hat p)+E\Bigr),
\qquad |E|\leq c_1\,a^{-1}\quad(t\geq200).\qquad\text{(74)}
```

*Step 3 (case $`N=m`$, i.e. $`x=\{T\}<\tfrac12`$, $`\hat p\in(\tfrac12,1)`$).* Here $`r=r_{\mathrm{RS}}`$, and the two signs multiply out: $`(-1)^{N-1}`$ from [(74)](#eq-gabcke) against $`(-1)^{m+1}`$ from [(70)](#eq-cosu) give $`+1`$, so

```math
d_1=\frac{C_0(\hat p)}
{2\cos\bigl(2\pi x(1-x)-\tfrac{3\pi}8\bigr)}\cdot\frac{1}{a^{1/2}}
\;+\;O(a^{-3/2}).
```

By Lemma [8.2](#lem-C0-trig)(i) the numerator is at least $`\sin\tfrac\pi8`$, and the cosine in the denominator is at most $`1`$, so $`d_1\geq\bigl(\tfrac12\sin\tfrac\pi8\bigr)a^{-1/2}-O(a^{-3/2})`$.

*Step 4 (case $`N=m+1`$, i.e. $`x>\tfrac12`$, $`\hat p\in(0,\tfrac12)`$).* Now [(73)](#eq-r-two-cases) has the extra term,

```math
d_1=\frac1{\sqrt{m+1}}+\frac{r_{\mathrm{RS}}}{2\cos u},
```

and this time the two signs multiply to $`-1`$: the correction is *subtracted*, with magnitude $`\Lambda(\hat p)\,a^{-1/2}+O(a^{-3/2})`$ (here $`\cos(2\pi x(1-x)-\tfrac{3\pi}8)=\cos(\pi(\tfrac18-2\hat p^2))`$ under $`x=\hat p+\tfrac12`$). Lemma [8.2](#lem-C0-trig)(ii) caps $`\Lambda\leq\tfrac12`$, and $`a=m+1+\hat p\geq m+1`$, so

```math
d_1\;\geq\;\frac1{\sqrt{m+1}}-\frac{1}{2a^{1/2}}-O(a^{-3/2})
\;\geq\;\frac{1}{2\,a^{1/2}}-O(a^{-3/2}).
```

In both cases $`d_1\geq(\tfrac12\sin\tfrac\pi8-o(1))a^{-1/2}`$ once *a* is large enough that the explicit $`O(1/a)`$ errors of [(74)](#eq-gabcke) and of the phase expansion [(70)](#eq-cosu) are dominated. The boundary slivers of [(69)](#eq-cut-cases) are covered because the two case formulas agree to leading order at the seams: as $`x\to\tfrac12`$ from either side, and across each integer, both give $`d_1\approx\tfrac12a^{-1/2}`$. The range $`T<T_0`$ is closed by the verification of §[4](04-decomposing-the-remainder-r-r1ps-r2ps.md#sec-decomp) ($`30{,}562`$ samples on $`1\le T\le30`$ with magnified windows at fractional parts $`{\approx}\,\tfrac14,\tfrac34`$; `check_d1_positive_critical.py`). ◻



**Remark 74** (why the critical line has no poles of *d₁*). The denominator $`\sin(2\omega+\psi)=\sin2u`$ vanishes twice per unit interval of *T*, near $`\{T\}=\tfrac14`$ and $`\tfrac34`$, exactly where §[8.4](#sec-pole-locations) finds the off-line poles. On the line, both vanishings belong to the factor $`\sin u`$, which cancels identically against the numerator in [(72)](#eq-exact-line); the dangerous factor $`\cos u`$ stays bounded away from zero by [(71)](#eq-cosu-bound). Off the line the cancellation is spoiled, and the same two zeros become genuine poles. The next theorem quantifies how much of each unit interval they actually poison.


<a id="thm-d1-positive-offline"></a>


**Theorem 8.5**. *Fix $`\sigma\in(0,1)`$, $`\sigma\neq\tfrac12`$. There are constants $`C(\sigma)`$ and $`T_0(\sigma)`$ such that for all $`T\geq T_0`$, both $`d_1(\sigma,T)>0`$ and $`d_2(\sigma,T)>0`$ whenever $`\{T\}`$ lies outside two intervals of width at most $`C(\sigma)/T`$, centered at points that converge to $`\tfrac14`$ and $`\tfrac34`$ at rate $`O(1/T)`$. Inside each window one of the two weights is negative, so the excluded intervals cannot be removed. In particular, for every fixed $`\delta>0`$ there is $`T_1(\sigma,\delta)`$ with $`d_1>0`$ and $`d_2>0`$ whenever $`T\geq T_1`$ and $`\{T\}\notin(\tfrac14-\delta,\tfrac14+\delta)\cup
(\tfrac34-\delta,\tfrac34+\delta)`$.*



*Proof.* Write $`u'=\omega+\psi/2`$ and let $`\tau=\arg R-\psi/2\pmod\pi`$, folded to $`[-\tfrac\pi2,\tfrac\pi2)`$, measure the tilt of *R* away from the bisector direction. Up to a common positive factor and a common sign, [(19)](04-decomposing-the-remainder-r-r1ps-r2ps.md#eq-d1)–[(20)](04-decomposing-the-remainder-r-r1ps-r2ps.md#eq-d2) read

<a id="eq-offline-form"></a>

```math
d_1\propto\frac{\sin(u'-\tau)}{\sin 2u'},
\qquad
d_2\propto\frac{\sin(u'+\tau)}{\sin 2u'}.\qquad\text{(75)}
```

Two inputs control the picture.

*(i) The tilt τ is small.* The first-term approximation [(64)](#eq-R-general) has argument $`\psi/2`$ modulo π up to $`O_\sigma(1/t)`$; the deviation of the exact *R* from that argument comes from the next term of Siegel’s expansion, giving $`|\tau|\leq C_2(\sigma)\,t^{-1/2}`$. (Numerically at $`\sigma=0.3`$ the product $`|\tau|\,t^{1/2}`$ stays between about $`0.03`$ and $`0.09`$ over $`t\in[200,4\times10^4]`$.)

*(ii) The phase $`u'`$ has the same skeleton as on the line.* Since $`\psi(\sigma+it)=-2\vartheta(t)+O_\sigma(1/t)`$ uniformly for σ in compacta, $`u'=u+O_\sigma(1/t)`$, and [(70)](#eq-cosu)–[(71)](#eq-cosu-bound) apply: $`|\cos u'|\geq\sin\tfrac\pi8-o(1)`$, so the only sign changes of $`\sin2u'=2\sin u'\cos u'`$ within a unit interval are the two zeros of $`\sin u'`$, at fractional parts converging to $`\tfrac14`$ and $`\tfrac34`$, crossed with slope $`|du'/d\{T\}|=\pi+O(1/T)`$.

Away from those zeros (say $`|\sin u'|\geq2|\tau|`$) the ratios $`\sin(u'\mp\tau)/\sin u'`$ are positive, so [(75)](#eq-offline-form) carries the same signs as on the line, and the Step-3/Step-4 analysis of Theorem [8.3](#thm-d1-positive-line), with the $`O_\sigma`$ errors absorbed into the constants, gives positivity of both weights. Near a zero of $`\sin u'`$ the numerator of *d₁* crosses zero at $`u'=\tau`$ while the denominator crosses at $`u'=0`$: between the two crossings, an interval of $`u'`$-length exactly $`|\tau|`$, the signs disagree and $`d_1<0`$; mirror-symmetrically $`d_2<0`$ on the interval of length $`|\tau|`$ on the other side. Converting $`u'`$-length to $`\{T\}`$-length by the slope $`\pi+O(1/T)`$ bounds each window by $`C_2(\sigma)\,t^{-1/2}/\pi\asymp C(\sigma)/T`$, since $`t=I(T)\asymp2\pi T^2`$, centered $`O(1/T)`$ from the denominator zero. On the critical line $`\tau\equiv0`$ exactly (Step 1 of Theorem [8.3](#thm-d1-positive-line)), the two crossings coincide, and the windows are empty, consistent with no poles there. ◻



**Remark 75**. The mechanism reproduces Remark [14.3](14-further-observations.md#rem-d-ratio): just outside a window, *d₁* and *d₂* have opposite-signed numerators of size $`{\approx}\,|\tau|`$ against a denominator passing through zero, which is why values as large as $`d_1=-d_2\approx-4\times10^{36}`$ are observed adjacent to a pole while the window itself is only $`O(1/T)`$ wide.



**Remark 75** (numerical corroboration). At $`\sigma=0.3`$, scanning $`\{T\}\in[0.22,0.28]\cup[0.72,0.78]`$ with step $`2\times10^{-4}`$ (`check_positivity_windows.py`):


| *N* | window near $`\tfrac14`$ |   center   | window near $`\tfrac34`$ |   center   |
|:---:|:------------------------:|:----------:|:------------------------:|:----------:|
|  5  |        $`0.0034`$        | $`0.2556`$ |        $`0.0010`$        | $`0.7550`$ |
| 10  |        $`0.0020`$        | $`0.2529`$ |        $`0.0006`$        | $`0.7528`$ |
| 20  |        $`0.0008`$        | $`0.2515`$ |        $`0.0004`$        | $`0.7515`$ |
| 40  |        $`0.0006`$        | $`0.2508`$ |        $`0.0002`$        | $`0.7508`$ |


Widths scale like $`1/T`$ and centers drift to $`\tfrac14,\tfrac34`$ like $`1/T`$, as Theorem [8.5](#thm-d1-positive-offline) predicts; on the line the same scan finds no negative values at all. The leading-order formula of Theorem [8.3](#thm-d1-positive-line) reproduces the exact *d₁* to relative error $`0.028`$ on $`T\in[20,21]`$ and $`0.014`$ on $`T\in[40,41]`$, consistent with the $`O(1/a)`$ error terms, and its lower bound $`0.19\,a^{-1/2}`$ lies below the observed minima ($`0.0498`$ and $`0.0355`$ respectively).


<a id="sec-d1-limit"></a>

### 8.6 The limit profile of the fractional amount: the waveform in closed form

The bottom panel of Figure [10](#fig-d1-critical) showed the normalized fraction $`\hat d_1=\lceil T\rceil^{1/2}d_1`$ sweeping nearly the same arc in every unit interval, and §[8.1](#sec-d1-exact) met the tangent waveform $`\mathcal{W}_{\infty}`$ of [(61)](#eq-W-infty) as the limit of the pinned coordinate $`\mathcal{W}`$. The machinery of Theorem [8.3](#thm-d1-positive-line) upgrades both observations to a theorem: at fixed fractional part the fraction converges, and its limit is exactly $`\tfrac12`$ minus the tangent waveform. Note that it is the hatted weight that has a nontrivial limit: *d₁* itself decays, $`d_1\asymp a^{-1/2}`$ by Theorem [8.3](#thm-d1-positive-line), and the normalization [(26)](05-the-remainders-are-one-more-partial-summand.md#eq-frac-vs-weight) is what removes the decay.

<a id="thm-d1-limit"></a>


**Theorem 8.8**. *Let $`\sigma=\tfrac12`$ and fix $`x\in(0,1)`$. Then*

```math
\lim_{\substack{T\to\infty\\ \{T\}=x}}\hat d_1(T)
=\lim_{N\to\infty}\sqrt{N+1}\;d_1(N+x)
=d(x),
\qquad
d(x)\;=\;\tfrac12-\mathcal{W}_{\infty}(x)
\;=\;\tfrac12-\tfrac12\tan(2\pi x)\,
\tan\!\bigl(2\pi(x-\tfrac14)(x-\tfrac34)\bigr),
```

*with the removable points $`x=\tfrac14,\tfrac34`$ filled in by continuity ($`d(\tfrac14)=\tfrac14`$, $`d(\tfrac34)=\tfrac34`$). The same limit holds for $`\hat d_2`$, since $`d_2=d_1`$ on the line. The convergence rate is $`O(1/T)`$.*



*Proof.* Fix *x* and let $`T=N+x\to\infty`$, $`m=\lfloor T\rfloor=N`$. Refining [(68)](#eq-a-vs-T) one order, $`a=T+\tfrac12-\tfrac1{24T}+O(T^{-2})`$, so the offset $`\hat p`$ converges to its case value in [(69)](#eq-cut-cases) with rate $`1/T`$; moreover $`(m+1)/a\to1`$ at the same rate, and all error terms in Steps 2–4 of Theorem [8.3](#thm-d1-positive-line) are $`O(1/a)`$. Multiplying the two case formulas of that proof by $`\sqrt{m+1}`$ therefore gives

```math
\hat d_1\longrightarrow
\frac{C_0(x+\tfrac12)}
{2\cos\bigl(2\pi x(1-x)-\tfrac{3\pi}8\bigr)}
\quad(x<\tfrac12),
\qquad
\hat d_1\longrightarrow 1-\Lambda\bigl(x-\tfrac12\bigr)
\quad(x>\tfrac12).
```

It remains to collapse both branches to the tangent form. For $`x<\tfrac12`$, substituting $`\hat p=x+\tfrac12`$ into *C₀* gives $`\hat p^2-\hat p-\tfrac1{16}=x^2-\tfrac5{16}`$ and $`\cos(2\pi\hat p)=-\cos(2\pi x)`$, so with $`\alpha=2\pi x`$ and $`\beta=2\pi(x-\tfrac14)(x-\tfrac34)=2\pi(x^2-x)+\tfrac{3\pi}8`$ the limit is

```math
\frac{-\cos\bigl(2\pi x^2-\tfrac{5\pi}8\bigr)}
{2\cos(2\pi x)\cos\bigl(2\pi x(1-x)-\tfrac{3\pi}8\bigr)}
=\frac{\cos(\alpha+\beta)}{2\cos\alpha\,\cos\beta}
=\tfrac12\bigl(1-\tan\alpha\tan\beta\bigr)
=\tfrac12-\mathcal{W}_{\infty}(x),
```

using $`\alpha+\beta=2\pi x^2+\tfrac{3\pi}8`$, $`\cos(\alpha+\beta)=-\cos(2\pi x^2-\tfrac{5\pi}8)`$, the evenness of the cosine for the β factor, and the product formula. For $`x>\tfrac12`$, the same substitution algebra applied to $`\Lambda(x-\tfrac12)`$ (as in Lemma [8.2](#lem-C0-trig)(ii), with $`\hat p=x-\tfrac12`$) yields $`\Lambda(x-\tfrac12)=\tfrac12-\mathcal{W}_{\infty}(1-x)`$, and $`\mathcal{W}_{\infty}(1-x)=-\mathcal{W}_{\infty}(x)`$ because $`\tan(2\pi(1-x))=-\tan(2\pi x)`$ while the quadratic factor is symmetric under $`x\mapsto1-x`$; hence $`1-\Lambda(x-\tfrac12)=\tfrac12-\mathcal{W}_{\infty}(x)`$ as well. ◻


So the same elementary function that governs the pinned waveform of §[8.2](#sec-d1-approx-critical) governs the fraction itself, recentered at $`\tfrac12`$ and flipped. This is the closed-form waveform promised at the start of the section.

<a id="rem-d-profile"></a>


**Remark 8.9** (properties of the profile). Since $`\mathcal{W}_{\infty}(1-x)=-\mathcal{W}_{\infty}(x)`$, the profile satisfies the functional equation

```math
d(x)+d(1-x)=1,
```

so its graph is antisymmetric about the point $`(\tfrac12,\tfrac12)`$. Three exact values follow:

```math
d\bigl(\tfrac14\bigr)=\tfrac14,\qquad
d\bigl(\tfrac12\bigr)=\tfrac12,\qquad
d\bigl(\tfrac34\bigr)=\tfrac34:
```

at the two abscissas where the off-line weights have their poles, the limiting fraction of the next summand equals the abscissa itself, and the middle value is forced by the functional equation. Furthermore $`\mathcal{W}_{\infty}(0)=\mathcal{W}_{\infty}(1)=0`$ gives $`d(0^{+})=d(1^{-})=\tfrac12`$: although $`\hat d_1`$ jumps at every integer *T* by the relation [(53)](#eq-fold), both sides of the jump tend to $`\tfrac12`$, and the limit profile extends to a *continuous periodic function* on $`\mathbb{R}/\mathbb{Z}`$ once $`d(0):=\tfrac12`$ (Figure [16](#fig-d-limit)). Its range is $`[m_0,\,1-m_0]`$ with

```math
m_0=d(x^{*})=0.2268951\ldots,
\qquad x^{*}=0.1629962\ldots
```

(the maximum $`1-m_0=0.7731048\ldots`$ at the mirror point $`1-x^{*}`$): asymptotically, the split always uses between $`22.7\%`$ and $`77.3\%`$ of the $`(m+1)`$st summand, which is the range $`{\approx}\,[0.23,\,0.78]`$ measured in Figure [10](#fig-d1-critical). §[8.7](#sec-d1-bounds) upgrades this to uniform bounds valid at every finite *T*.


<a id="fig-d-limit"></a>

<p align="center"><img src="../figures/fig_d_limit.png"></p>

**Figure 16:** The closed-form profile $`d(x)`$ of Theorem [8.8](#thm-d1-limit) (blue) against the exact $`\sqrt{m+1}\,d_1`$ sampled at $`T=10+x`$, $`50+x`$, $`400+x`$ on the critical line. Already at $`T=10+x`$ the samples sit on the curve; the marked squares are the exact values $`(\tfrac14,\tfrac14)`$, $`(\tfrac12,\tfrac12)`$, $`(\tfrac34,\tfrac34)`$, and the dashed red lines are the extremes $`m_0=0.2268951\ldots`$ and $`1-m_0=0.7731048\ldots`$ of the profile. Generated by `fig_d_limit.py`.


**Remark 16** (numerical corroboration). With $`\hat d_1`$ computed from the exact remainder (`check_d_limit.py`), the error $`|\hat d_1(N+x)-d(x)|`$ at $`N=50,200,800`$ decreases by a factor $`4.0`$ at each quadrupling of *N*, matching the $`O(1/T)`$ rate; at $`x=0.35`$, for instance, the errors are $`3.6\times10^{-4}`$, $`9.2\times10^{-5}`$, $`2.3\times10^{-5}`$.



**Remark 16** (off the critical line the profile is universal). For fixed $`\sigma\in(0,1)`$ the same argument, run through Theorem [8.5](#thm-d1-positive-offline), gives the *identical* limit for both fractional amounts of [(26)](05-the-remainders-are-one-more-partial-summand.md#eq-frac-vs-weight),

```math
\lim_{\substack{T\to\infty\\ \{T\}=x}}\hat d_1(\sigma,T)
=\lim_{\substack{T\to\infty\\ \{T\}=x}}\hat d_2(\sigma,T)
= d(x)
\qquad\bigl(x\neq\tfrac14,\tfrac34\bigr):
```

the leading-order amplitudes agree to $`O(1/t)`$ and the tilt $`\tau=O(t^{-1/2})`$ vanishes in the limit, so the σ-dependence survives only inside the two shrinking pole windows. Numerically at $`\sigma=0.3`$ both normalized weights match $`d(x)`$ with errors falling like $`1/N`$ (at $`x=0.35`$: errors $`9.7\times10^{-5}`$ and $`5.1\times10^{-5}`$ at $`N=800`$). At $`x=\tfrac14,\tfrac34`$ exactly, the finite-*T* poles prevent a uniform statement off the line.


<a id="sec-d1-bounds"></a>

### 8.7 Uniform bounds: the fraction stays between $`\tfrac15`$ and $`\tfrac45`$

Theorem [8.8](#thm-d1-limit) confines the fraction to $`[m_0,1-m_0]`$ in the limit. At finite *T* the excursions are slightly larger, and round constants cover every height at once: the fractional summand never uses less than a fifth, or more than four fifths, of the next term.

<a id="thm-d1-bounds"></a>


**Theorem 8.12**. *Let $`\sigma=\tfrac12`$. For every non-integer $`T>1`$,*

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



*Proof.* On the line $`d_2=d_1`$ and $`|\chi|=1`$, so $`\hat d_2=\hat d_1`$ by [(26)](05-the-remainders-are-one-more-partial-summand.md#eq-frac-vs-weight) and it suffices to bound $`\hat d_1=\sqrt{m+1}\,d_1`$.

*Step 1 (exact finite-T form).* Multiplying the two case formulas in the proof of Theorem [8.3](#thm-d1-positive-line) by $`\sqrt{m+1}`$ and writing $`\rho=\sqrt{(m+1)/a}`$,

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

with $`|E|\leq c_1a^{-1}`$ from [(74)](#eq-gabcke) and $`|\delta|\leq
c_2a^{-1}`$ from the phase expansion [(70)](#eq-cosu). At $`\rho=1`$, $`E=\delta=0`$ these are exactly the two branches of Theorem [8.8](#thm-d1-limit).

*Step 2 (range of the main terms).* On $`(0,\tfrac12)`$ the branch function $`d(x)`$ descends from $`\tfrac12`$ to its single interior minimum $`m_0=d(x^{*})`$ and climbs back to $`\tfrac12`$ (one sign change of $`d'`$; the critical point $`x^{*}`$ is the root of an explicit elementary equation). Hence the first main term ranges over $`[m_0,\tfrac12]`$ and the second over $`[\tfrac12,\,1-\rho\,m_0]`$.

*Step 3 (all $`T\geq30`$).* The total deviation of $`\hat d_1`$ from its main term is at most $`(\rho-1)\cdot\tfrac12`$ plus a term collecting *E* and δ, with $`\rho-1\leq\tfrac1{4a}`$; the collected constant is validated by the convergence-rate measurements of Theorem [8.8](#thm-d1-limit) (observed absolute error $`{\leq}\,0.008`$ at $`T\approx20`$, decreasing like $`1/T`$), giving a total deviation below $`0.02`$ for $`T\geq30`$. Therefore, for $`T\geq30`$,

```math
\{T\}<\tfrac12:\quad
\hat d_1\in\bigl(m_0-0.02,\ \tfrac12(1+\tfrac1{120})+0.02\bigr)
\subset(0.206,\,0.525),
\qquad
\{T\}>\tfrac12:\quad
\hat d_1\in(0.48,\,0.795),
```

and both windows lie inside $`(\tfrac15,\tfrac45)`$.

*Step 4 ($`1<T\leq30`$, computational).* A dense evaluation of the exact $`\hat d_1`$ (grid step $`5\times10^{-4}`$ on $`(1,3]`$, $`10^{-3}`$ on $`(3,12]`$, $`2\times10^{-3}`$ on $`(12,30]`$; `check_uniform_bounds.py`) gives the observed range $`[0.2274,\ 0.78499]`$ (Figure [17](#fig-interval-range)), with margin at least $`0.015`$ to both $`\tfrac15`$ and $`\tfrac45`$ and sampled variation between adjacent grid points below $`0.004`$, a factor of nearly four inside the margin. This covers the remaining range and, refined near its endpoints, produces the sharp values in the statement: the maximum $`0.78499047437\ldots`$ at $`T=1.85307336433\ldots`$ (on the $`m=1`$ interval, where $`\rho<1`$ pushes the second branch above its limiting value), and interval minima decreasing toward *m₀* from above as *T* grows ($`0.227369`$ at $`T=59.164`$, for instance). ◻


<a id="fig-interval-range"></a>

<p align="center"><img src="../figures/fig_interval_range.png"></p>

**Figure 17:** Range of the exact $`\hat d_1`$ over each unit interval $`(N,N+1)`$, $`N=1,\dots,29`$, on the critical line (blue bands; grid step $`5\times10^{-4}`$ for $`N<3`$, $`10^{-3}`$ after). Dashed black lines: the uniform bounds $`\tfrac15`$ and $`\tfrac45`$ of Theorem [8.12](#thm-d1-bounds); the red right-hand scale marks the extremes $`m_0=0.2268951\ldots`$ and $`1-m_0=0.7731048\ldots`$ of the limit profile of Theorem [8.8](#thm-d1-limit). The interval maxima decrease toward the $`1-m_0`$ mark, starting from the supremum $`0.78499\ldots`$ attained on the first interval at $`T=1.8530\ldots`$; the interval minima decrease toward *m₀* from above without attaining it. Generated by `fig_interval_range.py`.


**Remark 17**. For the unnormalized weight the theorem reads $`\tfrac15(m+1)^{-1/2}<d_1<\tfrac45(m+1)^{-1/2}`$; in particular $`d_1\leq0.78499\ldots/\sqrt2=0.55508\ldots`$, attained at the same $`T=1.853\ldots`$, and no positive *T*-independent lower bound exists for *d₁* itself.


<a id="rem-d1-provenance"></a>


**Remark 8.14** (what is cited rather than proved). For the record, the proofs of §[8.5](#sec-d1-positive)–§[8.7](#sec-d1-bounds) take four inputs on faith or on computation. (1) Gabcke’s explicit error bound [(74)](#eq-gabcke) for the first Riemann–Siegel correction \[9\]. (2) The first-order Siegel asymptotics of *R* at fixed $`\sigma\in(0,1)`$ behind Theorem [8.5](#thm-d1-positive-offline)(i), from Siegel’s account of the Nachlaß \[20\]; its error term is classical, but the constant $`C_2(\sigma)`$ is not tracked explicitly here, which is why $`T_0(\sigma)`$ is not effective as stated. (3) The numerically located minimum in Lemma [8.2](#lem-C0-trig)(i) and the single-minimum property of the branch in Step 2 of Theorem [8.12](#thm-d1-bounds). (4)  Theorem [8.12](#thm-d1-bounds) is computer-assisted: Step 3’s error constant is validated numerically rather than derived with explicit Gabcke and Taylor constants, and Step 4 is a dense grid evaluation with margin, not interval arithmetic.

---

[^4]: The alternating-sum analogue of Euler–Maclaurin summation: the correction terms are built from the Euler polynomials in place of the Bernoulli numbers.

[^5]: This is the Hermite-pinned variant, the dashed green curve in Figure [13](#fig-pinned-waveform). It names an alternative way of removing the jumps from *P*, one the paper shows for comparison but does not adopt.

---

[← Contents](../README.md) · [← 7 Other remainders](07-other-remainders.md) · [9 The geometry behind the result (experimen… →](09-the-geometry-behind-the-result-experimental-math.md)
