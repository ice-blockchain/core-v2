import type { EnvironmentConfig } from './types';

// Platform stub for TypeScript resolution.
// At runtime, bundlers resolve .native.ts or .web.ts instead.
export const environmentConfig: EnvironmentConfig = (() => {
  throw new Error('Platform implementation not resolved');
})();
