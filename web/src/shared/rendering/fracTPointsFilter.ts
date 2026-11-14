import * as THREE from "three";

import {
  fracTGpuBandsEqual,
  fracTInBand,
  fracTKeptByBands,
  INACTIVE_FRAC_T_BANDS,
  type FracTBand,
  type FracTGpuBands,
} from "@/shared/math/zerosOfF/fracTGpuBands";
import { trackInjectedUniforms } from "@/shared/rendering/renderSignature";

/** Per-point float attribute holding frac(T) as float32. */
export const FRAC_T_ATTRIBUTE = "fracT";

const VERTEX_PARS = /* glsl */ `
attribute float ${FRAC_T_ATTRIBUTE};
uniform float uFracActive;
uniform vec4 uFracBandA;
uniform vec4 uFracBandB;
uniform vec4 uFracNudgeBand;
uniform vec2 uFracNudgeOffset;
bool zofFracInBand(float f, vec4 b) {
  bool aboveLo = b.z > 0.5 ? f > b.x : f >= b.x;
  bool belowHi = b.w > 0.5 ? f < b.y : f <= b.y;
  return aboveLo && belowHi;
}
`;

const VERTEX_KEEP = /* glsl */ `
bool zofFracKept = uFracActive < 0.5
  || zofFracInBand(${FRAC_T_ATTRIBUTE}, uFracBandA)
  || zofFracInBand(${FRAC_T_ATTRIBUTE}, uFracBandB);
if (zofFracInBand(${FRAC_T_ATTRIBUTE}, uFracNudgeBand)) transformed.xy += uFracNudgeOffset;
`;

/** A hidden dot lands outside clip space with no size, so nothing rasterizes. */
const VERTEX_HIDE = /* glsl */ `
if (!zofFracKept) {
  gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
  gl_PointSize = 0.0;
}
`;

function packBand(target: THREE.Vector4, b: FracTBand): void {
  target.set(b.lo, b.hi, b.loOpen ? 1 : 0, b.hiOpen ? 1 : 0);
}

/**
 * Display frac(T) filter evaluated in the vertex shader of a `PointsMaterial`.
 *
 * Point buffers keep every zero in source order; moving a frac(T) control
 * only changes a few uniforms. The geometry must carry a
 * {@link FRAC_T_ATTRIBUTE} attribute filled with `fracT32(T)`.
 */
export class FracTPointsFilter {
  private readonly uniforms = {
    uFracActive: { value: 0 },
    uFracBandA: { value: new THREE.Vector4() },
    uFracBandB: { value: new THREE.Vector4() },
    uFracNudgeBand: { value: new THREE.Vector4() },
    uFracNudgeOffset: { value: new THREE.Vector2() },
  };
  private bands: FracTGpuBands = INACTIVE_FRAC_T_BANDS;
  private version = 0;

  public constructor(material: THREE.PointsMaterial) {
    this.writeUniforms();
    const uniforms = this.uniforms;
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", `#include <common>\n${VERTEX_PARS}`)
        .replace("#include <begin_vertex>", `#include <begin_vertex>\n${VERTEX_KEEP}`)
        .replace("#include <fog_vertex>", `#include <fog_vertex>\n${VERTEX_HIDE}`);
    };
    material.customProgramCacheKey = () => "zof-frac-t-filter";
    trackInjectedUniforms(material, uniforms);
  }

  /** Apply new bands. Returns false (and keeps the version) when nothing changed. */
  public setBands(bands: FracTGpuBands): boolean {
    if (fracTGpuBandsEqual(this.bands, bands)) return false;
    this.bands = bands;
    this.version += 1;
    this.writeUniforms();
    return true;
  }

  /** Data-space shift for dots in the nudge band (the dragged .75–1 cloud). */
  public setNudgeOffset(x: number, y: number): void {
    this.uniforms.uFracNudgeOffset.value.set(x, y);
  }

  public getNudgeOffsetX(): number {
    return this.uniforms.uFracNudgeOffset.value.x;
  }

  public getNudgeOffsetY(): number {
    return this.uniforms.uFracNudgeOffset.value.y;
  }

  /** Bumped whenever the kept set may change; use it to cache counts. */
  public getVersion(): number {
    return this.version;
  }

  /** True when no dot is hidden or moved. */
  public isInactive(): boolean {
    return !this.bands.active;
  }

  /** Same keep test as the shader, for a float32 frac(T). */
  public keeps(frac: number): boolean {
    return fracTKeptByBands(frac, this.bands);
  }

  /** Same nudge test as the shader, for a float32 frac(T). */
  public nudges(frac: number): boolean {
    return fracTInBand(frac, this.bands.nudge);
  }

  private writeUniforms(): void {
    const u = this.uniforms;
    u.uFracActive.value = this.bands.active ? 1 : 0;
    packBand(u.uFracBandA.value, this.bands.first);
    packBand(u.uFracBandB.value, this.bands.second);
    packBand(u.uFracNudgeBand.value, this.bands.nudge);
  }
}
