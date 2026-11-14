import * as THREE from "three";

import { RenderSignature, trackInjectedUniforms } from "@/shared/rendering/renderSignature";

function capture(signature: RenderSignature, scene: THREE.Scene, camera: THREE.Camera): boolean {
  signature.begin();
  signature.addCamera(camera);
  signature.addObject(scene);
  return signature.end();
}

function makeScene(): { scene: THREE.Scene; camera: THREE.OrthographicCamera; points: THREE.Points } {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0d12);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array([0, 0, 0, 1, 1, 0]), 3));
  const points = new THREE.Points(geometry, new THREE.PointsMaterial({ size: 2, color: 0xffffff }));
  scene.add(points);
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 200);
  return { scene, camera, points };
}

describe("RenderSignature", () => {
  it("reports a change on the first capture and none on an idle repeat", () => {
    const { scene, camera } = makeScene();
    const signature = new RenderSignature();
    expect(capture(signature, scene, camera)).toBe(true);
    expect(capture(signature, scene, camera)).toBe(false);
  });

  it("sees a camera pan", () => {
    const { scene, camera } = makeScene();
    const signature = new RenderSignature();
    capture(signature, scene, camera);
    camera.left = -0.5;
    camera.right = 1.5;
    camera.updateProjectionMatrix();
    expect(capture(signature, scene, camera)).toBe(true);
  });

  it("sees a buffer flagged for upload and a shorter draw range", () => {
    const { scene, camera, points } = makeScene();
    const signature = new RenderSignature();
    capture(signature, scene, camera);
    points.geometry.getAttribute("position").needsUpdate = true;
    expect(capture(signature, scene, camera)).toBe(true);
    points.geometry.setDrawRange(0, 1);
    expect(capture(signature, scene, camera)).toBe(true);
    expect(capture(signature, scene, camera)).toBe(false);
  });

  it("sees visibility, opacity, color, and size edits", () => {
    const { scene, camera, points } = makeScene();
    const material = points.material;
    if (!(material instanceof THREE.PointsMaterial)) throw new Error("expected PointsMaterial");
    const signature = new RenderSignature();
    capture(signature, scene, camera);
    points.visible = false;
    expect(capture(signature, scene, camera)).toBe(true);
    points.visible = true;
    expect(capture(signature, scene, camera)).toBe(true);
    material.opacity = 0.5;
    expect(capture(signature, scene, camera)).toBe(true);
    material.color.setHex(0xff0000);
    expect(capture(signature, scene, camera)).toBe(true);
    material.size = 3;
    expect(capture(signature, scene, camera)).toBe(true);
  });

  it("ignores edits inside a hidden group", () => {
    const { scene, camera } = makeScene();
    const group = new THREE.Group();
    const child = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial());
    group.add(child);
    group.visible = false;
    scene.add(group);
    const signature = new RenderSignature();
    capture(signature, scene, camera);
    child.position.x = 5;
    expect(capture(signature, scene, camera)).toBe(false);
  });

  it("sees an added child and a swapped geometry", () => {
    const { scene, camera, points } = makeScene();
    const signature = new RenderSignature();
    capture(signature, scene, camera);
    scene.add(new THREE.Group());
    expect(capture(signature, scene, camera)).toBe(true);
    points.geometry = new THREE.BufferGeometry();
    expect(capture(signature, scene, camera)).toBe(true);
  });

  it("sees shader uniform and texture edits", () => {
    const { scene, camera } = makeScene();
    const texture = new THREE.DataTexture(new Uint8Array(4), 1, 1);
    const material = new THREE.ShaderMaterial({
      uniforms: { uBrightness: { value: 0 }, uTex: { value: texture } },
    });
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material));
    const signature = new RenderSignature();
    capture(signature, scene, camera);
    const brightness = material.uniforms.uBrightness;
    if (brightness === undefined) throw new Error("missing uniform");
    brightness.value = 0.4;
    expect(capture(signature, scene, camera)).toBe(true);
    texture.needsUpdate = true;
    expect(capture(signature, scene, camera)).toBe(true);
    expect(capture(signature, scene, camera)).toBe(false);
  });

  it("sees uniforms injected into a built-in material", () => {
    const { scene, camera, points } = makeScene();
    if (!(points.material instanceof THREE.PointsMaterial)) throw new Error("expected PointsMaterial");
    const uniforms = { uBand: { value: new THREE.Vector4(0, 1, 0, 0) } };
    trackInjectedUniforms(points.material, uniforms);
    const signature = new RenderSignature();
    capture(signature, scene, camera);
    expect(capture(signature, scene, camera)).toBe(false);
    uniforms.uBand.value.x = 0.25;
    expect(capture(signature, scene, camera)).toBe(true);
  });

  it("sees a scene background change", () => {
    const { scene, camera } = makeScene();
    const signature = new RenderSignature();
    capture(signature, scene, camera);
    scene.background = new THREE.Color(0xffffff);
    expect(capture(signature, scene, camera)).toBe(true);
  });
});
