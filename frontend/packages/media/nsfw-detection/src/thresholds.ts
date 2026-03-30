import type { CategoryThreshold } from './types';

export const DEFAULT_THRESHOLDS: CategoryThreshold[] = [
  { label: 'explicit', threshold: 0.50 },
  { label: 'suggestive', threshold: 0.50 },
  { label: 'violence', threshold: 0.60 },
  { label: 'hate', threshold: 0.60 },
];
