import { describe, it, expect, vi } from 'vitest';
import { followRedirects } from './redirect-handler';

describe('followRedirects no redirect', () => {
  it('returns response when no redirect', async () => {
    const response = new Response('ok', { status: 200 });
    const mockFetch = vi.fn().mockResolvedValue(response);
    const request = new Request('https://api.example.com/users', { redirect: 'manual' });
    const result = await followRedirects(
      { maxRedirects: 5, originalUrl: 'https://api.example.com/users' },
      mockFetch,
      request,
    );
    expect(result.status).toBe(200);
  });
});

describe('followRedirects same-origin', () => {
  it('follows same-origin redirect', async () => {
    const redirect = new Response(null, { status: 302, headers: { location: '/new-path' } });
    const final = new Response('ok', { status: 200 });
    const mockFetch = vi.fn().mockResolvedValueOnce(redirect).mockResolvedValueOnce(final);
    const request = new Request('https://api.example.com/old', { redirect: 'manual' });
    const result = await followRedirects(
      { maxRedirects: 5, originalUrl: 'https://api.example.com/old' },
      mockFetch,
      request,
    );
    expect(result.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });
});

describe('followRedirects SSRF protection', () => {
  it('throws on redirect to private IP from public origin', async () => {
    const redirect = new Response(null, { status: 302, headers: { location: 'https://169.254.169.254/metadata' } });
    const mockFetch = vi.fn().mockResolvedValue(redirect);
    const request = new Request('https://api.example.com/endpoint', { redirect: 'manual' });
    await expect(followRedirects(
      { maxRedirects: 5, originalUrl: 'https://api.example.com/endpoint' },
      mockFetch, request,
    )).rejects.toThrow('SSRF');
  });

  it('throws on redirect to localhost from public origin', async () => {
    const redirect = new Response(null, { status: 302, headers: { location: 'https://localhost:8080/admin' } });
    const mockFetch = vi.fn().mockResolvedValue(redirect);
    const request = new Request('https://api.example.com/endpoint', { redirect: 'manual' });
    await expect(followRedirects(
      { maxRedirects: 5, originalUrl: 'https://api.example.com/endpoint' },
      mockFetch, request,
    )).rejects.toThrow('SSRF');
  });

  it('throws on redirect to ::1 from public origin', async () => {
    const redirect = new Response(null, { status: 302, headers: { location: 'https://[::1]:8080/admin' } });
    const mockFetch = vi.fn().mockResolvedValue(redirect);
    const request = new Request('https://api.example.com/endpoint', { redirect: 'manual' });
    await expect(followRedirects(
      { maxRedirects: 5, originalUrl: 'https://api.example.com/endpoint' },
      mockFetch, request,
    )).rejects.toThrow('SSRF');
  });
});

describe('followRedirects scheme validation', () => {
  it('throws on redirect to file:// scheme', async () => {
    const redirect = new Response(null, { status: 302, headers: { location: 'file:///etc/passwd' } });
    const mockFetch = vi.fn().mockResolvedValue(redirect);
    const request = new Request('https://api.example.com/endpoint', { redirect: 'manual' });
    await expect(followRedirects(
      { maxRedirects: 5, originalUrl: 'https://api.example.com/endpoint' },
      mockFetch, request,
    )).rejects.toThrow('non-HTTP(S) scheme');
  });
});

describe('followRedirects HTTPS downgrade protection', () => {
  it('throws on HTTPS-to-HTTP downgrade redirect', async () => {
    const redirect = new Response(null, { status: 302, headers: { location: 'http://api.example.com/path' } });
    const mockFetch = vi.fn().mockResolvedValue(redirect);
    const request = new Request('https://api.example.com/start', { redirect: 'manual' });
    await expect(followRedirects(
      { maxRedirects: 5, originalUrl: 'https://api.example.com/start' },
      mockFetch, request,
    )).rejects.toThrow('HTTPS-to-HTTP downgrade blocked');
  });

  it('allows HTTP-to-HTTP redirect', async () => {
    const redirect = new Response(null, { status: 302, headers: { location: 'http://localhost/new' } });
    const final = new Response('ok', { status: 200 });
    const mockFetch = vi.fn().mockResolvedValueOnce(redirect).mockResolvedValueOnce(final);
    const request = new Request('http://localhost/old', { redirect: 'manual' });
    const result = await followRedirects(
      { maxRedirects: 5, originalUrl: 'http://localhost/old' },
      mockFetch, request,
    );
    expect(result.status).toBe(200);
  });
});

describe('followRedirects loop detection', () => {
  it('throws on redirect loop exceeding max', async () => {
    const redirect = new Response(null, { status: 302, headers: { location: 'https://api.example.com/loop' } });
    const mockFetch = vi.fn().mockResolvedValue(redirect);
    const request = new Request('https://api.example.com/start', { redirect: 'manual' });
    await expect(followRedirects(
      { maxRedirects: 3, originalUrl: 'https://api.example.com/start' },
      mockFetch, request,
    )).rejects.toThrow('Max redirects exceeded');
  });
});
