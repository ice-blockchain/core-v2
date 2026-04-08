import type { HttpClient } from '@ion/network';
import type { UserActionDataSource } from '../data-sources/user-action-data-source';
import type { KeysDataSource } from '../data-sources/keys-data-source';
import type { SigningContext } from '../types';
import type { CreateKeyInput, DeriveKeyInput } from './types';
import { listKeys, createKey, deriveKey, updateKey } from './keys';

interface KeyContext {
  httpClient: HttpClient;
  origin: string;
  userActionDataSource: UserActionDataSource;
  keysDataSource: KeysDataSource;
}

export function buildKeyMethods(c: KeyContext) {
  const readDeps = { keysDataSource: c.keysDataSource };
  const writeDeps = { userActionDataSource: c.userActionDataSource, httpClient: c.httpClient, origin: c.origin };

  return {
    listKeys: (username: string, params?: { owner?: string; limit?: number; paginationToken?: string }) =>
      listKeys(username, params, readDeps),
    createKey: (username: string, input: CreateKeyInput, signingContext: SigningContext) =>
      createKey({ username, input, signingContext }, writeDeps),
    deriveKey: (params: { username: string; keyId: string; input: DeriveKeyInput; signingContext: SigningContext }) =>
      deriveKey(params, writeDeps),
    updateKey: (params: { username: string; keyId: string; name: string; signingContext: SigningContext }) =>
      updateKey(params, writeDeps),
  };
}
