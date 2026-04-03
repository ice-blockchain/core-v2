import type { TwoFADataSource } from '../data-sources/two-fa-data-source';
import type { UserActionDataSource } from '../data-sources/user-action-data-source';
import { signUserAction } from './sign-user-action';

interface VerifyTwoFACodeDeps {
  twoFADataSource: TwoFADataSource;
  userActionDataSource: UserActionDataSource;
  origin: string;
}

interface VerifyTwoFACodeParams {
  username: string;
  userId: string;
  twoFAOption: string;
  code: string;
  signingContext: { kind: 'password'; password: string } | { kind: 'passkey' };
}

export async function verifyTwoFACode(
  params: VerifyTwoFACodeParams,
  deps: VerifyTwoFACodeDeps,
): Promise<void> {
  const url = `/v1/users/${encodeURIComponent(params.userId)}/2fa/${encodeURIComponent(params.twoFAOption)}/verification-requests`;
  const userAction = await signUserAction(
    { username: params.username, httpMethod: 'PATCH', httpPath: url, body: {}, signingContext: params.signingContext },
    { userActionDataSource: deps.userActionDataSource, origin: deps.origin },
  );
  await deps.twoFADataSource.verifyCode(
    { userId: params.userId, twoFAOption: params.twoFAOption, username: params.username, userAction },
    params.code,
  );
}
