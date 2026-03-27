import type { HttpClient } from '@ion/network';
import type { User } from '../types';

export interface UserDataSource {
  getUser(userIdOrMasterKey: string, token: string): Promise<User>;
}

export function createUserDataSource(httpClient: HttpClient): UserDataSource {
  return {
    getUser(userIdOrMasterKey, token) {
      return httpClient.get<User>(`/auth/users/${encodeURIComponent(userIdOrMasterKey)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    },
  };
}
