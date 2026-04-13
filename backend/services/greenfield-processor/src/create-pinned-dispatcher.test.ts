import { describe, it, expect } from 'vitest';
import createPinnedDispatcher from './create-pinned-dispatcher.js';

describe('createPinnedDispatcher', () => {
  it('creates a dispatcher that can be closed', async () => {
    const dispatcher = createPinnedDispatcher('203.0.113.10', 4);
    expect(dispatcher).toBeDefined();
    expect(typeof dispatcher.close).toBe('function');
    await dispatcher.close();
  });

  it('creates distinct dispatchers per call', async () => {
    const d1 = createPinnedDispatcher('203.0.113.10', 4);
    const d2 = createPinnedDispatcher('203.0.113.11', 4);
    expect(d1).not.toBe(d2);
    await d1.close();
    await d2.close();
  });
});
