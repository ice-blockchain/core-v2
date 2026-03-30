declare module 'react-native-fast-tflite' {
  type TypedArray =
    | Float32Array
    | Float64Array
    | Int8Array
    | Int16Array
    | Int32Array
    | Uint8Array
    | Uint16Array
    | Uint32Array;

  interface TensorflowModel {
    run(input: TypedArray[]): Promise<TypedArray[]>;
    runSync(input: TypedArray[]): TypedArray[];
  }

  type ModelSource = number | { url: string; headers?: Record<string, string> };

  export function loadTensorflowModel(
    source: ModelSource,
    delegate?: string,
  ): Promise<TensorflowModel>;
}
