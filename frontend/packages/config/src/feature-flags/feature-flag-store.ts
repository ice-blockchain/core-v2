import type { FeatureFlagName, FeatureFlags } from './feature-flag-types';
import { defaultFeatureFlags } from './feature-flag-defaults';

let flags: FeatureFlags = { ...defaultFeatureFlags };

export async function getFeatureFlag(name: FeatureFlagName): Promise<boolean> {
  return flags[name];
}

export async function getAllFeatureFlags(): Promise<FeatureFlags> {
  return { ...flags };
}

export async function setFeatureFlags(overrides: Partial<FeatureFlags>): Promise<void> {
  flags = { ...flags, ...overrides };
}

export async function resetFeatureFlags(): Promise<void> {
  flags = { ...defaultFeatureFlags };
}
