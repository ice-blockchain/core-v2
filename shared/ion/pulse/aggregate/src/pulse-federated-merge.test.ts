import { describe, it, expect } from 'vitest';
import {
  mergePulseCountResults,
  mergePulseTimeSeriesResults,
  mergePulseRankResults,
} from './pulse-federated-merge.js';

describe('mergePulseCountResults', () => {
  it('sums counts for the same key across partials', () => {
    const result = mergePulseCountResults([
      [{ key: 'post', count: 5 }, { key: 'like', count: 3 }],
      [{ key: 'post', count: 10 }, { key: 'share', count: 2 }],
    ]);

    expect(result).toEqual([
      { key: 'post', count: 15 },
      { key: 'like', count: 3 },
      { key: 'share', count: 2 },
    ]);
  });

  it('sorts by count descending', () => {
    const result = mergePulseCountResults([
      [{ key: 'a', count: 1 }],
      [{ key: 'b', count: 10 }],
      [{ key: 'c', count: 5 }],
    ]);

    expect(result.map((r) => r.key)).toEqual(['b', 'c', 'a']);
  });

  it('handles empty partials', () => {
    const result = mergePulseCountResults([[], []]);
    expect(result).toEqual([]);
  });
});

describe('mergePulseTimeSeriesResults', () => {
  it('sums counts for the same bucket across partials', () => {
    const result = mergePulseTimeSeriesResults([
      [{ bucket: 0, count: 3 }, { bucket: 100, count: 5 }],
      [{ bucket: 0, count: 7 }, { bucket: 200, count: 2 }],
    ]);

    expect(result).toEqual([
      { bucket: 0, count: 10 },
      { bucket: 100, count: 5 },
      { bucket: 200, count: 2 },
    ]);
  });

  it('sorts by bucket ascending', () => {
    const result = mergePulseTimeSeriesResults([
      [{ bucket: 300, count: 1 }],
      [{ bucket: 100, count: 2 }],
      [{ bucket: 200, count: 3 }],
    ]);

    expect(result.map((r) => r.bucket)).toEqual([100, 200, 300]);
  });
});

describe('mergePulseRankResults', () => {
  it('sums scores for the same soul and re-ranks', () => {
    const result = mergePulseRankResults({
      partials: [
        [{ soul: 'alice', score: 10, rank: 1 }, { soul: 'bob', score: 5, rank: 2 }],
        [{ soul: 'bob', score: 20, rank: 1 }, { soul: 'alice', score: 3, rank: 2 }],
      ],
      limit: 10,
    });

    expect(result).toEqual([
      { soul: 'bob', score: 25, rank: 1 },
      { soul: 'alice', score: 13, rank: 2 },
    ]);
  });

  it('applies limit after merging', () => {
    const result = mergePulseRankResults({
      partials: [
        [
          { soul: 'a', score: 30, rank: 1 },
          { soul: 'b', score: 20, rank: 2 },
          { soul: 'c', score: 10, rank: 3 },
        ],
      ],
      limit: 2,
    });

    expect(result).toHaveLength(2);
    expect(result[0]!.soul).toBe('a');
    expect(result[1]!.soul).toBe('b');
  });

  it('assigns correct rank numbers', () => {
    const result = mergePulseRankResults({
      partials: [
        [{ soul: 'x', score: 5, rank: 1 }],
        [{ soul: 'y', score: 15, rank: 1 }],
        [{ soul: 'z', score: 10, rank: 1 }],
      ],
      limit: 3,
    });

    expect(result).toEqual([
      { soul: 'y', score: 15, rank: 1 },
      { soul: 'z', score: 10, rank: 2 },
      { soul: 'x', score: 5, rank: 3 },
    ]);
  });
});
