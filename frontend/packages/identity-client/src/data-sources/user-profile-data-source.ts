import type { HttpClient } from '@ion/network';
import { NetworkError } from '@ion/network';

import { IdentityError, IdentityErrorCode } from '../errors';
import type { SocialProfile, UpdateSocialProfileInput, UpdateSocialProfileResult } from '../users/types';

export interface UserProfileDataSource {
  getSocialProfile(userIdOrMasterKey: string, username: string): Promise<SocialProfile>;
  updateSocialProfile(userId: string, username: string, input: UpdateSocialProfileInput): Promise<UpdateSocialProfileResult>;
  verifyNickname(username: string, nickname: string): Promise<void>;
}

function mapNicknameError(error: unknown): never {
  if (error instanceof NetworkError) {
    const body = error.responseBody as Record<string, unknown> | undefined;
    const code = body?.code as string | undefined;
    if (code === 'INVALID_USERNAME') {
      throw new IdentityError(IdentityErrorCode.INVALID_NICKNAME, 'Invalid nickname', error);
    }
    if (code === 'DUPLICATE') {
      throw new IdentityError(IdentityErrorCode.NICKNAME_ALREADY_EXISTS, 'Nickname already exists', error);
    }
    if (code === 'RESERVED') {
      throw new IdentityError(IdentityErrorCode.NICKNAME_RESERVED, 'Nickname is reserved', error);
    }
  }
  throw error;
}

async function sendGetSocialProfile(
  httpClient: HttpClient,
  userIdOrMasterKey: string,
  username: string,
): Promise<SocialProfile> {
  try {
    const { body } = await httpClient.get<SocialProfile>(
      `/v1/users/${encodeURIComponent(userIdOrMasterKey)}/profiles/social`,
      { headers: { 'X-Username': username } },
    );
    return body;
  } catch (error) {
    if (error instanceof NetworkError && error.status === 404) {
      throw new IdentityError(IdentityErrorCode.USER_NOT_FOUND, 'User not found', error);
    }
    throw error;
  }
}

async function sendUpdateSocialProfile(
  httpClient: HttpClient,
  options: { userId: string; username: string; input: UpdateSocialProfileInput },
): Promise<UpdateSocialProfileResult> {
  try {
    const { body } = await httpClient.patch<UpdateSocialProfileResult>(
      `/v1/users/${encodeURIComponent(options.userId)}/profiles/social`,
      { body: options.input, headers: { 'X-Username': options.username } },
    );
    return body;
  } catch (error) {
    mapNicknameError(error);
  }
}

async function sendVerifyNickname(
  httpClient: HttpClient,
  username: string,
  nickname: string,
): Promise<void> {
  try {
    await httpClient.get<Record<string, unknown>>(
      '/v1/users/verify-username-availability',
      { query: { username: nickname }, headers: { 'X-Username': username } },
    );
  } catch (error) {
    mapNicknameError(error);
  }
}

export function createUserProfileDataSource(httpClient: HttpClient): UserProfileDataSource {
  return {
    getSocialProfile: (id, username) => sendGetSocialProfile(httpClient, id, username),
    updateSocialProfile: (userId, username, input) => sendUpdateSocialProfile(httpClient, { userId, username, input }),
    verifyNickname: (username, nickname) => sendVerifyNickname(httpClient, username, nickname),
  };
}
