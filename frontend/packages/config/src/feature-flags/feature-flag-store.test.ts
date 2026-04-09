import { describe, it, expect, beforeEach } from 'vitest';

import {
  getFeatureFlag,
  getAllFeatureFlags,
  setFeatureFlags,
  resetFeatureFlags,
} from './feature-flag-store';

describe('feature-flag-store', () => {
  beforeEach(async () => {
    await resetFeatureFlags();
  });

  it('returns false for all flags by default', async () => {
    expect(await getFeatureFlag('debugMenuEnabled')).toBe(false);
  });

  it('returns all flags as a snapshot', async () => {
    const flags = await getAllFeatureFlags();

    expect(flags).toEqual({
      debugMenuEnabled: false,
      darkModeEnabled: true,
    });
  });

  it('applies partial overrides', async () => {
    await setFeatureFlags({ debugMenuEnabled: true });

    expect(await getFeatureFlag('debugMenuEnabled')).toBe(true);
  });

  it('resets all flags to defaults', async () => {
    await setFeatureFlags({ debugMenuEnabled: true });
    await resetFeatureFlags();

    expect(await getFeatureFlag('debugMenuEnabled')).toBe(false);
  });

  it('returns a copy from getAllFeatureFlags, not the internal state', async () => {
    const flags = await getAllFeatureFlags();
    (flags as unknown as Record<string, boolean>).debugMenuEnabled = true;

    expect(await getFeatureFlag('debugMenuEnabled')).toBe(false);
  });
});
