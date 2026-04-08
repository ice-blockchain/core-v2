import type { HttpClient } from '@ion/network';
import type { KeysDataSource } from '../data-sources/keys-data-source';
import type { UserActionDataSource } from '../data-sources/user-action-data-source';
import { executeSignedRequest } from '../auth/execute-signed-request';
import type { SigningContext } from '../types';
import type { KeyResponse, ListKeysResponse, CreateKeyInput, DeriveKeyInput } from './types';

interface KeysReadDeps {
  keysDataSource: KeysDataSource;
}

interface KeysWriteDeps {
  userActionDataSource: UserActionDataSource;
  httpClient: HttpClient;
  origin: string;
}

interface CreateKeyOptions {
  username: string;
  input: CreateKeyInput;
  signingContext: SigningContext;
}

interface DeriveKeyOptions {
  username: string;
  keyId: string;
  input: DeriveKeyInput;
  signingContext: SigningContext;
}

interface UpdateKeyOptions {
  username: string;
  keyId: string;
  name: string;
  signingContext: SigningContext;
}

export async function listKeys(
  username: string, params: { owner?: string; limit?: number; paginationToken?: string } | undefined, deps: KeysReadDeps,
): Promise<ListKeysResponse> {
  return deps.keysDataSource.listKeys(username, params);
}

export async function createKey(options: CreateKeyOptions, deps: KeysWriteDeps): Promise<KeyResponse> {
  const body: Record<string, unknown> = { scheme: options.input.scheme, curve: options.input.curve };
  if (options.input.name !== undefined) body.name = options.input.name;
  return executeSignedRequest<KeyResponse>({
    username: options.username, httpMethod: 'POST', httpPath: '/keys', body, signingContext: options.signingContext,
  }, deps);
}

export async function deriveKey(options: DeriveKeyOptions, deps: KeysWriteDeps): Promise<{ output: string }> {
  return executeSignedRequest<{ output: string }>({
    username: options.username,
    httpMethod: 'POST',
    httpPath: `/keys/${encodeURIComponent(options.keyId)}/derive`,
    body: options.input,
    signingContext: options.signingContext,
  }, deps);
}

export async function updateKey(options: UpdateKeyOptions, deps: KeysWriteDeps): Promise<KeyResponse> {
  return executeSignedRequest<KeyResponse>({
    username: options.username,
    httpMethod: 'PUT',
    httpPath: `/keys/${encodeURIComponent(options.keyId)}`,
    body: { name: options.name },
    signingContext: options.signingContext,
  }, deps);
}
