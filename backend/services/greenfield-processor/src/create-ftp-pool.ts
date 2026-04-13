import { Client } from 'basic-ftp';
import { createPool } from 'generic-pool';
import type { Pool } from 'generic-pool';

interface FtpPoolOptions {
  host: string;
  user: string;
  password: string;
  secure?: boolean;
  maxConnections: number;
}

export type FtpPool = Pool<Client>;

export default function createFtpPool(options: FtpPoolOptions): FtpPool {
  return createPool<Client>(
    {
      create: async () => {
        const client = new Client();
        await client.access({
          host: options.host,
          user: options.user,
          password: options.password,
          secure: options.secure ?? true,
        });
        return client;
      },
      validate: async (client) => {
        try {
          await client.pwd();
          return true;
        } catch {
          return false;
        }
      },
      destroy: async (client) => {
        client.close();
      },
    },
    {
      max: options.maxConnections,
      min: 0,
      testOnBorrow: true,
      acquireTimeoutMillis: 30_000,
      idleTimeoutMillis: 60_000,
    },
  );
}
