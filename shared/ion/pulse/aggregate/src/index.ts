export {
  createPulseAggregate,
  createInMemoryAggregate,
  matchesFilter,
} from './pulse-aggregate';
export { createDuckDbAggregate } from './pulse-aggregate-duckdb';
export type {
  PulseAggregateConfig,
  PulseAnalyticsEvent,
  PulseCountQuery,
  PulseEventFilter,
  PulseCountResult,
  PulseTimeSeriesQuery,
  PulseTimeSeriesResult,
  PulseAggregateInstance,
} from './types';
