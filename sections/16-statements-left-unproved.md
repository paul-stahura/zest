[← Contents](../README.md) · [← 15 Prior literature](15-prior-literature.md) · [17 Glossary →](17-glossary.md)

---

<a id="sec-unproved"></a>

## 16 Statements left unproved

The body of the paper mixes identities that are proved, identities that are written down and then checked, and readings that are only measurements. This section collects the ones we would like to prove and have not.

<a id="possible-but-longer"></a>

### Possible, but longer

These need a real argument, not just a census.

1.  Every forward link is crossed by a reverse link, and the partner is the summand $`n'=a^2/n`$ of [(137)](12-general-yin-and-yang-and-the-d1-and-d2-formulas.md#eq-crossing-product) (§[12.1](12-general-yin-and-yang-and-the-d1-and-d2-formulas.md#sec-links-crossing)). The product law is motivated by a stationary-phase sweep and then checked on $`118{,}007`$ samples. Proposition [12.1](12-general-yin-and-yang-and-the-d1-and-d2-formulas.md#prop-crossing-angle) settles the direction: the named partner is never parallel to the link and never more than a quarter turn from antiparallel, because $`nn'`$ is an integer. What is missing is the position. A theorem would have to show that the two polylines meet, not only that the named integer usually works, and that needs the sweep [(145)](12-general-yin-and-yang-and-the-d1-and-d2-formulas.md#eq-crossing-saddle) with an effective error term rather than as a stationary-phase heuristic.

2.  The pairing is an involution: $`C_s(C_s(n,T),T)=n`$. Claimed as the symmetry of [(137)](12-general-yin-and-yang-and-the-d1-and-d2-formulas.md#eq-crossing-product); if the previous item is proved, this is immediate.

3.  A retrograde stretch of ϑ₂ is an equal-leg oval, one to one (§[13.3](13-theta1-theta2-and-the-zero-counting-function.md#sec-counting-ovals)). The correspondence is exact on $`5.9\le T\le 6.7`$, and it survives a much wider scan: over twelve windows spread from $`T=1`$ to $`T=50`$, holding $`344`$ ordinates between them, the $`45`$ retrograde stretches, the $`45`$ off-line ovals and the $`45`$ retrograde ordinates match one for one, with the stretch and the oval agreeing end to end to between $`10^{-5}`$ and $`10^{-3}`$ of *T* (`check_retro_ovals.py`). The only other off-line features met are the pole bands at $`\{T\}\approx\tfrac14,\tfrac34`$, which cross at every σ instead of closing. The geometric story is written (*h* small, the legs nearly folded, ϑ₂ stalls). Making that story a local lemma is one thing; the global one-to-one is still a scan.

4.  Off the critical line, collinearity of $`R_{1ps}`$, $`R_{1rs}`$, and $`R_{1ak}`$ fails except on isolated curves, and a hypothetical off-line zero can be connected to that structure (§[14.3](14-further-observations.md#sec-colinearity)). The on-line identity is Proposition [14.6](14-further-observations.md#prop-colinear-line); these are the two steps that remain if collinearity is to say anything about zeros.

<a id="observational"></a>

### Observational

These are measurements. We do not have a mechanism that would turn them into theorems, and we do not claim one.

1.  Five off-line collinearity bands per unit of *T*, two of them tracking the poles of *d₁* (§[14.3](14-further-observations.md#sec-colinearity)). The pattern is read from the heatmaps.

2.  Scoring large values of $`|Z|`$ from the first few links, the rank correlation of the slope ρ of $`N_{\ast}`$ against $`|Z|`$, and the grids on which $`N_{\ast}`$ stays increasing (Remark [14.5](14-further-observations.md#rem-large-values), Remark [13.5](13-theta1-theta2-and-the-zero-counting-function.md#rem-nstar-slope), Remark [13.4](13-theta1-theta2-and-the-zero-counting-function.md#rem-nstar-mono)).

---

[← Contents](../README.md) · [← 15 Prior literature](15-prior-literature.md) · [17 Glossary →](17-glossary.md)
