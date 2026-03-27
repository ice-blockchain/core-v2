import { jwtDecode } from 'jwt-decode';

export function parseJwtExpiry(token: string): number | null {
  try {
    const payload = jwtDecode(token);
    if (typeof payload.exp !== 'number') return null;
    return payload.exp;
  } catch {
    return null;
  }
}
