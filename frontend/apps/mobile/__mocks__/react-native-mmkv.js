// Shim for react-native-mmkv (not installed yet).
// Prevents crash when @ion/storage barrel import loads key-value-storage.native.ts.
const store = new Map();

class MMKV {
  constructor() {}
  getString(key) { return store.get(key); }
  set(key, value) { store.set(key, value); }
  getNumber(key) { return store.get(key); }
  getBoolean(key) { return store.get(key); }
  delete(key) { store.delete(key); }
  contains(key) { return store.has(key); }
  clearAll() { store.clear(); }
}

module.exports = { MMKV };
