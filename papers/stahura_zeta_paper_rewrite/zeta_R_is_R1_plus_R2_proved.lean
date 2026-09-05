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
