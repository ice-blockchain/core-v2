import { describe, it, expect } from 'vitest';
import { cosineSimilarity } from './cosine-similarity.js';

describe('cosineSimilarity', () => {
  it('returns 1.0 for identical vectors', () => {
    const vector = [1, 2, 3, 4, 5];
    expect(cosineSimilarity(vector, vector)).toBeCloseTo(1.0);
  });

  it('returns 0.0 for orthogonal vectors', () => {
    const vectorA = [1, 0, 0];
    const vectorB = [0, 1, 0];
    expect(cosineSimilarity(vectorA, vectorB)).toBeCloseTo(0.0);
  });

  it('returns -1.0 for opposite vectors', () => {
    const vectorA = [1, 2, 3];
    const vectorB = [-1, -2, -3];
    expect(cosineSimilarity(vectorA, vectorB)).toBeCloseTo(-1.0);
  });

  it('returns 0 for zero-length vectors', () => {
    expect(cosineSimilarity([], [1, 2, 3])).toBe(0);
    expect(cosineSimilarity([1, 2, 3], [])).toBe(0);
    expect(cosineSimilarity([], [])).toBe(0);
  });

  it('returns 0 when a vector has all zeros', () => {
    const zero = [0, 0, 0];
    const normal = [1, 2, 3];
    expect(cosineSimilarity(zero, normal)).toBe(0);
    expect(cosineSimilarity(normal, zero)).toBe(0);
  });

  it('computes correct similarity for known vectors', () => {
    const vectorA = [1, 0];
    const vectorB = [1, 1];
    const expected = 1 / Math.sqrt(2);
    expect(cosineSimilarity(vectorA, vectorB)).toBeCloseTo(expected);
  });
});
