// Platform stub for tsc resolution.
// At runtime, bundlers resolve .native.ts or .web.ts instead.
export function openSettings(): Promise<void> {
  throw new Error("Platform implementation not resolved");
}
