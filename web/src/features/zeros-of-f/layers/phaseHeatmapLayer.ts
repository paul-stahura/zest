import * as THREE from "three";

import { fScaledComponentsBatch, makeFVariant, type FFamily, type RForm } from "@/shared/math/zerosOfF";
import { fracToHue, hsvToRgb } from "@/features/zeros-of-f/fracToHue";
import type { SavedHeatmap, SavedHeatmapTile } from "@/features/zeros-of-f/layers/heatmapCache";

export interface HeatmapBuildParams {
  family: FFamily;        // legAngle / legAngleOut / legRatio
  rForm: RForm;           // ak / ps — picks R₁/R₂ form
  /** Texture pixel dimensions — caller computes these from density × span so
   *  per-unit detail stays constant as bounds change. wPx applies to each
   *  tile; hPx is the TOTAL across all tiles (split evenly per tile). */
  wPx: number;
  hPx: number;
  /** Tile the T axis into this many vertically-stacked slices, each with its
   *  own texture. Lets the user request more pixels than the GPU's per-texture
   *  max (typically 16384) by spreading them across N textures. */
  tilesT: number;
  sigmaMin: number;
  sigmaMax: number;
  tMin: number;
  tMax: number;
}

interface Tile {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
  texture: THREE.DataTexture | null;
  /** Original pixel bytes (RGBA) kept around so the layer can serialize for
   *  IndexedDB caching without reading the texture back from the GPU. */
  data: Uint8Array;
  wPx: number;
  hPx: number;
  tMin: number;
  tMax: number;
}

/**
 * One or more plane meshes covering the configured (σ, T) data rectangle,
 * textured with a φ-field of the chosen leg-pair variant. Tiles let us push
 * past the WebGL per-texture-size limit by partitioning the T axis. Renders
 * BEHIND the scan scatter so dots overlay the field.
 */
export class PhaseHeatmapLayer {
  private readonly parent: THREE.Group;
  private readonly geometry: THREE.PlaneGeometry;
  private tiles: Tile[] = [];
  /** White outline of the currently-selected bounds rectangle. Visible whenever
   *  bounds have been set (independent of whether the heatmap texture is up to
   *  date), so the user can see where the next Refresh will paint. */
  private readonly outline: THREE.LineSegments;
  private outlineHasBounds = false;
  /** 0..1 — slider that fades color by the texture's alpha (near-zero-ness).
   *  Stored so newly-created tiles pick it up immediately. */
  private brightness = 0;
  private hasContentFlag = false;
  private wantVisible = false;
  /** Parameters of the last successful build — needed when serializing the
   *  current tiles for IndexedDB. null until at least one rebuild has finished
   *  (or a saved heatmap has been restored). */
  private lastBuildParams: {
    family: FFamily; rForm: RForm;
    sigmaMin: number; sigmaMax: number;
    tMin: number; tMax: number;
    tilesT: number;
  } | null = null;
  /** 0..1 — current rebuild progress for the UI to poll. 1 when idle/done. */
  private progress = 1;
  /** Bumped on every cancel request so an in-flight rebuild can bail out. */
  private cancelToken = 0;

  public constructor(parent: THREE.Group) {
    this.parent = parent;
    // Shared unit-square geometry; each tile mesh scales/positions it.
    this.geometry = new THREE.PlaneGeometry(1, 1);

    // Outline: 4 line segments forming a rectangle.
    const outlineGeom = new THREE.BufferGeometry();
    outlineGeom.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(8 * 3), 3));
    const outlineMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthTest: false });
    this.outline = new THREE.LineSegments(outlineGeom, outlineMat);
    this.outline.visible = false;
    this.outline.frustumCulled = false;
    this.outline.position.z = -0.4;
    this.parent.add(this.outline);
  }

  /** Place the white bounds rectangle. Call this whenever the user picks a
   *  new preset, even before Refresh, so they see where the next build lands. */
  public setBounds(sigmaMin: number, sigmaMax: number, tMin: number, tMax: number): void {
    const x0 = Math.min(sigmaMin, sigmaMax);
    const x1 = Math.max(sigmaMin, sigmaMax);
    const y0 = Math.min(tMin, tMax);
    const y1 = Math.max(tMin, tMax);
    const positions = new Float32Array([
      x0, y0, 0, x1, y0, 0,   // bottom
      x1, y0, 0, x1, y1, 0,   // right
      x1, y1, 0, x0, y1, 0,   // top
      x0, y1, 0, x0, y0, 0,   // left
    ]);
    const attr = this.outline.geometry.getAttribute("position") as THREE.BufferAttribute;
    attr.copyArray(positions);
    attr.needsUpdate = true;
    this.outlineHasBounds = true;
    this.outline.visible = this.wantVisible;
  }

  public dispose(): void {
    this.clearTiles();
    this.parent.remove(this.outline);
    this.geometry.dispose();
    this.outline.geometry.dispose();
    (this.outline.material as THREE.Material).dispose();
  }

  private clearTiles(): void {
    for (const t of this.tiles) {
      this.parent.remove(t.mesh);
      t.material.dispose();
      t.texture?.dispose();
    }
    this.tiles = [];
  }

  public setVisible(visible: boolean): void {
    this.wantVisible = visible;
    for (const t of this.tiles) t.mesh.visible = visible && this.hasContentFlag;
    this.outline.visible = visible && this.outlineHasBounds;
  }

  public isVisible(): boolean {
    return this.wantVisible && this.hasContentFlag;
  }

  public hasContent(): boolean {
    return this.hasContentFlag;
  }

  public getProgress(): number { return this.progress; }
  public isBuilding(): boolean { return this.progress < 1; }

  /** Live brightness slider (0..1). Updates the shader uniform on every tile. */
  public setBrightness(b: number): void {
    this.brightness = Math.max(0, Math.min(1, b));
    for (const t of this.tiles) {
      if (t.material.uniforms.uBrightness !== undefined) {
        t.material.uniforms.uBrightness.value = this.brightness;
      }
    }
  }

  private makeMaterial(texture: THREE.Texture | null): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: texture },
        uHasMap: { value: texture === null ? 0 : 1 },
        uBrightness: { value: this.brightness },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uMap;
        uniform float uHasMap;
        uniform float uBrightness;
        varying vec2 vUv;
        void main() {
          if (uHasMap < 0.5) { discard; }
          vec4 t = texture2D(uMap, vUv);
          float mult = mix(1.0, t.a, uBrightness);
          gl_FragColor = vec4(t.rgb * mult, 1.0);
        }
      `,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });
  }

  /**
   * Build N vertically-stacked tiles covering the (σ, T) data rectangle. The
   * user gets per-unit detail = densityT × tilesT (effectively): each tile
   * texture is small enough to fit under the GPU's per-texture limit, and the
   * tiles together cover the whole range without gaps.
   *
   * Yields to the event loop between columns inside each tile so the progress
   * indicator can update and the UI stays responsive.
   */
  public async rebuild(params: HeatmapBuildParams, yieldEveryCols: number = 16): Promise<void> {
    const myToken = ++this.cancelToken;
    const { family, rForm, sigmaMin, sigmaMax, tMin, tMax } = params;
    const tilesT = Math.max(1, Math.floor(params.tilesT));

    // GPU cap. Per-tile texture must fit under this.
    const MAX_DIM = 16384;
    const reqW = Math.max(16, Math.floor(params.wPx));
    const totalReqH = Math.max(16, Math.floor(params.hPx));
    const wPx = Math.min(MAX_DIM, reqW);
    // Per-tile hPx ≈ totalReqH / tilesT, then clamped to MAX_DIM.
    const perTileReqH = Math.max(16, Math.floor(totalReqH / tilesT));
    const perTileH = Math.min(MAX_DIM, perTileReqH);
    if (wPx !== reqW || perTileH !== perTileReqH) {
      // eslint-disable-next-line no-console
      console.warn(`[heatmap] requested ${reqW}×${totalReqH} (${tilesT} tiles → ${perTileReqH} per tile) — clamped to ${wPx}×${perTileH} per tile (GPU max ${MAX_DIM})`);
    }
    const variant = makeFVariant(family, rForm);

    // Dispose old tiles up front so the user sees a clean rebuild start.
    this.clearTiles();
    this.hasContentFlag = false;
    this.progress = 0;

    const tMinSafe = Math.max(1e-3, tMin);
    const tMaxSafe = Math.max(tMinSafe + 1e-3, tMax);
    const totalSpan = tMaxSafe - tMinSafe;

    // Total work for progress = tilesT * wPx columns.
    const totalCols = tilesT * wPx;
    let colsDone = 0;

    for (let tileIdx = 0; tileIdx < tilesT; tileIdx++) {
      if (myToken !== this.cancelToken) return;
      const tileTMin = tMinSafe + (tileIdx / tilesT) * totalSpan;
      const tileTMax = tMinSafe + ((tileIdx + 1) / tilesT) * totalSpan;
      const data = new Uint8Array(wPx * perTileH * 4);

      const tArr = new Float64Array(perTileH);
      for (let r = 0; r < perTileH; r++) {
        tArr[r] = tileTMin + ((r + 0.5) / perTileH) * (tileTMax - tileTMin);
      }
      for (let c = 0; c < wPx; c++) {
        if (myToken !== this.cancelToken) return;
        const sigma = sigmaMin + ((c + 0.5) / wPx) * (sigmaMax - sigmaMin);
        let batch;
        try {
          batch = fScaledComponentsBatch(sigma, tArr, variant);
        } catch {
          colsDone++;
          this.progress = colsDone / totalCols;
          if (yieldEveryCols > 0 && (c + 1) % yieldEveryCols === 0) {
            await new Promise<void>((resolve) => { setTimeout(resolve, 0); });
          }
          continue;
        }
        for (let r = 0; r < perTileH; r++) {
          let red = 0, green = 0, blue = 0;
          let alpha = 0;
          if (family === "legRatio") {
            const s1 = batch.sigma1Mag[r]!;
            const s2 = batch.r1Mag[r]!;
            if (Number.isFinite(s1) && Number.isFinite(s2) && s2 > 0) {
              const f = s1 / s2 - 1;
              const a = Math.abs(f);
              const logA = Math.log10(Math.max(a, 1e-9));
              const nearZero = Math.max(0, Math.min(1, (-logA) / 6));
              const hue = f > 0 ? 0.0 : 0.6;
              const [rf, gf, bf] = hsvToRgb(hue, 1, 1);
              red = Math.round(rf * 255); green = Math.round(gf * 255); blue = Math.round(bf * 255);
              alpha = nearZero;
            }
          } else {
            const phase = batch.phaseSigned[r]!;
            const u = (phase + 1) * 0.5;
            const hue = fracToHue(u);
            const [rf, gf, bf] = hsvToRgb(hue, 1, 1);
            red = Math.round(rf * 255); green = Math.round(gf * 255); blue = Math.round(bf * 255);
            alpha = Math.max(0, 1 - Math.min(1, Math.abs(phase)));
          }
          const idx = (r * wPx + c) * 4;
          data[idx + 0] = red;
          data[idx + 1] = green;
          data[idx + 2] = blue;
          data[idx + 3] = Math.round(alpha * 255);
        }
        colsDone++;
        this.progress = colsDone / totalCols;
        if (yieldEveryCols > 0 && (c + 1) % yieldEveryCols === 0) {
          await new Promise<void>((resolve) => { setTimeout(resolve, 0); });
        }
      }
      if (myToken !== this.cancelToken) return;

      // Upload this tile's texture and place its mesh.
      const tex = new THREE.DataTexture(data, wPx, perTileH, THREE.RGBAFormat);
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.needsUpdate = true;
      const mat = this.makeMaterial(tex);
      const mesh = new THREE.Mesh(this.geometry, mat);
      mesh.frustumCulled = false;
      mesh.position.x = 0.5 * (sigmaMin + sigmaMax);
      mesh.position.y = 0.5 * (tileTMin + tileTMax);
      mesh.position.z = -0.5;
      mesh.scale.x = Math.max(1e-9, sigmaMax - sigmaMin);
      mesh.scale.y = Math.max(1e-9, tileTMax - tileTMin);
      mesh.visible = this.wantVisible;
      this.parent.add(mesh);
      this.tiles.push({ mesh, material: mat, texture: tex, data, wPx, hPx: perTileH, tMin: tileTMin, tMax: tileTMax });
      // Mark visible as soon as the first tile lands so the user sees partial
      // progress without having to wait for all tiles. Re-apply visibility
      // through the canonical path so the newly-pushed tile gets the current
      // wantVisible value (and the outline visibility stays in sync).
      this.hasContentFlag = true;
      this.setVisible(this.wantVisible);
    }

    if (myToken !== this.cancelToken) return;
    this.lastBuildParams = { family, rForm, sigmaMin, sigmaMax, tMin, tMax, tilesT };
    // Re-apply visibility to every tile through the canonical path. Guards
    // against the first-build-invisible bug where a tile's `mesh.visible` was
    // captured at create time but `wantVisible` flipped later.
    this.setVisible(this.wantVisible);
    this.progress = 1;
  }

  /** Capture the current tile bytes + bounds for IndexedDB caching. Returns
   *  null if no build has happened yet. */
  public serialize(): Omit<SavedHeatmap, "key"> | null {
    if (this.lastBuildParams === null || this.tiles.length === 0) return null;
    const tiles: SavedHeatmapTile[] = this.tiles.map((t) => ({
      data: t.data,
      wPx: t.wPx,
      hPx: t.hPx,
      tMin: t.tMin,
      tMax: t.tMax,
    }));
    return {
      savedAt: Date.now(),
      family: this.lastBuildParams.family,
      rForm: this.lastBuildParams.rForm,
      sigmaMin: this.lastBuildParams.sigmaMin,
      sigmaMax: this.lastBuildParams.sigmaMax,
      tMin: this.lastBuildParams.tMin,
      tMax: this.lastBuildParams.tMax,
      tilesT: this.lastBuildParams.tilesT,
      tiles,
    };
  }

  /** Restore tiles from a previously-saved heatmap. Cancels any in-flight
   *  rebuild and replaces the live tiles with the saved bytes. */
  public restore(saved: SavedHeatmap): void {
    this.cancelToken++;
    this.clearTiles();
    const { sigmaMin, sigmaMax, tiles } = saved;
    for (const t of tiles) {
      const tex = new THREE.DataTexture(t.data, t.wPx, t.hPx, THREE.RGBAFormat);
      tex.minFilter = THREE.LinearFilter;
      tex.magFilter = THREE.LinearFilter;
      tex.needsUpdate = true;
      const mat = this.makeMaterial(tex);
      const mesh = new THREE.Mesh(this.geometry, mat);
      mesh.frustumCulled = false;
      mesh.position.x = 0.5 * (sigmaMin + sigmaMax);
      mesh.position.y = 0.5 * (t.tMin + t.tMax);
      mesh.position.z = -0.5;
      mesh.scale.x = Math.max(1e-9, sigmaMax - sigmaMin);
      mesh.scale.y = Math.max(1e-9, t.tMax - t.tMin);
      mesh.visible = this.wantVisible;
      this.parent.add(mesh);
      this.tiles.push({ mesh, material: mat, texture: tex, data: t.data, wPx: t.wPx, hPx: t.hPx, tMin: t.tMin, tMax: t.tMax });
    }
    this.lastBuildParams = {
      family: saved.family as FFamily,
      rForm: saved.rForm as RForm,
      sigmaMin: saved.sigmaMin,
      sigmaMax: saved.sigmaMax,
      tMin: saved.tMin,
      tMax: saved.tMax,
      tilesT: saved.tilesT,
    };
    this.hasContentFlag = true;
    this.setVisible(this.wantVisible);
    this.progress = 1;
  }
}
