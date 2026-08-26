[← Contents](../README.md) · [← 16 Statements left unproved](16-statements-left-unproved.md) · [Acknowledgments →](acknowledgments.md)

---

<a id="sec-glossary"></a>

## 17 Glossary

The paper uses a geometric language for objects that other writers have named differently, or not named at all. This section collects those words in one place. Each entry is a definition in ordinary language, a short formula when the formula is short, a pointer to the section that introduces the object, and, where we know one, the name another author has used for the same thing or a neighboring one. The names are those already used above; this list is only a map.

The list is not alphabetical. It runs from the parameters and the polyline itself to the more specialized constructions built on them, and the entries in each group belong with one another.

<a id="the-parameters"></a>

### The parameters

Index $`T`$, and $`I(T)`$.  
The real parameter that replaces Siegel’s pair $`(t,m)`$: $`t=I(T)=\pi(2T+1)/\log(1+1/T)`$ and $`m=\lfloor T\rfloor`$ (§[3](03-the-same-formula-reparameterized-the-i-t-mapping.md#sec-IT)). *T* is called the index even though it is not an integer. The map is chosen so that integer *T* lands on a handoff (§[10.1](10-i-t-functions.md#sec-IT-origin)).

Unit of the index $`T`$.  
One stretch of *T* between consecutive integers: the interval $`(m,m+1)`$ with $`m=\lfloor T\rfloor`$, for example *T* from $`6`$ to $`7`$. The chains keep the same number of partial-sum links on that stretch. The ends of the unit are $`\{T\}`$ near $`0`$ and near $`1`$; the middle is $`\{T\}`$ around $`\tfrac12`$ (§[12.1](12-general-yin-and-yang-and-the-d1-and-d2-formulas.md#sec-links-crossing)).

$`\chi(s)`$.  
The completion factor of the functional equation, $`\zeta(s)=\chi(s)\zeta(1-s)`$ (§[2](02-siegel-s-1932-decomposition.md#sec-siegel)). Nickel writes $`Q(s)`$ for the same factor.

$`\omega`$.  
The absolute direction of the next forward summand: $`\omega=I(T)\log\lceil T\rceil`$, so that $`(m+1)^{-s}`$ points along $`e^{-i\omega}`$ (§[4](04-decomposing-the-remainder-r-r1ps-r2ps.md#sec-decomp)).

$`a`$, $`a^2`$.  
Siegel’s cutoff $`a=\sqrt{t/2\pi}`$ and its square $`a^2=t/2\pi=I(T)/2\pi`$. Crossing partners multiply to $`a^2`$. Under $`t=I(T)`$ one has $`a^2\approx(T+\tfrac12)^2`$.

<a id="the-chain-joints-and-links"></a>

### The chain: joints and links

Polyline.  
The drawing: a path of straight segments laid end to end, which is how a partial sum appears in the plane once each summand is drawn as a vector from the end of the last one (§[6](06-summands-as-links-and-joints.md#sec-matrix-product)). The word is about the picture and not about any new object. The forward and reverse spirals are the two polylines of this paper, and statements like “the two polylines meet” are statements about the drawn segments rather than about the sums.

Sum chain, or link chain.  
The partial-sum polyline in the plane: joints connected by links, one Dirichlet summand per link (§[6](06-summands-as-links-and-joints.md#sec-matrix-product)). “Sum chain” reads it as a running total; “link chain” reads it as a serial chain of segments. The two names are the same object. We also call it a spiral, though only the later links wind. Nickel \[16\] draws it as the Argand diagram of the steps $`n^{-s}`$. Erickson \[8\] identifies the later coils as Cornu spirals and labels their centers $`C_n`$. Kapitonets \[11\] calls the polyline the Riemann spiral. Berry and Goldberg \[2\] call the quadratic-phase analogue a curlicue; our turn $`\theta_n=-t\log(1+1/n)`$ is not quadratic, so the coils are Cornu only locally (§[15.3](15-prior-literature.md#sec-curlicues)). The $`3\times3`$ matrices of §[6.2](06-summands-as-links-and-joints.md#sec-product-form) are the planar Denavit–Hartenberg encoding of a serial chain \[7\].

Joint.  
A vertex of a chain: the value of the partial sum after an integer number of summands. Joint *n* of the forward chain is $`J_n=\sum_{n'\le n}n'^{-s}`$, so joint $`0`$ is the origin and joint *m* is Σ₁ itself (§[6](06-summands-as-links-and-joints.md#sec-matrix-product), §[12.1](12-general-yin-and-yang-and-the-d1-and-d2-formulas.md#sec-links-crossing)). Erickson’s centers $`C_n`$ stand in one-to-one correspondence with the joints, though a center is not itself a joint (§[9.1](09-the-geometry-behind-the-result-experimental-math.md#sec-bisector); see *Spiral center*).

Link.  
The segment between two consecutive joints: one Dirichlet summand, drawn as a vector. Link *k* of the forward chain runs from joint *k* to joint $`k+1`$ and carries the summand $`n=k+1`$ (§[6](06-summands-as-links-and-joints.md#sec-matrix-product)). Nickel calls the same object a step. Coutsias and Kazarinoff \[4\] treat the same polyline as a discrete curve with a radius of curvature at each turn.

Spiral center.  
The point a coil of the chain winds around, and the clearing it leaves at the middle of that coil (§[9](09-the-geometry-behind-the-result-experimental-math.md#sec-geometry), §[12.1](12-general-yin-and-yang-and-the-d1-and-d2-formulas.md#sec-links-crossing), Figure [19](09-the-geometry-behind-the-result-experimental-math.md#fig-last-spiral-zoom)). The link nearest it is $`L_N(T,S_n)`$ of [(76)](09-the-geometry-behind-the-result-experimental-math.md#eq-LN), where the turn per link $`t\log(1+1/n)`$ is the odd multiple $`\pi(2S_n+1)`$: successive links are antiparallel there, so the chain sweeps back and forth across the center and the joints settle onto a ring around it of radius about half a link length, which is the lens-shaped clearing the near-diameter links envelope. The center need not lie on any link or joint, not even on the nearest link. The centers are not scattered. Numbering them by the spiral number $`S_n=c`$ outward from the end of the chain, center $`c=0`$ is the last spiral, the largest, and sits at ζ to within that radius; each further center is one sweep back: by [(145)](12-general-yin-and-yang-and-the-d1-and-d2-formulas.md#eq-crossing-saddle) the step from center *c* to center $`c-1`$ is the *c*-th summand reflected in the fixed direction Θ, of length $`c^{-1/2}`$. Read outward from ζ the centers therefore reproduce the head of the chain reflected, which is Nickel’s center-to-center distances and angles reproducing the initial steps. In summands, center *c* is near $`n=a^2/(c+\tfrac12)`$, interleaving with the sweeps at $`n=a^2/c`$ of [(144)](12-general-yin-and-yang-and-the-d1-and-d2-formulas.md#eq-crossing-sweep). Erickson writes $`C_n`$ for these points.

$`\Sigma_1`$, the forward chain (or forward spiral).  
The sum chain of the first Dirichlet sum, $`\Sigma_1=\sum_{n=1}^mn^{-s}`$ (§[2](02-siegel-s-1932-decomposition.md#sec-siegel), §[6](06-summands-as-links-and-joints.md#sec-matrix-product)). The chain is a polyline of summands, not a placement: it may be drawn in any frame.

$`\Sigma_2`$, the reverse chain (or reverse spiral).  
The sum chain of the reflected Dirichlet sum, $`\Sigma_2=\chi(s)\sum_{n=1}^mn^{s-1}`$ (§[2](02-siegel-s-1932-decomposition.md#sec-siegel)). In the plane the reverse chain is usually drawn from ζ, running counter to the forward chain; as a free vector it can sit anywhere. On the critical line it is the functional-equation image of the forward chain: each summand of Σ₂ is χ times the conjugate of the matching summand of Σ₁. Nickel’s second half $`Q(s)P(1-s)`$ is the same reflection, with his *Q* equal to our χ (§[15.1](15-prior-literature.md#sec-nickel)).

<a id="the-remainder-on-the-chain"></a>

### The remainder on the chain

$`R`$.  
Siegel’s unsplit remainder integral, so that $`\zeta=\Sigma_1+\Sigma_2+R`$ (§[2](02-siegel-s-1932-decomposition.md#sec-siegel)). Every named split below recovers this same *R*, exactly or approximately.

Split.  
The choice of meeting point: a writing $`R=R_1+R_2`$ (or $`\zeta=B_1+B_2`$) that picks where the two halves join (§[7.2](07-other-remainders.md#sec-remainders-summary)). The two pieces leave the same pair of joints: *R₁* starts at Σ₁, and *R₂* arrives at $`\Sigma_1+R`$. What a split chooses is only the point $`\Sigma_1+R_1`$ between those joints, its own bisector point. The three named splits are the partial-summand split $`ps`$, the half-split $`rs`$, and the Kuznetsov / Siegel-*f* split $`ak`$. The $`rs`$ split just halves *R* along itself. The $`ak`$ split does not follow the summand directions.

Cone.  
What the $`ps`$ split looks like in the plane: the two halves run along two different link directions, $`R=d_1\,e^{-i\omega}+d_2\,e^{i(\omega+\psi)}`$, with real weights (§[4](04-decomposing-the-remainder-r-r1ps-r2ps.md#sec-decomp), [(23)](04-decomposing-the-remainder-r-r1ps-r2ps.md#eq-R-as-cone)). Those two rays form an angle, and *R* sits in that angle when both weights are positive. The same picture at a general forward link, with $`W_k`$ in place of *R*, is [(166)](12-general-yin-and-yang-and-the-d1-and-d2-formulas.md#eq-W-cone). A cone is a split; not every split is a cone.

$`R_{ps}`$, $`R_{1ps}`$, $`R_{2ps}`$.  
The partial-summand split of *R*: $`R=R_{ps}=R_{1ps}+R_{2ps}`$, with $`R_{1ps}=d_1\,e^{-i\omega}`$ and $`R_{2ps}=d_2\,e^{i(\omega+\arg\chi)}`$ (§[4](04-decomposing-the-remainder-r-r1ps-r2ps.md#sec-decomp)). Each piece is the next Dirichlet term of its sum, shortened by a real weight. The subscript $`ps`$ distinguishes this exact split from the approximate remainders of other authors.

Fractional summand.  
A remainder that is exactly the next Dirichlet term, scaled by a real factor: $`R_{1ps}=\hat d_1\,(m+1)^{-s}`$ and $`R_{2ps}=\hat d_2\,\chi\,(m+1)^{s-1}`$ (§[5](05-the-remainders-are-one-more-partial-summand.md#sec-summand)). The word “fractional” means a fraction of one summand, not a summand with a non-integer index.

$`d_1`$, $`d_2`$.  
The real lengths of the two fractional summands: $`|R_{1ps}|=d_1`$ and $`|R_{2ps}|=d_2`$ (§[4](04-decomposing-the-remainder-r-r1ps-r2ps.md#sec-decomp)). Each is the distance, in the plane, from the bisector joint to the bisector point, measured along its own bisector link. On the critical line, $`d_1=d_2`$. The sine formulas are [(19)](04-decomposing-the-remainder-r-r1ps-r2ps.md#eq-d1)–[(20)](04-decomposing-the-remainder-r-r1ps-r2ps.md#eq-d2).

$`\hat d_1`$, $`\hat d_2`$ (fractional amounts).  
The same weights read as fractions of a link rather than as lengths: $`\hat d_1=\lceil T\rceil^{\sigma}\,d_1`$ and $`\hat d_2=\lceil T\rceil^{1-\sigma}\,d_2/|\chi|`$ (§[5](05-the-remainders-are-one-more-partial-summand.md#sec-summand)). $`\hat d_1`$ is the crossing fraction of the bisector link. At the running example $`\sigma=\tfrac12`$, $`T=6.18`$, one has $`d_1\approx0.0875`$ and $`\hat d_1\approx0.231`$.

$`R_{ak}`$, $`R_{1ak}`$, $`R_{2ak}`$.  
The Kuznetsov / Siegel-*f* split: $`R\sim R_{ak}=R_{1ak}+R_{2ak}`$, where $`R_{1ak}=f(s)-\Sigma_1`$ (§[7.1](07-other-remainders.md#sec-kuznetsov), §[7.2](07-other-remainders.md#sec-remainders-summary)). Approximate, and not a single fractional summand.

$`R_{rs}`$, $`R_{1rs}`$, $`R_{2rs}`$.  
The half-split $`R_{1rs}=R_{2rs}=\tfrac12 R`$ (§[7.2](07-other-remainders.md#sec-remainders-summary)). Kapitonets’ midpoint of the remainder vector is this split (§[15.3](15-prior-literature.md#sec-curlicues)).

<a id="the-bisector"></a>

### The bisector

Bisector link.  
Link $`m=\lfloor T\rfloor`$ of a chain: the link that sits at the boundary between the nearly-straight early chain and the coils (§[9.1](09-the-geometry-behind-the-result-experimental-math.md#sec-bisector)). Each chain has one. The forward bisector link runs from Σ₁ along the $`(m+1)`$st summand; the reverse bisector link runs from $`\Sigma_1+R`$ along its $`(m+1)`$st summand. On $`\sigma=\tfrac12`$ the bisector line cuts this link at the bisector point *B₁*: that is where the forward chain meets the bisector line, at crossing fraction $`\hat d_1`$ along the link, not (except at a handoff) at the bisector joint itself. This is the neighborhood of Siegel’s cutoff $`m=\lfloor\sqrt{t/2\pi}\rfloor`$ (§[2](02-siegel-s-1932-decomposition.md#sec-siegel)), of Nickel’s center-of-symmetry step $`n_p=[\sqrt{t/2\pi}\,]`$ (offset from our *m* by about half a unit, §[15.1](15-prior-literature.md#sec-nickel)), and of the inflection at which Coutsias and Kazarinoff cut their sum (§[15.3](15-prior-literature.md#sec-curlicues)).

Bisector joint.  
Joint *m* of the forward chain, the integer vertex at which the bisector link begins: the point Σ₁. The matching joint of the reverse chain is $`\Sigma_1+R`$. All three remainder splits of §[7.2](07-other-remainders.md#sec-remainders-summary) leave from this pair of joints.

Bisector point.  
The crossing of the two bisector links, $`B_1=\Sigma_1+R_{1ps}=\Sigma_1+R-R_{2ps}`$ (§[9.1](09-the-geometry-behind-the-result-experimental-math.md#sec-bisector)). On the critical line it is the apex of the isosceles triangle with base from the origin to ζ. Nickel’s center $`P(s)`$ plays the same role and is not the same point: the two differ mostly along the symmetry axis, which ζ cannot see (§[15.1](15-prior-literature.md#sec-nickel)). Kapitonets draws his axis through the midpoint of the remainder vector *R*; that midpoint is the half-split $`R_{rs}`$, not *B₁* (§[15.3](15-prior-literature.md#sec-curlicues)).

Bisector line.  
The line through the bisector point *B₁* and $`\zeta/2`$ (§[9.2](09-the-geometry-behind-the-result-experimental-math.md#sec-legs), Figure [18](09-the-geometry-behind-the-result-experimental-math.md#fig-full-spirals)). On $`\sigma=\tfrac12`$ it is the perpendicular bisector of the segment from the origin to ζ, and the axis of symmetry of the isosceles triangle *O*–*B₁*–ζ whose equal sides are the two legs. It cuts the bisector link at *B₁*. Off the critical line the legs are unequal, so there is no isosceles triangle and the line is no longer a symmetry axis, but we keep the same name for the line through *B₁* and $`\zeta/2`$.

$`B_1`$, $`B_2`$.  
The two half-sums that add to ζ: $`B_1=\Sigma_1+R_{1ps}`$ and $`B_2=\Sigma_2+R_{2ps}`$, so $`\zeta=B_1+B_2`$ (§[6](06-summands-as-links-and-joints.md#sec-matrix-product)). *B₁* is the bisector point. On the critical line, $`B_2=\chi\,\overline{B_1}`$. Nickel’s Riemann–Siegel equation $`\zeta=P(s)+Q(s)P(1-s)`$ is this two-leg split with a different choice of the meeting point (§[15.1](15-prior-literature.md#sec-nickel)).

<a id="frames"></a>

### Frames

Link frame.  
The coordinate frame of an arbitrary forward link *k*: translate joint *k* to the origin and divide by the link vector $`(k+1)^{-s}`$, so that link *k* becomes the unit interval $`[0,1]`$ (§[12.2](12-general-yin-and-yang-and-the-d1-and-d2-formulas.md#sec-yinyang-any), Figure [45](12-general-yin-and-yang-and-the-d1-and-d2-formulas.md#fig-link-frames)).

Bisector frame.  
The link frame at $`k=m`$: it sends the forward bisector link to $`[0,1]`$ on the real axis (§[10.1](10-i-t-functions.md#sec-IT-origin), §[11](11-the-yin-and-yang-curves.md#sec-yinyang)). In that frame the reverse bisector link revolves as *T* advances, and the crossing with the axis is the number *d₁* (or the crossing fraction $`\hat d_1`$, once the link is read at unit length).

$`\vartheta`$-frame.  
The rotation that makes ζ real on the critical line: multiply every vector by $`e^{i\vartheta(t)}`$, where ϑ is the Riemann–Siegel theta function, so that $`Z=e^{i\vartheta}\zeta`$ lies on the real axis (§[13.1](13-theta1-theta2-and-the-zero-counting-function.md#sec-counting-review), Corollary [9.2](09-the-geometry-behind-the-result-experimental-math.md#cor-bisector-proj)). The base $`O\to\zeta`$ is then the real axis, and a split point reads as $`\tfrac12 Z+ih`$. This is the same rotation as $`e^{-i\psi/2}`$ with $`\vartheta=-\psi/2`$, since $`\chi=e^{-2i\vartheta}`$ on the line. *Z* is Hardy’s *Z*-function.

<a id="legs"></a>

### Legs

Legs.  
The two segments that add to ζ: Leg 1 is the vector *B₁* from the origin to the bisector point, and Leg 2 is the vector $`B_2=\zeta-B_1`$ from the bisector point to ζ (§[9.2](09-the-geometry-behind-the-result-experimental-math.md#sec-legs)). Their lengths are $`L_1=|B_1|`$ and $`L_2=|B_2|`$. Nickel’s two vectors $`P(s)`$ and $`Q(s)P(1-s)`$ are legs in the same sense, meeting at his center rather than at *B₁*.

$`\vartheta_1`$, $`\vartheta_2`$.  
The two leg angles: $`\vartheta_1=\arg B_1`$ is the heading of Leg 1 from the positive real axis, and $`\vartheta_2=\arg(B_2/B_1)`$ is the turn from Leg 1 to Leg 2 (§[9.2](09-the-geometry-behind-the-result-experimental-math.md#sec-legs)). Then $`\zeta=L_1 e^{i\vartheta_1}+L_2 e^{i(\vartheta_1+\vartheta_2)}`$. These are not the Riemann–Siegel theta function $`\vartheta(t)`$ of [(183)](13-theta1-theta2-and-the-zero-counting-function.md#eq-N-theta), which is the phase of $`\chi^{1/2}`$ and counts zeros; the clash of names is unfortunate and the two are kept apart by the subscripts.

Ordinate.  
Always the ordinate of a zeta zero: the imaginary part γ of a zero of ζ, so $`\zeta(\tfrac12+i\gamma_n)=0`$ with $`\gamma_1<\gamma_2<\cdots`$ (§[13](13-theta1-theta2-and-the-zero-counting-function.md#sec-counting)). On the index, ordinate $`\gamma_n`$ sits at $`T=I^{-1}(\gamma_n)`$. The word is never used here in its generic sense, the *y*-coordinate of an arbitrary point.

Retrograde, prograde.  
The two directions of the fold angle ϑ₂ (§[13](13-theta1-theta2-and-the-zero-counting-function.md#sec-counting), Figure [53](13-theta1-theta2-and-the-zero-counting-function.md#fig-nps-staircase)). Prograde is the usual way: ϑ₂ keeps going through π at an ordinate and does not come back. Retrograde is the other way: ϑ₂ rises through π, turns around, and comes back down through it (or the reverse). The boundary between the two is where the derivative vanishes, $`\vartheta_2'=0`$. A retrograde passage is where $`N_{\mathrm{ps}}`$ miscounts; $`\vartheta_2^{\ast}`$ of the velocity split never retrogrades, which is why $`N_{\ast}`$ counts correctly (§[13.3](13-theta1-theta2-and-the-zero-counting-function.md#sec-counting-ovals), Figure [56](13-theta1-theta2-and-the-zero-counting-function.md#fig-theta2-star-compare)).

Equal legs.  
The condition $`L_1=L_2`$. On the critical line it holds identically (Corollary [9.1](09-the-geometry-behind-the-result-experimental-math.md#cor-equal-legs)). Off the line it is a locus of ovals and thin bands in the strip (Figure [21](09-the-geometry-behind-the-result-experimental-math.md#fig-equal-legs-strips)). A zero of ζ requires equal legs *and* $`\vartheta_2=\pi`$. Nickel notes that the two magnitudes are equal exactly when $`\sigma=\tfrac12`$ (§[15.1](15-prior-literature.md#sec-nickel)).

$`\mathcal{E}_{\mathrm{ps}}`$, $`\mathcal{E}_{\mathrm{rs}}`$.  
The equal-leg loci of two different splits of the remainder. Each is the set of $`(\sigma,T)`$ at which the two legs have the same length, $`|B_1|=|\zeta-B_1|`$, for $`B_1=B_{1ps}`$ and $`B_1=B_{1rs}`$ respectively (§[9.4](09-the-geometry-behind-the-result-experimental-math.md#sec-ps-ak-r2)). A zero forces equal legs for every split, so every zero lies in the intersection $`\mathcal{E}_{\mathrm{ps}}\cap\mathcal{E}_{\mathrm{rs}}`$. The whole critical line is in both. Off the line, a meeting of the two oval families would be necessary for an off-line zero (not sufficient). If they never meet off $`\sigma=\tfrac12`$, there is no off-line zero.

Fold, folded.  
Two related uses, both meaning that two segments occupy the same line and point opposite ways. At an integer *T* the neighboring link *folds back* onto the bisector link, the joint angle is an odd multiple of π, and the bisector point hands off to the next link (§[10.1](10-i-t-functions.md#sec-IT-origin), §[11](11-the-yin-and-yang-curves.md#sec-yinyang)): that is a *handoff*, and for zeta every handoff is of this kind. Separately, a *folded-leg* point in the strip is a height where $`\vartheta_2=\pi`$, so that Leg 2 folds back onto Leg 1 (Figure [21](09-the-geometry-behind-the-result-experimental-math.md#fig-equal-legs-strips)); a zero is an equal-leg point that is also folded-leg.

<a id="how-the-picture-moves-with-t"></a>

### How the picture moves with *T*

Handoff.  
The instant, at integer *T*, when the bisector point moves from link $`m-1`$ onto link *m* (§[8](08-the-positive-real-function-d1-and-its-periodicit.md#sec-d1-function), §[10.1](10-i-t-functions.md#sec-IT-origin)). For zeta the two links fold back onto one another and the point slides across the joint with no jump.

Event.  
Any instant at which the bisector point moves from one link to the next (§[10.2](10-i-t-functions.md#sec-IT-Lfunctions)). For zeta every event is a handoff by fold-back. Dirichlet *L*-functions have a second kind.

Folded event.  
An event at which the turning angle at the current joint is $`\pm\pi`$, so the chain reverses and the bisector point slides across the joint (§[10.2](10-i-t-functions.md#sec-IT-Lfunctions)). For zeta, every handoff is a folded event, once per unit of *T*. For $`L(s,\chi_p)`$ these occur at $`T\equiv0\pmod{p-1}`$.

Bisector event.  
An event at which the bisector *line* (the perpendicular bisector of the segment from $`0`$ to the *L*-value) sweeps through a joint and carries the crossing onto the neighboring link (§[10.2](10-i-t-functions.md#sec-IT-Lfunctions)). Zeta has none. For $`L(s,\chi_p)`$ they occupy the remaining residues modulo $`p-1`$.

Phantom link.  
A zero-length summand of $`L(s,\chi_p)`$, where $`\chi_p(n)=0`$ (§[10.2](10-i-t-functions.md#sec-IT-Lfunctions)). Phantoms receive no index *T*; only the nonzero steps are links.

<a id="crossings-along-the-chain"></a>

### Crossings along the chain

Crossing (the point).  
Where a forward link and a reverse link meet in the plane. The distinguished one is the bisector point *B₁*; every other forward link *k* has one as well, written $`P_k`$ (§[12.1](12-general-yin-and-yang-and-the-d1-and-d2-formulas.md#sec-links-crossing), §[12.4](12-general-yin-and-yang-and-the-d1-and-d2-formulas.md#sec-sum-x)).

Crossing partner.  
The reverse link that crosses forward link *k*. The two summands are reciprocal about the Riemann–Siegel cutoff $`a=\sqrt{t/2\pi}`$: $`n\,n'=a^2=I(T)/2\pi`$, with $`n=k+1`$ (§[12.1](12-general-yin-and-yang-and-the-d1-and-d2-formulas.md#sec-links-crossing)). This is the same saddle that Siegel’s contour is built around.

Crossing fraction.  
How far along a link the crossing sits, from the left joint toward the right, as a number in $`[0,1]`$ (§[12.3](12-general-yin-and-yang-and-the-d1-and-d2-formulas.md#sec-d1-any), §[12.4](12-general-yin-and-yang-and-the-d1-and-d2-formulas.md#sec-sum-x)). On forward link *k* it is $`\hat d_1(k)`$; on reverse link *k* it is $`\hat d_2(k)`$, the *T* of $`\hat d_1(k,T)`$ and $`\hat d_2(k,T)`$ being suppressed where it is fixed. At the bisector, $`\hat d_1(m)=\hat d_1`$. Away from the fold the other $`\hat d_1(k)`$ sit near $`\tfrac12`$. This is a fraction of the straight link, not of a curved arc.

$`\Sigma_{1x}`$, $`\Sigma_{2x}`$.  
The two Dirichlet sums re-jointed at the crossings instead of at the integers (§[12.4](12-general-yin-and-yang-and-the-d1-and-d2-formulas.md#sec-sum-x)). $`\Sigma_{1x}`$ walks $`P_{-1}=0,P_0,\dots,P_m=B_1`$ and totals $`B_1=\Sigma_1+R_{1ps}`$; $`\Sigma_{2x}`$ does the same from the origin along Σ₂ and totals *B₂*. The subscript *x* is for crossing, not a dummy index. The step lengths are the crossing fractions $`\hat d_1(k)`$ and $`\hat d_2(k)`$.

<a id="yin-and-yang"></a>

### Yin and yang

Yin, yang.  
The two ends of the reverse bisector link, watched in the bisector frame as *T* advances (§[11](11-the-yin-and-yang-curves.md#sec-yinyang)). Each traces a teardrop; the pair resembles a yin-yang. Yin is the joint-*m* end, yang the joint-$`(m+1)`$ end. The chord from yin to yang crosses the real axis at the bisector point, and that crossing is how *d₁* and *d₂* were found (§[11.2](11-the-yin-and-yang-curves.md#sec-derive-r1ps)–§[11.3](11-the-yin-and-yang-curves.md#sec-derive-r2ps)). The same pair exists for every forward link *k*, once the crossing partner is known (§[12.2](12-general-yin-and-yang-and-the-d1-and-d2-formulas.md#sec-yinyang-any)). The names are ours.

$`Y_{\inf}`$ (yinfinity).  
The common limit of the yin curve as $`T\to\infty`$ at fixed fractional part $`q=\{T\}`$: $`Y_{\inf}(q)=1-\Psi(q)\,e^{-2\pi i(q^2-1/16)}`$ (§[11.6](11-the-yin-and-yang-curves.md#sec-yinyang-infinity)). We call this curve yinfinity. Yang follows the same curve half a unit behind. For $`0<T<1`$ the yin path is ζ itself (Erickson’s *C₀*).

$`\Psi`$.  
The classical Riemann–Siegel correction $`\Psi(x)=\cos\bigl(2\pi(x^2-x-1/16)\bigr)/\cos(2\pi x)`$, as in Titchmarsh \[22, §15.3\] and Pugh \[19, §5.4.1\]. It enters this paper as the amplitude of $`Y_{\inf}`$, not as a remainder of its own.

<a id="the-far-chain-links-near-zeta"></a>

### The far chain (links near ζ)

Conveyor belt.  
The stretch of the reverse chain between the last two spirals (spirals $`1`$ and $`0`$ of [(76)](09-the-geometry-behind-the-result-experimental-math.md#eq-LN)), the links near ζ. The name is ours.

Last link.  
The link nearest the center of the last spiral: $`L_N(T,0)=\lfloor I(T)/\pi\rfloor=\lfloor t/\pi\rfloor\approx 2T^2`$ (§[9](09-the-geometry-behind-the-result-experimental-math.md#sec-geometry), [(76)](09-the-geometry-behind-the-result-experimental-math.md#eq-LN)). It is the link closest to ζ, far past the bisector; ζ itself is not typically on it. The same formula with spiral number $`S_n`$ names the link nearest the center of any spiral, $`L_N(T,S_n)=\bigl\lfloor I(T)/\bigl(\pi(2S_n+1)\bigr)\bigr\rfloor`$. Consecutive links there are antiparallel.

---

[← Contents](../README.md) · [← 16 Statements left unproved](16-statements-left-unproved.md) · [Acknowledgments →](acknowledgments.md)
