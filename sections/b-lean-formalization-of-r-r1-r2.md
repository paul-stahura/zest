[← Contents](../README.md) · [← A Proof of Proposition 4.1: reality and pos…](a-proof-of-proposition-4-1-reality-and-positivity.md) · [C Lean formalization of the critical line:… →](c-lean-formalization-of-the-critical-line-d1-d2-r1.md)

---

<a id="app-lean-decomp"></a>

## B Lean formalization of $`R=R_1+R_2`$

This appendix reproduces the Lean file formalizing the algebraic content of Theorem [4.2](04-decomposing-the-remainder-r-r1-r2.md#thm-decomp). The file contains no `axiom` and no `sorry`: every step is proved, and the only axioms the final theorem depends on are Lean’s own three (`propext`, `Classical.choice`, `Quot.sound`), as reported by `#print axioms`. It was checked against Lean 4.32.2 with Mathlib at commit `905b95818e`. The proof was written by the author, and the formalization of the proof in Lean code was written with the assistance of AI coding assistants (Anthropic’s Claude).

<a id="correspondence-with-the-written-proof"></a>

### B.1 Correspondence with the written proof

The file follows the proof of Theorem [4.2](04-decomposing-the-remainder-r-r1-r2.md#thm-decomp) step for step. The definitions `d_j1` and `d_j2` are the sine weights [(17)](04-decomposing-the-remainder-r-r1-r2.md#eq-d1)–[(18)](04-decomposing-the-remainder-r-r1-r2.md#eq-d2), and `R_1ps` and `R_2ps` are Step 1, transcribed from [(15)](04-decomposing-the-remainder-r-r1-r2.md#eq-R1-def)–[(16)](04-decomposing-the-remainder-r-r1-r2.md#eq-R2-def) in the $`\lceil T\rceil^{\mp iI(T)}`$ form rather than the $`e^{\mp i\omega}`$ form (the Lean identifiers keep the names `R_1ps`, `R_2ps` for what this paper writes *R₁*, *R₂*). Two small bridges convert them: `ceil_cpow` proves $`\lceil T\rceil^{\,ir}=e^{\,ir\log\lceil T\rceil}`$ for $`T>0`$, which with $`\omega(T)=I(T)\log\lceil T\rceil`$ (the definition `omg`) is exactly $`\lceil T\rceil^{\,iI(T)}=e^{i\omega}`$; and `div_norm_eq_exp_arg` proves $`z/|z|=e^{i\arg z}`$ for $`z\neq0`$, applied to χ to give $`\chi/|\chi|=e^{i\psi}`$. Then `factoring_lemma` is the regrouping of Step 2, pulling out the common factor $`|R|/\sin(2\omega+\psi)`$, and `key_algebraic_identity` is the content of Steps 3–5, namely

<a id="eq-lean-key"></a>

```math
e^{-i\omega}\sin(\omega-\phi+\psi)+e^{\,i(\omega+\psi)}\sin(\omega+\phi)
\;=\;
e^{\,i\phi}\sin(2\omega+\psi);\qquad\text{(204)}
```

it is proved by writing each sine as $`(e^{i\theta}-e^{-i\theta})/2i`$ (`sin_to_exp`, itself proved from Mathlib’s $`e^{i\theta}=\cos\theta+i\sin\theta`$), clearing the denominator, merging the resulting products of exponentials into single exponentials, and letting `ring_nf` cancel the two copies of $`e^{\,i(\psi-\phi)}`$. The closing lines are Step 6: cancel $`\sin(2\omega+\psi)`$ and recognize $`|R|e^{i\phi}=R`$, which is Mathlib’s `Complex.norm_mul_exp_arg_mul_I`.

<a id="what-is-proved-and-what-is-hypothesized"></a>

### B.2 What is proved and what is hypothesized

The theorem `R_1ps_plus_R_2ps_eq_R` carries three hypotheses. Two are needed for the objects to exist at all: $`\chi(\sigma+iI(T))\neq0`$, without which $`\chi/|\chi|`$ is meaningless, and $`\sin(2\omega+\psi)\neq0`$, without which *d₁* and *d₂* of [(17)](04-decomposing-the-remainder-r-r1-r2.md#eq-d1)–[(18)](04-decomposing-the-remainder-r-r1-r2.md#eq-d2) are undefined. The third, $`T>0`$, makes $`\lceil T\rceil`$ a positive base, so that its complex power can be written as an exponential. Nothing is assumed about whether *T* is an integer.

The conventions match exactly. Steps 2–6, that is `factoring_lemma` and `key_algebraic_identity`, hold for arbitrary real $`\omega,\phi,\psi`$ and make no reference to *T*; the only *T*-dependent ingredient is the bridge `ceil_cpow`, which holds for every $`T>0`$ with ω defined as $`I(T)\log\lceil T\rceil`$. In the paper’s variables that reads $`t\log M`$, which is precisely the definition [(19)](04-decomposing-the-remainder-r-r1-r2.md#eq-omega-def), for integer and non-integer *T* alike. The file therefore proves the identity in the same generality as Theorem [4.2](04-decomposing-the-remainder-r-r1-r2.md#thm-decomp): every $`T>0`$, under the three hypotheses above.

What remains outside the formalization is not algebra but analysis. The functional-equation factor χ, the index map *I*, and Siegel’s remainder *R* enter as free parameters, so what is machine-checked is that any *R* written in polar form splits as $`R_1+R_2`$ with the weights [(17)](04-decomposing-the-remainder-r-r1-r2.md#eq-d1)–[(18)](04-decomposing-the-remainder-r-r1-r2.md#eq-d2), which is exactly Steps 1–6. That *R* is Siegel’s remainder, and that *I* is the map of §[3](03-reparameterization-and-cutoff-choice-the-i-t-map.md#sec-IT), are inputs to the theorem rather than consequences of it. Positivity, analytic continuation, pole cancellation, and singular limits are likewise outside the file. The `#print axioms` commands were run separately; their console output is not reproduced here.

<a id="source-listing"></a>

### B.3 Source listing

```lean
/-
  Formalization of Theorem (R = R_1ps + R_2ps) from
  "Remainder Terms of the Riemann Zeta Function".

  Contains no `axiom` and no `sorry`: every step is proved.
-/
import Mathlib.Analysis.SpecialFunctions.Complex.Circle
import Mathlib.Analysis.SpecialFunctions.Pow.Complex

open Complex Real

/-! ### Phases -/

/-- The phase of Siegel's remainder, `φ = arg R`. -/
noncomputable def phiR (R : ℂ) : ℝ := Complex.arg R

/-- The phase of the functional-equation factor, `ψ = arg χ(σ + i I(T))`. -/
noncomputable def psi (χ : ℂ → ℂ) (σ T : ℝ) (If : ℝ → ℝ) : ℝ :=
  Complex.arg (χ (σ + If T * I))

/-- The turn angle `ω(T) = I(T) · log⌈T⌉`, so that `⌈T⌉^{i I(T)} = e^{iω}`. -/
noncomputable def omg (T : ℝ) (If : ℝ → ℝ) : ℝ := If T * Real.log (⌈T⌉ : ℝ)

/-! ### The two fractional link lengths -/

noncomputable def d_j1 (R : ℂ) (w f p : ℝ) : ℂ :=
  ((‖R‖ * (Real.sin (w - f + p) / Real.sin (2 * w + p)) : ℝ) : ℂ)

noncomputable def d_j2 (R : ℂ) (w f p : ℝ) : ℂ :=
  ((‖R‖ * (Real.sin (w + f) / Real.sin (2 * w + p)) : ℝ) : ℂ)

/-! ### The two partial-summand remainders, exactly as in the paper -/

noncomputable def R_1ps (σ T : ℝ) (R : ℂ) (χ : ℂ → ℂ) (If : ℝ → ℝ) : ℂ :=
  d_j1 R (omg T If) (phiR R) (psi χ σ T If) * ((⌈T⌉ : ℝ) : ℂ) ^ (-(I * (If T : ℂ)))

noncomputable def R_2ps (σ T : ℝ) (R : ℂ) (χ : ℂ → ℂ) (If : ℝ → ℝ) : ℂ :=
  d_j2 R (omg T If) (phiR R) (psi χ σ T If) * ((⌈T⌉ : ℝ) : ℂ) ^ (I * (If T : ℂ))
    * (χ (σ + If T * I) / (‖χ (σ + If T * I)‖ : ℂ))

/-! ### Step 0: elementary bridges -/

/-- `⌈T⌉^{i r} = e^{i r log⌈T⌉}` for `T > 0`, with no hypothesis on the
integrality of `T`. -/
lemma ceil_cpow (T r : ℝ) (hT : 0 < T) :
    (((⌈T⌉ : ℝ)) : ℂ) ^ (I * (r : ℂ))
      = Complex.exp (I * ((r * Real.log (⌈T⌉ : ℝ) : ℝ) : ℂ)) := by
  have hpos : (0 : ℝ) < (⌈T⌉ : ℝ) := lt_of_lt_of_le hT (Int.le_ceil T)
  have hne : (((⌈T⌉ : ℝ)) : ℂ) ≠ 0 := by
    simpa using (ne_of_gt hpos)
  rw [Complex.cpow_def_of_ne_zero hne, ← Complex.ofReal_log hpos.le]
  congr 1
  push_cast
  ring

/-- `z/‖z‖ = e^{i arg z}` for `z ≠ 0`. -/
lemma div_norm_eq_exp_arg (z : ℂ) (hz : z ≠ 0) :
    z / (‖z‖ : ℂ) = Complex.exp (I * (Complex.arg z : ℂ)) := by
  have hn : ((‖z‖ : ℝ) : ℂ) ≠ 0 := by
    simpa using norm_ne_zero_iff.mpr hz
  rw [div_eq_iff hn, mul_comm I ((Complex.arg z : ℝ) : ℂ),
    mul_comm (Complex.exp (((Complex.arg z : ℝ) : ℂ) * I)) ((‖z‖ : ℝ) : ℂ)]
  exact (Complex.norm_mul_exp_arg_mul_I z).symm

/-- Exponential form of the sine of a real argument, valued in `ℂ`. -/
lemma sin_to_exp (θ : ℝ) :
    (Real.sin θ : ℂ)
      = (Complex.exp (I * (θ : ℂ)) - Complex.exp (-I * (θ : ℂ))) / (2 * I) := by
  have h1 : Complex.exp (I * (θ : ℂ)) = Complex.cos (θ : ℂ) + Complex.sin (θ : ℂ) * I := by
    rw [mul_comm]; exact Complex.exp_mul_I _
  have h2 : Complex.exp (-I * (θ : ℂ)) = Complex.cos (θ : ℂ) - Complex.sin (θ : ℂ) * I := by
    have h : (-I * (θ : ℂ)) = (-(θ : ℂ)) * I := by ring
    rw [h, Complex.exp_mul_I, Complex.cos_neg, Complex.sin_neg]; ring
  rw [h1, h2, Complex.ofReal_sin]
  have hI : (2 * I : ℂ) ≠ 0 := by simp [Complex.I_ne_zero]
  field_simp
  ring

/-! ### Steps 3-5: the key algebraic identity -/

/-- The heart of the theorem: the two sine-weighted phasors combine into a
single phasor along `e^{iφ}`. -/
theorem key_algebraic_identity (w f p : ℝ) :
    Complex.exp (-I * (w : ℂ)) * (Real.sin (w - f + p) : ℂ) +
    Complex.exp (I * ((w + p : ℝ) : ℂ)) * (Real.sin (w + f) : ℂ) =
    Complex.exp (I * (f : ℂ)) * (Real.sin (2 * w + p) : ℂ) := by
  rw [sin_to_exp, sin_to_exp, sin_to_exp]
  have hI : (2 * I : ℂ) ≠ 0 := by simp [Complex.I_ne_zero]
  field_simp
  simp only [mul_sub, ← Complex.exp_add]
  push_cast
  ring_nf

/-! ### Step 2: factoring -/

/-- Pulling the common factor `|R|/sin(2ω+ψ)` out front. -/
lemma factoring_lemma (absR w f p : ℝ) :
    ((absR * (Real.sin (w - f + p) / Real.sin (2 * w + p)) : ℝ) : ℂ) *
        Complex.exp (-(I * (w : ℂ))) +
    ((absR * (Real.sin (w + f) / Real.sin (2 * w + p)) : ℝ) : ℂ) *
        Complex.exp (I * (w : ℂ)) * Complex.exp (I * (p : ℂ)) =
    ((absR : ℝ) : ℂ) / (Real.sin (2 * w + p) : ℂ) *
      (Complex.exp (-I * (w : ℂ)) * (Real.sin (w - f + p) : ℂ) +
       Complex.exp (I * ((w + p : ℝ) : ℂ)) * (Real.sin (w + f) : ℂ)) := by
  have hsplit : I * ((w + p : ℝ) : ℂ) = I * (w : ℂ) + I * (p : ℂ) := by
    push_cast; ring
  rw [hsplit, Complex.exp_add]
  push_cast
  ring

/-! ### The theorem -/

/-- **R = R₁ps + R₂ps.**  The only hypotheses are that the index is positive,
that `χ` does not vanish at the point in question, and that the denominator
`sin(2ω+ψ)` is nonzero (without which `d₁, d₂` are undefined). In particular no
assumption is made about `T` being an integer or not. -/
theorem R_1ps_plus_R_2ps_eq_R (σ T : ℝ) (R : ℂ) (χ : ℂ → ℂ) (If : ℝ → ℝ)
    (hT : 0 < T)
    (hχ : χ (σ + If T * I) ≠ 0)
    (h_sin : Real.sin (2 * omg T If + psi χ σ T If) ≠ 0) :
    R_1ps σ T R χ If + R_2ps σ T R χ If = R := by
  have hsinC : (Real.sin (2 * omg T If + psi χ σ T If) : ℂ) ≠ 0 := by
    exact_mod_cast h_sin
  -- e^{iψ} for the normalized functional-equation factor
  have hchi : χ (σ + If T * I) / (‖χ (σ + If T * I)‖ : ℂ)
      = Complex.exp (I * (psi χ σ T If : ℂ)) := div_norm_eq_exp_arg _ hχ
  -- the two cpow factors become e^{∓iω}
  have hpow : (((⌈T⌉ : ℝ)) : ℂ) ^ (I * (If T : ℂ))
      = Complex.exp (I * (omg T If : ℂ)) := by
    rw [ceil_cpow T (If T) hT]; rfl
  have hpow' : (((⌈T⌉ : ℝ)) : ℂ) ^ (-(I * (If T : ℂ)))
      = Complex.exp (-(I * (omg T If : ℂ))) := by
    have h : -(I * (If T : ℂ)) = I * ((-(If T) : ℝ) : ℂ) := by push_cast; ring
    rw [h, ceil_cpow T (-(If T)) hT]
    congr 1
    simp only [omg]
    push_cast
    ring
  -- |R| e^{iφ} = R
  have hR : ((‖R‖ : ℝ) : ℂ) * Complex.exp (I * (phiR R : ℂ)) = R := by
    rw [mul_comm I ((phiR R : ℝ) : ℂ)]
    exact Complex.norm_mul_exp_arg_mul_I R
  unfold R_1ps R_2ps d_j1 d_j2
  rw [hchi, hpow, hpow', factoring_lemma, key_algebraic_identity]
  -- cancel sin(2ω+ψ)
  field_simp
  linear_combination hR
```

---

[← Contents](../README.md) · [← A Proof of Proposition 4.1: reality and pos…](a-proof-of-proposition-4-1-reality-and-positivity.md) · [C Lean formalization of the critical line:… →](c-lean-formalization-of-the-critical-line-d1-d2-r1.md)
