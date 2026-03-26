import type {
  PulseAggregate,
  PulseAggregateConfig,
  PulseEvent,
  PulseCountQuery,
  PulseCountResult,
  PulseTimeSeriesQuery,
  PulseTimeSeriesResult,
  PulseRankQuery,
  PulseRankResult,
} from './types.js';
import { applyPulseFilter } from './pulse-aggregate-filter.js';

const DEFAULT_MAX_EVENTS = 1_000_000;

function resolveGroupValue(event: PulseEvent, field: string): string {
  const value = (event as Record<string, unknown>)[field] ?? event.data[field];
  return String(value ?? 'unknown');
}

function buildCountMap(events: PulseEvent[], groupBy: string): Map<string, number> {
  const counts = new Map<string, number>();
  for (const event of events) {
    const key = resolveGroupValue(event, groupBy);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

function sortCountResultsDescending(results: PulseCountResult[]): PulseCountResult[] {
  return results.sort((a, b) => b.count - a.count);
}

function computeCount(query: PulseCountQuery, events: PulseEvent[]): PulseCountResult[] {
  const filtered = applyPulseFilter(events, query.filter);
  const counts = buildCountMap(filtered, query.groupBy);
  const results = Array.from(counts.entries()).map(([key, count]) => ({ key, count }));
  return sortCountResultsDescending(results);
}

function computeTimeSeries(query: PulseTimeSeriesQuery, events: PulseEvent[]): PulseTimeSeriesResult[] {
  const filtered = applyPulseFilter(events, query.filter);
  const buckets = new Map<number, number>();

  for (let bucket = query.startTime; bucket < query.endTime; bucket += query.bucketMs) {
    buckets.set(bucket, 0);
  }

  for (const event of filtered) {
    const bucket = query.startTime + Math.floor((event.timestamp - query.startTime) / query.bucketMs) * query.bucketMs;
    if (bucket >= query.startTime && bucket < query.endTime) {
      buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
    }
  }

  return Array.from(buckets.entries())
    .map(([bucket, count]) => ({ bucket, count }))
    .sort((a, b) => a.bucket - b.bucket);
}

function aggregateScoresBySoul(events: PulseEvent[], scoreField: string): Map<string, number> {
  const scores = new Map<string, number>();
  for (const event of events) {
    const score = Number(event.data[scoreField] ?? 0);
    scores.set(event.soul, (scores.get(event.soul) ?? 0) + score);
  }
  return scores;
}

function buildRankedResults(scores: Map<string, number>, limit: number): PulseRankResult[] {
  return Array.from(scores.entries())
    .map(([soul, score]) => ({ soul, score, rank: 0 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((result, index) => ({ ...result, rank: index + 1 }));
}

function computeRank(query: PulseRankQuery, events: PulseEvent[]): PulseRankResult[] {
  const filtered = applyPulseFilter(events, query.filter);
  const scores = aggregateScoresBySoul(filtered, query.scoreField);
  return buildRankedResults(scores, query.limit);
}

function enforceMaxEvents(events: PulseEvent[], maxEvents: number): PulseEvent[] {
  if (events.length <= maxEvents) return events;
  return events.slice(events.length - maxEvents);
}

export function createPulseAggregate(config?: PulseAggregateConfig): PulseAggregate {
  const maxEvents = config?.maxEvents ?? DEFAULT_MAX_EVENTS;
  let events: PulseEvent[] = [];

  return {
    ingestEvents(newEvents: PulseEvent[]): void {
      events = events.concat(newEvents);
      events = enforceMaxEvents(events, maxEvents);
    },

    pulseCount(query: PulseCountQuery): PulseCountResult[] {
      return computeCount(query, events);
    },

    pulseTimeSeries(query: PulseTimeSeriesQuery): PulseTimeSeriesResult[] {
      return computeTimeSeries(query, events);
    },

    pulseRank(query: PulseRankQuery): PulseRankResult[] {
      return computeRank(query, events);
    },

    getEventCount(): number {
      return events.length;
    },

    clear(): void {
      events = [];
    },

    destroy(): void {
      events = [];
    },
  };
}
