import { jwtDecode } from 'jwt-decode';

interface IdentityTokenPayload {
  'https://custom/app_metadata'?: { userId?: string };
}

export function parseUserIdFromToken(token: string): string | null {
  try {
    const payload = jwtDecode<IdentityTokenPayload>(token);
    const userId = payload['https://custom/app_metadata']?.userId;
    return typeof userId === 'string' && userId.length > 0 ? userId : null;
  } catch {
    return null;
  }
}
