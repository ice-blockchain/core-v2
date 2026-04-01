export function parseUserIdFromToken(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(atob(parts[1]!.replace(/-/g, '+').replace(/_/g, '/')));
    const userId = payload['https://custom/app_metadata']?.userId;
    return typeof userId === 'string' && userId.length > 0 ? userId : null;
  } catch {
    return null;
  }
}
