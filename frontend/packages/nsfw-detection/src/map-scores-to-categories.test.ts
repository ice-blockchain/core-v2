import { describe, it, expect } from 'vitest';
import { mapScoresToCategories } from './map-scores-to-categories';
import type { RawInferenceScores } from './types';

function makeScores(overrides?: Partial<RawInferenceScores>): RawInferenceScores {
  return { explicit: 0.1, suggestive: 0.1, violence: 0.1, hate: 0.1, ...overrides };
}

describe('mapScoresToCategories', () => {
  it('maps scores to all four category labels', () => {
    const result = mapScoresToCategories(makeScores());
    const labels = result.categories.map((c) => c.label);
    expect(labels).toEqual(['explicit', 'suggestive', 'violence', 'hate']);
  });

  it('marks category above threshold correctly', () => {
    const result = mapScoresToCategories(makeScores({ explicit: 0.95 }));
    const explicit = result.categories.find((c) => c.label === 'explicit')!;
    expect(explicit.isAboveThreshold).toBe(true);
    expect(explicit.confidence).toBe(0.95);
  });

  it('marks category below threshold correctly', () => {
    const result = mapScoresToCategories(makeScores({ explicit: 0.3 }));
    const explicit = result.categories.find((c) => c.label === 'explicit')!;
    expect(explicit.isAboveThreshold).toBe(false);
  });

  it('handles exact-threshold boundary as above', () => {
    const result = mapScoresToCategories(makeScores({ explicit: 0.50 }));
    const explicit = result.categories.find((c) => c.label === 'explicit')!;
    expect(explicit.isAboveThreshold).toBe(true);
  });

  it('sets isSafe true when all below threshold', () => {
    const result = mapScoresToCategories(makeScores());
    expect(result.isSafe).toBe(true);
  });

  it('sets isSafe false when any above threshold', () => {
    const result = mapScoresToCategories(makeScores({ hate: 0.95 }));
    expect(result.isSafe).toBe(false);
  });
});
