export interface FeatureFlags {
  readonly debugMenuEnabled: boolean;
}

export type FeatureFlagName = keyof FeatureFlags;
