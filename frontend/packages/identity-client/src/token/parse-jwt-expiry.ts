export function parseJwtExpiry(token: string): number | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const b64 = parts[1]!.replace(/-/g, '+').replace(/_/g, '/');
    const padded = b64.padEnd(b64.length + (4 - b64.length % 4) % 4, '=');
    const payload = JSON.parse(atob(padded)) as Record<string, unknown>;
    if (typeof payload.exp !== 'number') return null;
    return payload.exp;
  } catch {
    return null;
  }
}
