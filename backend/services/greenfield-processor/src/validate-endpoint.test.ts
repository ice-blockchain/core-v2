import { describe, it, expect, vi } from 'vitest';
import assertSafeEndpoint from './validate-endpoint.js';

vi.mock('node:dns/promises', () => ({
  lookup: vi.fn(async (hostname: string) => {
    const map: Record<string, string> = {
      'sp1.bnbchain.org': '203.0.113.10',
      'sp.nodereal.io': '203.0.113.11',
      'evil.example.com': '203.0.113.12',
      'any-public-host.example.com': '203.0.113.13',
      'sp.bnbchain.org': '203.0.113.14',
      'rebind.evil.com': '10.0.0.1',
      'ipv6-loopback.evil.com': '::1',
      'ipv6-link-local.evil.com': 'fe80::1',
      'ipv6-unique-local.evil.com': 'fd00::1',
      'ipv6-ula-fc01.evil.com': 'fc01::1',
      'ipv6-ula-fcab.evil.com': 'fcab::1',
      'ipv6-ula-fd12.evil.com': 'fd12::1',
      'ipv6-ula-fdff.evil.com': 'fdff::1',
      'ipv6-mapped.evil.com': '::ffff:192.168.1.1',
      'ipv6-mapped-hex-loopback.evil.com': '::ffff:7f00:1',
      'ipv6-mapped-hex-10.evil.com': '::ffff:a00:1',
      'ipv6-mapped-hex-172.evil.com': '::ffff:ac10:fe01',
      'ipv6-6to4.evil.com': '2002:c0a8:0101::1',
      'ipv6-nat64.evil.com': '64:ff9b::10.0.0.1',
      'ipv6-unspecified.evil.com': '::',
      'cgnat.evil.com': '100.64.0.1',
      'benchmark.evil.com': '198.18.0.1',
      'reserved.evil.com': '240.0.0.1',
    };
    const address = map[hostname];
    if (!address) return { address: '203.0.113.99' };
    return { address };
  }),
}));

describe('assertSafeEndpoint', () => {
  it('returns validated IP and family for valid HTTPS endpoints', async () => {
    const result1 = await assertSafeEndpoint('https://sp1.bnbchain.org');
    expect(result1).toEqual({ ip: '203.0.113.10', family: 4 });

    const result2 = await assertSafeEndpoint('https://sp.nodereal.io:443');
    expect(result2).toEqual({ ip: '203.0.113.11', family: 4 });
  });

  it('rejects HTTP endpoints', async () => {
    await expect(assertSafeEndpoint('http://sp1.bnbchain.org'))
      .rejects.toThrow('must use HTTPS');
  });

  it('rejects non-HTTP protocols', async () => {
    await expect(assertSafeEndpoint('ftp://sp.example.com'))
      .rejects.toThrow('must use HTTPS');
  });

  it('rejects private IP 10.x', async () => {
    await expect(assertSafeEndpoint('https://10.0.0.1'))
      .rejects.toThrow('private IP');
  });

  it('rejects private IP 172.16.x', async () => {
    await expect(assertSafeEndpoint('https://172.16.0.1'))
      .rejects.toThrow('private IP');
  });

  it('rejects private IP 192.168.x', async () => {
    await expect(assertSafeEndpoint('https://192.168.1.1'))
      .rejects.toThrow('private IP');
  });

  it('rejects loopback 127.x', async () => {
    await expect(assertSafeEndpoint('https://127.0.0.1'))
      .rejects.toThrow('private IP');
  });

  it('rejects link-local 169.254.x', async () => {
    await expect(assertSafeEndpoint('https://169.254.169.254'))
      .rejects.toThrow('private IP');
  });

  it('rejects 0.x addresses', async () => {
    await expect(assertSafeEndpoint('https://0.0.0.0'))
      .rejects.toThrow('private IP');
  });

  it('rejects localhost', async () => {
    await expect(assertSafeEndpoint('https://localhost'))
      .rejects.toThrow('private host');
  });

  it('rejects IPv6 loopback', async () => {
    await expect(assertSafeEndpoint('https://[::1]'))
      .rejects.toThrow('private host');
  });

  it('rejects invalid URL', async () => {
    await expect(assertSafeEndpoint('not-a-url'))
      .rejects.toThrow('Invalid SP endpoint URL');
  });

  it('enforces hostname allowlist when provided', async () => {
    const result = await assertSafeEndpoint('https://sp.bnbchain.org', '.*\\.bnbchain\\.org');
    expect(result).toEqual({ ip: '203.0.113.14', family: 4 });
    await expect(assertSafeEndpoint('https://evil.example.com', '.*\\.bnbchain\\.org'))
      .rejects.toThrow('hostname not allowed');
  });

  it('skips allowlist check when pattern is not provided', async () => {
    const result = await assertSafeEndpoint('https://any-public-host.example.com');
    expect(result).toEqual({ ip: '203.0.113.13', family: 4 });
  });

  it('returns family 4 for IPv4 addresses', async () => {
    const result = await assertSafeEndpoint('https://8.8.8.8');
    expect(result).toEqual({ ip: '8.8.8.8', family: 4 });
  });

  // --- DNS rebinding ---

  it('rejects hostname resolving to private IPv4 via DNS', async () => {
    await expect(assertSafeEndpoint('https://rebind.evil.com'))
      .rejects.toThrow('private IP');
  });

  it('rejects hostname resolving to IPv6 loopback via DNS', async () => {
    await expect(assertSafeEndpoint('https://ipv6-loopback.evil.com'))
      .rejects.toThrow('private IPv6');
  });

  it('rejects hostname resolving to IPv6 link-local via DNS', async () => {
    await expect(assertSafeEndpoint('https://ipv6-link-local.evil.com'))
      .rejects.toThrow('private IPv6');
  });

  it('rejects hostname resolving to IPv6 unique-local via DNS', async () => {
    await expect(assertSafeEndpoint('https://ipv6-unique-local.evil.com'))
      .rejects.toThrow('private IPv6');
  });

  it('rejects fc01::1 (ULA outside fc00: prefix)', async () => {
    await expect(assertSafeEndpoint('https://ipv6-ula-fc01.evil.com'))
      .rejects.toThrow('private IPv6');
  });

  it('rejects fcab::1 (ULA outside fc00: prefix)', async () => {
    await expect(assertSafeEndpoint('https://ipv6-ula-fcab.evil.com'))
      .rejects.toThrow('private IPv6');
  });

  it('rejects fd12::1 (ULA outside fd00: prefix)', async () => {
    await expect(assertSafeEndpoint('https://ipv6-ula-fd12.evil.com'))
      .rejects.toThrow('private IPv6');
  });

  it('rejects fdff::1 (ULA at end of fc00::/7 range)', async () => {
    await expect(assertSafeEndpoint('https://ipv6-ula-fdff.evil.com'))
      .rejects.toThrow('private IPv6');
  });

  it('rejects hostname resolving to IPv4-mapped IPv6 private address', async () => {
    await expect(assertSafeEndpoint('https://ipv6-mapped.evil.com'))
      .rejects.toThrow('private IPv6');
  });

  it('rejects IPv4-mapped IPv6 in hex form (loopback 7f00:1)', async () => {
    await expect(assertSafeEndpoint('https://ipv6-mapped-hex-loopback.evil.com'))
      .rejects.toThrow('private IPv6');
  });

  it('rejects IPv4-mapped IPv6 in hex form (10.x -> a00:1)', async () => {
    await expect(assertSafeEndpoint('https://ipv6-mapped-hex-10.evil.com'))
      .rejects.toThrow('private IPv6');
  });

  it('rejects IPv4-mapped IPv6 in hex form (172.16.x -> ac10:fe01)', async () => {
    await expect(assertSafeEndpoint('https://ipv6-mapped-hex-172.evil.com'))
      .rejects.toThrow('private IPv6');
  });

  it('rejects 6to4 address tunneling to private IPv4', async () => {
    await expect(assertSafeEndpoint('https://ipv6-6to4.evil.com'))
      .rejects.toThrow('private IPv6');
  });

  it('rejects NAT64 well-known prefix mapping to private IPv4', async () => {
    await expect(assertSafeEndpoint('https://ipv6-nat64.evil.com'))
      .rejects.toThrow('private IPv6');
  });

  it('rejects IPv6 unspecified address (::)', async () => {
    await expect(assertSafeEndpoint('https://ipv6-unspecified.evil.com'))
      .rejects.toThrow('private IPv6');
  });

  it('rejects CGNAT range 100.64.x.x', async () => {
    await expect(assertSafeEndpoint('https://cgnat.evil.com'))
      .rejects.toThrow('private IP');
  });

  it('rejects benchmark range 198.18.x.x', async () => {
    await expect(assertSafeEndpoint('https://benchmark.evil.com'))
      .rejects.toThrow('private IP');
  });

  it('rejects reserved range 240.x.x.x', async () => {
    await expect(assertSafeEndpoint('https://reserved.evil.com'))
      .rejects.toThrow('private IP');
  });

  // --- Anchored hostname pattern ---

  it('auto-anchoring rejects suffix-only match that would bypass without anchors', async () => {
    // Without anchoring, 'bnbchain\.org' would match 'bnbchain.org.evil.com'
    // With auto-anchoring, it becomes ^bnbchain\.org$ which rejects it
    await expect(
      assertSafeEndpoint('https://sp1.bnbchain.org', 'bnbchain\\.org'),
    ).rejects.toThrow('hostname not allowed');
  });

  it('auto-anchoring accepts exact match', async () => {
    const result = await assertSafeEndpoint('https://sp1.bnbchain.org', '.*\\.bnbchain\\.org');
    expect(result.ip).toBe('203.0.113.10');
  });

  it('auto-anchoring prevents subdomain-suffix bypass', async () => {
    // 'example\.com' with anchoring becomes ^example\.com$ — rejects subdomains
    await expect(
      assertSafeEndpoint('https://evil.example.com', 'example\\.com'),
    ).rejects.toThrow('hostname not allowed');
  });
});
