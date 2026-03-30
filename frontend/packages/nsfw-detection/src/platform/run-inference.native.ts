import type { TensorflowModel } from 'react-native-nitro-tflite';
import type {
  NsfwModel,
  PreprocessedImage,
  RawInferenceScores,
} from '../types';

// NSFWJS MobileNet v2 output classes (same order as web)
const NSFWJS_CLASSES = [
  'drawing',
  'hentai',
  'neutral',
  'porn',
  'sexy',
] as const;

export async function runInferencePlatform(
  model: NsfwModel,
  input: PreprocessedImage,
): Promise<RawInferenceScores> {
  const tfliteModel = model as TensorflowModel;
  const outputs = await tfliteModel.run([input.data]);
  const output = outputs[0];
  if (!output) throw new Error('TFLite model returned no output');
  return mapOutputToScores(output);
}

function mapOutputToScores(
  output: ArrayLike<number>,
): RawInferenceScores {
  const scores = Object.fromEntries(
    NSFWJS_CLASSES.map((name, i) => [name, output[i] ?? 0]),
  ) as Record<(typeof NSFWJS_CLASSES)[number], number>;

  return {
    explicit: Math.max(scores.porn, scores.hentai),
    suggestive: scores.sexy,
    violence: 0,
    hate: 0,
  };
}
