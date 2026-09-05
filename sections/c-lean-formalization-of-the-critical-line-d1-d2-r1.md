[← Contents](../README.md) · [← B Lean formalization of R=R1+R2](b-lean-formalization-of-r-r1-r2.md) · [References →](references.md)

---

<a id="app-lean-critical"></a>

## C Lean formalization of the critical line: $`d_1=d_2`$, $`|R_{1ps}|=|R_{2ps}|`$, and equal legs

This appendix reproduces the Lean file establishing the three critical-line statements of the paper: Proposition [4.1](04-decomposing-the-remainder-r-r1-r2.md#prop-weights)(iii) in its compact form [(70)](09-the-geometry-behind-the-result-experimental-math.md#eq-R2-conj-R1) ($`d_1=d_2`$ and $`|R_{1ps}|=|R_{2ps}|`$), Corollary [9.1](09-the-geometry-behind-the-result-experimental-math.md#cor-equal-legs) ($`L_1=L_2`$), and Corollary [9.2](09-the-geometry-behind-the-result-experimental-math.md#cor-bisector-proj) (the bisector point projects onto $`\tfrac{\zeta}{2}`$). As in Appendix [B](b-lean-formalization-of-r-r1-r2.md#app-lean-decomp) the file contains no `axiom` and no `sorry`, and each result depends only on Lean’s own three axioms (`propext`, `Classical.choice`, `Quot.sound`) as reported by `#print axioms`; it was checked against Lean 4.32.2 with Mathlib at commit `905b95818e`. The Lean code was written with the assistance of AI coding assistants (Anthropic’s Claude).

<a id="the-chain-of-implications"></a>

### C.1 The chain of implications

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
\;\in\;\mathbb{R},\qquad\text{(205)}
```

the first term being real because the functional equation at $`\sigma=\tfrac12`$ reads $`\zeta=\chi\overline{\zeta}`$, so that $`e^{-i\psi/2}\zeta=\overline{e^{-i\psi/2}\zeta}`$. In the file this is `rotated_remainder_self_conj` (the algebra, from $`u\bar u=1`$ and $`u^2=\chi`$) and `rotated_remainder_im_eq_zero` (its imaginary part vanishes). It is the fact quoted in §[9.3](09-the-geometry-behind-the-result-experimental-math.md#sec-ps-ak-r2) and Appendix [A.2](a-proof-of-proposition-4-1-reality-and-positivity.md#sec-phase-bound) as $`R=e^{-i\vartheta}r`$ with *r* real and $`\psi=-2\vartheta`$ on the line. Stated as the reality of $`e^{-i\psi/2}R`$ it is exact; stated through the argument it holds modulo π, which is visible in $`R=2d_1\cos(\omega+\tfrac\psi2)e^{\,i\psi/2}`$, whose argument is $`\tfrac\psi2+\pi`$ wherever the cosine is negative. The modulo-π version is all the sequel uses.

*Step 2: $`d_1=d_2`$.* Since $`\sin A-\sin B=2\sin\frac{A-B}{2}\cos\frac{A+B}{2}`$, the two numerators of [(17)](04-decomposing-the-remainder-r-r1-r2.md#eq-d1)–[(18)](04-decomposing-the-remainder-r-r1-r2.md#eq-d2) differ by

<a id="eq-lean-numerators"></a>

```math
\sin(\omega-\phi+\psi)-\sin(\omega+\phi)
\;=\;
2\,\sin\!\Bigl(\frac{\psi}{2}-\phi\Bigr)\cos\!\Bigl(\omega+\frac{\psi}{2}\Bigr),\qquad\text{(206)}
```

and Step 1 kills the first factor: `sin_half_sub_arg_eq_zero` turns the reality of $`e^{-i\psi/2}R`$ into $`\sin(\tfrac\psi2-\arg R)=0`$, using $`\cos\arg R=\Re R/|R|`$ and $`\sin\arg R=\Im R/|R|`$. Hence `d1_eq_d2_of_im_eq_zero` and its critical-line specialization `d1_eq_d2`. Note that ω is an arbitrary real throughout: the equality of the weights depends on the direction of *R* relative to χ and not at all on the turn angle.

*Step 3: $`|R_{1ps}|=|R_{2ps}|`$.* Both phases are unimodular, so this is $`|d_1|=|d_2|`$: `norm_R1ps_eq_norm_R2ps`. The sharper form [(70)](09-the-geometry-behind-the-result-experimental-math.md#eq-R2-conj-R1), $`R_{2ps}=\chi\,\overline{R_{1ps}}`$, is `R2ps_eq_chi_conj_R1ps`, and it is what feeds Step 4; it needs only that *d₁* is real and $`d_1=d_2`$.

*Step 4: the legs.* Combining Steps 0 and 3, $`B_2=\Sigma_2+R_{2ps}=\chi\,\overline{\Sigma_1+R_{1ps}}=\chi\overline{B_1}`$ (`leg2_eq_chi_conj_leg1`), and since $`|\chi|=1`$ on the line the two legs have the same length (`legs_norm_eq`). Finally, from $`\zeta=B_1+\chi\overline{B_1}`$,

<a id="eq-lean-proj"></a>

```math
e^{-i\psi/2}\zeta
=e^{-i\psi/2}B_1+\overline{e^{-i\psi/2}B_1}
=2\,\Re\bigl(e^{-i\psi/2}B_1\bigr),\qquad\text{(207)}
```

which says that the perpendicular projection of the bisector point onto the line $`\mathbb{R}\,e^{\,i\psi/2}`$ carrying ζ lands exactly on $`\tfrac{\zeta}{2}`$: the apex of the isosceles triangle sits over the midpoint of its base. This is `proj_eq_half_zeta`, and it is the dotted bisector line drawn in Figures [16](09-the-geometry-behind-the-result-experimental-math.md#fig-full-spirals) and [18](09-the-geometry-behind-the-result-experimental-math.md#fig-legs).

<a id="what-is-proved-and-what-is-hypothesized-1"></a>

### C.2 What is proved and what is hypothesized

Two analytic facts about χ on the critical line enter as hypotheses: $`|\chi|=1`$, used in the form $`\chi=e^{\,i\arg\chi}`$ (`eq_exp_arg_of_norm_one`), and the functional equation $`\zeta=\chi\overline{\zeta}`$, which is $`\zeta(s)=\chi(s)\zeta(1-s)`$ together with $`1-s=\bar s`$ at $`\sigma=\tfrac12`$. Everything else above is derived, including the reflection $`\Sigma_2=\chi\overline{\Sigma_1}`$ of Step 0, which is proved rather than assumed. The projection statement additionally takes $`\zeta=B_1+B_2`$, which is Theorem [4.2](04-decomposing-the-remainder-r-r1-r2.md#thm-decomp), formalized in Appendix [B](b-lean-formalization-of-r-r1-r2.md#app-lean-decomp).

The remainders are written here in the $`ps`$ notation of §[8.1](08-other-remainders.md#sec-remainders-summary), in the form $`R_{1ps}=d_1e^{-i\omega}`$, $`R_{2ps}=d_2e^{\,i(\omega+\psi)}`$ of [(46)](07-summands-as-links-and-joints.md#eq-R-phasors) (where they are the plain *R₁*, *R₂* of §[4](04-decomposing-the-remainder-r-r1-r2.md#sec-decomp)) rather than the $`\lceil T\rceil^{\mp iI(T)}`$ form of [(15)](04-decomposing-the-remainder-r-r1-r2.md#eq-R1-def)–[(16)](04-decomposing-the-remainder-r-r1-r2.md#eq-R2-def); the bridge between them is `ceil_cpow` of Appendix [B](b-lean-formalization-of-r-r1-r2.md#app-lean-decomp). As there, ζ, χ, Σ₁ and ω are free parameters, so what is checked is the geometry of the critical line and not the identity of the functions involved.

<a id="source-listing-1"></a>

### C.3 Source listing

```lean
/-
  Critical-line consequences of the decomposition R = R1ps + R2ps:
    (1) e^{-iψ/2} R is real, i.e. arg R = ψ/2 modulo π,
    (2) d₁ = d₂,
    (3) |R1ps| = |R2ps|, indeed R2ps = χ · conj R1ps,
    (4) the two legs have equal length, and the bisector point projects onto ζ/2.

  Contains no `axiom` and no `sorry`: every step is proved.
-/
import Mathlib.Analysis.SpecialFunctions.Complex.Circle
import Mathlib.Analysis.SpecialFunctions.Pow.Complex

open Complex Real ComplexConjugate

/-! ### Unit phases -/

/-- A purely imaginary exponent gives a unit phase. -/
lemma norm_exp_imag (x : ℝ) : ‖Complex.exp (I * (x : ℂ))‖ = 1 := by
  rw [Complex.norm_exp]
  simp

lemma norm_exp_neg_imag (x : ℝ) : ‖Complex.exp (-(I * (x : ℂ)))‖ = 1 := by
  rw [Complex.norm_exp]
  simp

/-- Conjugation flips the sign of a purely imaginary exponent. -/
lemma conj_exp_imag (x : ℝ) :
    conj (Complex.exp (I * (x : ℂ))) = Complex.exp (-(I * (x : ℂ))) := by
  rw [← Complex.exp_conj]
  congr 1
  simp [Complex.ext_iff]

lemma conj_exp_neg_imag (x : ℝ) :
    conj (Complex.exp (-(I * (x : ℂ)))) = Complex.exp (I * (x : ℂ)) := by
  rw [← Complex.exp_conj]
  congr 1
  simp [Complex.ext_iff]

/-- A number of unit modulus is the exponential of its argument: this is the
form in which `|χ| = 1` on the critical line will be used. -/
lemma eq_exp_arg_of_norm_one {χ : ℂ} (hχ : ‖χ‖ = 1) :
    χ = Complex.exp (I * ((Complex.arg χ : ℝ) : ℂ)) := by
  have h := Complex.norm_mul_exp_arg_mul_I χ
  rw [hχ] at h
  rw [mul_comm I _]
  simpa using h.symm

/-! ### Step 0: the second partial sum is the reflection of the first

At `σ = 1/2` we have `n^{s-1} = conj (n^{-s})` for every `n`, because
`conj(-s) = s - 1` there. Summing, `Σ₂ = χ · conj Σ₁`, which is the hypothesis
the results below are stated with. -/

lemma conj_natCast_cpow (n : ℕ) (z : ℂ) :
    conj ((n : ℂ) ^ z) = (n : ℂ) ^ (conj z) := by
  have harg : ((n : ℂ)).arg ≠ π := by
    rw [show ((n : ℂ)) = (((n : ℝ)) : ℂ) by push_cast; ring,
      Complex.arg_ofReal_of_nonneg (by positivity)]
    exact Ne.symm Real.pi_ne_zero
  rw [Complex.cpow_conj _ _ harg, Complex.conj_natCast]

/-- On the critical line the two Dirichlet partial sums are conjugate. -/
theorem partial_sum_reflect (m : ℕ) (t : ℝ) :
    ∑ n ∈ Finset.Icc 1 m, ((n : ℂ)) ^ (((1 / 2 : ℂ) + (t : ℂ) * I) - 1)
      = conj (∑ n ∈ Finset.Icc 1 m, ((n : ℂ)) ^ (-((1 / 2 : ℂ) + (t : ℂ) * I))) := by
  rw [map_sum]
  refine Finset.sum_congr rfl fun n _ => ?_
  rw [conj_natCast_cpow]
  congr 1
  simp [Complex.ext_iff]
  norm_num

/-! ### Step 1: the rotated remainder is real

On the critical line the functional equation reads `ζ = χ · conj ζ`, and the
second partial sum is the reflection of the first, `S₂ = χ · conj S₁`. With
`u = e^{iψ/2}` a square root of `χ`, the remainder `R = ζ - S₁ - S₂` satisfies
`conj (conj u * R) = conj u * R`, that is, `e^{-iψ/2} R` is real. -/

lemma rotated_remainder_self_conj (ζ S₁ χ u : ℂ)
    (hu : u * conj u = 1) (hu2 : u ^ 2 = χ)
    (hζ : ζ = χ * conj ζ) :
    conj (conj u * (ζ - S₁ - χ * conj S₁)) = conj u * (ζ - S₁ - χ * conj S₁) := by
  simp only [map_sub, map_mul, Complex.conj_conj]
  rw [← hu2] at hζ ⊢
  simp only [map_pow]
  linear_combination (-conj u) * hζ
    + (-u * conj ζ + u * conj S₁ - conj u * S₁) * hu

lemma rotated_remainder_im_eq_zero (ζ S₁ χ : ℂ) (p : ℝ)
    (hp : χ = Complex.exp (I * (p : ℂ)))
    (hζ : ζ = χ * conj ζ) :
    (Complex.exp (-(I * ((p / 2 : ℝ) : ℂ))) * (ζ - S₁ - χ * conj S₁)).im = 0 := by
  have hu : Complex.exp (I * ((p / 2 : ℝ) : ℂ)) * conj (Complex.exp (I * ((p / 2 : ℝ) : ℂ))) = 1 := by
    rw [conj_exp_imag, ← Complex.exp_add]
    simp
  have hu2 : Complex.exp (I * ((p / 2 : ℝ) : ℂ)) ^ 2 = χ := by
    rw [hp, pow_two, ← Complex.exp_add]
    congr 1
    push_cast
    ring
  have hc : conj (Complex.exp (I * ((p / 2 : ℝ) : ℂ)))
      = Complex.exp (-(I * ((p / 2 : ℝ) : ℂ))) := conj_exp_imag _
  rw [← hc]
  exact Complex.conj_eq_iff_im.mp
    (rotated_remainder_self_conj ζ S₁ χ _ hu hu2 hζ)

/-! ### Step 2: reality of `e^{-ip/2} R` says `arg R = p/2` modulo `π` -/

lemma sin_half_sub_arg_eq_zero (R : ℂ) (p : ℝ) (hR : R ≠ 0)
    (him : (Complex.exp (-(I * ((p / 2 : ℝ) : ℂ))) * R).im = 0) :
    Real.sin (p / 2 - Complex.arg R) = 0 := by
  have hexp : Complex.exp (-(I * ((p / 2 : ℝ) : ℂ)))
      = ((Real.cos (p / 2) : ℝ) : ℂ) - ((Real.sin (p / 2) : ℝ) : ℂ) * I := by
    have h : -(I * ((p / 2 : ℝ) : ℂ)) = ((-(p / 2) : ℝ) : ℂ) * I := by
      push_cast; ring
    rw [h, Complex.exp_mul_I, ← Complex.ofReal_cos, ← Complex.ofReal_sin,
      Real.cos_neg, Real.sin_neg]
    push_cast
    ring
  have hnorm : ‖R‖ ≠ 0 := norm_ne_zero_iff.mpr hR
  rw [hexp] at him
  simp only [Complex.mul_im, Complex.sub_re, Complex.sub_im, Complex.mul_re,
    Complex.ofReal_re, Complex.ofReal_im, Complex.I_re, Complex.I_im] at him
  rw [Real.sin_sub, Complex.cos_arg hR, Complex.sin_arg]
  field_simp
  linear_combination -him

/-! ### The weights and the two fractional remainders -/

/-- `d₁ = |R| sin(ω - arg R + ψ)/sin(2ω + ψ)`. -/
noncomputable def d1 (R : ℂ) (w p : ℝ) : ℝ :=
  ‖R‖ * (Real.sin (w - Complex.arg R + p) / Real.sin (2 * w + p))

/-- `d₂ = |R| sin(ω + arg R)/sin(2ω + ψ)`. -/
noncomputable def d2 (R : ℂ) (w p : ℝ) : ℝ :=
  ‖R‖ * (Real.sin (w + Complex.arg R) / Real.sin (2 * w + p))

/-- `R1ps = d₁ e^{-iω}`. -/
noncomputable def R_1ps (R : ℂ) (w p : ℝ) : ℂ :=
  ((d1 R w p : ℝ) : ℂ) * Complex.exp (-(I * ((w : ℝ) : ℂ)))

/-- `R2ps = d₂ e^{i(ω+ψ)}`. -/
noncomputable def R_2ps (R : ℂ) (w p : ℝ) : ℂ :=
  ((d2 R w p : ℝ) : ℂ) * Complex.exp (I * ((w + p : ℝ) : ℂ))

/-! ### Result 1: the two weights are equal

Note that `ω` is arbitrary here: the equality of the weights depends only on the
direction of `R` relative to `χ`, not on the turn angle. -/

theorem d1_eq_d2_of_im_eq_zero (R : ℂ) (w p : ℝ)
    (him : (Complex.exp (-(I * ((p / 2 : ℝ) : ℂ))) * R).im = 0) :
    d1 R w p = d2 R w p := by
  rcases eq_or_ne R 0 with h | h
  · simp [d1, d2, h]
  · have hs : Real.sin (p / 2 - Complex.arg R) = 0 :=
      sin_half_sub_arg_eq_zero R p h him
    have hnum : Real.sin (w - Complex.arg R + p) = Real.sin (w + Complex.arg R) := by
      have hd := Real.sin_sub_sin (w - Complex.arg R + p) (w + Complex.arg R)
      have harg : (w - Complex.arg R + p - (w + Complex.arg R)) / 2
          = p / 2 - Complex.arg R := by ring
      rw [harg, hs, mul_zero, zero_mul] at hd
      linarith
    rw [d1, d2, hnum]

/-- **d₁ = d₂ on the critical line.** -/
theorem d1_eq_d2 (ζ S₁ χ : ℂ) (w p : ℝ)
    (hp : χ = Complex.exp (I * (p : ℂ)))
    (hζ : ζ = χ * conj ζ) :
    d1 (ζ - S₁ - χ * conj S₁) w p = d2 (ζ - S₁ - χ * conj S₁) w p :=
  d1_eq_d2_of_im_eq_zero _ w p (rotated_remainder_im_eq_zero ζ S₁ χ p hp hζ)

/-! ### Result 2: the two fractional remainders have equal length -/

/-- **|R1ps| = |R2ps|.** -/
theorem norm_R1ps_eq_norm_R2ps (R : ℂ) (w p : ℝ) (hd : d1 R w p = d2 R w p) :
    ‖R_1ps R w p‖ = ‖R_2ps R w p‖ := by
  rw [R_1ps, R_2ps, norm_mul, norm_mul, norm_exp_neg_imag, norm_exp_imag, hd]

/-- The sharper statement: `R2ps` is the mirror image of `R1ps` across the real
axis, followed by the rotation `χ`. -/
theorem R2ps_eq_chi_conj_R1ps (R χ : ℂ) (w p : ℝ)
    (hp : χ = Complex.exp (I * (p : ℂ)))
    (hd : d1 R w p = d2 R w p) :
    R_2ps R w p = χ * conj (R_1ps R w p) := by
  have hexp : Complex.exp (I * ((w + p : ℝ) : ℂ))
      = Complex.exp (I * (p : ℂ)) * Complex.exp (I * ((w : ℝ) : ℂ)) := by
    rw [← Complex.exp_add]
    congr 1
    push_cast
    ring
  rw [R_1ps, R_2ps, map_mul, Complex.conj_ofReal, conj_exp_neg_imag, hd, hexp, hp]
  ring

/-! ### Result 3: the two legs have equal length -/

/-- With `B₁ = S₁ + R1ps` and `B₂ = S₂ + R2ps = χ conj S₁ + R2ps`, the second leg
is the reflection of the first. -/
theorem leg2_eq_chi_conj_leg1 (S₁ R χ : ℂ) (w p : ℝ)
    (hp : χ = Complex.exp (I * (p : ℂ)))
    (hd : d1 R w p = d2 R w p) :
    χ * conj S₁ + R_2ps R w p = χ * conj (S₁ + R_1ps R w p) := by
  rw [map_add, mul_add, R2ps_eq_chi_conj_R1ps R χ w p hp hd]

/-- **L₁ = L₂.** -/
theorem legs_norm_eq (S₁ R χ : ℂ) (w p : ℝ) (hχ : ‖χ‖ = 1)
    (hp : χ = Complex.exp (I * (p : ℂ)))
    (hd : d1 R w p = d2 R w p) :
    ‖χ * conj S₁ + R_2ps R w p‖ = ‖S₁ + R_1ps R w p‖ := by
  rw [leg2_eq_chi_conj_leg1 S₁ R χ w p hp hd, norm_mul, hχ, one_mul,
    RCLike.norm_conj]

/-! ### Result 4: the bisector point projects onto ζ/2 -/

/-- If `B₂ = χ conj B₁` and `ζ = B₁ + B₂`, then the orthogonal projection of the
bisector point `B₁` onto the line `ℝ·e^{iψ/2}` through `ζ` is exactly `ζ/2`. The
apex of the isosceles triangle sits over the midpoint of its base. -/
theorem proj_eq_half_zeta (B₁ ζ χ : ℂ) (p : ℝ)
    (hp : χ = Complex.exp (I * (p : ℂ)))
    (hzeta : ζ = B₁ + χ * conj B₁) :
    (((Complex.exp (-(I * ((p / 2 : ℝ) : ℂ))) * B₁).re : ℝ) : ℂ) *
        Complex.exp (I * ((p / 2 : ℝ) : ℂ))
      = ζ / 2 := by
  set em := Complex.exp (-(I * ((p / 2 : ℝ) : ℂ))) with hem
  set ep := Complex.exp (I * ((p / 2 : ℝ) : ℂ)) with hep
  have hu : ep * em = 1 := by
    rw [hep, hem, ← Complex.exp_add]
    simp
  have hu2 : ep ^ 2 = χ := by
    rw [hep, hp, pow_two, ← Complex.exp_add]
    congr 1
    push_cast
    ring
  have hconj : conj em = ep := by rw [hem, hep, conj_exp_neg_imag]
  set z := em * B₁ with hz
  have key : ((z.re : ℝ) : ℂ) * 2 = z + conj z := by
    rw [Complex.add_conj]
    push_cast
    ring
  have hcz : conj z = ep * conj B₁ := by rw [hz, map_mul, hconj]
  rw [eq_div_iff (two_ne_zero : (2 : ℂ) ≠ 0), hzeta]
  linear_combination ep * key + ep * hz + B₁ * hu + ep * hcz + conj B₁ * hu2
```

---

[← Contents](../README.md) · [← B Lean formalization of R=R1+R2](b-lean-formalization-of-r-r1-r2.md) · [References →](references.md)
