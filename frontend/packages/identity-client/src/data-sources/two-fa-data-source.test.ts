import { describe, it, expect, vi } from 'vitest';
import { NetworkError } from '@ion/network';
import type { HttpClient } from '@ion/network';

import { IdentityErrorCode } from '../errors';

import { createTwoFADataSource } from './two-fa-data-source';

function createMockHttpClient(): HttpClient {
  return {
    get: vi.fn(),
    head: vi.fn(),
    post: vi.fn(),
    put: vi.fn(() => Promise.resolve({ status: 200, headers: {}, body: { TOTPAuthenticatorURL: 'otpauth://...' } })),
    patch: vi.fn(() => Promise.resolve({ status: 200, headers: {}, body: {} })),
    delete: vi.fn(() => Promise.resolve({ status: 200, headers: {}, body: {} })),
    upload: vi.fn(),
  } as unknown as HttpClient;
}

function defaultRequestOptions() {
  return { userId: 'u1', twoFAOption: 'totp', username: 'alice' };
}

describe('createTwoFADataSource', () => {
  it('requestCode sends PUT with correct URL and headers', async () => {
    const httpClient = createMockHttpClient();
    const dataSource = createTwoFADataSource(httpClient);
    const input = { email: 'a@b.com' };
    const result = await dataSource.requestCode(defaultRequestOptions(), input);
    expect(result).toEqual({ TOTPAuthenticatorURL: 'otpauth://...' });
    expect(httpClient.put).toHaveBeenCalledWith('/v1/users/u1/2fa/totp/verification-requests', {
      body: input,
      headers: { 'X-Username': 'alice' },
    });
  });

  it('verifyCode sends PATCH with code in query', async () => {
    const httpClient = createMockHttpClient();
    const dataSource = createTwoFADataSource(httpClient);
    await dataSource.verifyCode(defaultRequestOptions(), '123456');
    expect(httpClient.patch).toHaveBeenCalledWith('/v1/users/u1/2fa/totp/verification-requests', {
      body: {},
      headers: { 'X-Username': 'alice' },
      query: { code: '123456' },
    });
  });

  it('deleteMethod sends DELETE with userAction header and verification query params', async () => {
    const httpClient = createMockHttpClient();
    const dataSource = createTwoFADataSource(httpClient);
    await dataSource.deleteMethod({
      userId: 'u1',
      twoFAOption: 'totp',
      twoFAValue: 'val1',
      verificationParams: [
        { twoFAOptionVerificationValue: 'email', twoFAOptionVerificationCode: '111' },
      ],
      username: 'alice',
      userAction: 'ua-signed',
    });
    expect(httpClient.delete).toHaveBeenCalledWith('/v1/users/u1/2fa/totp/values/val1', {
      headers: {
        'X-Username': 'alice',
        'X-Useraction': 'ua-signed',
      },
      query: {
        twoFAOptionVerificationValue0: 'email',
        twoFAOptionVerificationCode0: '111',
      },
    });
  });

  it('maps 2FA_INVALID_CODE network error to INVALID_TWO_FA_CODE', async () => {
    const networkError = new NetworkError({
      code: 'CLIENT_ERROR',
      message: 'Bad request',
      status: 400,
      responseBody: { code: '2FA_INVALID_CODE' },
    });
    const httpClient = createMockHttpClient();
    (httpClient.put as ReturnType<typeof vi.fn>).mockRejectedValue(networkError);
    const dataSource = createTwoFADataSource(httpClient);
    await expect(dataSource.requestCode(defaultRequestOptions(), {})).rejects.toMatchObject({
      code: IdentityErrorCode.INVALID_TWO_FA_CODE,
    });
  });
});
