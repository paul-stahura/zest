declare module "gl" {
  function createGl(
    width: number,
    height: number,
    options?: Record<string, unknown>,
  ): WebGLRenderingContext | null;

  export default createGl;
}
