import { execFileSync } from "child_process";
import { computeEmsSpiralGeometry } from "@/shared/math/zetaEms";
import { computeZakSpiralGeometry } from "@/shared/math/zakCalculator";
import { indexToImag } from "@/shared/math/zetaEms";

// Get mpmath reference value for zeta(sigma + i*t) at high precision
function mpmathZeta(sigma: number, t: number): { re: number; im: number } {
  const out = execFileSync("python3", [
    "-c",
    `import mpmath,sys
mpmath.mp.dps=30
s=mpmath.mpc(sys.argv[1],sys.argv[2])
z=mpmath.zeta(s)
print(f"{float(z.real)} {float(z.imag)}")`,
    String(sigma),
    String(t),
  ]).toString().trim();
  const [re, im] = out.split(" ").map(Number);
  return { re: re!, im: im! };
}

function magnitude(x: number, y: number): number {
  return Math.sqrt(x * x + y * y);
}

function relErr(ref: number, val: number): number {
  const mag = magnitude(ref, 0);
  if (mag === 0) return Math.abs(val);
  return Math.abs(val - ref) / Math.abs(ref);
}

function complexRelErr(refRe: number, refIm: number, re: number, im: number): number {
  const refMag = magnitude(refRe, refIm);
  const diffMag = magnitude(re - refRe, im - refIm);
  if (refMag === 0) return diffMag;
  return diffMag / refMag;
}

function formatTime(ms: number): string {
  if (ms >= 1) return `${ms.toFixed(3)}ms`;
  return `${(ms * 1000).toFixed(2)}µs`;
}

function pct(v: number): string {
  if (v < 1e-10) return `${(v * 100).toExponential(2)}%`;
  if (v < 1e-4) return `${(v * 100).toExponential(2)}%`;
  return `${(v * 100).toFixed(6)}%`;
}

async function main() {
  console.log("="+"=".repeat(120));
  console.log("RIGOROUS BENCHMARK: EMS vs ZAK vs mpmath (reference)");
  console.log("="+"=".repeat(120));

  // Test cases at various indices
  const testIndices = [5, 10, 25, 50, 100, 200, 500, 1000];
  const sigma = 0.5;

  console.log(`\nSigma: ${sigma}`);
  console.log(`Test indices: ${testIndices.join(", ")}`);
  console.log("");

  // --- ACCURACY TEST vs mpmath ---
  console.log("─".repeat(130));
  console.log("ACCURACY TEST: Comparing zeta endpoints to mpmath (30-digit precision reference)");
  console.log("─".repeat(130));
  console.log();

  const accuracyResults: {
    index: number;
    t: number;
    ref: { re: number; im: number };
    ems: { re: number; im: number };
    zak: { re: number; im: number };
    emsErr: number;
    zakErr: number;
  }[] = [];

  console.log("idx    t (imag)           |ζ_ref|       EMS ζ                     ZAK ζ                     EMS rel err    ZAK rel err");
  console.log("─".repeat(130));

  for (const idx of testIndices) {
    const t = indexToImag(idx, false);
    const ref = mpmathZeta(sigma, t);
    const refMag = magnitude(ref.re, ref.im);

    const emsGeom = computeEmsSpiralGeometry({ sigma, index: idx, usePolyImag: false, extendSpiralCount: 0 });
    const zakGeom = computeZakSpiralGeometry(sigma, idx);
    const maxJ = Math.floor(idx);

    // EMS zeta endpoint
    const emsZ = { re: emsGeom.zeta.x, im: emsGeom.zeta.y };

    // ZAK zeta = last joint (after full inverse path construction)
    const zakZ = { re: zakGeom.zeta.x, im: zakGeom.zeta.y };

    const emsErr = complexRelErr(ref.re, ref.im, emsZ.re, emsZ.im);
    const zakErr = complexRelErr(ref.re, ref.im, zakZ.re, zakZ.im);

    accuracyResults.push({ index: idx, t, ref, ems: emsZ, zak: zakZ, emsErr, zakErr });

    const idxStr = String(idx).padEnd(6);
    const tStr = t.toFixed(4).padEnd(18);
    const refMagStr = refMag.toFixed(6).padEnd(13);
    const emsStr = `(${emsZ.re.toFixed(4)}, ${emsZ.im.toFixed(4)})`.padEnd(26);
    const zakStr = `(${zakZ.re.toFixed(4)}, ${zakZ.im.toFixed(4)})`.padEnd(26);
    const emsErrStr = pct(emsErr).padEnd(14);
    const zakErrStr = pct(zakErr);

    console.log(`${idxStr} ${tStr} ${refMagStr} ${emsStr} ${zakStr} ${emsErrStr} ${zakErrStr}`);
  }

  // Summary
  const emsErrs = accuracyResults.map(r => r.emsErr);
  const zakErrs = accuracyResults.map(r => r.zakErr);
  const maxEmsErr = Math.max(...emsErrs);
  const maxZakErr = Math.max(...zakErrs);
  const meanEmsErr = emsErrs.reduce((a, b) => a + b, 0) / emsErrs.length;
  const meanZakErr = zakErrs.reduce((a, b) => a + b, 0) / zakErrs.length;

  console.log();
  console.log("Accuracy Summary:");
  console.log(`  EMS: max rel err = ${pct(maxEmsErr)}, mean rel err = ${pct(meanEmsErr)}`);
  console.log(`  ZAK: max rel err = ${pct(maxZakErr)}, mean rel err = ${pct(meanZakErr)}`);

  // --- PERFORMANCE TEST ---
  console.log();
  console.log("─".repeat(130));
  console.log("PERFORMANCE TEST: 30 iterations per index, warmup excluded");
  console.log("─".repeat(130));

  const iterations = 30;

  // Warmup
  for (const idx of testIndices) {
    for (let i = 0; i < 5; i++) {
      computeEmsSpiralGeometry({ sigma, index: idx, usePolyImag: false, extendSpiralCount: 0 });
      computeZakSpiralGeometry(sigma, idx);
    }
  }

  console.log();
  console.log("idx       EMS mean       EMS min        EMS max        ZAK mean       ZAK min        ZAK max        Speedup");
  console.log("─".repeat(130));

  const perfResults: { idx: number; emsMean: number; zakMean: number }[] = [];

  for (const idx of testIndices) {
    const emsTimes: number[] = [];
    const zakTimes: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const t0 = performance.now();
      computeEmsSpiralGeometry({ sigma, index: idx, usePolyImag: false, extendSpiralCount: 0 });
      const t1 = performance.now();
      emsTimes.push(t1 - t0);

      const t2 = performance.now();
      computeZakSpiralGeometry(sigma, idx);
      const t3 = performance.now();
      zakTimes.push(t3 - t2);
    }

    const emsMean = emsTimes.reduce((a, b) => a + b, 0) / emsTimes.length;
    const zakMean = zakTimes.reduce((a, b) => a + b, 0) / zakTimes.length;
    const emsMin = Math.min(...emsTimes);
    const zakMin = Math.min(...zakTimes);
    const emsMax = Math.max(...emsTimes);
    const zakMax = Math.max(...zakTimes);
    const speedup = emsMean / zakMean;

    perfResults.push({ idx, emsMean, zakMean });

    const idxStr = String(idx).padEnd(9);
    const emsMeanStr = formatTime(emsMean).padEnd(14);
    const emsMinStr = formatTime(emsMin).padEnd(14);
    const emsMaxStr = formatTime(emsMax).padEnd(14);
    const zakMeanStr = formatTime(zakMean).padEnd(14);
    const zakMinStr = formatTime(zakMin).padEnd(14);
    const zakMaxStr = formatTime(zakMax).padEnd(14);
    const speedupStr = `${speedup.toFixed(2)}x`;

    console.log(`${idxStr} ${emsMeanStr} ${emsMinStr} ${emsMaxStr} ${zakMeanStr} ${zakMinStr} ${zakMaxStr} ${speedupStr}`);
  }

  // --- VERDICT ---
  console.log();
  console.log("="+"=".repeat(120));
  console.log("VERDICT");
  console.log("="+"=".repeat(120));

  const emsAvgPerf = perfResults.reduce((a, b) => a + b.emsMean, 0) / perfResults.length;
  const zakAvgPerf = perfResults.reduce((a, b) => a + b.zakMean, 0) / perfResults.length;

  console.log();
  console.log(`Performance:  EMS avg ${formatTime(emsAvgPerf)} per call | ZAK avg ${formatTime(zakAvgPerf)} per call`);
  console.log(`              ZAK is ${(emsAvgPerf / zakAvgPerf).toFixed(2)}x faster (${(((emsAvgPerf - zakAvgPerf) / emsAvgPerf) * 100).toFixed(1)}% time reduction)`);
  console.log();
  console.log(`Accuracy:     EMS max error ${pct(maxEmsErr)} | ZAK max error ${pct(maxZakErr)}`);

  if (maxEmsErr < 1e-6 && maxZakErr < 1e-6) {
    console.log(`              BOTH accurate (<1e-6). ZAK wins on speed with equivalent accuracy.`);
  } else if (maxZakErr < maxEmsErr) {
    console.log(`              ZAK MORE ACCURATE than EMS. Double win for ZAK.`);
  } else if (maxEmsErr < 1e-6 && maxZakErr >= 1e-6) {
    console.log(`              EMS more accurate. ZAK faster but has accuracy issues.`);
  } else {
    console.log(`              Both have accuracy issues. Review implementations.`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
