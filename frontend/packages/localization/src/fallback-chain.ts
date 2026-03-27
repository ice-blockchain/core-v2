export function buildFallbackChain(
  locale: string,
  defaultLocale: string,
): string[] {
  const chain: string[] = [locale];
  const dashIndex = locale.indexOf('-');
  if (dashIndex > 0) {
    chain.push(locale.substring(0, dashIndex));
  }
  if (!chain.includes(defaultLocale)) {
    chain.push(defaultLocale);
  }
  return chain;
}
