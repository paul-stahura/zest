[← Contents](../README.md) · [← 4 Decomposing the remainder: R=R1+R2](04-decomposing-the-remainder-r-r1-r2.md) · [6 Periodicity in T →](06-periodicity-in-t.md)

---

<a id="sec-summand"></a>

## 5 The remainders are “one more partial summand”

Theorem [4.2](04-decomposing-the-remainder-r-r1-r2.md#thm-decomp) is more than an algebraic identity. Unlike Siegel’s integral *R*, which bears no resemblance to the terms of the Dirichlet sums, each of *R₁* and *R₂* is *exactly the next term* of its partial sum, scaled by a real number (positive in the sense of Proposition [4.1](04-decomposing-the-remainder-r-r1-r2.md#prop-weights)). We call such a term a *fractional summand*.

Concretely, the last term actually included in Σ₁ is the *m*-th term. For non-integer *T*, the very next term is the *M*-th, and *R₁* lies along its direction, scaled by a real signed coefficient; similarly for *R₂* along the next term of Σ₂. It is literally shortened only when the corresponding hatted coefficient lies in $`[0,1]`$. Table [1](#tab-frac) uses this non-integer convention.

<a id="tab-frac"></a>

|  | Last summand | Next summand |  | Fractional amount |  | Partial summand |
|:--:|:---|:---|:--:|:---|:--:|:---|
| *R₁* | $`m^{-s}`$ | $`M^{-s}`$ | $`\times`$ | $`\bigl(d_1\,M^{\sigma}=\hat d_1\bigr)`$ | $`=`$ | $`d_1\,M^{-it}`$ |
| *R₂* | $`\chi(s)\,m^{\,s-1}`$ | $`\chi(s)\,M^{\,s-1}`$ | $`\times`$ | $`\Bigl(d_2\,\dfrac{M^{\,1-\sigma}}{\|\chi(s)\|}=\hat d_2\Bigr)`$ | $`=`$ | $`d_2\,M^{\,it}\,\dfrac{\chi(s)}{\|\chi(s)\|}`$ |

**Table 1:** Each remainder is the *M*-th (“next”) summand of its Dirichlet sum, scaled by a real fractional amount; here $`s=\sigma+it`$ with $`t=I(T)`$, $`m=\lfloor T\rfloor`$, and $`M=\lceil T\rceil`$. The first column is the last summand actually included in the sum, shown for reference; the remaining columns display the identity (next summand) $`\times`$ (fractional amount) $`=`$ (partial summand), the fractional amount being exactly the hatted weight $`\hat d_1`$ or $`\hat d_2`$ of [(24)](#eq-frac-vs-weight), and the product simplifying to *R₁* and *R₂* respectively.

Reading [(22)](04-decomposing-the-remainder-r-r1-r2.md#eq-zeta-ps) in this light, the zeta function takes the clean “one more summand” form

<a id="eq-zeta-clean"></a>

```math
\boxed{\;
\zeta(s)=\sum_{n=1}^m n^{-s} + \hat d_1\,M^{-s}
        + \chi(s)\sum_{n=1}^m n^{s-1} + \hat d_2\,\chi(s)\,M^{s-1}
\;}\qquad\text{(23)}
```

with $`\hat d_1,\hat d_2`$ real numbers, positive on the critical line (and off it outside the pole windows of Proposition [4.1](04-decomposing-the-remainder-r-r1-r2.md#prop-weights)). In words: the two finite Dirichlet sums, each carried exactly one fractional term past its cutoff, together reproduce ζ with no other remainder term.

The coefficients here are the *fractional amounts* of Table [1](#tab-frac), not the weights $`d_1,d_2`$ of [(15)](04-decomposing-the-remainder-r-r1-r2.md#eq-R1-def)–[(16)](04-decomposing-the-remainder-r-r1-r2.md#eq-R2-def). The hat is what distinguishes them, and the two differ by the length of the summand they scale:

<a id="eq-frac-vs-weight"></a>

```math
\hat d_1=M^{\sigma}\,d_1,
\qquad
\hat d_2=\frac{M^{\,1-\sigma}}{|\chi|}\,d_2.\qquad\text{(24)}
```

The unhatted weights are signed coefficients satisfying $`|R_1|=|d_1|`$ and $`|R_2|=|d_2|`$. The hatted quantities are signed normalized coefficients; they are literal fractions of their summands only where $`0\leq\hat d_i\leq1`$. At $`\sigma=\tfrac12`$, $`T=6.18`$ for instance, $`d_1=0.0875`$ while $`\hat d_1=\sqrt7\,d_1=0.2315`$.

---

[← Contents](../README.md) · [← 4 Decomposing the remainder: R=R1+R2](04-decomposing-the-remainder-r-r1-r2.md) · [6 Periodicity in T →](06-periodicity-in-t.md)
