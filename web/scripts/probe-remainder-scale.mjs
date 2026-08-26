import { calcRps1, calcRak1, calcRHalf } from "../src/shared/math/sumRemainders.ts";
import { rak } from "../src/shared/math/zakCalculator.ts";
import { indexToImag } from "../src/shared/math/zetaEms.ts";

function abs(z){ return Math.hypot(z.re,z.im); }
function arg(z){ return Math.atan2(z.im,z.re); }
function angDiff(a,b){
  let d=a-b; while(d>Math.PI)d-=2*Math.PI; while(d<-Math.PI)d+=2*Math.PI; return d;
}

function pack(sigma,T){
  const R=rak(sigma,T);
  const rps=calcRps1(sigma,T);
  const rak1=calcRak1(sigma,T);
  const rh=calcRHalf(sigma,T);
  // relative angles in R-frame: rotate so R is on +x
  const aR=arg(R);
  const rot=(z)=>{
    const c=Math.cos(-aR), s=Math.sin(-aR);
    return { re: z.re*c - z.im*s, im: z.re*s + z.im*c };
  };
  return {
    absR: abs(R), absRps: abs(rps), absRak: abs(rak1), absRh: abs(rh),
    rR: rot(R), rRps: rot(rps), rRak: rot(rak1), rRh: rot(rh),
    t: indexToImag(T,false),
  };
}

const frac=0.30434;
const sigma=0.5;
const Ns=[3,10,20,44];
console.log("=== fixed σ, same {T}, vary N ===");
for (const N of Ns){
  const T=N+frac;
  const p=pack(sigma,T);
  console.log({N,T, absR:p.absR, absRps:p.absRps, absRak:p.absRak, absRh:p.absRh,
    // relative args of heads in R-frame
    argRps: arg(p.rRps), argRak: arg(p.rRak), argRh: arg(p.rRh),
    // length ratios
    rps_over_R: p.absRps/p.absR, rak_over_R: p.absRak/p.absR, rh_over_R: p.absRh/p.absR,
  });
}

console.log("\n=== scale ratios vs N=3 baseline ===");
const base=pack(sigma,3+frac);
for (const N of [10,20,44]){
  const p=pack(sigma,N+frac);
  const sR=p.absR/base.absR;
  const sRps=p.absRps/base.absRps;
  const sRak=p.absRak/base.absRak;
  const t1=base.t, t2=p.t;
  const N1=3, N2=N;
  // candidate analytic scales
  const cand = {
    N_pow: Math.pow(N2/N1, 0.5-sigma),
    N_pow_m: Math.pow((N2+1)/(N1+1), 0.5-sigma),
    N_pow_frac: Math.pow((N2+frac)/(N1+frac), 0.5-sigma),
    sqrtN: Math.sqrt(N2/N1),
    t_ratio: t2/t1,
    // Riemann-Siegel style ~ (t/2π)^{1/2(1/2-σ)} * ... rough
    rs: Math.pow(t2/t1, (0.5-sigma)/2) * Math.pow((N2+1)/(N1+1), 0), 
  };
  console.log({N, sR, sRps, sRak, 
    ratio_sRps_sR: sRps/sR, ratio_sRak_sR: sRak/sR,
    cand});
}

console.log("\n=== fixed T, vary σ ===");
const T=3+frac;
for (const s of [0.3,0.4,0.5,0.6,0.7]){
  const p=pack(s,T);
  console.log({s, absR:p.absR, rps_over_R:p.absRps/p.absR, rak_over_R:p.absRak/p.absR,
    argRps:arg(p.rRps), argRak:arg(p.rRak)});
}
