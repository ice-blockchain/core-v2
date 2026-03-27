import { buildFallbackChain } from './fallback-chain';

describe('buildFallbackChain', () => {
  it('builds chain from regional locale to base to default', () => {
    expect(buildFallbackChain('pt-BR', 'en')).toEqual(['pt-BR', 'pt', 'en']);
  });

  it('builds chain from base locale to default', () => {
    expect(buildFallbackChain('fr', 'en')).toEqual(['fr', 'en']);
  });

  it('returns single-entry chain when locale is the default', () => {
    expect(buildFallbackChain('en', 'en')).toEqual(['en']);
  });

  it('does not duplicate default when base matches default', () => {
    expect(buildFallbackChain('en-US', 'en')).toEqual(['en-US', 'en']);
  });

  it('handles script subtags like zh-Hant-TW', () => {
    const chain = buildFallbackChain('zh-Hant-TW', 'en');
    expect(chain).toEqual(['zh-Hant-TW', 'zh', 'en']);
  });
});
