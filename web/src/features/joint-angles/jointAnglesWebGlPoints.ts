const VERTEX_SHADER = `
attribute vec2 a_pos;
uniform vec2 u_canvasSize;
uniform float u_pointSize;
void main() {
  vec2 clip = vec2(
    (a_pos.x / u_canvasSize.x) * 2.0 - 1.0,
    1.0 - (a_pos.y / u_canvasSize.y) * 2.0
  );
  gl_Position = vec4(clip, 0.0, 1.0);
  gl_PointSize = u_pointSize;
}
`;

const FRAGMENT_SHADER = `
precision mediump float;
uniform vec4 u_color;
void main() {
  vec2 c = gl_PointCoord - vec2(0.5);
  if (dot(c, c) > 0.25) discard;
  gl_FragColor = u_color;
}
`;

function compileShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (shader === null) throw new Error("WebGL createShader failed");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? "unknown shader error";
    gl.deleteShader(shader);
    throw new Error(log);
  }
  return shader;
}

function linkProgram(gl: WebGLRenderingContext, vs: WebGLShader, fs: WebGLShader): WebGLProgram {
  const program = gl.createProgram();
  if (program === null) throw new Error("WebGL createProgram failed");
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program) ?? "unknown link error";
    gl.deleteProgram(program);
    throw new Error(log);
  }
  return program;
}

export interface JointAnglesWebGlDrawStats {
  pointCount: number;
  drawCalls: number;
}

/**
 * Renders joint-angle dots with WebGL POINTS on a dedicated canvas layer.
 * Positions are CSS pixels; the renderer scales by dpr for the framebuffer.
 */
export class JointAnglesWebGlPoints {
  private readonly gl: WebGLRenderingContext;
  private program: WebGLProgram;
  private buffer: WebGLBuffer;
  private aPos: number;
  private uCanvasSize: WebGLUniformLocation;
  private uPointSize: WebGLUniformLocation;
  private uColor: WebGLUniformLocation;
  private cssW = 1;
  private cssH = 1;
  private dpr = 1;
  private pointCount = 0;
  private lastStats: JointAnglesWebGlDrawStats = { pointCount: 0, drawCalls: 0 };

  public constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl", {
      alpha: false,
      antialias: true,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
    });
    if (gl === null) throw new Error("WebGL not available");
    this.gl = gl;
    const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER);
    this.program = linkProgram(gl, vs, fs);
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    const buf = gl.createBuffer();
    if (buf === null) throw new Error("WebGL createBuffer failed");
    this.buffer = buf;
    this.aPos = gl.getAttribLocation(this.program, "a_pos");
    const uCanvas = gl.getUniformLocation(this.program, "u_canvasSize");
    const uSize = gl.getUniformLocation(this.program, "u_pointSize");
    const uCol = gl.getUniformLocation(this.program, "u_color");
    if (uCanvas === null || uSize === null || uCol === null) {
      throw new Error("WebGL missing uniforms");
    }
    this.uCanvasSize = uCanvas;
    this.uPointSize = uSize;
    this.uColor = uCol;
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }

  public resize(cssWidth: number, cssHeight: number, dpr: number): void {
    this.cssW = Math.max(1, cssWidth);
    this.cssH = Math.max(1, cssHeight);
    this.dpr = Math.max(1, dpr);
    const gl = this.gl;
    const bw = Math.max(1, Math.round(this.cssW * this.dpr));
    const bh = Math.max(1, Math.round(this.cssH * this.dpr));
    gl.viewport(0, 0, bw, bh);
  }

  /** Upload interleaved CSS-pixel [x,y,...] positions; scaled to buffer pixels on draw. */
  public setPositionsCss(interleaved: Float32Array): void {
    const gl = this.gl;
    this.pointCount = Math.floor(interleaved.length / 2);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, interleaved, gl.DYNAMIC_DRAW);
  }

  public clear(backgroundRgb: [number, number, number] = [0.04, 0.04, 0.06]): void {
    const gl = this.gl;
    gl.clearColor(backgroundRgb[0], backgroundRgb[1], backgroundRgb[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  public draw(colorRgb: [number, number, number], pointRadiusCss: number): JointAnglesWebGlDrawStats {
    const gl = this.gl;
    if (this.pointCount <= 0) {
      this.lastStats = { pointCount: 0, drawCalls: 0 };
      return this.lastStats;
    }
    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    gl.enableVertexAttribArray(this.aPos);
    gl.vertexAttribPointer(this.aPos, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(this.uCanvasSize, this.cssW, this.cssH);
    gl.uniform1f(this.uPointSize, Math.max(1, pointRadiusCss * 2 * this.dpr));
    gl.uniform4f(this.uColor, colorRgb[0] / 255, colorRgb[1] / 255, colorRgb[2] / 255, 1);
    gl.drawArrays(gl.POINTS, 0, this.pointCount);
    this.lastStats = { pointCount: this.pointCount, drawCalls: 1 };
    return this.lastStats;
  }

  public getLastStats(): JointAnglesWebGlDrawStats {
    return this.lastStats;
  }

  public dispose(): void {
    const gl = this.gl;
    gl.deleteBuffer(this.buffer);
    gl.deleteProgram(this.program);
  }
}

/** Try to construct a WebGL point layer; returns null when WebGL is unavailable. */
export function tryCreateJointAnglesWebGlPoints(canvas: HTMLCanvasElement): JointAnglesWebGlPoints | null {
  try {
    return new JointAnglesWebGlPoints(canvas);
  } catch {
    return null;
  }
}
