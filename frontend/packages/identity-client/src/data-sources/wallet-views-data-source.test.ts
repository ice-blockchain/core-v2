import { describe, it, expect, vi } from 'vitest';
import type { HttpClient } from '@ion/network';
import { createWalletViewsDataSource } from './wallet-views-data-source';

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

const mockSummary = { id: 'v1', name: 'My View', coins: [], symbolGroups: [] };
const mockDetail = { id: 'v1', name: 'My View', coins: [], aggregation: {}, symbolGroups: [] };
const mockInput = { name: 'My View', items: [], symbolGroups: [] };

describe('createWalletViewsDataSource', () => {
  it('lists wallet views with correct URL and header', async () => {
    const http = createMockHttpClient();
    vi.mocked(http.get).mockResolvedValueOnce({ status: 200, headers: {}, body: [mockSummary] });
    const ds = createWalletViewsDataSource(http);

    const result = await ds.listWalletViews('user-1', 'alice');

    expect(http.get).toHaveBeenCalledWith('/v1/users/user-1/wallet-views', {
      headers: { 'X-Username': 'alice' },
    });
    expect(result).toEqual([mockSummary]);
  });

  it('encodes userId in list path', async () => {
    const http = createMockHttpClient();
    vi.mocked(http.get).mockResolvedValueOnce({ status: 200, headers: {}, body: [] });
    const ds = createWalletViewsDataSource(http);

    await ds.listWalletViews('../admin', 'alice');

    expect(http.get).toHaveBeenCalledWith('/v1/users/..%2Fadmin/wallet-views', {
      headers: { 'X-Username': 'alice' },
    });
  });

  it('creates a wallet view with body and header', async () => {
    const http = createMockHttpClient();
    vi.mocked(http.post).mockResolvedValueOnce({ status: 201, headers: {}, body: mockDetail });
    const ds = createWalletViewsDataSource(http);

    const result = await ds.createWalletView('user-1', mockInput, 'alice');

    expect(http.post).toHaveBeenCalledWith('/v1/users/user-1/wallet-views', {
      headers: { 'X-Username': 'alice' },
      body: mockInput,
    });
    expect(result).toEqual(mockDetail);
  });

  it('gets a wallet view and returns body with headers', async () => {
    const http = createMockHttpClient();
    const responseHeaders = { 'x-next-page': 'token-abc' };
    vi.mocked(http.get).mockResolvedValueOnce({ status: 200, headers: responseHeaders, body: mockDetail });
    const ds = createWalletViewsDataSource(http);

    const result = await ds.getWalletView({ userId: 'user-1', walletViewId: 'v1', username: 'alice' });

    expect(http.get).toHaveBeenCalledWith('/v1/users/user-1/wallet-views/v1', {
      headers: { 'X-Username': 'alice' },
      query: {},
    });
    expect(result.body).toEqual(mockDetail);
    expect(result.headers).toEqual(responseHeaders);
  });

  it('passes query params to getWalletView', async () => {
    const http = createMockHttpClient();
    vi.mocked(http.get).mockResolvedValueOnce({ status: 200, headers: {}, body: mockDetail });
    const ds = createWalletViewsDataSource(http);

    await ds.getWalletView({ userId: 'user-1', walletViewId: 'v1', username: 'alice', query: { limit: 10, paginationToken: 'tok' } });

    expect(http.get).toHaveBeenCalledWith('/v1/users/user-1/wallet-views/v1', {
      headers: { 'X-Username': 'alice' },
      query: { limit: '10', paginationToken: 'tok' },
    });
  });

  it('encodes walletViewId in get path', async () => {
    const http = createMockHttpClient();
    vi.mocked(http.get).mockResolvedValueOnce({ status: 200, headers: {}, body: mockDetail });
    const ds = createWalletViewsDataSource(http);

    await ds.getWalletView({ userId: 'user-1', walletViewId: 'a/b', username: 'alice' });

    expect(http.get).toHaveBeenCalledWith('/v1/users/user-1/wallet-views/a%2Fb', {
      headers: { 'X-Username': 'alice' },
      query: {},
    });
  });

  it('updates a wallet view with body', async () => {
    const http = createMockHttpClient();
    vi.mocked(http.put).mockResolvedValueOnce({ status: 200, headers: {}, body: mockDetail });
    const ds = createWalletViewsDataSource(http);

    const result = await ds.updateWalletView({ userId: 'user-1', walletViewId: 'v1', input: mockInput, username: 'alice' });

    expect(http.put).toHaveBeenCalledWith('/v1/users/user-1/wallet-views/v1', {
      headers: { 'X-Username': 'alice' },
      body: mockInput,
    });
    expect(result).toEqual(mockDetail);
  });

  it('deletes a wallet view', async () => {
    const http = createMockHttpClient();
    vi.mocked(http.delete).mockResolvedValueOnce({ status: 204, headers: {}, body: undefined });
    const ds = createWalletViewsDataSource(http);

    await ds.deleteWalletView('user-1', 'v1', 'alice');

    expect(http.delete).toHaveBeenCalledWith('/v1/users/user-1/wallet-views/v1', {
      headers: { 'X-Username': 'alice' },
    });
  });
});
