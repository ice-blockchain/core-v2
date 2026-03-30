import type {
  NsfwModel,
  PreprocessedImage,
  RawInferenceScores,
} from '../types';

// Platform stub for tsc resolution.
// At runtime, bundlers resolve .native.ts or .web.ts instead.
export function runInferencePlatform(
  _model: NsfwModel,
  _input: PreprocessedImage,
): Promise<RawInferenceScores> {
  throw new Error('Platform implementation not resolved');
}
