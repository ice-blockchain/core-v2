import { runInferencePlatform } from './platform/run-inference';
import type { NsfwModel, PreprocessedImage, RawInferenceScores } from './types';

export async function runInference(
  model: NsfwModel,
  input: PreprocessedImage,
): Promise<RawInferenceScores> {
  return runInferencePlatform(model, input);
}
