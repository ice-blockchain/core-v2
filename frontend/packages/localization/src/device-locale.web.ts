export function getDeviceLocale(): string {
  if (typeof navigator === 'undefined') return 'en';
  return navigator.languages?.[0] ?? navigator.language ?? 'en';
}
