// Platform stub for tsc resolution.
// At runtime, bundlers resolve .native.ts or .web.ts instead.
export function generateBlurhash(_uri: string): Promise<string> {
  throw new Error("Platform implementation not resolved");
}
