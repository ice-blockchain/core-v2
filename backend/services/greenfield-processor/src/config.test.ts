import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import loadConfig from './config.js';

const REQUIRED_ENV: Record<string, string> = {
  BUNNY_STORAGE_ZONE: 'test-zone',
  BUNNY_STORAGE_PASSWORD: 'test-password',
};

describe('loadConfig', () => {
  beforeEach(() => {
    for (const [key, value] of Object.entries(REQUIRED_ENV)) {
      process.env[key] = value;
    }
  });

  afterEach(() => {
    for (const key of Object.keys(REQUIRED_ENV)) {
      delete process.env[key];
    }
    delete process.env.ALLOWED_SP_HOSTNAME_PATTERN;
  });

  it('accepts a valid regex hostname pattern', () => {
    process.env.ALLOWED_SP_HOSTNAME_PATTERN = '.*\\.bnbchain\\.org';
    expect(() => loadConfig()).not.toThrow();
  });

  it('accepts empty hostname pattern', () => {
    process.env.ALLOWED_SP_HOSTNAME_PATTERN = '';
    expect(() => loadConfig()).not.toThrow();
  });

  it('rejects invalid regex hostname pattern', () => {
    process.env.ALLOWED_SP_HOSTNAME_PATTERN = '(unclosed';
    expect(() => loadConfig()).toThrow('not a valid regex');
  });

  it('rejects hostname pattern exceeding max length', () => {
    process.env.ALLOWED_SP_HOSTNAME_PATTERN = 'a'.repeat(201);
    expect(() => loadConfig()).toThrow('too long');
  });
});
