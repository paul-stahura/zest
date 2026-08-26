[← Contents](../README.md) · [← 3 The same formula, reparameterized: The I(…](03-the-same-formula-reparameterized-the-i-t-mapping.md) · [5 The remainders are “one more partial summ… →](05-the-remainders-are-one-more-partial-summand.md)

---

<a id="sec-decomp"></a>

## 4 Decomposing the remainder: $`R=R_{1ps}+R_{2ps}`$

We now split Siegel’s single remainder *R* into two exact pieces, named $`R_{1ps}`$ and $`R_{2ps}`$ (the subscript “$`ps`$” distinguishes them from the approximate remainders of other authors). Define

<a id="eq-R1ps-def"></a>

```math
R_{1ps}(\sigma, T) \;:=\; d_1(\sigma, T)\,\cdot\, \lceil T \rceil^{-i\,I(T)},\qquad\text{(17)}
```

<a id="eq-R2ps-def"></a>

```math
R_{2ps}(\sigma, T) \;:=\; d_2(\sigma, T)\,\cdot\, \lceil T \rceil^{\,i\,I(T)}
\cdot \frac{\chi(\sigma + i\,I(T))}{|\chi(\sigma + i\,I(T))|},\qquad\text{(18)}
```

with real weights

<a id="eq-d1"></a>

<a id="eq-d2"></a>

```math
\begin{align}
d_1(\sigma,T) &\;:=\; |R|\,
\frac{\sin\!\bigl(\omega - \arg R + \arg\chi\bigr)}{\sin\!\bigl(2\omega + \arg\chi\bigr)},
\\[4pt]
d_2(\sigma,T) &\;:=\; |R|\,
\frac{\sin\!\bigl(\omega + \arg R\bigr)}{\sin\!\bigl(2\omega + \arg\chi\bigr)},
\end{align}\qquad\text{(20)}
```

where $`\arg R=\arg R(\sigma,T)`$, $`\arg\chi=\arg\chi(\sigma+iI(T))`$, and

<a id="autoeq-5"></a>

```math
\omega(T) \;:=\; I(T)\,\log\!\bigl(\lfloor T+1\rfloor\bigr).\qquad\text{(21)}
```

Geometrically, ω is the *absolute* direction angle, measured from the positive real axis, of the next summand of the first Dirichlet sum: with $`t=I(T)`$ and $`m=\lfloor T\rfloor`$, the summand $`n^{-s}=n^{-\sigma}e^{-it\ln n}`$ rotates by $`\theta_n=-t\ln\tfrac{n+1}{n}`$ relative to its predecessor, and these relative rotations telescope,

<a id="eq-omega-telescope"></a>

```math
\theta_1+\theta_2+\cdots+\theta_m
\;=\;
-t\ln\tfrac{2}{1}-t\ln\tfrac{3}{2}-\cdots-t\ln\tfrac{m+1}{m}
\;=\;
-t\ln(m+1)
\;=\;
-\omega,\qquad\text{(22)}
```

so the $`(m+1)`$st summand points along $`e^{-i\omega}`$.

Note: both *d₁* and *d₂* are real, for the reason given just below, and on the critical line they are always positive, which is Theorem [8.3](08-the-positive-real-function-d1-and-its-periodicit.md#thm-d1-positive-line) of §[8.5](08-the-positive-real-function-d1-and-its-periodicit.md#sec-d1-positive). Writing $`\psi=\arg\chi(\sigma+iI(T))`$, the definitions [(17)](#eq-R1ps-def)–[(18)](#eq-R2ps-def) express *R* as a combination of two fixed *unit* directions,

<a id="eq-R-as-cone"></a>

```math
R \;=\; d_1\,e^{-i\omega} \;+\; d_2\,e^{\,i(\omega+\psi)},\qquad\text{(23)}
```

namely the phases of the next summand of each Dirichlet sum. An alternative route to *d₁* and *d₂* would be to start from [(23)](#eq-R-as-cone) and require $`d_1,d_2\in\mathbb{R}`$: that makes it a $`2\times2`$ real linear system, its real and imaginary parts, whose solution by Cramer’s rule is exactly the pair of sine expressions [(19)](#eq-d1)–[(20)](#eq-d2), real by inspection. They are positive exactly when *R* lies in the cone spanned by the two directions $`e^{-i\omega}`$ and $`e^{i(\omega+\psi)}`$, so that both numerators carry the same sign as the common denominator $`\sin(2\omega+\psi)`$. On the critical line *R* never leaves the cone: there $`d_1=d_2`$ (Corollary [8.1](08-the-positive-real-function-d1-and-its-periodicit.md#cor-equal)) and the common value stays strictly inside the link, the normalized fraction $`\lceil T\rceil^{\sigma}d_1`$ sweeping $`{\approx}\,[0.23,\,0.78]`$ in every unit interval (§[8](08-the-positive-real-function-d1-and-its-periodicit.md#sec-d1-function)); we verify $`d_1=d_2>0`$ at every one of $`30{,}562`$ samples of a dense grid over $`1\le T\le30`$, including magnified windows around the near-parallel instants at fractional parts $`{\approx}\,\tfrac14,\tfrac34`$, and in unit windows at $`T=100`$, $`300`$, and $`1000`$ (`check_d1_positive_critical.py`).[^1] Off the critical line the weights are positive outside a narrow window around each pole of §[8.4](08-the-positive-real-function-d1-and-its-periodicit.md#sec-pole-locations); inside such a window *R* exits the cone and one of the two weights turns negative (Remark [14.3](14-further-observations.md#rem-d-ratio), where $`d_1=-d_2`$ exactly at a pole). That those windows have width $`O(1/T)`$ is Theorem [8.5](08-the-positive-real-function-d1-and-its-periodicit.md#thm-d1-positive-offline), in the same subsection. Geometrically, positivity is the statement that each fractional summand points *forward* along its partial sum, a positive fraction of the next term.

<a id="thm-decomp"></a>


**Theorem 4.1**. *For all σ and T,*

```math
R_{1ps} + R_{2ps} = R.
```

*Consequently,*

```math
\zeta = \Sigma_1 + R_{1ps} + \Sigma_2 + R_{2ps}.
```



*Proof.* Write $`\phi = \arg R`$, $`\psi = \arg\chi`$, and $`\omega=\omega(T)`$, so that $`R=|R|e^{i\phi}`$ and, for non-integer *T*, $`\lceil T\rceil^{\,iI(T)}=e^{i\omega}`$ and $`\chi/|\chi|=e^{i\psi}`$.

**Step 1 (substitute).** From [(17)](#eq-R1ps-def)–[(20)](#eq-d2),

```math
R_{1ps} = |R|\,\frac{\sin(\omega - \phi + \psi)}{\sin(2\omega + \psi)}\, e^{-i\omega},
\qquad
R_{2ps} = |R|\,\frac{\sin(\omega + \phi)}{\sin(2\omega + \psi)}\, e^{i\omega}\, e^{i\psi}.
```

**Step 2 (add).**

```math
R_{1ps} + R_{2ps}
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
R_{1ps} + R_{2ps}
= \frac{|R|}{\sin(2\omega + \psi)}\cdot e^{i\phi}\sin(2\omega + \psi)
= |R|e^{i\phi} = R.
```

**Integer *T*.** At integer *T* one has $`\lceil T\rceil^{\,iI(T)} = -e^{i\omega}`$, and the factor $`(-1)^{\lfloor T\rfloor}`$ in *R* shifts $`\phi=\arg R`$ by π. That π shift flips the signs of both sine terms in $`d_1,d_2`$, while the $`-1`$ contributes a further sign; the two sign flips cancel, so $`R = R_{1ps}+R_{2ps}`$ holds for all *T*. ◻


A formalization of the algebra of Theorem [4.1](#thm-decomp) in Lean is given in Appendix [A](a-lean-formalization-of-r-r1ps-r2ps.md#app-lean-decomp). It assumes no axioms of its own; the appendix records what its three hypotheses are and what is left outside its scope. Since $`R=R_{1ps}+R_{2ps}`$, we have in particular proved the exact formula

<a id="eq-zeta-ps"></a>

```math
\zeta(\sigma,T)
=
\Sigma_1 + R_{1ps} + R_{2ps} + \Sigma_2.\qquad\text{(24)}
```

Figure [1](#fig-remainder-average) is the theorem drawn: as *T* crosses a unit interval the two remainders trace their own paths in the plane, and the path of $`\tfrac12R`$ is the average of them, point by point, which is $`R_{1ps}+R_{2ps}=R`$ read as a midpoint.

<a id="fig-remainder-average"></a>

<p align="center"><img src="../figures/fig_remainder_average.png"></p>

**Figure 1:** $`R_{1ps}(\sigma,T)-1`$ (green, left), $`\tfrac12 R(\sigma,T)`$ (violet, middle), $`R_{2ps}(\sigma,T)+1`$ (red, right), for $`\sigma=\tfrac12`$ and $`2<T<3`$. The middle trajectory is the average of the left and right trajectories (the unit shifts cancel), since $`R_{1ps}+R_{2ps}=R`$. Generated by `fig_remainder_average.py`.

---

[^1]: Every script named in this paper, both the numerical checks and the ones that generate the figures, is in the directory `papers/my main paper/rewrite_v7/` of the Zest repository, <https://github.com/paul-stahura/zest>.

---

[← Contents](../README.md) · [← 3 The same formula, reparameterized: The I(…](03-the-same-formula-reparameterized-the-i-t-mapping.md) · [5 The remainders are “one more partial summ… →](05-the-remainders-are-one-more-partial-summand.md)
