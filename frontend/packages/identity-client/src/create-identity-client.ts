import type { IdentityClient, IdentityClientConfig } from './types';
import { createRegistrationDataSource } from './data-sources/registration-data-source';
import { createLoginDataSource } from './data-sources/login-data-source';
import { createSessionDataSource } from './data-sources/session-data-source';
import { createUserDataSource } from './data-sources/user-data-source';
import { createTokenManager } from './token/token-manager';
import { withDefaultHeaders } from './http-client-with-headers';
import { registerWithPasskey, registerWithPassword } from './auth/registration';
import { loginWithPasskey, loginWithPassword } from './auth/login';
import { logout, refreshToken, isAuthenticated } from './auth/session';
import { getLoginCapabilities } from './auth/login-capabilities';
import { getUser } from './users/get-user';

export function createIdentityClient(config: IdentityClientConfig): IdentityClient {
  const httpClient = withDefaultHeaders(config.httpClient, { 'X-Client-ID': config.appId });
  const registrationDataSource = createRegistrationDataSource(httpClient);
  const loginDataSource = createLoginDataSource(httpClient);
  const sessionDataSource = createSessionDataSource(httpClient);
  const userDataSource = createUserDataSource(httpClient);
  const tokenManager = createTokenManager(config.secureStorage);
  const origin = config.appId;

  const regDeps = { registrationDataSource, tokenManager, origin };
  const loginDeps = { loginDataSource, tokenManager, origin };
  const sessionDeps = { sessionDataSource, tokenManager, refreshLocks: new Map<string, Promise<void>>() };
  const userDeps = { userDataSource, tokenManager };

  return {
    registerWithPasskey: (username, earlyAccessEmail) => registerWithPasskey(username, regDeps, earlyAccessEmail),
    registerWithPassword: (username, password, earlyAccessEmail) => registerWithPassword({ username, password, earlyAccessEmail }, regDeps),
    loginWithPasskey: (username, twoFAVerificationCodes) => loginWithPasskey(username, loginDeps, twoFAVerificationCodes),
    loginWithPassword: (username, password, twoFAVerificationCodes) => loginWithPassword({ username, password, twoFAVerificationCodes }, loginDeps),
    logout: (username) => logout(username, sessionDeps),
    refreshToken: (username) => refreshToken(username, sessionDeps),
    isAuthenticated: (username) => isAuthenticated(username, sessionDeps),
    getLoginCapabilities: (username) => getLoginCapabilities(username, loginDataSource),
    getUser: (username, userIdOrMasterKey) => getUser(username, userIdOrMasterKey, userDeps),
  };
}
