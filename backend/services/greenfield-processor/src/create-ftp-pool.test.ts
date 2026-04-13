import { describe, it, expect, vi } from 'vitest';

vi.mock('basic-ftp', () => ({
  Client: vi.fn().mockImplementation(() => ({
    access: vi.fn(async () => {}),
    pwd: vi.fn(async () => '/'),
    close: vi.fn(),
  })),
}));

vi.mock('generic-pool', () => ({
  createPool: vi.fn(
    (factory: { create: () => Promise<unknown> }, _opts: unknown) => {
      let lastCreated: unknown;
      return {
        factory,
        acquire: async () => {
          lastCreated = await factory.create();
          return lastCreated;
        },
        _getLastCreated: () => lastCreated,
      };
    },
  ),
}));

import createFtpPool from './create-ftp-pool.js';

describe('createFtpPool', () => {
  it('creates FTP connections with secure: true by default', async () => {
    const pool = createFtpPool({
      host: 'storage.bunnycdn.com',
      user: 'zone',
      password: 'secret',
      maxConnections: 2,
    });

    const client = await (pool as unknown as { acquire: () => Promise<{ access: ReturnType<typeof vi.fn> }> }).acquire();

    expect(client.access).toHaveBeenCalledWith(
      expect.objectContaining({ secure: true }),
    );
  });

  it('passes secure: false when explicitly configured', async () => {
    const pool = createFtpPool({
      host: 'storage.bunnycdn.com',
      user: 'zone',
      password: 'secret',
      secure: false,
      maxConnections: 2,
    });

    const client = await (pool as unknown as { acquire: () => Promise<{ access: ReturnType<typeof vi.fn> }> }).acquire();

    expect(client.access).toHaveBeenCalledWith(
      expect.objectContaining({ secure: false }),
    );
  });
});
