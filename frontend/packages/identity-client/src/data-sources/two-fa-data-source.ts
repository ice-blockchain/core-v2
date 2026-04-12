import type { HttpClient } from '@ion/network';
import { NetworkError } from '@ion/network';

import { IdentityError, IdentityErrorCode } from '../errors';

interface RequestTwoFAInput {
  '2FAVerificationCodes'?: Record<string, string>;
  email?: string;
  phoneNumber?: string;
  replace?: string;
}

type RequestTwoFAResponse = { TOTPAuthenticatorURL: string } | Record<string, never>;

interface TwoFAVerificationParam {
  twoFAOptionVerificationValue: string;
  twoFAOptionVerificationCode: string;
}

interface TwoFARequestOptions {
  userId: string;
  twoFAOption: string;
  username: string;
  userAction?: string;
}

interface TwoFADeleteOptions {
  userId: string;
  twoFAOption: string;
  twoFAValue: string;
  verificationParams: TwoFAVerificationParam[];
  username: string;
  userAction: string;
}

export interface TwoFADataSource {
  requestCode(options: TwoFARequestOptions, input: RequestTwoFAInput): Promise<RequestTwoFAResponse>;
  verifyCode(options: TwoFARequestOptions, code: string): Promise<void>;
  deleteMethod(options: TwoFADeleteOptions): Promise<void>;
}

function mapTwoFAError(error: unknown): never {
  if (error instanceof NetworkError) {
    const body = error.responseBody as Record<string, unknown> | undefined;
    const code = body?.code as string | undefined;
    if (code === '2FA_INVALID_CODE' || code === '2FA_EXPIRED_CODE') {
      throw new IdentityError(IdentityErrorCode.INVALID_TWO_FA_CODE, 'Invalid or expired 2FA code', error);
    }
    if (code === '2FA_NOT_CONFIGURED') {
      throw new IdentityError(IdentityErrorCode.TWO_FA_NOT_CONFIGURED, '2FA not configured', error);
    }
  }
  throw error;
}

function buildHeaders(username: string, userAction?: string): Record<string, string> {
  const headers: Record<string, string> = { 'X-Username': username };
  if (userAction) headers['X-Useraction'] = userAction;
  return headers;
}

function buildDeleteQuery(params: TwoFAVerificationParam[]): Record<string, string> {
  const query: Record<string, string> = {};
  params.forEach((param, index) => {
    query[`twoFAOptionVerificationValue${index}`] = param.twoFAOptionVerificationValue;
    query[`twoFAOptionVerificationCode${index}`] = param.twoFAOptionVerificationCode;
  });
  return query;
}

function buildVerificationUrl(userId: string, twoFAOption: string): string {
  return `/v1/users/${encodeURIComponent(userId)}/2fa/${encodeURIComponent(twoFAOption)}/verification-requests`;
}

async function sendRequestCode(
  httpClient: HttpClient,
  options: TwoFARequestOptions,
  input: RequestTwoFAInput,
): Promise<RequestTwoFAResponse> {
  try {
    const { body } = await httpClient.put<RequestTwoFAResponse>(
      buildVerificationUrl(options.userId, options.twoFAOption),
      { body: input, headers: buildHeaders(options.username, options.userAction) },
    );
    if (body === undefined) throw new Error('Empty response body from requestCode');
    return body;
  } catch (error) {
    mapTwoFAError(error);
  }
}

async function sendVerifyCode(
  httpClient: HttpClient,
  options: TwoFARequestOptions,
  code: string,
): Promise<void> {
  try {
    await httpClient.patch<void>(buildVerificationUrl(options.userId, options.twoFAOption), {
      body: {},
      headers: buildHeaders(options.username, options.userAction),
      query: { code },
    });
  } catch (error) {
    mapTwoFAError(error);
  }
}

async function sendDeleteMethod(httpClient: HttpClient, options: TwoFADeleteOptions): Promise<void> {
  try {
    const url = `/v1/users/${encodeURIComponent(options.userId)}/2fa/${encodeURIComponent(options.twoFAOption)}/values/${encodeURIComponent(options.twoFAValue)}`;
    await httpClient.delete<void>(url, {
      headers: buildHeaders(options.username, options.userAction),
      query: buildDeleteQuery(options.verificationParams),
    });
  } catch (error) {
    mapTwoFAError(error);
  }
}

export function createTwoFADataSource(httpClient: HttpClient): TwoFADataSource {
  return {
    requestCode: (options, input) => sendRequestCode(httpClient, options, input),
    verifyCode: (options, code) => sendVerifyCode(httpClient, options, code),
    deleteMethod: (options) => sendDeleteMethod(httpClient, options),
  };
}
