[← Contents](../README.md) · [← Acknowledgments](acknowledgments.md) · [B Lean formalization of the critical line:… →](b-lean-formalization-of-the-critical-line-d1-d2-r1.md)

---

<a id="app-lean-decomp"></a>

## A Lean formalization of $`R=R_{1ps}+R_{2ps}`$

<details>
<summary><b>Click to expand the Lean appendix</b></summary>


This appendix reproduces the Lean file formalizing the algebraic content of Theorem [4.1](04-decomposing-the-remainder-r-r1ps-r2ps.md#thm-decomp). The file contains no `axiom` and no `sorry`: every step is proved, and the only axioms the final theorem depends on are Lean’s own three (`propext`, `Classical.choice`, `Quot.sound`), as reported by `#print axioms`. It was checked against Lean 4.32.2 with Mathlib at commit `905b95818e`. The Lean code was written with the assistance of AI coding assistants (Anthropic’s Claude).

<a id="correspondence-with-the-written-proof"></a>

### A.1 Correspondence with the written proof

The file follows the proof of Theorem [4.1](04-decomposing-the-remainder-r-r1ps-r2ps.md#thm-decomp) step for step. The definitions `d_j1` and `d_j2` are the sine weights [(19)](04-decomposing-the-remainder-r-r1ps-r2ps.md#eq-d1)–[(20)](04-decomposing-the-remainder-r-r1ps-r2ps.md#eq-d2), and `R_1ps` and `R_2ps` are Step 1, transcribed from [(17)](04-decomposing-the-remainder-r-r1ps-r2ps.md#eq-R1ps-def)–[(18)](04-decomposing-the-remainder-r-r1ps-r2ps.md#eq-R2ps-def) in the $`\lceil T\rceil^{\mp iI(T)}`$ form rather than the $`e^{\mp i\omega}`$ form. Two small bridges convert them: `ceil_cpow` proves $`\lceil T\rceil^{\,ir}=e^{\,ir\log\lceil T\rceil}`$ for $`T>0`$, which with $`\omega(T)=I(T)\log\lceil T\rceil`$ (the definition `omg`) is exactly $`\lceil T\rceil^{\,iI(T)}=e^{i\omega}`$; and `div_norm_eq_exp_arg` proves $`z/|z|=e^{i\arg z}`$ for $`z\neq0`$, applied to χ to give $`\chi/|\chi|=e^{i\psi}`$. Then `factoring_lemma` is the regrouping of Step 2, pulling out the common factor $`|R|/\sin(2\omega+\psi)`$, and `key_algebraic_identity` is the content of Steps 3–5, namely

<a id="eq-lean-key"></a>

```math
e^{-i\omega}\sin(\omega-\phi+\psi)+e^{\,i(\omega+\psi)}\sin(\omega+\phi)
\;=\;
e^{\,i\phi}\sin(2\omega+\psi);\qquad\text{(225)}
```

it is proved by writing each sine as $`(e^{i\theta}-e^{-i\theta})/2i`$ (`sin_to_exp`, itself proved from Mathlib’s $`e^{i\theta}=\cos\theta+i\sin\theta`$), clearing the denominator, merging the resulting products of exponentials into single exponentials, and letting `ring_nf` cancel the two copies of $`e^{\,i(\psi-\phi)}`$. The closing lines are Step 6: cancel $`\sin(2\omega+\psi)`$ and recognize $`|R|e^{i\phi}=R`$, which is Mathlib’s `Complex.norm_mul_exp_arg_mul_I`.

<a id="what-is-proved-and-what-is-hypothesized"></a>

### A.2 What is proved and what is hypothesized

The theorem `R_1ps_plus_R_2ps_eq_R` carries three hypotheses. Two are needed for the objects to exist at all: $`\chi(\sigma+iI(T))\neq0`$, without which $`\chi/|\chi|`$ is meaningless, and $`\sin(2\omega+\psi)\neq0`$, without which *d₁* and *d₂* of [(19)](04-decomposing-the-remainder-r-r1ps-r2ps.md#eq-d1)–[(20)](04-decomposing-the-remainder-r-r1ps-r2ps.md#eq-d2) are undefined. The third, $`T>0`$, makes $`\lceil T\rceil`$ a positive base, so that its complex power can be written as an exponential. Nothing is assumed about whether *T* is an integer.

One convention has to be read carefully. Steps 2–6, that is `factoring_lemma` and `key_algebraic_identity`, hold for arbitrary real $`\omega,\phi,\psi`$ and make no reference to *T*; the only *T*-dependent ingredient is the bridge `ceil_cpow`, which holds for every $`T>0`$ with ω defined as $`I(T)\log\lceil T\rceil`$. That is the paper’s ω whenever *T* is not an integer, since then $`\lceil T\rceil=\lfloor T+1\rfloor`$. At integer *T* the two part company, and the sign bookkeeping in the last paragraph of the proof of Theorem [4.1](04-decomposing-the-remainder-r-r1ps-r2ps.md#thm-decomp) turns on the factor $`(-1)^{\lfloor T\rfloor}`$ sitting inside Siegel’s *R*; that factor is invisible here, because *R* enters as a free complex parameter, so what the file proves at integer *T* is the same identity read with $`\lceil T\rceil`$ throughout.

What remains outside the formalization is not algebra but analysis. The functional-equation factor χ, the index map *I*, and Siegel’s remainder *R* enter as free parameters, so what is machine-checked is that any *R* written in polar form splits as $`R_{1ps}+R_{2ps}`$ with the weights [(19)](04-decomposing-the-remainder-r-r1ps-r2ps.md#eq-d1)–[(20)](04-decomposing-the-remainder-r-r1ps-r2ps.md#eq-d2), which is exactly Steps 1–6. That *R* is Siegel’s remainder, and that *I* is the map of §[10.1](10-i-t-functions.md#sec-IT-origin), are inputs to the theorem rather than consequences of it.

<a id="source-listing"></a>

### A.3 Source listing

```
```

<a id="app-lean-critical"></a>

</details>

---

[← Contents](../README.md) · [← Acknowledgments](acknowledgments.md) · [B Lean formalization of the critical line:… →](b-lean-formalization-of-the-critical-line-d1-d2-r1.md)
