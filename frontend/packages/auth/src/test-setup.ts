import { vi } from 'vitest';

vi.mock('@ion/localization', () => ({
  translate: (key: string) => key,
}));
