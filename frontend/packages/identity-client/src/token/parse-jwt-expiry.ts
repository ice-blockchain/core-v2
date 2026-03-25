export function parseJwtExpiry(token: string): number | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const payload = JSON.parse(atob(parts[1]!)) as { exp?: number };
    return payload.exp ?? null;
  } catch {
    return null;
  }
}
