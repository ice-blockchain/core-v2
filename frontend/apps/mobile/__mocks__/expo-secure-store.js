// Shim for expo-secure-store (not installed in bare RN).
// Prevents crash when @ion/storage barrel import loads secure-storage.native.ts.
module.exports = {
  getItemAsync: async () => null,
  setItemAsync: async () => {},
  deleteItemAsync: async () => {},
};
