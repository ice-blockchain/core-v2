import type { PulseCountResult, PulseTimeSeriesResult, PulseRankResult } from './types.js';

function sumCountsByKey(partials: PulseCountResult[][]): Map<string, number> {
  const merged = new Map<string, number>();
  for (const partial of partials) {
    for (const result of partial) {
      merged.set(result.key, (merged.get(result.key) ?? 0) + result.count);
    }
  }
  return merged;
}

export function mergePulseCountResults(partials: PulseCountResult[][]): PulseCountResult[] {
  const merged = sumCountsByKey(partials);
  return Array.from(merged.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
}

function sumTimeSeriesByBucket(partials: PulseTimeSeriesResult[][]): Map<number, number> {
  const merged = new Map<number, number>();
  for (const partial of partials) {
    for (const result of partial) {
      merged.set(result.bucket, (merged.get(result.bucket) ?? 0) + result.count);
    }
  }
  return merged;
}

export function mergePulseTimeSeriesResults(partials: PulseTimeSeriesResult[][]): PulseTimeSeriesResult[] {
  const merged = sumTimeSeriesByBucket(partials);
  return Array.from(merged.entries())
    .map(([bucket, count]) => ({ bucket, count }))
    .sort((a, b) => a.bucket - b.bucket);
}

function sumScoresBySoul(partials: PulseRankResult[][]): Map<string, number> {
  const merged = new Map<string, number>();
  for (const partial of partials) {
    for (const result of partial) {
      merged.set(result.soul, (merged.get(result.soul) ?? 0) + result.score);
    }
  }
  return merged;
}

interface MergeRankOptions {
  partials: PulseRankResult[][];
  limit: number;
}

export function mergePulseRankResults(options: MergeRankOptions): PulseRankResult[] {
  const scores = sumScoresBySoul(options.partials);
  return Array.from(scores.entries())
    .map(([soul, score]) => ({ soul, score, rank: 0 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, options.limit)
    .map((result, index) => ({ ...result, rank: index + 1 }));
}
