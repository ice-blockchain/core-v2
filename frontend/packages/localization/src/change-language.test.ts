import { describe, it, expect, vi } from 'vitest';

vi.mock('./restart-application', () => ({
  restartApplication: vi.fn(),
}));

vi.mock('@ion/storage', () => {
  const store = new Map<string, string>();
  return {
    createKeyValueStorage: () => ({
      getString: (key: string) => store.get(key) ?? null,
      setString: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => { store.delete(key); },
      hasItem: (key: string) => store.has(key),
      clear: () => { store.clear(); },
      __store: store,
    }),
  };
});

import { changeLanguage } from './change-language';
import { restartApplication } from './restart-application';
import { createKeyValueStorage } from '@ion/storage';

describe('changeLanguage', () => {
  it('persists the locale to storage and restarts', () => {
    changeLanguage('fr');

    const storage = createKeyValueStorage({ id: 'ion-localization' });
    const store = (storage as unknown as { __store: Map<string, string> }).__store;
    expect(store.get('user_preferred_locale')).toBe('fr');
    expect(restartApplication).toHaveBeenCalledTimes(1);
  });
});
