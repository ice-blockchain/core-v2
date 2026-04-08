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
import { createWalletsDataSource } from './data-sources/wallets-data-source';
import { createWalletViewsDataSource } from './data-sources/wallet-views-data-source';
import { createCoinsDataSource } from './data-sources/coins-data-source';
import { createNetworksDataSource } from './data-sources/networks-data-source';
import { createKeysDataSource } from './data-sources/keys-data-source';
import { createTokenManager } from './token/token-manager';
import { deduplicatedRefresh } from './token/deduplicated-refresh';
import { createIdentityAuthInterceptor } from './interceptor/identity-auth-interceptor';
import { createAuthStore } from './auth-store';
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
import { buildWalletMethods } from './wallets/build-wallet-methods';
import { buildCoinMethods } from './coins/build-coin-methods';
import { buildKeyMethods } from './keys/build-key-methods';

export function createIdentityClient(config: IdentityClientConfig): IdentityClient {
  const ctx = buildContext(config);
  return {
    ...buildAuthMethods(ctx), ...buildFeatureMethods(ctx), ...buildUserMethods(ctx),
    ...buildWalletMethods(ctx), ...buildCoinMethods(ctx), ...buildKeyMethods(ctx),
    authStore: ctx.authStore,
  };
}

function buildHttpClient(config: IdentityClientConfig, tokenManager: ReturnType<typeof createTokenManager>) {
  const refreshLocks = new Map<string, Promise<void>>();
  const lazyDeps = {} as { sessionDataSource: ReturnType<typeof createSessionDataSource> };
  const refreshFn = (username: string) => refreshToken(username, { sessionDataSource: lazyDeps.sessionDataSource, tokenManager });
  const interceptor = createIdentityAuthInterceptor({ tokenManager, refreshFn, refreshLocks, trustedBaseUrl: config.baseUrl });
  const allInterceptors = [...(config.interceptors ?? []), interceptor];
  const httpClient = createHttpClient({ baseUrl: config.baseUrl, interceptors: allInterceptors, headers: { 'X-Client-ID': config.appId } });
  lazyDeps.sessionDataSource = createSessionDataSource(httpClient);
  return { httpClient, sessionDataSource: lazyDeps.sessionDataSource, refreshLocks, refreshFn };
}

function buildDataSources(httpClient: ReturnType<typeof createHttpClient>) {
  return {
    loginDataSource: createLoginDataSource(httpClient),
    userActionDataSource: createUserActionDataSource(httpClient),
    registrationDataSource: createRegistrationDataSource(httpClient),
    userDataSource: createUserDataSource(httpClient),
    credentialsDataSource: createCredentialsDataSource(httpClient),
    twoFADataSource: createTwoFADataSource(httpClient),
    recoveryDataSource: createRecoveryDataSource(httpClient),
    userProfileDataSource: createUserProfileDataSource(httpClient),
    walletsDataSource: createWalletsDataSource(httpClient),
    walletViewsDataSource: createWalletViewsDataSource(httpClient),
    coinsDataSource: createCoinsDataSource(httpClient),
    networksDataSource: createNetworksDataSource(httpClient),
    keysDataSource: createKeysDataSource(httpClient),
  };
}

function buildContext(config: IdentityClientConfig) {
  const tokenManager = createTokenManager(config.secureStorage);
  const authStore = createAuthStore();
  const { httpClient, sessionDataSource, refreshLocks, refreshFn } = buildHttpClient(config, tokenManager);
  return {
    httpClient, tokenManager, authStore, origin: config.appId,
    refreshLocks, refreshFn, pbkdf2Fn: config.nativePbkdf2,
    sessionDataSource, ...buildDataSources(httpClient),
  };
}

type Ctx = ReturnType<typeof buildContext>;

function buildAuthMethods(c: Ctx) {
  const regDeps = { registrationDataSource: c.registrationDataSource, tokenManager: c.tokenManager, origin: c.origin, authStore: c.authStore, ...(c.pbkdf2Fn && { pbkdf2Fn: c.pbkdf2Fn }) };
  const loginDeps = { loginDataSource: c.loginDataSource, tokenManager: c.tokenManager, origin: c.origin, authStore: c.authStore, ...(c.pbkdf2Fn && { pbkdf2Fn: c.pbkdf2Fn }) };
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

function buildFeatureMethods(c: Ctx) {
  const credDeps = { credentialsDataSource: c.credentialsDataSource, userActionDataSource: c.userActionDataSource, origin: c.origin, ...(c.pbkdf2Fn && { pbkdf2Fn: c.pbkdf2Fn }) };
  const twoFADeps = { twoFADataSource: c.twoFADataSource, userActionDataSource: c.userActionDataSource, origin: c.origin };
  const deleteDeps = { tokenManager: c.tokenManager, authStore: c.authStore, httpClient: c.httpClient };
  const recoveryDeps = { recoveryDataSource: c.recoveryDataSource, origin: c.origin, ...(c.pbkdf2Fn && { pbkdf2Fn: c.pbkdf2Fn }) };
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
