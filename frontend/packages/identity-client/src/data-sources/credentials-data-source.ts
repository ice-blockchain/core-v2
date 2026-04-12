import type { HttpClient } from '@ion/network';
import type { UserRegistrationChallenge } from '../types';

interface CredentialListItem {
  uuid: string | null;
  kind: string;
  name: string;
}

interface CredentialListResponse {
  items: CredentialListItem[];
}

interface CreateCredentialPayload {
  challengeIdentifier: string;
  credentialName: string;
  credentialKind: string;
  credentialInfo: {
    credId: string;
    clientData: string;
    attestationData: string;
  };
  encryptedPrivateKey: string;
}

interface CredentialResult {
  credentialUuid: string;
  credentialId: string;
  dateCreated: string;
  isActive: boolean;
  kind: string;
  name: string;
  origin: string;
  relyingPartyId: string;
  publicKey: string;
}

export type { CredentialListItem, CredentialListResponse, CreateCredentialPayload, CredentialResult };

interface CredentialAuthHeaders {
  username: string;
  userAction?: string;
}

export interface CredentialsDataSource {
  listCredentials(username: string): Promise<CredentialListResponse>;
  initCreateCredential(kind: string, username: string): Promise<UserRegistrationChallenge>;
  createCredential(payload: CreateCredentialPayload, auth: CredentialAuthHeaders): Promise<CredentialResult>;
}

async function listCredentials(httpClient: HttpClient, username: string): Promise<CredentialListResponse> {
  const { body } = await httpClient.get<CredentialListResponse>('/auth/credentials', {
    headers: { 'X-Username': username },
  });
  if (body === undefined) throw new Error('Empty response body from listCredentials');
  return body;
}

async function initCreateCredential(httpClient: HttpClient, kind: string, username: string): Promise<UserRegistrationChallenge> {
  const { body } = await httpClient.post<UserRegistrationChallenge>('/auth/credentials/init', {
    body: { kind },
    headers: { 'X-Username': username },
  });
  if (body === undefined) throw new Error('Empty response body from initCreateCredential');
  return body;
}

async function createCredential(httpClient: HttpClient, payload: CreateCredentialPayload, auth: CredentialAuthHeaders): Promise<CredentialResult> {
  const headers: Record<string, string> = { 'X-Username': auth.username };
  if (auth.userAction) headers['X-Useraction'] = auth.userAction;
  const { body } = await httpClient.post<CredentialResult>('/auth/credentials', {
    body: payload,
    headers,
  });
  if (body === undefined) throw new Error('Empty response body from createCredential');
  return body;
}

export function createCredentialsDataSource(httpClient: HttpClient): CredentialsDataSource {
  return {
    listCredentials: (username) => listCredentials(httpClient, username),
    initCreateCredential: (kind, username) => initCreateCredential(httpClient, kind, username),
    createCredential: (payload, auth) => createCredential(httpClient, payload, auth),
  };
}
