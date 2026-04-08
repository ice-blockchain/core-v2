export interface KeyResponse {
  id: string;
  scheme: string;
  curve: string;
  publicKey: string;
  name: string | null;
  status: 'Active' | 'Archived';
  custodial: boolean;
  dateCreated: string;
}

export interface ListKeysResponse {
  items: KeyResponse[];
  nextPageToken: string | null;
}

export interface CreateKeyInput {
  scheme: string;
  curve: string;
  name?: string;
}

export interface DeriveKeyInput {
  domain: string;
  seed: string;
}
