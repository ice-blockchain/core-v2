// Stub for react-native's codegenNativeComponent used by react-native-svg
// On web, native components are not used — this returns a no-op component factory
export default function codegenNativeComponent<T>(_name: string) {
  return (_props: T) => null;
}
