import { rak } from "../src/shared/math/zakCalculator.ts";
function abs(z){return Math.hypot(z.re,z.im)}
const frac=0.30434, sigma=0.5;
const N1=3, base=abs(rak(sigma,N1+frac));
for (const N2 of [10,20,44,100,200]){
  const a=abs(rak(sigma,N2+frac));
  const pred = base * Math.pow((N1+1)/(N2+1), sigma);
  const predM = base * Math.pow((N1+0.5)/(N2+0.5), sigma);
  console.log({N2, actual:a/base, ceil:pred/base, Mhalf:predM/base, err_ceil:a/pred-1, err_M:a/predM-1});
}
console.log("--- σ=0.3 ---");
const s=0.3; const b=abs(rak(s,N1+frac));
for (const N2 of [10,20,44]){
  const a=abs(rak(s,N2+frac));
  const pred=b*Math.pow((N1+1)/(N2+1),s);
  console.log({N2, actual:a/b, ceil:pred/b, err:a/pred-1});
}
