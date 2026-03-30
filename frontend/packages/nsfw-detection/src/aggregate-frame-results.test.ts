import { describe, it, expect } from 'vitest';
import { aggregateFrameResults } from './aggregate-frame-results';
import type { FrameInferenceResult, RawInferenceScores } from './types';
import { mapScoresToCategories } from './map-scores-to-categories';

function makeFrameResult(
  frameIndex: number,
  scoreOverrides?: Partial<RawInferenceScores>,
): FrameInferenceResult {
  const scores: RawInferenceScores = {
    explicit: 0.1, suggestive: 0.1, violence: 0.1, hate: 0.1,
    ...scoreOverrides,
  };
  const categories = mapScoresToCategories(scores).categories;
  return { frameIndex, scores, categories };
}

describe('aggregateFrameResults', () => {
  it('uses worst-case score per category across frames', () => {
    const frames = [
      makeFrameResult(0, { explicit: 0.3 }),
      makeFrameResult(1, { explicit: 0.7 }),
    ];
    const result = aggregateFrameResults(frames, 2, []);
    const explicit = result.categories.find((c) => c.label === 'explicit')!;
    expect(explicit.confidence).toBe(0.7);
  });

  it('marks isSafe false when any frame exceeds threshold', () => {
    const frames = [
      makeFrameResult(0),
      makeFrameResult(1, { explicit: 0.95 }),
    ];
    const result = aggregateFrameResults(frames, 2, []);
    expect(result.isSafe).toBe(false);
  });

  it('marks isSafe true when all frames below all thresholds', () => {
    const frames = [makeFrameResult(0), makeFrameResult(1)];
    const result = aggregateFrameResults(frames, 2, []);
    expect(result.isSafe).toBe(true);
  });

  it('returns correct framesAnalyzed and totalFramesRequested', () => {
    const frames = [makeFrameResult(0)];
    const result = aggregateFrameResults(frames, 5, []);
    expect(result.framesAnalyzed).toBe(1);
    expect(result.totalFramesRequested).toBe(5);
  });

  it('identifies correct flaggedFrameIndices', () => {
    const frames = [
      makeFrameResult(0),
      makeFrameResult(1, { explicit: 0.95 }),
      makeFrameResult(2),
    ];
    const result = aggregateFrameResults(frames, 3, []);
    expect(result.flaggedFrameIndices).toEqual([1]);
  });

  it('handles single-frame input', () => {
    const frames = [makeFrameResult(0, { violence: 0.9 })];
    const result = aggregateFrameResults(frames, 1, []);
    expect(result.isSafe).toBe(false);
    expect(result.framesAnalyzed).toBe(1);
  });

  it('handles empty frameResults array', () => {
    const result = aggregateFrameResults([], 0, []);
    expect(result.isSafe).toBe(true);
    expect(result.framesAnalyzed).toBe(0);
    expect(result.flaggedFrameIndices).toEqual([]);
  });
});
