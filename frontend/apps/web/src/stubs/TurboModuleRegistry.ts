// Stub for react-native's TurboModuleRegistry — not available on web
export const TurboModuleRegistry = {
  get: () => null,
  getEnforcing: () => { throw new Error('TurboModuleRegistry is not available on web'); },
};
export default TurboModuleRegistry;
