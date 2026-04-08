import { describe, it, expect, vi } from 'vitest';
import type { HttpClient } from '@ion/network';

import { createNetworksDataSource } from './networks-data-source';

function createMockHttpClient(): HttpClient {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    upload: vi.fn(),
    head: vi.fn(),
  };
}

const mockFee = {
  network: 'ethereum',
  estimatedBaseFee: 25,
  kind: null,
  fast: { maxFeePerGas: '100', maxPriorityFeePerGas: '10', feeRate: null, waitTime: 15 },
  standard: { maxFeePerGas: '80', maxPriorityFeePerGas: '5', feeRate: null, waitTime: 30 },
  slow: { maxFeePerGas: '60', maxPriorityFeePerGas: '2', feeRate: null, waitTime: 60 },
};

describe('createNetworksDataSource', () => {
  describe('estimateFees', () => {
    it('fetches fees with comma-joined networks and username header', async () => {
      const httpClient = createMockHttpClient();
      vi.mocked(httpClient.get).mockResolvedValueOnce({ status: 200, headers: {}, body: [mockFee] });
      const ds = createNetworksDataSource(httpClient);

      const result = await ds.estimateFees(['ethereum', 'polygon'], 'alice');

      expect(httpClient.get).toHaveBeenCalledWith('/networks/fees', {
        query: { network: 'ethereum,polygon' },
        headers: { 'X-Username': 'alice' },
      });
      expect(result).toEqual([mockFee]);
    });

    it('handles a single network', async () => {
      const httpClient = createMockHttpClient();
      vi.mocked(httpClient.get).mockResolvedValueOnce({ status: 200, headers: {}, body: [mockFee] });
      const ds = createNetworksDataSource(httpClient);

      await ds.estimateFees(['ethereum'], 'bob');

      expect(httpClient.get).toHaveBeenCalledWith('/networks/fees', {
        query: { network: 'ethereum' },
        headers: { 'X-Username': 'bob' },
      });
    });
  });
});
