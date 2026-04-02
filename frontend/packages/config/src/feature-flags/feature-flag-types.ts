export interface FeatureFlags {
  readonly debugMenuEnabled: boolean;
  readonly darkModeEnabled: boolean;
}

export type FeatureFlagName = keyof FeatureFlags;
