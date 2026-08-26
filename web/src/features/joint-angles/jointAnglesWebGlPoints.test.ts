import createGl from "gl";
import { describe, expect, it } from "vitest";

import { JointAnglesWebGlPoints } from "@/features/joint-angles/jointAnglesWebGlPoints";

function headlessCanvas(width: number, height: number): HTMLCanvasElement {
  const gl = createGl(width, height);
  if (gl === null) throw new Error("headless WebGL unavailable");
  return {
    width,
    height,
    getContext(type: string) {
      return type === "webgl" ? gl : null;
    },
  } as unknown as HTMLCanvasElement;
}

function destroyHeadless(canvas: HTMLCanvasElement): void {
  const gl = canvas.getContext("webgl") as ReturnType<typeof createGl> & {
    getExtension(name: string): { destroy?: () => void } | null;
  };
  gl.getExtension("STACKGL_destroy_context")?.destroy?.();
}

describe("JointAnglesWebGlPoints", () => {
  it("compiles shaders and draws points without error", () => {
    const canvas = headlessCanvas(640, 480);
    const layer = new JointAnglesWebGlPoints(canvas);
    layer.resize(640, 480, 1);
    layer.setPositionsCss(new Float32Array([100, 50, 200, 150, 300, 100]));
    layer.clear();
    const stats = layer.draw([143, 208, 255], 1.5);
    expect(stats.pointCount).toBe(3);
    expect(stats.drawCalls).toBe(1);
    layer.dispose();
    destroyHeadless(canvas);
  });

  it("reports zero draw calls when no points uploaded", () => {
    const canvas = headlessCanvas(320, 240);
    const layer = new JointAnglesWebGlPoints(canvas);
    layer.resize(320, 240, 2);
    layer.clear();
    const stats = layer.draw([255, 255, 255], 1);
    expect(stats.pointCount).toBe(0);
    expect(stats.drawCalls).toBe(0);
    layer.dispose();
    destroyHeadless(canvas);
  });
});
