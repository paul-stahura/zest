import { rak } from "../src/shared/math/zakCalculator.ts";
import { calcRps1, calcRak1, calcRHalf } from "../src/shared/math/sumRemainders.ts";

function abs(z){return Math.hypot(z.re,z.im)}

function kappaR(sigma,T){ return abs(rak(sigma,T)) * Math.pow(Math.ceil(T), sigma); }
function kappaRps(sigma,T){ return abs(calcRps1(sigma,T)) * Math.pow(Math.ceil(T), sigma); }

const frac=0.30434;
for (const sigma of [0.5, 0.3, 0.7]) {
  console.log("\nσ=", sigma);
  const rows=[];
  for (const N of [3,4,5,7,10,15,20,30,44,70,100,200,500,1000]) {
    const T=N+frac;
    rows.push({
      N,
      kR: kappaR(sigma,T),
      kRps: kappaRps(sigma,T),
      kRh: abs(calcRHalf(sigma,T))*Math.pow(N+1,sigma),
      kRak: abs(calcRak1(sigma,T))*Math.pow(N+1,sigma),
    });
  }
  console.table(rows);
  // predict with κ∞ ≈ last row, and with κ(N)=κ∞(1+c/(N+1)^2) fit from N=100 and N=1000
  const kInf = rows[rows.length-1].kR;
  const k100 = rows.find(r=>r.N===100).kR;
  // k100 = kInf (1 + c/101^2) => c = (k100/kInf - 1)*101^2
  const c = (k100 / kInf - 1) * 101 * 101;
  console.log("κ∞≈", kInf, "c≈", c);
  const N1=3, k1=rows[0].kR, a1=abs(rak(sigma,N1+frac));
  for (const N2 of [10,44,200,1000]) {
    const act = abs(rak(sigma,N2+frac))/a1;
    const ceil = Math.pow((N1+1)/(N2+1), sigma);
    const k2 = kInf * (1 + c / ((N2+1)**2));
    const k1p = kInf * (1 + c / ((N1+1)**2));
    const pred = ceil * (k2 / k1p);
    const predExactK = ceil * (rows.find(r=>r.N===N2).kR / k1);
    console.log(N2, { err_ceil: ceil/act-1, err_kfit: pred/act-1, err_exactKsplit: predExactK/act-1 });
  }
}
