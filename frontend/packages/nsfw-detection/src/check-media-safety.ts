import { Logger } from '@ion/diagnostics';
import { loadModel } from './load-model';
import { preprocessImage } from './preprocess-image';
import { runInference } from './run-inference';
import { mapScoresToCategories } from './map-scores-to-categories';
import type { SafetyResult } from './types';

export async function checkMediaSafety(
  uri: string,
): Promise<SafetyResult> {
  if (!uri) throw new Error('URI is required for safety check');

  try {
    const model = await loadModel();
    const preprocessed = await preprocessImage(uri);
    const scores = await runInference(model, preprocessed);
    return mapScoresToCategories(scores);
  } catch (error) {
    Logger.error('Media safety check failed', {
      tag: 'nsfw-detection',
      error: error instanceof Error ? error : new Error(String(error)),
    });
    throw error;
  }
}
