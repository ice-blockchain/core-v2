import type { TwoFADataSource } from '../data-sources/two-fa-data-source';
import type { UserActionDataSource } from '../data-sources/user-action-data-source';
import { signUserAction } from './sign-user-action';

interface TwoFAVerificationParam {
  twoFAOptionVerificationValue: string;
  twoFAOptionVerificationCode: string;
}

interface DeleteTwoFAMethodDeps {
  twoFADataSource: TwoFADataSource;
  userActionDataSource: UserActionDataSource;
  origin: string;
}

interface DeleteTwoFAMethodParams {
  username: string;
  userId: string;
  twoFAOption: string;
  twoFAValue: string;
  verificationParams: TwoFAVerificationParam[];
  signingContext: { kind: 'password'; password: string } | { kind: 'passkey' };
}

export async function deleteTwoFAMethod(
  params: DeleteTwoFAMethodParams,
  deps: DeleteTwoFAMethodDeps,
): Promise<void> {
  const httpPath = `/v1/users/${params.userId}/2fa/${params.twoFAOption}/values/${params.twoFAValue}`;
  const userAction = await signUserAction(
    { username: params.username, httpMethod: 'DELETE', httpPath, body: {}, signingContext: params.signingContext },
    { userActionDataSource: deps.userActionDataSource, origin: deps.origin },
  );
  await deps.twoFADataSource.deleteMethod({
    userId: params.userId,
    twoFAOption: params.twoFAOption,
    twoFAValue: params.twoFAValue,
    verificationParams: params.verificationParams,
    username: params.username,
    userAction,
  });
}
