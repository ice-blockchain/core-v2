/**
 * Integration test for TonStorageClient against a real tonutils-storage daemon.
 *
 * Prerequisites:
 *   1. Start the daemon:  .local/tonutils-storage -api 127.0.0.1:8192 -db .local/db -daemon
 *   2. Run this test:     pnpm --filter @ion/ton-storage test:integration
 *
 * This test validates that our HTTP client maps correctly to the real API.
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { createTonStorageClient } from './ton-storage-client';
import { createHttpClient } from '@ion/network';
import type { TonStorageClient } from './types';

const API_PORT = 8192;
const API_BASE = `http://127.0.0.1:${API_PORT}`;

let client: TonStorageClient;

beforeAll(async () => {
  const httpClient = createHttpClient({
    baseUrl: API_BASE,
    httpsAllowlist: ['127.0.0.1'],
  });
  client = createTonStorageClient(httpClient);

  // Verify daemon is reachable
  try {
    await client.listBags();
  } catch {
    throw new Error(
      `Cannot reach tonutils-storage at ${API_BASE}. ` +
      'Start it with: .local/tonutils-storage -api 127.0.0.1:8192 -db .local/db -daemon',
    );
  }
});

describe('TonStorageClient integration', () => {
  it('lists bags from the daemon (initially empty or with existing bags)', async () => {
    const bags = await client.listBags();
    expect(Array.isArray(bags)).toBe(true);
    for (const bag of bags) {
      expect(bag.bagId).toBeDefined();
      expect(typeof bag.totalSize).toBe('number');
      expect(typeof bag.isActive).toBe('boolean');
    }
  });

  it('adds and then removes a well-known public bag', async () => {
    // TON Docs bag — lightweight, always available on the network
    const testBagId = '85d0998dcf325b6fee4f529d4dcf66fb253fc39c59687c82a0ef7fc96fed4c9f';

    await client.addBag({
      bagId: testBagId,
      downloadPath: '/tmp/ton-storage-integration-test',
      downloadAll: true,
    });

    // Give the daemon a moment to register the bag
    await delay(2000);

    const bags = await client.listBags();
    const found = bags.find((b) => b.bagId === testBagId);
    expect(found).toBeDefined();
    expect(found!.bagId).toBe(testBagId);

    // Fetch details
    const details = await client.getBagDetails(testBagId);
    expect(details.bagId).toBe(testBagId);
    expect(typeof details.totalSize).toBe('number');
    expect(Array.isArray(details.files)).toBe(true);

    // Stop and remove
    await client.stopBag(testBagId);
    await client.removeBag(testBagId, true);

    // Verify removal
    const bagsAfter = await client.listBags();
    const stillThere = bagsAfter.find((b) => b.bagId === testBagId);
    expect(stillThere).toBeUndefined();
  }, 30_000);

  it('getFilePath constructs a local path', () => {
    const path = client.getFilePath('abc123', 0);
    expect(path).toBe('abc123/0');
  });
});

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
