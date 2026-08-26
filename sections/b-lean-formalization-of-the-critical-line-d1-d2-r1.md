[← Contents](../README.md) · [← A Lean formalization of R=R1ps+R2ps](a-lean-formalization-of-r-r1ps-r2ps.md) · [References →](references.md)

---

## B Lean formalization of the critical line: $`d_1=d_2`$, $`|R_{1ps}|=|R_{2ps}|`$, and equal legs

<details>
<summary><b>Click to expand the Lean appendix</b></summary>


This appendix reproduces the Lean file establishing the three critical-line statements of the paper: Corollary [8.1](08-the-positive-real-function-d1-and-its-periodicit.md#cor-equal) ($`d_1=d_2`$ and $`|R_{1ps}|=|R_{2ps}|`$), Corollary [9.1](09-the-geometry-behind-the-result-experimental-math.md#cor-equal-legs) ($`L_1=L_2`$), and Corollary [9.2](09-the-geometry-behind-the-result-experimental-math.md#cor-bisector-proj) (the bisector point projects onto $`\tfrac{\zeta}{2}`$). As in Appendix [A](a-lean-formalization-of-r-r1ps-r2ps.md#app-lean-decomp) the file contains no `axiom` and no `sorry`, and each result depends only on Lean’s own three axioms (`propext`, `Classical.choice`, `Quot.sound`) as reported by `#print axioms`; it was checked against Lean 4.32.2 with Mathlib at commit `905b95818e`. The Lean code was written with the assistance of AI coding assistants (Anthropic’s Claude).

<a id="the-chain-of-implications"></a>

### B.1 The chain of implications

All three statements descend from a single fact, and the file is organized around it.

*Step 0: the two partial sums are conjugate.* At $`\sigma=\tfrac12`$ one has $`\overline{-s}=s-1`$, so $`n^{\,s-1}=\overline{n^{-s}}`$ for every *n*; summing over $`n\le m`$ gives $`\Sigma_2=\chi\,\overline{\Sigma_1}`$. This is `partial_sum_reflect`, proved from Mathlib’s `Complex.cpow_conj`.

*Step 1: the rotated remainder is real.* Write $`\psi=\arg\chi`$ and let $`u=e^{\,i\psi/2}`$, a square root of χ. With $`R=\zeta-\Sigma_1-\Sigma_2`$,

<a id="eq-lean-hinge"></a>

```math
e^{-i\psi/2}R
\;=\;
\underbrace{e^{-i\psi/2}\zeta}_{\text{real}}
\;-\;
\underbrace{\bigl(e^{-i\psi/2}\Sigma_1+e^{\,i\psi/2}\overline{\Sigma_1}\bigr)}_{=\;2\Re\left(e^{-i\psi/2}\Sigma_1\right)}
\;\in\;\mathbb{R},\qquad\text{(226)}
```

the first term being real because the functional equation at $`\sigma=\tfrac12`$ reads $`\zeta=\chi\overline{\zeta}`$, so that $`e^{-i\psi/2}\zeta=\overline{e^{-i\psi/2}\zeta}`$. In the file this is `rotated_remainder_self_conj` (the algebra, from $`u\bar u=1`$ and $`u^2=\chi`$) and `rotated_remainder_im_eq_zero` (its imaginary part vanishes). It is the fact quoted as $`\arg R=\tfrac12\arg\chi`$ in §[8.1](08-the-positive-real-function-d1-and-its-periodicit.md#sec-d1-exact). Stated as the reality of $`e^{-i\psi/2}R`$ it is exact; stated through the argument it holds modulo π, which is visible in $`R=2d_1\cos(\omega+\tfrac\psi2)e^{\,i\psi/2}`$, whose argument is $`\tfrac\psi2+\pi`$ wherever the cosine is negative. The modulo-π version is all the sequel uses.

*Step 2: $`d_1=d_2`$.* Since $`\sin A-\sin B=2\sin\frac{A-B}{2}\cos\frac{A+B}{2}`$, the two numerators of [(19)](04-decomposing-the-remainder-r-r1ps-r2ps.md#eq-d1)–[(20)](04-decomposing-the-remainder-r-r1ps-r2ps.md#eq-d2) differ by

<a id="eq-lean-numerators"></a>

```math
\sin(\omega-\phi+\psi)-\sin(\omega+\phi)
\;=\;
2\,\sin\!\Bigl(\frac{\psi}{2}-\phi\Bigr)\cos\!\Bigl(\omega+\frac{\psi}{2}\Bigr),\qquad\text{(227)}
```

and Step 1 kills the first factor: `sin_half_sub_arg_eq_zero` turns the reality of $`e^{-i\psi/2}R`$ into $`\sin(\tfrac\psi2-\arg R)=0`$, using $`\cos\arg R=\Re R/|R|`$ and $`\sin\arg R=\Im R/|R|`$. Hence `d1_eq_d2_of_im_eq_zero` and its critical-line specialization `d1_eq_d2`. Note that ω is an arbitrary real throughout: the equality of the weights depends on the direction of *R* relative to χ and not at all on the turn angle.

*Step 3: $`|R_{1ps}|=|R_{2ps}|`$.* Both phases are unimodular, so this is $`|d_1|=|d_2|`$: `norm_R1ps_eq_norm_R2ps`. The sharper form [(78)](09-the-geometry-behind-the-result-experimental-math.md#eq-R2-conj-R1), $`R_{2ps}=\chi\,\overline{R_{1ps}}`$, is `R2ps_eq_chi_conj_R1ps`, and it is what feeds Step 4; it needs only that *d₁* is real and $`d_1=d_2`$.

*Step 4: the legs.* Combining Steps 0 and 3, $`B_2=\Sigma_2+R_{2ps}=\chi\,\overline{\Sigma_1+R_{1ps}}=\chi\overline{B_1}`$ (`leg2_eq_chi_conj_leg1`), and since $`|\chi|=1`$ on the line the two legs have the same length (`legs_norm_eq`). Finally, from $`\zeta=B_1+\chi\overline{B_1}`$,

<a id="eq-lean-proj"></a>

```math
e^{-i\psi/2}\zeta
=e^{-i\psi/2}B_1+\overline{e^{-i\psi/2}B_1}
=2\,\Re\bigl(e^{-i\psi/2}B_1\bigr),\qquad\text{(228)}
```

which says that the perpendicular projection of the bisector point onto the line $`\mathbb{R}\,e^{\,i\psi/2}`$ carrying ζ lands exactly on $`\tfrac{\zeta}{2}`$: the apex of the isosceles triangle sits over the midpoint of its base. This is `proj_eq_half_zeta`, and it is the dotted bisector line drawn in Figures [18](09-the-geometry-behind-the-result-experimental-math.md#fig-full-spirals) and [20](09-the-geometry-behind-the-result-experimental-math.md#fig-legs).

<a id="what-is-proved-and-what-is-hypothesized-1"></a>

### B.2 What is proved and what is hypothesized

Two analytic facts about χ on the critical line enter as hypotheses: $`|\chi|=1`$, used in the form $`\chi=e^{\,i\arg\chi}`$ (`eq_exp_arg_of_norm_one`), and the functional equation $`\zeta=\chi\overline{\zeta}`$, which is $`\zeta(s)=\chi(s)\zeta(1-s)`$ together with $`1-s=\bar s`$ at $`\sigma=\tfrac12`$. Everything else above is derived, including the reflection $`\Sigma_2=\chi\overline{\Sigma_1}`$ of Step 0, which is proved rather than assumed. The projection statement additionally takes $`\zeta=B_1+B_2`$, which is Theorem [4.1](04-decomposing-the-remainder-r-r1ps-r2ps.md#thm-decomp) of Appendix [A](a-lean-formalization-of-r-r1ps-r2ps.md#app-lean-decomp).

The remainders are written here in the form $`R_{1ps}=d_1e^{-i\omega}`$, $`R_{2ps}=d_2e^{\,i(\omega+\psi)}`$ of [(24)](04-decomposing-the-remainder-r-r1ps-r2ps.md#eq-zeta-ps) rather than the $`\lceil T\rceil^{\mp iI(T)}`$ form of [(17)](04-decomposing-the-remainder-r-r1ps-r2ps.md#eq-R1ps-def)–[(18)](04-decomposing-the-remainder-r-r1ps-r2ps.md#eq-R2ps-def); the bridge between them is `ceil_cpow` of Appendix [A](a-lean-formalization-of-r-r1ps-r2ps.md#app-lean-decomp). As there, ζ, χ, Σ₁ and ω are free parameters, so what is checked is the geometry of the critical line and not the identity of the functions involved.

<a id="source-listing-1"></a>

### B.3 Source listing

```
```

<a id="references"></a>

</details>

---

[← Contents](../README.md) · [← A Lean formalization of R=R1ps+R2ps](a-lean-formalization-of-r-r1ps-r2ps.md) · [References →](references.md)
