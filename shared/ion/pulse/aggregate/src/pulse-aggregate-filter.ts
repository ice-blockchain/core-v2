import type { PulseEvent, PulseAggregateFilter } from './types.js';

function matchesType(event: PulseEvent, type: string): boolean {
  return event.type === type;
}

function matchesLabels(event: PulseEvent, labels: string[]): boolean {
  if (!event.labels) return false;
  return labels.every((label) => event.labels!.includes(label));
}

function matchesTimeRange(event: PulseEvent, filter: PulseAggregateFilter): boolean {
  if (filter.startTime !== undefined && event.timestamp < filter.startTime) return false;
  if (filter.endTime !== undefined && event.timestamp >= filter.endTime) return false;
  return true;
}

function matchesFilter(event: PulseEvent, filter: PulseAggregateFilter): boolean {
  if (filter.type && !matchesType(event, filter.type)) return false;
  if (filter.labels && filter.labels.length > 0 && !matchesLabels(event, filter.labels)) return false;
  if (!matchesTimeRange(event, filter)) return false;
  return true;
}

export function applyPulseFilter(events: PulseEvent[], filter?: PulseAggregateFilter): PulseEvent[] {
  if (!filter) return events;
  return events.filter((event) => matchesFilter(event, filter));
}
