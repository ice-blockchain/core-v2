import { describe, it, expect, vi } from 'vitest';
import { createHttpsValidator } from './https-validator';

vi.mock('@ion/diagnostics', () => ({
  Logger: { warning: vi.fn(), debug: vi.fn(), info: vi.fn(), error: vi.fn() },
}));

describe('createHttpsValidator setup', () => {
  it('allows HTTPS URLs', () => {
    const validate = createHttpsValidator({ allowlist: [], isProduction: false });
    expect(() => validate('https://api.example.com/users')).not.toThrow();
  });

  it('rejects HTTP URLs without allowlist', () => {
    const validate = createHttpsValidator({ allowlist: [], isProduction: false });
    expect(() => validate('http://api.example.com/users')).toThrow('HTTPS required');
  });

  it('throws if allowlist is non-empty in production', () => {
    expect(() => createHttpsValidator({
      allowlist: ['localhost'],
      isProduction: true,
    })).toThrow('HTTPS allowlist must be empty in production');
  });

  it('rejects public domains in allowlist', () => {
    expect(() => createHttpsValidator({
      allowlist: ['api.example.com'],
      isProduction: false,
    })).toThrow('HTTPS allowlist only accepts private/local hosts');
  });
});

describe('createHttpsValidator allowlist', () => {
  it('allows localhost via allowlist', () => {
    const validate = createHttpsValidator({ allowlist: ['localhost'], isProduction: false });
    expect(() => validate('http://localhost:3000/api')).not.toThrow();
  });

  it('allows 127.0.0.1 via allowlist', () => {
    const validate = createHttpsValidator({ allowlist: ['127.0.0.1'], isProduction: false });
    expect(() => validate('http://127.0.0.1:8080/api')).not.toThrow();
  });

  it('allows RFC1918 addresses via allowlist', () => {
    const validate = createHttpsValidator({ allowlist: ['192.168.1.1'], isProduction: false });
    expect(() => validate('http://192.168.1.1/api')).not.toThrow();
  });
});
