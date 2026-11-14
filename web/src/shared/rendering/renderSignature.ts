import * as THREE from "three";

const MATERIAL_NUMBER_KEYS = ["size", "linewidth", "dashSize", "gapSize", "scale", "rotation"] as const;
const MATERIAL_COLOR_KEYS = ["color", "emissive"] as const;
const MATERIAL_TEXTURE_KEYS = ["map", "alphaMap"] as const;
const MISSING = -1;

/** Uniforms injected into built-in materials through `onBeforeCompile`. */
const injectedUniforms = new WeakMap<THREE.Material, Record<string, THREE.IUniform>>();

/**
 * Make uniforms added by `onBeforeCompile` part of the signature. Without
 * this, a built-in material whose only change is such a uniform would be
 * treated as idle and never redrawn.
 */
export function trackInjectedUniforms(
  material: THREE.Material,
  uniforms: Record<string, THREE.IUniform>,
): void {
  injectedUniforms.set(material, uniforms);
}

/**
 * Every number a Three.js draw depends on, compared in place against the
 * previous capture so an idle canvas can skip `renderer.render`.
 *
 * Covers transforms, visibility, draw ranges, buffer versions (bumped by
 * `needsUpdate = true`), material state, shader uniforms, and textures.
 * Hidden subtrees are skipped: nothing under them can reach the screen.
 */
export class RenderSignature {
  private values = new Float64Array(4096);
  private length = 0;
  private previousLength = -1;
  private changed = false;
  private readonly ids = new WeakMap<object, number>();
  private nextId = 1;
  private readonly stack: THREE.Object3D[] = [];

  /** Start a capture. Values are compared as they are pushed. */
  public begin(): void {
    this.length = 0;
    this.changed = false;
  }

  /** Finish a capture. True when anything differs from the previous one. */
  public end(): boolean {
    const changed = this.changed || this.length !== this.previousLength;
    this.previousLength = this.length;
    return changed;
  }

  /** Append one value; NaN matches NaN so unset state stays stable. */
  public push(value: number): void {
    if (this.length === this.values.length) {
      const grown = new Float64Array(this.values.length * 2);
      grown.set(this.values);
      this.values = grown;
    }
    const old = this.values[this.length]!;
    if (old !== value && !(Number.isNaN(old) && Number.isNaN(value))) {
      this.changed = true;
      this.values[this.length] = value;
    }
    this.length += 1;
  }

  /** Projection, placement, and identity of a camera. */
  public addCamera(camera: THREE.Camera): void {
    this.push(this.idOf(camera));
    for (const e of camera.projectionMatrix.elements) this.push(e);
    this.pushTransform(camera);
  }

  /** Walk an object tree, skipping anything hidden. */
  public addObject(root: THREE.Object3D): void {
    const stack = this.stack;
    stack.length = 0;
    stack.push(root);
    while (stack.length > 0) {
      const obj = stack.pop()!;
      this.push(this.idOf(obj));
      this.push(obj.visible ? 1 : 0);
      if (!obj.visible) continue;
      this.pushTransform(obj);
      this.push(obj.renderOrder);
      this.push(obj.layers.mask);
      this.push(obj.children.length);
      if (!obj.matrixAutoUpdate) {
        for (const e of obj.matrix.elements) this.push(e);
      }
      if (obj instanceof THREE.Scene) this.addBackground(obj.background);
      if (
        obj instanceof THREE.Mesh
        || obj instanceof THREE.Points
        || obj instanceof THREE.Line
        || obj instanceof THREE.Sprite
      ) {
        this.addGeometry(obj.geometry);
        this.addMaterial(obj.material);
      }
      if (obj instanceof THREE.InstancedMesh) {
        this.push(obj.count);
        this.push(obj.instanceMatrix.version);
        this.push(obj.instanceColor?.version ?? MISSING);
      }
      if (obj instanceof THREE.Sprite) {
        this.push(obj.center.x);
        this.push(obj.center.y);
      }
      for (const child of obj.children) stack.push(child);
    }
  }

  private pushTransform(obj: THREE.Object3D): void {
    this.push(obj.position.x);
    this.push(obj.position.y);
    this.push(obj.position.z);
    this.push(obj.quaternion.x);
    this.push(obj.quaternion.y);
    this.push(obj.quaternion.z);
    this.push(obj.quaternion.w);
    this.push(obj.scale.x);
    this.push(obj.scale.y);
    this.push(obj.scale.z);
  }

  private addBackground(background: THREE.Scene["background"]): void {
    if (background instanceof THREE.Color) {
      this.push(background.r);
      this.push(background.g);
      this.push(background.b);
    } else if (background instanceof THREE.Texture) {
      this.addTexture(background);
    } else {
      this.push(MISSING);
    }
  }

  private addGeometry(geometry: THREE.BufferGeometry): void {
    this.push(this.idOf(geometry));
    this.push(geometry.drawRange.start);
    this.push(geometry.drawRange.count);
    this.push(geometry.groups.length);
    const index = geometry.index;
    if (index === null) {
      this.push(MISSING);
    } else {
      this.push(this.idOf(index));
      this.push(index.version);
      this.push(index.count);
    }
    const attributes = geometry.attributes;
    for (const name in attributes) {
      const attr = attributes[name]!;
      this.push(this.idOf(attr));
      this.push(attr instanceof THREE.InterleavedBufferAttribute ? attr.data.version : attr.version);
      this.push(attr.count);
    }
  }

  private addMaterial(material: THREE.Material | THREE.Material[]): void {
    if (Array.isArray(material)) {
      this.push(material.length);
      for (const m of material) this.addOneMaterial(m);
      return;
    }
    this.addOneMaterial(material);
  }

  private addOneMaterial(material: THREE.Material): void {
    this.push(this.idOf(material));
    this.push(material.version);
    this.push(material.visible ? 1 : 0);
    this.push(material.opacity);
    this.push(material.transparent ? 1 : 0);
    this.push(material.depthTest ? 1 : 0);
    this.push(material.depthWrite ? 1 : 0);
    this.push(material.colorWrite ? 1 : 0);
    this.push(material.blending);
    this.push(material.side);
    this.push(material.alphaTest);
    for (const key of MATERIAL_NUMBER_KEYS) {
      const value: unknown = Reflect.get(material, key);
      this.push(typeof value === "number" ? value : MISSING);
    }
    for (const key of MATERIAL_COLOR_KEYS) {
      const value: unknown = Reflect.get(material, key);
      if (value instanceof THREE.Color) {
        this.push(value.r);
        this.push(value.g);
        this.push(value.b);
      } else {
        this.push(MISSING);
      }
    }
    for (const key of MATERIAL_TEXTURE_KEYS) {
      const value: unknown = Reflect.get(material, key);
      if (value instanceof THREE.Texture) this.addTexture(value);
      else this.push(MISSING);
    }
    if (material instanceof THREE.ShaderMaterial) {
      for (const name in material.uniforms) {
        this.addUniformValue(material.uniforms[name]!.value, 0);
      }
    }
    const injected = injectedUniforms.get(material);
    if (injected !== undefined) {
      for (const name in injected) this.addUniformValue(injected[name]!.value, 0);
    }
  }

  private addTexture(texture: THREE.Texture): void {
    this.push(this.idOf(texture));
    this.push(texture.version);
  }

  private addUniformValue(value: unknown, depth: number): void {
    if (typeof value === "number") {
      this.push(value);
    } else if (typeof value === "boolean") {
      this.push(value ? 1 : 0);
    } else if (value instanceof THREE.Texture) {
      this.addTexture(value);
    } else if (value instanceof THREE.Color) {
      this.push(value.r);
      this.push(value.g);
      this.push(value.b);
    } else if (
      value instanceof THREE.Vector2
      || value instanceof THREE.Vector3
      || value instanceof THREE.Vector4
      || value instanceof THREE.Quaternion
    ) {
      for (const component of value.toArray()) this.push(component);
    } else if (value instanceof THREE.Matrix3 || value instanceof THREE.Matrix4) {
      for (const e of value.elements) this.push(e);
    } else if (Array.isArray(value) && depth < 2) {
      this.push(value.length);
      for (const item of value) this.addUniformValue(item, depth + 1);
    } else if (typeof value === "object" && value !== null) {
      this.push(this.idOf(value));
    } else {
      this.push(MISSING);
    }
  }

  private idOf(obj: object): number {
    let id = this.ids.get(obj);
    if (id === undefined) {
      id = this.nextId;
      this.nextId += 1;
      this.ids.set(obj, id);
    }
    return id;
  }
}
