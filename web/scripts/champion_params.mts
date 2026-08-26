import * as fs from "node:fs";
import { indexToImag } from "../src/shared/math/zetaEms";
import { calcRps1, calcRak1, calcForwardSum } from "../src/shared/math/sumRemainders";
import { rak } from "../src/shared/math/zakCalculator";
import { complexAbs, complexArg } from "../src/shared/math/complex";

const sigma = 0.5;
const txt = fs.readFileSync(
  "/Users/paul/Documents/zest/web/public/critical-strip-points/champions_149_with_precise_T.csv", "utf8");
const champs = txt.split("\n")
  .filter((l) => !l.startsWith("#") && l.includes(","))
  .map((l) => parseFloat(l.split(",")[1]!))
  .filter((v) => v >= 10)
  .sort((a, b) => a - b);

const rows = ["T,t,N,dir_last,dir_next,R1ps_len,R1ps_arg,R1ak_len,R1ak_arg,zeta_abs,zeta_arg"];
for (const T of champs) {
  const t = indexToImag(T, false);
  const N = Math.floor(T);
  const dirLast = -t * Math.log(N);
  const dirNext = -t * Math.log(N + 1);
  const r1ps = calcRps1(sigma, T);
  const r1ak = calcRak1(sigma, T);
  const fsum = calcForwardSum(sigma, T);
  const R = rak(sigma, T);
  const zeta = { re: fsum.re + R.re, im: fsum.im + R.im };
  rows.push([
    T, t, N, dirLast, dirNext,
    complexAbs(r1ps), complexArg(r1ps),
    complexAbs(r1ak), complexArg(r1ak),
    complexAbs(zeta), complexArg(zeta),
  ].map((x) => x.toString()).join(","));
}
fs.writeFileSync("/Users/paul/Downloads/champion_params.csv", rows.join("\n"));
console.log(`wrote ${champs.length} champions to champion_params.csv`);
