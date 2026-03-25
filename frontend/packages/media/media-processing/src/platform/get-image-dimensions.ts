// Platform stub for tsc resolution.
// At runtime, bundlers resolve .native.ts or .web.ts instead.
export function getImageDimensions(
  _uri: string,
): Promise<{ width: number; height: number }> {
  throw new Error("Platform implementation not resolved");
}
