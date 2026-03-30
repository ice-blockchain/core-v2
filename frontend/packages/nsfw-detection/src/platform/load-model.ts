import type { NsfwModel } from '../types';

// Platform stub for tsc resolution.
// At runtime, bundlers resolve .native.ts or .web.ts instead.
export function loadModelPlatform(): Promise<NsfwModel> {
  throw new Error('Platform implementation not resolved');
}
