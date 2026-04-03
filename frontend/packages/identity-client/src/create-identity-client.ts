import { createHttpClient } from '@ion/network';
import type { IdentityClient, IdentityClientConfig, SigningContext } from './types';
import type { RequestTwoFACodeParams, VerifyTwoFACodeParams, DeleteTwoFAMethodInput, RecoverAccountInput } from './types';
import type { UpdateSocialProfileInput } from './users/types';
import { createRegistrationDataSource } from './data-sources/registration-data-source';
import { createLoginDataSource } from './data-sources/login-data-source';
import { createSessionDataSource } from './data-sources/session-data-source';
import { createUserDataSource } from './data-sources/user-data-source';
import { createUserActionDataSource } from './data-sources/user-action-data-source';
import { createCredentialsDataSource } from './data-sources/credentials-data-source';
import { createTwoFADataSource } from './data-sources/two-fa-data-source';
import { createRecoveryDataSource } from './data-sources/recovery-data-source';
import { createUserProfileDataSource } from './data-sources/user-profile-data-source';
import { createTokenManager } from './token/token-manager';
import { createIdentityAuthInterceptor } from './interceptor/identity-auth-interceptor';
import { createAuthStore } from './auth-store';
import { setNativePbkdf2 } from './crypto/encrypt-private-key';
import { registerWithPasskey } from './auth/register-with-passkey';
import { registerWithPassword } from './auth/register-with-password';
import { loginWithPasskey } from './auth/login-with-passkey';
import { loginWithPassword } from './auth/login-with-password';
import { logout } from './auth/logout';
import { refreshToken } from './auth/refresh-token';
import { isAuthenticated } from './auth/is-authenticated';
import { getLoginCapabilities } from './auth/login-capabilities';
import { getUser } from './users/get-user';
import { getSocialProfile } from './users/get-social-profile';
import { updateSocialProfile } from './users/update-social-profile';
import { verifyNickname } from './users/verify-nickname';
import { verifyEarlyAccessEmail } from './auth/verify-early-access-email';
import { listCredentials } from './auth/list-credentials';
import { createRecoveryCredentials } from './auth/create-recovery-credentials';
import { requestTwoFACode } from './auth/request-two-fa-code';
import { verifyTwoFACode } from './auth/verify-two-fa-code';
import { deleteTwoFAMethod } from './auth/delete-two-fa-method';
import { deleteAccount } from './auth/delete-account';
import { recoverAccount } from './auth/recover-account';
import { restoreAuth } from './auth/restore-auth';

export function createIdentityClient(config: IdentityClientConfig): IdentityClient {
  const ctx = buildContext(config);
  return { ...buildAuthMethods(ctx), ...buildFeatureMethods(ctx), ...buildUserMethods(ctx), authStore: ctx.authStore };
}

function buildContext(config: IdentityClientConfig) {
  if (config.nativePbkdf2) setNativePbkdf2(config.nativePbkdf2);
  const tokenManager = createTokenManager(config.secureStorage);
  const authStore = createAuthStore();
  const refreshLocks = new Map<string, Promise<void>>();

  const lazyDeps = {} as { sessionDataSource: ReturnType<typeof createSessionDataSource> };
  const refreshFn = (username: string) => refreshToken(username, { sessionDataSource: lazyDeps.sessionDataSource, tokenManager });
  const interceptor = createIdentityAuthInterceptor({ tokenManager, refreshFn, refreshLocks });
  const httpClient = createHttpClient({ baseUrl: config.baseUrl, interceptors: [interceptor], headers: { 'X-Client-ID': config.appId } });
  lazyDeps.sessionDataSource = createSessionDataSource(httpClient);
  const { sessionDataSource } = lazyDeps;

  return {
    httpClient, tokenManager, authStore, origin: config.appId,
    refreshLocks, refreshFn,
    loginDataSource: createLoginDataSource(httpClient),
    sessionDataSource,
    userActionDataSource: createUserActionDataSource(httpClient),
    registrationDataSource: createRegistrationDataSource(httpClient),
    userDataSource: createUserDataSource(httpClient),
    credentialsDataSource: createCredentialsDataSource(httpClient),
    twoFADataSource: createTwoFADataSource(httpClient),
    recoveryDataSource: createRecoveryDataSource(httpClient),
    userProfileDataSource: createUserProfileDataSource(httpClient),
  };
}

type Ctx = ReturnType<typeof buildContext>;

function buildAuthMethods(c: Ctx) {
  const regDeps = { registrationDataSource: c.registrationDataSource, tokenManager: c.tokenManager, origin: c.origin, authStore: c.authStore };
  const loginDeps = { loginDataSource: c.loginDataSource, tokenManager: c.tokenManager, origin: c.origin, authStore: c.authStore };
  const logoutDeps = { sessionDataSource: c.sessionDataSource, tokenManager: c.tokenManager, authStore: c.authStore };
  const userDeps = { userDataSource: c.userDataSource };
  return {
    registerWithPasskey: (username: string, email?: string) => registerWithPasskey(username, regDeps, email),
    registerWithPassword: (input: Parameters<typeof registerWithPassword>[0]) => registerWithPassword(input, regDeps),
    loginWithPasskey: (username: string, codes?: Record<string, string>) => loginWithPasskey(username, loginDeps, codes),
    loginWithPassword: (input: Parameters<typeof loginWithPassword>[0]) => loginWithPassword(input, loginDeps),
    logout: (username: string) => logout(username, logoutDeps),
    refreshToken: (username: string) => deduplicatedRefresh(username, c.refreshLocks, c.refreshFn),
    isAuthenticated: (username: string) => isAuthenticated(username, { tokenManager: c.tokenManager }),
    getLoginCapabilities: (username: string) => getLoginCapabilities(username, c.loginDataSource),
    getUser: (username: string, id: string) => getUser(username, id, userDeps),
    restoreAuth: () => restoreAuth({ tokenManager: c.tokenManager, authStore: c.authStore }),
  };
}

async function deduplicatedRefresh(
  username: string,
  locks: Map<string, Promise<void>>,
  refreshFn: (username: string) => Promise<void>,
): Promise<void> {
  const existing = locks.get(username);
  if (existing) { await existing; return; }
  const promise = refreshFn(username);
  locks.set(username, promise);
  try { await promise; } finally { locks.delete(username); }
}

function buildFeatureMethods(c: Ctx) {
  const credDeps = { credentialsDataSource: c.credentialsDataSource, userActionDataSource: c.userActionDataSource, origin: c.origin };
  const twoFADeps = { twoFADataSource: c.twoFADataSource, userActionDataSource: c.userActionDataSource, origin: c.origin };
  const deleteDeps = { tokenManager: c.tokenManager, authStore: c.authStore, httpClient: c.httpClient };
  const recoveryDeps = { recoveryDataSource: c.recoveryDataSource, origin: c.origin };
  return {
    verifyEarlyAccessEmail: (email: string) => verifyEarlyAccessEmail(email, { httpClient: c.httpClient }),
    listCredentials: (username: string) => listCredentials(username, credDeps),
    createRecoveryCredentials: (username: string, ctx: SigningContext) => createRecoveryCredentials(username, ctx, credDeps),
    requestTwoFACode: (params: RequestTwoFACodeParams) => requestTwoFACode(params, twoFADeps),
    verifyTwoFACode: (params: VerifyTwoFACodeParams) => verifyTwoFACode(params, twoFADeps),
    deleteTwoFAMethod: (input: DeleteTwoFAMethodInput) => deleteTwoFAMethod(input, twoFADeps),
    deleteAccount: (username: string, userAction: string) => deleteAccount(username, userAction, deleteDeps),
    recoverAccount: (input: RecoverAccountInput) => recoverAccount(input, recoveryDeps),
  };
}

function buildUserMethods(c: Ctx) {
  const profileDeps = { userProfileDataSource: c.userProfileDataSource };
  return {
    getSocialProfile: (username: string, id: string) => getSocialProfile(username, id, profileDeps),
    updateSocialProfile: (username: string, userId: string, input: UpdateSocialProfileInput) =>
      updateSocialProfile(username, { userId, input }, profileDeps),
    verifyNickname: (username: string, nickname: string) => verifyNickname(username, nickname, profileDeps),
  };
}
