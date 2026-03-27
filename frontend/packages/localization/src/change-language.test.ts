import type { IKeyValueStorage } from '@ion/storage';

jest.mock('./restart-application', () => ({
  restartApplication: jest.fn(),
}));

import { changeLanguage } from './change-language';
import { restartApplication } from './restart-application';

function createMockStorage(): IKeyValueStorage & {
  store: Map<string, string>;
} {
  const store = new Map<string, string>();
  return {
    store,
    getString: (key: string) => store.get(key) ?? null,
    setString: (key: string, value: string) => { store.set(key, value); },
    getNumber: () => null,
    setNumber: () => {},
    getBoolean: () => null,
    setBoolean: () => {},
    getObject: () => null,
    setObject: () => {},
    removeItem: (key: string) => { store.delete(key); },
    hasItem: (key: string) => store.has(key),
    clear: () => { store.clear(); },
  };
}

describe('changeLanguage', () => {
  it('persists the locale to storage and restarts', () => {
    const storage = createMockStorage();
    changeLanguage({ locale: 'pt-BR', storage });

    expect(storage.store.get('user_preferred_locale')).toBe('pt-BR');
    expect(restartApplication).toHaveBeenCalledTimes(1);
  });
});
