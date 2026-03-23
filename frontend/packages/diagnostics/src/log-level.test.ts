import { isLevelEnabled, getLevelLabel } from './log-level';
import { LogLevel } from './types';

describe('isLevelEnabled', () => {
  it('allows entry at same level as minimum', () => {
    expect(isLevelEnabled(LogLevel.Error, LogLevel.Error)).toBe(true);
  });

  it('allows entry above minimum level', () => {
    expect(isLevelEnabled(LogLevel.Fatal, LogLevel.Error)).toBe(true);
  });

  it('rejects entry below minimum level', () => {
    expect(isLevelEnabled(LogLevel.Debug, LogLevel.Warning)).toBe(false);
  });

  it('allows all levels when minimum is Debug', () => {
    expect(isLevelEnabled(LogLevel.Debug, LogLevel.Debug)).toBe(true);
    expect(isLevelEnabled(LogLevel.Info, LogLevel.Debug)).toBe(true);
    expect(isLevelEnabled(LogLevel.Fatal, LogLevel.Debug)).toBe(true);
  });
});

describe('getLevelLabel', () => {
  it('returns correct labels for each level', () => {
    expect(getLevelLabel(LogLevel.Debug)).toBe('DEBUG');
    expect(getLevelLabel(LogLevel.Info)).toBe('INFO');
    expect(getLevelLabel(LogLevel.Warning)).toBe('WARN');
    expect(getLevelLabel(LogLevel.Error)).toBe('ERROR');
    expect(getLevelLabel(LogLevel.Fatal)).toBe('FATAL');
  });
});
