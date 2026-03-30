import * as tf from '@tensorflow/tfjs';
import type {
  NsfwModel,
  PreprocessedImage,
  RawInferenceScores,
} from '../types';

// NSFWJS MobileNet v2 output classes (index order)
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
  const inputTensor = tf.tensor3d(
    input.data,
    [input.height, input.width, input.channels],
  );
  const batched = inputTensor.expandDims(0);
  const prediction = (model as tf.GraphModel).predict(batched) as tf.Tensor;
  const probabilities = await prediction.data();

  inputTensor.dispose();
  batched.dispose();
  prediction.dispose();

  return mapProbabilitiesToScores(probabilities);
}

function mapProbabilitiesToScores(
  probabilities: tf.TypedArray,
): RawInferenceScores {
  const scores = Object.fromEntries(
    NSFWJS_CLASSES.map((name, i) => [name, probabilities[i]]),
  ) as Record<(typeof NSFWJS_CLASSES)[number], number>;

  return {
    explicit: Math.max(scores.porn, scores.hentai),
    suggestive: scores.sexy,
    violence: 0,
    hate: 0,
  };
}
