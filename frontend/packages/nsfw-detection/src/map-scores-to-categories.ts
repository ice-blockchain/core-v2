import { DEFAULT_THRESHOLDS } from './thresholds';
import type { RawInferenceScores, SafetyResult } from './types';

export function mapScoresToCategories(
  scores: RawInferenceScores,
): SafetyResult {
  const categories = DEFAULT_THRESHOLDS
    .map(({ label, threshold }) => ({
      label,
      confidence: scores[label],
      isAboveThreshold: scores[label] >= threshold,
    }));

  return {
    isSafe: categories.every((c) => !c.isAboveThreshold),
    categories,
  };
}
