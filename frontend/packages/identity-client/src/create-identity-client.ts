import type { IdentityClient, IdentityClientConfig } from './types';
import { createRegistrationDataSource } from './data-sources/registration-data-source';
import { createLoginDataSource } from './data-sources/login-data-source';
import { createSessionDataSource } from './data-sources/session-data-source';
import { createTokenManager } from './token/token-manager';
import { registerWithPasskey, registerWithPassword } from './auth/registration';
import { loginWithPasskey, loginWithPassword } from './auth/login';
import { logout, refreshToken, isAuthenticated } from './auth/session';
import { getLoginCapabilities } from './auth/login-capabilities';

export function createIdentityClient(config: IdentityClientConfig): IdentityClient {
  const registrationDataSource = createRegistrationDataSource(config.httpClient);
  const loginDataSource = createLoginDataSource(config.httpClient);
  const sessionDataSource = createSessionDataSource(config.httpClient);
  const tokenManager = createTokenManager(config.secureStorage);
  const origin = config.appId;

  const regDeps = { registrationDataSource, tokenManager, origin };
  const loginDeps = { loginDataSource, tokenManager, origin };
  const sessionDeps = { sessionDataSource, tokenManager };

  return {
    registerWithPasskey: (username) => registerWithPasskey(username, regDeps),
    registerWithPassword: (username, password) => registerWithPassword(username, password, regDeps),
    loginWithPasskey: (username) => loginWithPasskey(username, loginDeps),
    loginWithPassword: (username, password) => loginWithPassword(username, password, loginDeps),
    logout: (userId) => logout(userId, userId, sessionDeps),
    refreshToken: (username) => refreshToken(username, sessionDeps),
    isAuthenticated: (username) => isAuthenticated(username, sessionDeps),
    getLoginCapabilities: (username) => getLoginCapabilities(username, loginDataSource),
  };
}
