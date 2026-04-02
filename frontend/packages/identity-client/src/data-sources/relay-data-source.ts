import type { HttpClient } from '@ion/network';
import type { IonConnectRelay, UserRelayInfo, SearchUsersParams } from '../users/types';

export interface RelayDataSource {
  getIonConnectRelays(username: string, masterPubkeys: string[]): Promise<UserRelayInfo[]>;
  getIonConnectIndexers(userId: string, username: string): Promise<string[]>;
  setIonConnectRelays(userId: string, username: string, followeeList: string[]): Promise<IonConnectRelay[]>;
  getAvailableRelays(username: string, userId: string, currentRelayUrl: string): Promise<IonConnectRelay[]>;
  getContentCreators(username: string, limit: number, excludeMasterPubKeys: string[]): Promise<UserRelayInfo[]>;
  searchUsers(username: string, params: SearchUsersParams): Promise<UserRelayInfo[]>;
}

function normalizeRelayUrl(url: string): string {
  return url.replace(/^(wss:\/\/[^/:]+):443(\/|$)/, '$1$2');
}

function assertValidRelayUrl(url: string): void {
  if (!url.startsWith('wss://') && !url.startsWith('https://')) {
    throw new Error('Invalid relay URL scheme: must be wss:// or https://');
  }
}

function buildRepeatedParams(key: string, values: string[]): string {
  return values.map((v) => `${key}=${encodeURIComponent(v)}`).join('&');
}

async function sendGetIonConnectRelays(
  httpClient: HttpClient,
  username: string,
  masterPubkeys: string[],
): Promise<UserRelayInfo[]> {
  const queryString = buildRepeatedParams('masterPubkey', masterPubkeys);
  const url = queryString ? `/v1/users/ion-connect-relays?${queryString}` : '/v1/users/ion-connect-relays';
  const { body } = await httpClient.get<UserRelayInfo[]>(url, {
    headers: { 'X-Username': username },
  });
  return body;
}

async function sendGetIonConnectIndexers(
  httpClient: HttpClient,
  userId: string,
  username: string,
): Promise<string[]> {
  const { body } = await httpClient.get<{ ionConnectIndexers: string[] }>(
    `/v1/users/${encodeURIComponent(userId)}/ion-connect-indexers`,
    { headers: { 'X-Username': username } },
  );
  return body.ionConnectIndexers;
}

async function sendSetIonConnectRelays(
  httpClient: HttpClient,
  options: { userId: string; username: string; followeeList: string[] },
): Promise<IonConnectRelay[]> {
  const { body } = await httpClient.patch<{ ionConnectRelays: IonConnectRelay[] }>(
    `/v1/users/${encodeURIComponent(options.userId)}/ion-connect-relays`,
    {
      body: { followeeList: options.followeeList },
      headers: { 'X-Username': options.username },
    },
  );
  return body.ionConnectRelays;
}

async function sendGetAvailableRelays(
  httpClient: HttpClient,
  options: { username: string; userId: string; currentRelayUrl: string },
): Promise<IonConnectRelay[]> {
  assertValidRelayUrl(options.currentRelayUrl);
  const { body } = await httpClient.get<{ ionConnectRelays: IonConnectRelay[] }>(
    `/v1/users/${encodeURIComponent(options.userId)}/all-available-ion-connect-relays`,
    {
      query: { 'ion-connect-relay': normalizeRelayUrl(options.currentRelayUrl) },
      headers: { 'X-Username': options.username },
    },
  );
  return body.ionConnectRelays;
}

async function sendGetContentCreators(
  httpClient: HttpClient,
  options: { username: string; limit: number; excludeMasterPubKeys: string[] },
): Promise<UserRelayInfo[]> {
  const { body } = await httpClient.post<UserRelayInfo[]>(
    '/v1/users/get-content-creators',
    {
      query: { limit: String(options.limit) },
      body: { excludeMasterPubKeys: options.excludeMasterPubKeys },
      headers: { 'X-Username': options.username },
    },
  );
  return body;
}

async function sendSearchUsers(
  httpClient: HttpClient,
  username: string,
  params: SearchUsersParams,
): Promise<UserRelayInfo[]> {
  const query: Record<string, string> = {
    keyword: params.keyword,
    limit: String(params.limit),
    offset: String(params.offset),
    type: params.type,
  };
  if (params.followedBy) {
    query.followedBy = params.followedBy;
  }
  if (params.followerOf) {
    query.followerOf = params.followerOf;
  }
  const { body } = await httpClient.get<UserRelayInfo[]>(
    '/v1/user-social-profiles',
    {
      query,
      headers: { 'X-Username': username },
    },
  );
  return body;
}

export function createRelayDataSource(httpClient: HttpClient): RelayDataSource {
  return {
    getIonConnectRelays: (username, keys) => sendGetIonConnectRelays(httpClient, username, keys),
    getIonConnectIndexers: (userId, username) => sendGetIonConnectIndexers(httpClient, userId, username),
    setIonConnectRelays: (userId, username, list) => sendSetIonConnectRelays(httpClient, { userId, username, followeeList: list }),
    getAvailableRelays: (username, userId, url) => sendGetAvailableRelays(httpClient, { username, userId, currentRelayUrl: url }),
    getContentCreators: (username, limit, keys) => sendGetContentCreators(httpClient, { username, limit, excludeMasterPubKeys: keys }),
    searchUsers: (username, params) => sendSearchUsers(httpClient, username, params),
  };
}
