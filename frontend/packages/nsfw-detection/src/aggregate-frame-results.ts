import { DEFAULT_THRESHOLDS } from './thresholds';
import type {
  FrameInferenceResult,
  SafetyCategory,
  VideoFrameDetail,
  VideoSafetyResult,
} from './types';

export function aggregateFrameResults(
  frameResults: FrameInferenceResult[],
  totalFramesRequested: number,
  frames: VideoFrameDetail[],
): VideoSafetyResult {
  const categories = computeWorstPerCategory(frameResults);
  const flaggedFrameIndices = findFlaggedFrames(frameResults);

  return {
    isSafe: categories.every((c) => !c.isAboveThreshold),
    categories,
    framesAnalyzed: frameResults.length,
    totalFramesRequested,
    flaggedFrameIndices,
    frames,
  };
}

function computeWorstPerCategory(
  frameResults: FrameInferenceResult[],
): SafetyCategory[] {
  return DEFAULT_THRESHOLDS.map(({ label, threshold }) => {
    const worst = frameResults.length > 0
      ? Math.max(...frameResults.map((r) => r.scores[label]))
      : 0;
    return { label, confidence: worst, isAboveThreshold: worst >= threshold };
  });
}

function findFlaggedFrames(
  frameResults: FrameInferenceResult[],
): number[] {
  return frameResults
    .filter((r) => r.categories.some((c) => c.isAboveThreshold))
    .map((r) => r.frameIndex);
}
