import { describe, it, expect } from 'vitest';
import { parseResponse, validateRequestBodySize } from './response-parser';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('parseResponse JSON', () => {
  it('parses JSON response', async () => {
    const response = jsonResponse({ id: 1, name: 'Alice' });
    const result = await parseResponse<{ id: number; name: string }>(response);
    expect(result).toEqual({ id: 1, name: 'Alice' });
  });

  it('returns undefined for 204 No Content', async () => {
    const response = new Response(null, { status: 204 });
    const result = await parseResponse(response);
    expect(result).toBeUndefined();
  });
});

describe('parseResponse content-type detection', () => {
  it('throws PARSE_ERROR for HTML response', async () => {
    const response = new Response('<html>Error</html>', {
      status: 500,
      headers: { 'content-type': 'text/html' },
    });
    await expect(parseResponse(response)).rejects.toThrow('HTML response');
  });

  it('throws PARSE_ERROR for text/plain response', async () => {
    const response = new Response('plain text', {
      status: 200,
      headers: { 'content-type': 'text/plain' },
    });
    await expect(parseResponse(response)).rejects.toThrow('text/plain');
  });

  it('throws PARSE_ERROR for invalid JSON', async () => {
    const response = new Response('not json', {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
    await expect(parseResponse(response)).rejects.toThrow('Failed to parse');
  });
});

describe('parseResponse size limit', () => {
  it('throws when response exceeds max size', async () => {
    const bigBody = 'x'.repeat(1000);
    const response = new Response(bigBody, {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
    await expect(
      parseResponse(response, { maxResponseSizeBytes: 100 }),
    ).rejects.toThrow('exceeds max size');
  });
});

describe('validateRequestBodySize', () => {
  it('allows body within limit', () => {
    expect(() => validateRequestBodySize({ data: 'small' }, 1024)).not.toThrow();
  });

  it('throws when body exceeds limit', () => {
    const bigBody = { data: 'x'.repeat(1000) };
    expect(() => validateRequestBodySize(bigBody, 100)).toThrow('exceeds max size');
  });

  it('skips validation for undefined body', () => {
    expect(() => validateRequestBodySize(undefined, 100)).not.toThrow();
  });
});
