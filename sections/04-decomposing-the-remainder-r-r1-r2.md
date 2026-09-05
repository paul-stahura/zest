[← Contents](../README.md) · [← 3 Reparameterization and cutoff choice: The…](03-reparameterization-and-cutoff-choice-the-i-t-map.md) · [5 The remainders are “one more partial summ… →](05-the-remainders-are-one-more-partial-summand.md)

---

<a id="sec-decomp"></a>

## 4 Decomposing the remainder: $`R=R_1+R_2`$

We now split Siegel’s single remainder *R* into two exact pieces, named *R₁* and *R₂*, stated in the variables *t*, *s*, *m*, and *M* fixed in [(9)](03-reparameterization-and-cutoff-choice-the-i-t-map.md#eq-IT). Define

<a id="eq-R1-def"></a>

<a id="eq-R2-def"></a>

```math
\begin{align}
R_1 &\;:=\; d_1\, M^{-it},
\qquad\text{(15)}\\[4pt]
R_2 &\;:=\; d_2\, M^{\,it}\,
\frac{\chi}{|\chi|},
\qquad\text{(16)}
\end{align}
```

with real weights

<a id="eq-d1"></a>

<a id="eq-d2"></a>

```math
\begin{align}

d_1 &\;:=\; |R|\,
\frac{\sin\!\bigl(\omega - \arg R + \arg\chi\bigr)}{\sin\!\bigl(2\omega + \arg\chi\bigr)},
\qquad\text{(17)}\\[4pt]
d_2 &\;:=\; |R|\,
\frac{\sin\!\bigl(\omega + \arg R\bigr)}{\sin\!\bigl(2\omega + \arg\chi\bigr)},
\qquad\text{(18)}
\end{align}
```

where *R* is Siegel’s remainder [(14)](03-reparameterization-and-cutoff-choice-the-i-t-map.md#eq-R-T), $`\chi=\chi(s)`$, and

<a id="eq-omega-def"></a>

```math
\begin{align}

\omega &\;:=\; t\,\log M .
\end{align}\qquad\text{(19)}
```

For non-integer *T* the angle $`\omega=t\log(m+1)`$ carries a geometric meaning: it is the total *clockwise* rotation accumulated by the summands of the first Dirichlet sum, so that $`-\omega`$ is the absolute direction angle, measured from the positive real axis, of the next summand: the summand $`n^{-s}=n^{-\sigma}e^{-it\ln n}`$ rotates by $`\theta_n=-t\ln\tfrac{n+1}{n}`$ relative to its predecessor, and these relative rotations telescope,

<a id="eq-omega-telescope"></a>

```math
\theta_1+\theta_2+\cdots+\theta_m
\;=\;
-t\ln\tfrac{2}{1}-t\ln\tfrac{3}{2}-\cdots-t\ln\tfrac{m+1}{m}
\;=\;
-t\ln(m+1)
\;=\;
-\omega,\qquad\text{(20)}
```

so the $`(m+1)`$st summand points along $`e^{-i\omega}`$. (At integer *T*, where $`M=m`$, the direction $`e^{-i\omega}`$ is instead that of the last *included* summand; the two directions are exactly antiparallel there, and the proof of Theorem [4.2](#thm-decomp) shows the ceiling is the orientation under which the decomposition holds at the integers as well.)

Writing $`\psi=\arg\chi(s)`$, the definitions [(15)](#eq-R1-def)–[(16)](#eq-R2-def) express *R* as a combination of two fixed *unit* directions,

<a id="eq-R-two-dirs"></a>

```math
R \;=\; d_1\,e^{-i\omega} \;+\; d_2\,e^{\,i(\omega+\psi)},\qquad\text{(21)}
```

namely the phases of the next summands of the two Dirichlet sums. The following proposition collects the basic facts about the two weights.

<a id="prop-weights"></a>


**Proposition 4.1** (Reality and positivity of the weights *d₁* and *d₂*). *Let $`\psi=\arg\chi(s)`$ and $`x=\{T\}`$, and let T be non-integer.*

1.  *Each remainder lies along the *next* summand of its Dirichlet sum.*

2.  *For every σ and every T with $`\sin(2\omega+\psi)\neq0`$, the weights d₁ and d₂ are real.*

3.  *On the critical line $`\sigma=\tfrac12`$ they are equal and positive.*

4.  *Fix $`\sigma\in(0,1)`$, $`\sigma\neq\tfrac12`$. For all $`T\geq T_0(\sigma)`$, both weights are positive except on two windows of width $`O_\sigma(1/T)`$, centered $`O(1/T)`$ from $`x=\tfrac14`$ and $`\tfrac34`$. Inside each window one weight is negative, with $`d_1/d_2\to-1`$ at the pole between them, so the windows cannot be removed.*


The proof, which occupies Appendix [A](a-proof-of-proposition-4-1-reality-and-positivity.md#sec-positivity), reduces everything to a sign criterion on the two numerators of [(17)](#eq-d1)–[(18)](#eq-d2). Geometrically, positivity is the statement that each fractional summand points *forward* along its partial sum, a positive fraction of the next term.

<a id="thm-decomp"></a>


**Theorem 4.2**. *Suppose $`T>0`$ and $`\sin(2\omega+\psi)\neq0`$. Then*

```math
R_1 + R_2 = R.
```

*Consequently,*

```math
\zeta = \Sigma_1 + R_1 + \Sigma_2 + R_2.
```

*At a zero of $`\sin(2\omega+\psi)`$, the combined expression on a punctured neighborhood has limiting value R. At an off-line pole the individual terms R₁ and R₂ diverge and are not assigned finite values there.*


The qualifier in the last sentence costs nothing. On the critical line $`\sigma=\tfrac12`$ the vanishing of the denominator $`\sin(2\omega+\psi)`$ is always cancelled by the numerators of [(17)](#eq-d1)–[(18)](#eq-d2), so *d₁* and *d₂* have no poles there at all (Appendix [A](a-proof-of-proposition-4-1-reality-and-positivity.md#sec-positivity)). Off the line the two weights do have genuine poles at those points, but the divergences are equal and opposite and cancel in the sum, which stays finite and equal to *R* (Appendix [A.5](a-proof-of-proposition-4-1-reality-and-positivity.md#sec-pole-locations)).


*Proof.* Write $`\phi = \arg R`$, $`\psi = \arg\chi`$, and $`\omega=t\log M`$, so that $`R=|R|e^{i\phi}`$ and $`\chi/|\chi|=e^{i\psi}`$. Since *M* is a positive real base and $`\omega=t\log M`$ by [(19)](#eq-omega-def), the substitution $`M^{\,\pm it}=e^{\pm i\omega}`$ is valid for *every* $`T>0`$, integer or not.

**Step 1 (substitute).** From [(15)](#eq-R1-def)–[(18)](#eq-d2),

```math
R_1 = |R|\,\frac{\sin(\omega - \phi + \psi)}{\sin(2\omega + \psi)}\, e^{-i\omega},
\qquad
R_2 = |R|\,\frac{\sin(\omega + \phi)}{\sin(2\omega + \psi)}\, e^{i\omega}\, e^{i\psi}.
```

**Step 2 (add).**

```math
R_1 + R_2
= \frac{|R|}{\sin(2\omega + \psi)}
\Bigl[\, e^{-i\omega}\sin(\omega - \phi + \psi) + e^{i(\omega + \psi)}\sin(\omega + \phi)\,\Bigr].
```

**Step 3 (expand via $`\sin\theta = \tfrac{e^{i\theta}-e^{-i\theta}}{2i}`$).**

```math
\begin{align*}
e^{-i\omega}\sin(\omega - \phi + \psi)
&= \frac{e^{i(\psi - \phi)} - e^{i(-2\omega + \phi - \psi)}}{2i}, \\
e^{i(\omega + \psi)}\sin(\omega + \phi)
&= \frac{e^{i(2\omega + \psi + \phi)} - e^{i(\psi - \phi)}}{2i}.
\end{align*}
```

**Step 4 (add the expansions).** The $`e^{i(\psi-\phi)}`$ terms cancel, leaving

```math
\frac{1}{2i}\Bigl[\, e^{i(2\omega + \psi + \phi)} - e^{i(\phi - \psi - 2\omega)}\,\Bigr].
```

**Step 5 (factor $`e^{i\phi}`$).**

```math
= \frac{e^{i\phi}}{2i}\Bigl[\, e^{i(2\omega + \psi)} - e^{-i(2\omega + \psi)}\,\Bigr]
= e^{i\phi}\sin(2\omega + \psi).
```

**Step 6 (substitute back).**

```math
R_1 + R_2
= \frac{|R|}{\sin(2\omega + \psi)}\cdot e^{i\phi}\sin(2\omega + \psi)
= |R|e^{i\phi} = R.
```

**Integer *T*.** No case split is needed: Steps 1–6 used only trigonometric algebra and the substitutions recorded at the start of the proof, all valid for every $`T>0`$. What deserves spelling out is the bookkeeping that the ceiling in [(19)](#eq-omega-def) handles. At integer *T* one has $`M=\lceil T\rceil=m`$ while $`\lfloor T+1\rfloor=m+1`$, and by the definition [(9)](03-reparameterization-and-cutoff-choice-the-i-t-map.md#eq-IT) of *I* the two candidate angles differ by

```math
t\log\tfrac{m+1}{m}
\;=\;
t\log\bigl(1+\tfrac1T\bigr)
\;=\;
\pi(2T+1),
```

exactly, which for integer *T* is an *odd* multiple of π. Passing from ω to $`\omega'=\omega+\pi(2T+1)`$ therefore flips the sign of both unit directions, $`e^{\mp i\omega'}=-e^{\mp i\omega}`$, and simultaneously flips the sign of both weights: each numerator in [(17)](#eq-d1)–[(18)](#eq-d2) shifts by an odd multiple of π and changes sign, while the common denominator shifts by the even multiple $`2\pi(2T+1)`$ and does not. The two flips cancel in the products, so the partial summands *R₁* and *R₂*, and with them the identity $`R_1+R_2=R`$, come out the same under either convention, *provided* the weights and the directions are computed from the same angle. The definitions [(15)](#eq-R1-def)–[(18)](#eq-d2) do exactly that: both use *M*, through [(19)](#eq-omega-def). (Mixing the conventions, with weights from $`\lfloor T+1\rfloor`$ against directions from *M*, would flip only one of the two signs and produce $`-R`$ at the integers.)

**Exceptional points.** The algebra above divides by $`\sin(2\omega+\psi)`$ and so applies wherever that denominator is nonzero. Its zeros are isolated in *T*, and *R* is continuous, so on a punctured neighborhood of each zero the identity $`R_1+R_2=R`$ holds and forces the limit of $`R_1+R_2`$ to exist and equal *R* there, which is the limiting sense adopted in the statement. At an off-line pole this does not assign finite values to the two individual terms. ◻


A formalization of the algebra of Theorem [4.2](#thm-decomp) in Lean is given in Appendix [B](b-lean-formalization-of-r-r1-r2.md#app-lean-decomp). It assumes no axioms of its own; the appendix records what its three hypotheses are and what is left outside its scope. A second Lean file, reproduced in Appendix [C](c-lean-formalization-of-the-critical-line-d1-d2-r1.md#app-lean-critical), formalizes the critical-line statements that descend from Proposition [4.1](#prop-weights)(iii): the reflection [(70)](09-the-geometry-behind-the-result-experimental-math.md#eq-R2-conj-R1) and the equal-leg corollaries of §[9.2](09-the-geometry-behind-the-result-experimental-math.md#sec-legs). Since $`R=R_1+R_2`$, we have in particular proved the exact formula

<a id="eq-zeta-ps"></a>

```math
\zeta(s)
=
\Sigma_1 + R_1 + R_2 + \Sigma_2.\qquad\text{(22)}
```

---

[← Contents](../README.md) · [← 3 Reparameterization and cutoff choice: The…](03-reparameterization-and-cutoff-choice-the-i-t-map.md) · [5 The remainders are “one more partial summ… →](05-the-remainders-are-one-more-partial-summand.md)
