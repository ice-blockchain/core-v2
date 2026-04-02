import { describe, it, expect, vi } from 'vitest';
import { NetworkError } from '@ion/network';
import type { HttpClient } from '@ion/network';

import { IdentityErrorCode } from '../errors';

import { createUserProfileDataSource } from './user-profile-data-source';

function createMockHttpClient(): HttpClient {
  return {
    get: vi.fn(() => Promise.resolve({ status: 200, headers: {}, body: {} })),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(() => Promise.resolve({ status: 200, headers: {}, body: {} })),
    delete: vi.fn(),
    upload: vi.fn(),
  } as unknown as HttpClient;
}

const mockProfile = {
  username: 'alice',
  displayName: 'Alice',
  avatar: null,
  bio: 'Hello',
  referral: null,
  referralMasterKey: null,
  referralCount: 0,
};

function createNicknameNetworkError(code: string): NetworkError {
  return new NetworkError({
    code: 'CLIENT_ERROR',
    message: 'Bad request',
    status: 400,
    responseBody: { code },
  });
}

describe('createUserProfileDataSource', () => {
  describe('getSocialProfile', () => {
    it('fetches social profile with correct URL and headers', async () => {
      const httpClient = createMockHttpClient();
      (httpClient.get as ReturnType<typeof vi.fn>).mockResolvedValue({
        status: 200,
        headers: {},
        body: mockProfile,
      });
      const dataSource = createUserProfileDataSource(httpClient);
      const result = await dataSource.getSocialProfile('master+key/special', 'alice');
      expect(result).toEqual(mockProfile);
      expect(httpClient.get).toHaveBeenCalledWith(
        `/v1/users/${encodeURIComponent('master+key/special')}/profiles/social`,
        { headers: { 'X-Username': 'alice' } },
      );
    });

    it('throws USER_NOT_FOUND on 404', async () => {
      const httpClient = createMockHttpClient();
      const networkError = new NetworkError({
        code: 'CLIENT_ERROR',
        message: 'not found',
        status: 404,
      });
      (httpClient.get as ReturnType<typeof vi.fn>).mockRejectedValue(networkError);
      const dataSource = createUserProfileDataSource(httpClient);
      await expect(dataSource.getSocialProfile('u1', 'alice')).rejects.toMatchObject({
        code: IdentityErrorCode.USER_NOT_FOUND,
      });
    });
  });

  describe('updateSocialProfile', () => {
    it('sends PATCH with correct URL, body, and headers', async () => {
      const updateResult = { username: 'alice', displayName: 'Alice', referral: null, usernameProof: [], referralMasterKey: null };
      const httpClient = createMockHttpClient();
      (httpClient.patch as ReturnType<typeof vi.fn>).mockResolvedValue({
        status: 200,
        headers: {},
        body: updateResult,
      });
      const dataSource = createUserProfileDataSource(httpClient);
      const input = { displayName: 'Alice' };
      const result = await dataSource.updateSocialProfile('u1', 'alice', input);
      expect(result).toEqual(updateResult);
      expect(httpClient.patch).toHaveBeenCalledWith('/v1/users/u1/profiles/social', {
        body: input,
        headers: { 'X-Username': 'alice' },
      });
    });

    it('maps INVALID_USERNAME to INVALID_NICKNAME', async () => {
      const httpClient = createMockHttpClient();
      (httpClient.patch as ReturnType<typeof vi.fn>).mockRejectedValue(
        createNicknameNetworkError('INVALID_USERNAME'),
      );
      const dataSource = createUserProfileDataSource(httpClient);
      await expect(dataSource.updateSocialProfile('u1', 'alice', {})).rejects.toMatchObject({
        code: IdentityErrorCode.INVALID_NICKNAME,
      });
    });

    it('maps DUPLICATE to NICKNAME_ALREADY_EXISTS', async () => {
      const httpClient = createMockHttpClient();
      (httpClient.patch as ReturnType<typeof vi.fn>).mockRejectedValue(
        createNicknameNetworkError('DUPLICATE'),
      );
      const dataSource = createUserProfileDataSource(httpClient);
      await expect(dataSource.updateSocialProfile('u1', 'alice', {})).rejects.toMatchObject({
        code: IdentityErrorCode.NICKNAME_ALREADY_EXISTS,
      });
    });

    it('maps RESERVED to NICKNAME_RESERVED', async () => {
      const httpClient = createMockHttpClient();
      (httpClient.patch as ReturnType<typeof vi.fn>).mockRejectedValue(
        createNicknameNetworkError('RESERVED'),
      );
      const dataSource = createUserProfileDataSource(httpClient);
      await expect(dataSource.updateSocialProfile('u1', 'alice', {})).rejects.toMatchObject({
        code: IdentityErrorCode.NICKNAME_RESERVED,
      });
    });
  });

  describe('verifyNickname', () => {
    it('sends GET with username query param', async () => {
      const httpClient = createMockHttpClient();
      const dataSource = createUserProfileDataSource(httpClient);
      await dataSource.verifyNickname('alice', 'bob');
      expect(httpClient.get).toHaveBeenCalledWith('/v1/users/verify-username-availability', {
        query: { username: 'bob' },
        headers: { 'X-Username': 'alice' },
      });
    });

    it('maps nickname errors on verify', async () => {
      const httpClient = createMockHttpClient();
      (httpClient.get as ReturnType<typeof vi.fn>).mockRejectedValue(
        createNicknameNetworkError('DUPLICATE'),
      );
      const dataSource = createUserProfileDataSource(httpClient);
      await expect(dataSource.verifyNickname('alice', 'bob')).rejects.toMatchObject({
        code: IdentityErrorCode.NICKNAME_ALREADY_EXISTS,
      });
    });
  });
});
