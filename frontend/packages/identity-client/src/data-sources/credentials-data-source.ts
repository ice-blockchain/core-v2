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

export function createCredentialsDataSource(httpClient: HttpClient): CredentialsDataSource {
  return {
    async listCredentials(username) {
      const { body } = await httpClient.get<CredentialListResponse>('/auth/credentials', {
        headers: { 'X-Username': username },
      });
      return body!;
    },

    async initCreateCredential(kind, username) {
      const { body } = await httpClient.post<UserRegistrationChallenge>('/auth/credentials/init', {
        body: { kind },
        headers: { 'X-Username': username },
      });
      return body!;
    },

    async createCredential(payload, auth) {
      const headers: Record<string, string> = {
        'X-Username': auth.username,
      };
      if (auth.userAction) headers['X-Useraction'] = auth.userAction;
      const { body } = await httpClient.post<CredentialResult>('/auth/credentials', {
        body: payload,
        headers,
      });
      return body!;
    },
  };
}
