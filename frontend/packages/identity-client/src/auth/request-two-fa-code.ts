import type { TwoFADataSource } from '../data-sources/two-fa-data-source';
import type { UserActionDataSource } from '../data-sources/user-action-data-source';
import { signUserAction } from './sign-user-action';

interface RequestTwoFACodeDeps {
  twoFADataSource: TwoFADataSource;
  userActionDataSource: UserActionDataSource;
  origin: string;
}

interface RequestTwoFAInput {
  '2FAVerificationCodes'?: Record<string, string>;
  email?: string;
  phoneNumber?: string;
  replace?: string;
}

type RequestTwoFAResponse = { TOTPAuthenticatorURL: string } | Record<string, never>;

interface RequestTwoFACodeParams {
  username: string;
  userId: string;
  twoFAOption: string;
  input: RequestTwoFAInput;
  signingContext: { kind: 'password'; password: string } | { kind: 'passkey' };
}

export async function requestTwoFACode(
  params: RequestTwoFACodeParams,
  deps: RequestTwoFACodeDeps,
): Promise<RequestTwoFAResponse> {
  const url = `/v1/users/${params.userId}/2fa/${params.twoFAOption}/verification-requests`;
  const userAction = await signUserAction(
    { username: params.username, httpMethod: 'PUT', httpPath: url, body: params.input, signingContext: params.signingContext },
    { userActionDataSource: deps.userActionDataSource, origin: deps.origin },
  );
  return deps.twoFADataSource.requestCode(
    { userId: params.userId, twoFAOption: params.twoFAOption, username: params.username, userAction },
    params.input,
  );
}
