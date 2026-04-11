import type { HttpClient } from '@ion/network';
import type { User } from '../types';

export interface UserDataSource {
  getUser(userIdOrMasterKey: string, username: string): Promise<User>;
}

export function createUserDataSource(httpClient: HttpClient): UserDataSource {
  return {
    async getUser(userIdOrMasterKey, username) {
      const response = await httpClient.get<User>(`/auth/users/${encodeURIComponent(userIdOrMasterKey)}`, {
        headers: { 'X-Username': username },
      });
      return response.body!;
    },
  };
}
