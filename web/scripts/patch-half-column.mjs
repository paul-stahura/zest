import { readFileSync, writeFileSync } from "node:fs";
import {
  calcForwardSum, calcInverseSum, calcRps1, calcRps2, calcRak1, calcRak2, calcRHalf,
} from "../src/shared/math/sumRemainders.ts";

const STEM = new URL("../../papers/my main paper/rewrite_v7/leg_equality_strip_0_20", import.meta.url);
const N_T = 2000, N_SIGMA = 10000, T_MAX = 20, EPS = 1e-18;
function abs(re,im){return Math.hypot(re,im)}
function pairDelta(a,b){return Math.abs(a-b)/(a+b+EPS)}
function probe(sigma,T){
  const Tc=Math.max(T,1e-4);
  const sum1=calcForwardSum(sigma,Tc), sum2=calcInverseSum(sigma,Tc);
  const rps1=calcRps1(sigma,Tc), rps2=calcRps2(sigma,Tc);
  const rak1=calcRak1(sigma,Tc), rak2=calcRak2(sigma,Tc);
  const rh=calcRHalf(sigma,Tc);
  const dPs=pairDelta(abs(sum1.re+rps1.re,sum1.im+rps1.im), abs(sum2.re+rps2.re,sum2.im+rps2.im));
  const dRh=pairDelta(abs(sum1.re+rh.re,sum1.im+rh.im), abs(sum2.re+rh.re,sum2.im+rh.im));
  const dAk=pairDelta(abs(sum1.re+rak1.re,sum1.im+rak1.im), abs(sum2.re+rak2.re,sum2.im+rak2.im));
  return (dPs+dRh+dAk)/3;
}
const buf = readFileSync(new URL("leg_equality_strip_0_20_meand.bin", STEM.href + "/../"));
const meanDs = new Float64Array(buf.buffer, buf.byteOffset, buf.byteLength/8);
const sigmas = new Float64Array(N_SIGMA);
for (let i=0;i<N_SIGMA;i++) sigmas[i]=i/(N_SIGMA-1);
// insert exact 1/2 at nearest index
let iHalf = 0; let best=1;
for (let i=0;i<N_SIGMA;i++){ const d=Math.abs(sigmas[i]-0.5); if(d<best){best=d;iHalf=i;} }
sigmas[iHalf]=0.5;
for (let j=0;j<N_T;j++){
  const T=(j/(N_T-1))*T_MAX;
  meanDs[j*N_SIGMA+iHalf]=probe(0.5,T);
}
writeFileSync(new URL("leg_equality_strip_0_20_meand.bin", STEM.href + "/../"), Buffer.from(meanDs.buffer));
writeFileSync(new URL("leg_equality_strip_0_20_sigma.bin", STEM.href + "/../"), Buffer.from(sigmas.buffer));
console.log("patched σ column", iHalf, "was", best, "now 0.5; median δ", (()=>{
  const col=[]; for(let j=0;j<N_T;j++) col.push(meanDs[j*N_SIGMA+iHalf]);
  col.sort((a,b)=>a-b); return col[(col.length/2)|0];
})());
