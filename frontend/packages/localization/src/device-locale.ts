// Platform stub for TypeScript resolution.
// At runtime, bundlers resolve .native.ts or .web.ts instead.
export const getDeviceLocale: () => string = () => {
  throw new Error('Platform implementation not resolved');
};
