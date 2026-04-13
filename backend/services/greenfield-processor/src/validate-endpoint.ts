import { lookup } from 'node:dns/promises';
import { isIPv4, isIPv6 } from 'node:net';

export interface ValidatedEndpoint {
  ip: string;
  family: 4 | 6;
}

const PRIVATE_IPV4_PATTERN = /^(0\.|10\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|127\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|198\.1[89]\.|240\.)/;
const PRIVATE_HOSTNAMES = new Set(['localhost', '[::1]']);

export default async function assertSafeEndpoint(
  endpoint: string,
  allowedHostnamePattern?: string,
): Promise<ValidatedEndpoint> {
  const parsed = parseEndpointUrl(endpoint);
  assertHttpsProtocol(parsed);
  assertNotPrivateHostname(parsed.hostname);
  const resolved = await resolveToIp(parsed.hostname);
  assertNotPrivateIp(resolved.address);

  if (allowedHostnamePattern) {
    assertHostnameAllowed(parsed.hostname, allowedHostnamePattern);
  }

  return { ip: resolved.address, family: resolved.family };
}

function parseEndpointUrl(endpoint: string): URL {
  try {
    return new URL(endpoint);
  } catch {
    throw new Error(`Invalid SP endpoint URL: ${endpoint}`);
  }
}

function assertHttpsProtocol(parsed: URL): void {
  if (parsed.protocol !== 'https:') {
    throw new Error(
      `SP endpoint must use HTTPS: ${parsed.protocol}//${parsed.hostname}`,
    );
  }
}

function assertNotPrivateHostname(hostname: string): void {
  if (PRIVATE_HOSTNAMES.has(hostname.toLowerCase())) {
    throw new Error(`SP endpoint resolves to private host: ${hostname}`);
  }
}

interface ResolvedAddress {
  address: string;
  family: 4 | 6;
}

async function resolveToIp(hostname: string): Promise<ResolvedAddress> {
  const bare = hostname.replace(/^\[|\]$/g, '');
  if (isIPv4(bare)) return { address: bare, family: 4 };
  if (isIPv6(bare)) return { address: bare, family: 6 };

  const result = await lookup(hostname);
  const family = isIPv4(result.address) ? 4 : 6;
  return { address: result.address, family };
}

function assertNotPrivateIp(ip: string): void {
  if (PRIVATE_IPV4_PATTERN.test(ip)) {
    throw new Error(`SP endpoint resolves to private IP: ${ip}`);
  }
  if (isPrivateIPv6(ip)) {
    throw new Error(`SP endpoint resolves to private IPv6: ${ip}`);
  }
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === '::1' || lower === '::') return true;
  if (lower.startsWith('fe80:')) return true;
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true;
  if (lower.startsWith('2002:')) return true;
  if (lower.startsWith('64:ff9b:')) return true;
  if (lower.startsWith('::ffff:')) {
    const mapped = lower.slice(7);
    if (PRIVATE_IPV4_PATTERN.test(mapped)) return true;
    return isPrivateIPv4MappedHex(mapped);
  }
  return false;
}

function isPrivateIPv4MappedHex(mapped: string): boolean {
  const match = mapped.match(/^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (!match) return false;
  const hi = parseInt(match[1], 16);
  const lo = parseInt(match[2], 16);
  const dotted = `${hi >> 8}.${hi & 0xff}.${lo >> 8}.${lo & 0xff}`;
  return PRIVATE_IPV4_PATTERN.test(dotted);
}

function assertHostnameAllowed(hostname: string, pattern: string): void {
  const anchored = anchorPattern(pattern);
  const regex = new RegExp(anchored);
  if (!regex.test(hostname)) {
    throw new Error(`SP endpoint hostname not allowed: ${hostname}`);
  }
}

function anchorPattern(pattern: string): string {
  let result = pattern;
  if (!result.startsWith('^')) result = '^' + result;
  if (!result.endsWith('$')) result = result + '$';
  return result;
}
