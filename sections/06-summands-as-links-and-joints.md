[← Contents](../README.md) · [← 5 The remainders are “one more partial summ…](05-the-remainders-are-one-more-partial-summand.md) · [7 Other remainders →](07-other-remainders.md)

---

<a id="sec-matrix-product"></a>

## 6 Summands as links and joints

Equation [(24)](04-decomposing-the-remainder-r-r1ps-r2ps.md#eq-zeta-ps) presents ζ as the sum of the four terms $`\Sigma_1+R_{1ps}+\Sigma_2+R_{2ps}`$, two of which are partial sums. Read geometrically, each summand of a partial sum is one *link* of a planar chain, and each remainder $`R_{1ps},R_{2ps}`$ is one additional *fractional* link. One can think of $`\hat d_1`$ (and likewise $`\hat d_2`$) as the percentage of the way along that additional link at which the chain stops: the link taken at its full length would be the whole $`(m+1)`$st summand, and $`R_{1ps}`$ is that fraction $`\hat d_1`$ of it. Write $`s=\sigma+iI(T)`$, $`t=I(T)`$, $`m=\lfloor T\rfloor`$, and $`\omega=t\ln(m+1)`$, and denote two complex numbers by

<a id="autoeq-6"></a>

```math
B_1=\Sigma_1+R_{1ps},\qquad B_2=\Sigma_2+R_{2ps},\qquad \zeta=B_1+B_2 .\qquad\text{(27)}
```

Each remainder is a single extra link appended to its partial sum, pointing in the direction of the $`(m+1)`$-th summand with a real length *d₁* or *d₂* (the fractional summands of §[5](05-the-remainders-are-one-more-partial-summand.md#sec-summand)):

<a id="eq-R-phasors"></a>

```math
R_{1ps}=d_1\,\lceil T\rceil^{-iI(T)}=d_1\,e^{-i\omega},\qquad
R_{2ps}=d_2\,\lceil T\rceil^{\,iI(T)}\,\frac{\chi}{|\chi|}=d_2\,e^{\,i(\omega+\arg\chi)},\qquad\text{(28)}
```

with $`d_1,d_2`$ as in [(19)](04-decomposing-the-remainder-r-r1ps-r2ps.md#eq-d1)–[(20)](04-decomposing-the-remainder-r-r1ps-r2ps.md#eq-d2). The first equality in each is the definition [(17)](04-decomposing-the-remainder-r-r1ps-r2ps.md#eq-R1ps-def)–[(18)](04-decomposing-the-remainder-r-r1ps-r2ps.md#eq-R2ps-def); the second uses that, for non-integer *T*, $`\lceil T\rceil=\lfloor T+1\rfloor`$, so $`\lceil T\rceil^{\pm iI(T)}=e^{\pm iI(T)\log\lceil T\rceil}=e^{\pm i\omega}`$ by the definition $`\omega=I(T)\log\lfloor T+1\rfloor`$, together with $`\chi/|\chi|=e^{\,i\arg\chi}`$.

<a id="sec-sum-form"></a>

### 6.1 Sum form

Splitting ζ into its partial sum plus this last fractional link,

<a id="eq-B1-sum"></a>

<a id="eq-B2-sum"></a>

```math
\begin{alignat}
{2}
B_1 &= \sum_{n=1}^m n^{-s}    &&{}+ d_1\,e^{-i\omega}, \\
B_2 &= \chi(s)\sum_{n=1}^m n^{\,s-1}           &&{}+ d_2\,e^{\,i(\omega+\arg\chi)}. \end{alignat}\qquad\text{(30)}
```

<a id="componentwise-"></a>

##### Componentwise.

Writing out real and imaginary parts,

```math
\begin{align}
\Re B_1 &= \sum_{n=1}^m\frac{\cos(t\ln n)}{n^{\sigma}} + d_1\cos\bigl(t\ln(m+1)\bigr),\\
\Im B_1 &= -\sum_{n=1}^m\frac{\sin(t\ln n)}{n^{\sigma}} - d_1\sin\bigl(t\ln(m+1)\bigr),\\
\Re B_2 &= \sum_{n=1}^m\frac{|\chi|\cos(\arg\chi+t\ln n)}{n^{\,1-\sigma}} + d_2\cos\bigl(\arg\chi+t\ln(m+1)\bigr),\\
\Im B_2 &= \sum_{n=1}^m\frac{|\chi|\sin(\arg\chi+t\ln n)}{n^{\,1-\sigma}} + d_2\sin\bigl(\arg\chi+t\ln(m+1)\bigr).
\end{align}
```

<a id="sec-product-form"></a>

### 6.2 Product form

This subsection is a tangent, and a reader in a hurry can skip to §[7](07-other-remainders.md#sec-other-remainders): nothing later rests on the matrix form, which is motivated by an analogy with multi-jointed planar robot manipulators. The one thing carried forward is the numbering of links and joints fixed in the next paragraph, which the rest of the paper uses throughout.

The goal of this subsection is to write each link as a homogeneous coordinate transformation matrix, and then to group the links into a single transformation matrix, so that ζ takes the form of a matrix product with four components: the two sums $`\Sigma_1,\Sigma_2`$ and the two partial-summand remainders $`R_{1ps},R_{2ps}`$.

Each summand is a link in the plane. We number the links of each chain from zero: link *n* runs from joint *n* to joint $`n+1`$ (joint *n* being the value of the partial sum after *n* summands), so link *n* represents the $`(n+1)`$st summand. The *m* summands of a partial sum are thus links $`0,\dots,m-1`$, and each remainder is the *fractional link* *m*. We encode one link by the $`3\times3`$ matrix with link length *l* and rotation θ from the previous link,[^2]

<a id="eq-link-matrix"></a>

```math
M(\theta,l)= \left(\begin{array}{lll}
\cos \theta & -\sin \theta           & l\cos \theta\\
\sin \theta & \cos \theta & l\sin \theta\\
0 & 0 & 1
\end{array}\right),\qquad\text{(35)}
```

where the accumulated position is the top two entries of the last column. The link matrix rotates by θ and then translates forward *l* along the new heading. Its inverse is again a link-shaped matrix, of a second type that translates *back* *l* along the current heading and then undoes the rotation:

<a id="eq-link-matrix-2"></a>

```math
M(\theta,l)^{-1}=
\begin{pmatrix}
\cos\theta & \sin\theta & -l\\
-\sin\theta & \cos\theta & 0\\
0 & 0 & 1
\end{pmatrix}.\qquad\text{(36)}
```

Forward links build chain 1; inverses are what let chain 2 be walked backwards.

*Chain 1.* Collect the *m* summand links of Σ₁ into a single product and give the fractional link its own name:

<a id="eq-P1-TR1-defs"></a>

```math
P_{\Sigma_1}=\prod_{n=0}^{m-1}M\bigl(\theta_n,\,(n+1)^{-\sigma}\bigr),
\qquad
M_{R_{1ps}}=M\bigl(-t\ln\tfrac{m+1}{m},\,d_1\bigr),\qquad\text{(37)}
```

where link *n* carries the two parameters $`\theta_n`$, its rotation from the previous link, and $`l_n=(n+1)^{-\sigma}`$, its length: as in [(22)](04-decomposing-the-remainder-r-r1ps-r2ps.md#eq-omega-telescope), $`\theta_0=0`$ and $`\theta_n=-t\ln\tfrac{n+1}{n}`$ for $`n\ge1`$. Written out, with the first two factors and the last two shown, the chain that reaches *B₁* is

<a id="eq-P1-written"></a>

```math
P_{\Sigma_1}M_{R_{1ps}}=
\underbrace{\left(\begin{array}{ccc}
1 & 0 & 1\\
0 & 1 & 0\\
0 & 0 & 1
\end{array}\right)}_{\text{link }0}
\underbrace{ \left(\begin{array}{lll}
\cos \theta_1 & -\sin \theta_1           & \frac{\cos \theta_1}{2^{\sigma}}\\[1pt]
\sin \theta_1 & \cos \theta_1 & \frac{\sin \theta_1}{2^{\sigma}}\\[1pt]
0 & 0 & 1
\end{array}\right)}_{\text{link }1}\;\cdots\;
\underbrace{ \left(\begin{array}{lll}
\cos \theta_{m-1} & -\sin \theta_{m-1}           & \frac{\cos \theta_{m-1}}{m^{\sigma}}\\[1pt]
\sin \theta_{m-1} & \cos \theta_{m-1} & \frac{\sin \theta_{m-1}}{m^{\sigma}}\\[1pt]
0 & 0 & 1
\end{array}\right)}_{\text{link }m-1}
\underbrace{ \left(\begin{array}{lll}
\cos \theta_m & -\sin \theta_m           & d_1\cos \theta_m\\
\sin \theta_m & \cos \theta_m & d_1\sin \theta_m\\
0 & 0 & 1
\end{array}\right)}_{\text{fractional link }m},\qquad\text{(38)}
```

the leading factor being the unit step $`1^{-s}=1`$ along the real axis, where $`\theta_0=0`$ and $`l_0=1`$ collapse [(35)](#eq-link-matrix) to a pure translation, and the trailing factor being $`M_{R_{1ps}}`$, whose rotation $`\theta_m=-t\ln\tfrac{m+1}{m}`$ continues the same pattern while its length is *d₁* rather than a power of $`m+1`$. The product carries the frame from the origin to the bisector point $`B_1=\Sigma_1+R_{1ps}`$, whose coordinates are the top two entries of the last column, and it arrives with accumulated rotation $`-t\ln(m+1)=-\omega`$ by the telescoping [(22)](04-decomposing-the-remainder-r-r1ps-r2ps.md#eq-omega-telescope).

*Chain 2.* The second chain is traversed tip-first, exactly as Figure [2](05-the-remainders-are-one-more-partial-summand.md#fig-spiral-summands) draws leg 2: the fractional link $`R_{2ps}`$ leaves *B₁*, and the summand links follow in descending order. Walking a link backwards is exactly its inverse [(36)](#eq-link-matrix-2); regrouping each rotation with the backward translation that follows it returns everything to the forward type [(35)](#eq-link-matrix), with negated parameters and each rotation paired with the preceding link’s length. Two bookkeeping factors appear at the ends of the backward walk: a leading pure translation $`M(0,-d_2)`$, and a trailing pure rotation $`M(-\arg\chi,0)`$, the functional-equation factor χ peeled off on its own. The leading translation absorbs the zero-length joint $`M(2\omega+\arg\chi+\pi,\,0)`$ that must sit between the two chains (a rotation followed by a translation is a single link), defining the backward fractional link

<a id="eq-TR2-def"></a>

```math
M_{R_{2ps}}
\;:=\;
M\bigl(2\omega+\arg\chi+\pi,\,0\bigr)\,M(0,\,-d_2)
\;=\;
M\bigl(2\omega+\arg\chi+\pi,\;-d_2\bigr);\qquad\text{(39)}
```

the backward summand links collect into

<a id="eq-P2-def"></a>

```math
P_{\Sigma_2}
\;:=\;
\prod_{n=m}^1M\bigl(\theta_n,\;-|\chi|\,n^{\sigma-1}\bigr)
\quad\text{(}n\text{ descending, }\theta_n=-t\ln\tfrac{n+1}{n}\text{)};\qquad\text{(40)}
```

and the trailing rotation is simply dropped, since a post-multiplied zero-length joint never moves the position column, only the final orientation.

Written out as [(38)](#eq-P1-written) was, with the first two factors and the last two shown and with $`\psi=\arg\chi`$ as before, the second chain is

<a id="eq-P2-written"></a>

```math
\begin{aligned}
M_{R_{2ps}}P_{\Sigma_2}
&=\underbrace{ \left(\begin{array}{lll}
\cos (2\omega+\psi+\pi) & -\sin (2\omega+\psi+\pi)           & -d_2\cos (2\omega+\psi+\pi)\\
\sin (2\omega+\psi+\pi) & \cos (2\omega+\psi+\pi) & -d_2\sin (2\omega+\psi+\pi)\\
0 & 0 & 1
\end{array}\right)}_{\text{fractional link }m}
\underbrace{ \left(\begin{array}{lll}
\cos \theta_m & -\sin \theta_m           & -\frac{|\chi|\cos \theta_m}{m^{1-\sigma}}\\[1pt]
\sin \theta_m & \cos \theta_m & -\frac{|\chi|\sin \theta_m}{m^{1-\sigma}}\\[1pt]
0 & 0 & 1
\end{array}\right)}_{\text{link }m-1}\;\cdots\\[3pt]
&\cdots\;
\underbrace{ \left(\begin{array}{lll}
\cos \theta_2 & -\sin \theta_2           & -\frac{|\chi|\cos \theta_2}{2^{1-\sigma}}\\[1pt]
\sin \theta_2 & \cos \theta_2 & -\frac{|\chi|\sin \theta_2}{2^{1-\sigma}}\\[1pt]
0 & 0 & 1
\end{array}\right)}_{\text{link }1}
\underbrace{ \left(\begin{array}{lll}
\cos \theta_1 & -\sin \theta_1           & -|\chi|\cos \theta_1\\
\sin \theta_1 & \cos \theta_1 & -|\chi|\sin \theta_1\\
0 & 0 & 1
\end{array}\right)}_{\text{link }0},
\end{aligned}\qquad\text{(41)}
```

the leading rotation being the merged joint of [(39)](#eq-TR2-def). The links run backwards, from the fractional link *m* down to link $`0`$, each brace naming the link whose length that factor carries; the rotation it carries is the $`\theta_n`$ of the link after it, which is the regrouping. Its last column is not *B₂* but $`e^{i\omega}B_2`$, leg 2 read in the frame chain 1 leaves behind, whose orientation is $`-\omega`$; multiplying on the left by $`P_{\Sigma_1}M_{R_{1ps}}`$ turns that back onto world axes and adds *B₁*, which is [(42)](#eq-zeta-serial). All three columns agree to $`28`$ digits at $`\sigma=\tfrac12`$, $`T=6.18`$ (`check_chain2_matrix.py`).

<a id="the-full-3times3-equation-for-zeta-"></a>

##### The full $`3\times3`$ equation for ζ.

With these four names the two chains combine into one serial product, in a single link type:

<a id="eq-zeta-serial"></a>

```math
Z \;=\; P_{\Sigma_1}\,M_{R_{1ps}}\,M_{R_{2ps}}\,P_{\Sigma_2}
\;=\;
\begin{pmatrix}
\cos\alpha_{\zeta} & -\sin\alpha_{\zeta} & \Re\,\zeta\\
\sin\alpha_{\zeta} & \cos\alpha_{\zeta} & \Im\,\zeta\\
0 & 0 & 1
\end{pmatrix},
\qquad \alpha_{\zeta}=\pi+\arg\chi.\qquad\text{(42)}
```

The last column is ζ and the rotation block records $`\alpha_{\zeta}`$, discussed below. The factors line up one to one with the terms of [(24)](04-decomposing-the-remainder-r-r1ps-r2ps.md#eq-zeta-ps), repeated here for comparison:

```math
\zeta(\sigma,T)
=
\Sigma_1 + R_{1ps} + R_{2ps} + \Sigma_2.\qquad\text{(24)}
```

Figure [4](#fig-zeta-chain) draws [(42)](#eq-zeta-serial) with one arrow per factor.

<a id="fig-zeta-chain"></a>

<p align="center"><img src="../figures/fig_zeta_chain.png"></p>

**Figure 4:** The serial chain of [(42)](#eq-zeta-serial) at $`\sigma=\tfrac12`$, $`T=6.18`$ ($`t=I(T)\approx279.85`$, $`m=6`$), one arrow for the net displacement of each matrix factor: $`P_{\Sigma_1}`$ (blue, *O* to Σ₁), $`M_{R_{1ps}}`$ (red, to *B₁*), $`M_{R_{2ps}}`$ (orange, to $`B_1+R_{2ps}`$; its rotation parameter carries the merged joint $`2\omega+\arg\chi+\pi`$), and $`P_{\Sigma_2}`$ (green, to ζ). The four arrows are the four terms of $`\zeta=\Sigma_1+R_{1ps}+R_{2ps}+\Sigma_2`$; the two fractional links are short here ($`d_1=d_2\approx0.087`$), so the inset zooms in on them. Colors match Figure [2](05-the-remainders-are-one-more-partial-summand.md#fig-spiral-summands). Generated by `fig_zeta_chain.py`.

Three features of [(42)](#eq-zeta-serial) deserve comment. First, the rotation $`2\omega+\arg\chi+\pi`$ carried by $`M_{R_{2ps}}`$ has three jobs at once: $`+\omega`$ cancels chain 1’s accumulated rotation $`-t\ln(m+1)=-\omega`$, a further $`+(\omega+\arg\chi)`$ pre-rotates against the counter-rotation of the backward-walked chain 2, and the final $`+\pi`$ rotates the backward translations to point forward again; together $`\omega+(\omega+\arg\chi)+\pi=2\omega+\arg\chi+\pi`$. Second, the links of $`P_{\Sigma_2}`$ carry chain 1’s very rotation parameters $`\theta_n`$: in this form the two chains use identical rotations and differ only in their lengths, $`(n+1)^{-\sigma}`$ forward versus $`-|\chi|\,n^{\sigma-1}`$ backward. Third, the net displacements of the four factors $`P_{\Sigma_1}`$, $`M_{R_{1ps}}`$, $`M_{R_{2ps}}`$, $`P_{\Sigma_2}`$ are exactly the four terms Σ₁, $`R_{1ps}=d_1e^{-i\omega}`$, $`R_{2ps}=d_2e^{\,i(\omega+\arg\chi)}`$, Σ₂ of [(24)](04-decomposing-the-remainder-r-r1ps-r2ps.md#eq-zeta-ps), and the final orientation $`\alpha_{\zeta}=\pi+\arg\chi`$ is the direction of $`-\chi/|\chi|`$: the trailing rotation $`M(-\arg\chi,0)`$ (the functional-equation factor χ, peeled off automatically when the base link of chain 2 is regrouped) was discarded, so χ’s direction is left showing in the orientation block, and *Z* packages the pair $`(\zeta,\arg\chi)`$ in one matrix. (Appending the discarded $`M(-\arg\chi,0)`$ would leave the position column untouched and make the orientation the constant π.)

---

[^2]: This is the planar case of the Denavit–Hartenberg convention of robot kinematics \[7\], in which each link of a serial chain is encoded by the $`4\times4`$ homogeneous transformation $`\mathrm{Rot}_z(\theta_i)\,\mathrm{Trans}_z(d_i)\,\mathrm{Trans}_x(a_i)\,
    \mathrm{Rot}_x(\alpha_i)`$ built from four parameters: the joint angle $`\theta_i`$, the joint offset $`d_i`$, the link length $`a_i`$ and the link twist $`\alpha_i`$. A planar chain has $`d_i=\alpha_i=0`$, which leaves the two parameters $`(\theta_i,a_i)`$ and the $`3\times3`$ matrix [(35)](#eq-link-matrix); [(42)](#eq-zeta-serial) is then the forward-kinematic product of the chain. One collision of names to watch: the Denavit–Hartenberg offset $`d_i`$ has nothing to do with the weights $`d_1,d_2`$ of [(19)](04-decomposing-the-remainder-r-r1ps-r2ps.md#eq-d1)–[(20)](04-decomposing-the-remainder-r-r1ps-r2ps.md#eq-d2).

---

[← Contents](../README.md) · [← 5 The remainders are “one more partial summ…](05-the-remainders-are-one-more-partial-summand.md) · [7 Other remainders →](07-other-remainders.md)
