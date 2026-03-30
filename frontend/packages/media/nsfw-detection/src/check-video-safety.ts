import { Logger } from '@ion/diagnostics';
import { loadModel } from './load-model';
import { preprocessImage } from './preprocess-image';
import { runInference } from './run-inference';
import { mapScoresToCategories } from './map-scores-to-categories';
import { extractVideoFrames } from './extract-video-frames';
import { aggregateFrameResults } from './aggregate-frame-results';
import type {
  NsfwModel,
  ExtractedFrame,
  FrameInferenceResult,
  VideoFrameDetail,
  VideoSafetyOptions,
  VideoSafetyResult,
} from './types';

export async function checkVideoSafety(
  uri: string,
  options?: VideoSafetyOptions,
): Promise<VideoSafetyResult> {
  if (!uri) throw new Error('URI is required for safety check');

  try {
    const model = await loadModel();
    const frames = await extractVideoFrames(uri, options);
    const frameResults = await analyzeFrames(model, frames, options);
    const frameDetails = buildFrameDetails(frames, frameResults);
    return aggregateFrameResults(frameResults, frames.length, frameDetails);
  } catch (error) {
    Logger.error('Video safety check failed', {
      tag: 'nsfw-detection',
      error: error instanceof Error ? error : new Error(String(error)),
    });
    throw error;
  }
}

function buildFrameDetails(
  frames: ExtractedFrame[],
  results: FrameInferenceResult[],
): VideoFrameDetail[] {
  return results.map((r) => ({
    index: r.frameIndex,
    uri: frames[r.frameIndex]?.uri ?? '',
    scores: r.scores,
    categories: r.categories,
  }));
}

async function analyzeFrames(
  model: NsfwModel,
  frames: ExtractedFrame[],
  options?: VideoSafetyOptions,
): Promise<FrameInferenceResult[]> {
  const preprocessed = await Promise.all(
    frames.map((f) => preprocessImage(f.uri)),
  );

  const results: FrameInferenceResult[] = [];
  const shouldEarlyExit = options?.earlyExit ?? true;

  for (let i = 0; i < frames.length; i++) {
    const scores = await runInference(model, preprocessed[i]!);
    const categories = mapScoresToCategories(scores).categories;
    results.push({ frameIndex: frames[i]!.index, scores, categories });

    if (shouldEarlyExit && categories.some((c) => c.isAboveThreshold)) {
      break;
    }
  }
  return results;
}
