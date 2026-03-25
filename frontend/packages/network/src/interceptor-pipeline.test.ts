import { describe, it, expect, vi } from 'vitest';
import {
  runRequestInterceptors,
  runResponseInterceptors,
  runErrorInterceptors,
} from './interceptor-pipeline';
import type { Interceptor, InterceptedRequest, InterceptedResponse } from './interceptor-types';
import { NetworkError } from './network-error';

vi.mock('@ion/diagnostics', () => ({
  Logger: { debug: vi.fn(), warning: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

const baseRequest: InterceptedRequest = {
  url: 'https://api.example.com/users',
  method: 'GET',
  headers: {},
};

const baseResponse: InterceptedResponse = {
  status: 200,
  headers: { 'content-type': 'application/json' },
  body: { id: 1 },
  url: 'https://api.example.com/users',
};

describe('runRequestInterceptors ordering', () => {
  it('runs request interceptors in order', async () => {
    const order: number[] = [];
    const interceptors: Interceptor[] = [
      { name: 'first', onRequest: async (r) => { order.push(1); return r; } },
      { name: 'second', onRequest: async (r) => { order.push(2); return r; } },
    ];
    await runRequestInterceptors({ request: baseRequest, interceptors });
    expect(order).toEqual([1, 2]);
  });

  it('passes modified request to next interceptor', async () => {
    const interceptors: Interceptor[] = [
      { name: 'auth', onRequest: async (r) => ({ ...r, headers: { ...r.headers, Authorization: 'Bearer token' } }) },
      { name: 'check', onRequest: async (r) => { expect(r.headers.Authorization).toBe('Bearer token'); return r; } },
    ];
    await runRequestInterceptors({ request: baseRequest, interceptors });
  });

  it('skips interceptors without onRequest', async () => {
    const interceptors: Interceptor[] = [
      { name: 'response-only', onResponse: async (r) => r },
      { name: 'auth', onRequest: async (r) => ({ ...r, headers: { ...r.headers, Authorization: 'Bearer tok' } }) },
    ];
    const result = await runRequestInterceptors({ request: baseRequest, interceptors });
    expect(result.headers.Authorization).toBe('Bearer tok');
  });
});

describe('runResponseInterceptors ordering', () => {
  it('runs response interceptors in reverse order', async () => {
    const order: number[] = [];
    const interceptors: Interceptor[] = [
      { name: 'first', onResponse: async (r) => { order.push(1); return r; } },
      { name: 'second', onResponse: async (r) => { order.push(2); return r; } },
    ];
    await runResponseInterceptors(interceptors, baseResponse);
    expect(order).toEqual([2, 1]);
  });

  it('passes modified response through chain', async () => {
    const interceptors: Interceptor[] = [
      { name: 'transform', onResponse: async (r) => ({ ...r, body: { ...r.body as object, extra: true } }) },
    ];
    const result = await runResponseInterceptors(interceptors, baseResponse);
    expect((result.body as Record<string, unknown>).extra).toBe(true);
  });
});

describe('runErrorInterceptors', () => {
  it('runs error interceptors in order', async () => {
    const order: number[] = [];
    const error = new NetworkError({ code: 'SERVER_ERROR', message: 'fail' });
    const interceptors: Interceptor[] = [
      { name: 'first', onError: async (e) => { order.push(1); return e; } },
      { name: 'second', onError: async (e) => { order.push(2); return e; } },
    ];
    await runErrorInterceptors(interceptors, error);
    expect(order).toEqual([1, 2]);
  });

  it('allows interceptor to replace error', async () => {
    const original = new NetworkError({ code: 'SERVER_ERROR', message: 'fail' });
    const replacement = new NetworkError({ code: 'CLIENT_ERROR', message: 'replaced' });
    const interceptors: Interceptor[] = [
      { name: 'replace', onError: async () => replacement },
    ];
    const result = await runErrorInterceptors(interceptors, original);
    expect(result.code).toBe('CLIENT_ERROR');
  });
});
