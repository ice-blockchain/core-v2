import { describe, it, expect, vi } from 'vitest';
import type { HttpClient } from '@ion/network';
import { createRelayDataSource } from './relay-data-source';

function createMockHttpClient(): HttpClient {
  return {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
    upload: vi.fn(),
  };
}

const mockRelayInfos = [
  {
    masterPubKey: 'key1',
    ionConnectRelays: [{ url: 'wss://r1', type: 'read' as const }],
    username: 'alice',
    displayName: 'Alice',
    avatar: null,
  },
];

describe('createRelayDataSource', () => {
  describe('getIonConnectRelays', () => {
    it('sends repeated query params for master pubkeys in URL', async () => {
      const httpClient = createMockHttpClient();
      vi.mocked(httpClient.get).mockResolvedValueOnce({
        status: 200, headers: {}, body: mockRelayInfos,
      });
      const ds = createRelayDataSource(httpClient);

      const result = await ds.getIonConnectRelays('alice', ['key1', 'key2']);

      expect(httpClient.get).toHaveBeenCalledWith(
        '/v1/users/ion-connect-relays?masterPubkey=key1&masterPubkey=key2',
        { headers: { 'X-Username': 'alice' } },
      );
      expect(result).toEqual(mockRelayInfos);
    });

    it('sends URL without query string when array is empty', async () => {
      const httpClient = createMockHttpClient();
      vi.mocked(httpClient.get).mockResolvedValueOnce({
        status: 200, headers: {}, body: [],
      });
      const ds = createRelayDataSource(httpClient);

      await ds.getIonConnectRelays('alice', []);

      expect(httpClient.get).toHaveBeenCalledWith(
        '/v1/users/ion-connect-relays',
        { headers: { 'X-Username': 'alice' } },
      );
    });
  });

  describe('getIonConnectIndexers', () => {
    it('unwraps ionConnectIndexers from response', async () => {
      const httpClient = createMockHttpClient();
      vi.mocked(httpClient.get).mockResolvedValueOnce({
        status: 200, headers: {}, body: { ionConnectIndexers: ['wss://idx1'] },
      });
      const ds = createRelayDataSource(httpClient);

      const result = await ds.getIonConnectIndexers('u1', 'alice');

      expect(result).toEqual(['wss://idx1']);
    });
  });

  describe('setIonConnectRelays', () => {
    it('sends PATCH with followeeList and unwraps response', async () => {
      const httpClient = createMockHttpClient();
      const relays = [{ url: 'wss://r1', type: 'read' as const }];
      vi.mocked(httpClient.patch).mockResolvedValueOnce({
        status: 200, headers: {}, body: { ionConnectRelays: relays },
      });
      const ds = createRelayDataSource(httpClient);

      const result = await ds.setIonConnectRelays('u1', 'alice', ['url1']);

      expect(httpClient.patch).toHaveBeenCalledWith(
        `/v1/users/${encodeURIComponent('u1')}/ion-connect-relays`,
        {
          body: { followeeList: ['url1'] },
          headers: { 'X-Username': 'alice' },
        },
      );
      expect(result).toEqual(relays);
    });
  });

  describe('getAvailableRelays', () => {
    it('normalizes wss URL by stripping :443', async () => {
      const httpClient = createMockHttpClient();
      const relays = [{ url: 'wss://relay.ice.io', type: null }];
      vi.mocked(httpClient.get).mockResolvedValueOnce({
        status: 200, headers: {}, body: { ionConnectRelays: relays },
      });
      const ds = createRelayDataSource(httpClient);

      await ds.getAvailableRelays('alice', 'u1', 'wss://relay.ice.io:443/');

      expect(httpClient.get).toHaveBeenCalledWith(
        `/v1/users/${encodeURIComponent('u1')}/all-available-ion-connect-relays`,
        {
          query: { 'ion-connect-relay': 'wss://relay.ice.io/' },
          headers: { 'X-Username': 'alice' },
        },
      );
    });

    it('passes X-Username header for auth interceptor', async () => {
      const httpClient = createMockHttpClient();
      vi.mocked(httpClient.get).mockResolvedValueOnce({
        status: 200, headers: {}, body: { ionConnectRelays: [] },
      });
      const ds = createRelayDataSource(httpClient);

      await ds.getAvailableRelays('bob', 'u2', 'wss://relay.ice.io');

      const callArgs = vi.mocked(httpClient.get).mock.calls[0]!;
      expect(callArgs[1]?.headers).toEqual({ 'X-Username': 'bob' });
    });

    it('does not strip :443 from non-wss URLs', async () => {
      const httpClient = createMockHttpClient();
      vi.mocked(httpClient.get).mockResolvedValueOnce({
        status: 200, headers: {}, body: { ionConnectRelays: [] },
      });
      const ds = createRelayDataSource(httpClient);

      await ds.getAvailableRelays('alice', 'u1', 'https://relay.ice.io:443/');

      const callArgs = vi.mocked(httpClient.get).mock.calls[0]!;
      expect(callArgs[1]?.query).toEqual({
        'ion-connect-relay': 'https://relay.ice.io:443/',
      });
    });
  });

  describe('getContentCreators', () => {
    it('sends POST with limit query and exclusion body', async () => {
      const httpClient = createMockHttpClient();
      vi.mocked(httpClient.post).mockResolvedValueOnce({
        status: 200, headers: {}, body: mockRelayInfos,
      });
      const ds = createRelayDataSource(httpClient);

      const result = await ds.getContentCreators('alice', 10, ['key1']);

      expect(httpClient.post).toHaveBeenCalledWith(
        '/v1/users/get-content-creators',
        {
          query: { limit: '10' },
          body: { excludeMasterPubKeys: ['key1'] },
          headers: { 'X-Username': 'alice' },
        },
      );
      expect(result).toEqual(mockRelayInfos);
    });
  });

  describe('searchUsers', () => {
    it('sends all search params as query', async () => {
      const httpClient = createMockHttpClient();
      vi.mocked(httpClient.get).mockResolvedValueOnce({
        status: 200, headers: {}, body: [],
      });
      const ds = createRelayDataSource(httpClient);

      await ds.searchUsers('alice', {
        keyword: 'bob',
        limit: 20,
        offset: 0,
        type: 'startsWith',
      });

      expect(httpClient.get).toHaveBeenCalledWith(
        '/v1/user-social-profiles',
        {
          query: { keyword: 'bob', limit: '20', offset: '0', type: 'startsWith' },
          headers: { 'X-Username': 'alice' },
        },
      );
    });

    it('includes optional followedBy and followerOf params', async () => {
      const httpClient = createMockHttpClient();
      vi.mocked(httpClient.get).mockResolvedValueOnce({
        status: 200, headers: {}, body: [],
      });
      const ds = createRelayDataSource(httpClient);

      await ds.searchUsers('alice', {
        keyword: 'bob',
        limit: 10,
        offset: 0,
        type: 'contains',
        followedBy: 'user1',
        followerOf: 'user2',
      });

      const callArgs = vi.mocked(httpClient.get).mock.calls[0]!;
      expect(callArgs[1]?.query).toEqual({
        keyword: 'bob',
        limit: '10',
        offset: '0',
        type: 'contains',
        followedBy: 'user1',
        followerOf: 'user2',
      });
    });

    it('omits followedBy and followerOf when not provided', async () => {
      const httpClient = createMockHttpClient();
      vi.mocked(httpClient.get).mockResolvedValueOnce({
        status: 200, headers: {}, body: [],
      });
      const ds = createRelayDataSource(httpClient);

      await ds.searchUsers('alice', {
        keyword: 'test',
        limit: 5,
        offset: 0,
        type: 'startsWith',
      });

      const callArgs = vi.mocked(httpClient.get).mock.calls[0]!;
      const query = callArgs[1]?.query as Record<string, string>;
      expect(query).not.toHaveProperty('followedBy');
      expect(query).not.toHaveProperty('followerOf');
    });
  });
});
