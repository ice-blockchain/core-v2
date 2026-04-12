import type { HttpClient } from '@ion/network';
import { validateBagId } from './validate-bag-id';
import type { TonStorageClient, AddBagRequest, BagDetails, BagInfo, BagFile, PeerInfo } from './types';

export function createTonStorageClient(httpClient: HttpClient): TonStorageClient {
  return {
    addBag: (request) => addBag(httpClient, request),
    removeBag: (bagId, deleteFiles) => removeBag(httpClient, bagId, deleteFiles),
    stopBag: (bagId) => stopBag(httpClient, bagId),
    getBagDetails: (bagId) => getBagDetails(httpClient, bagId),
    listBags: () => listBags(httpClient),
    getFilePath: (bagId, fileIndex) => getFilePath(httpClient, bagId, fileIndex),
  };
}

async function addBag(httpClient: HttpClient, request: AddBagRequest): Promise<void> {
  validateBagId(request.bagId);
  await httpClient.post('/api/v1/add', {
    body: {
      bag_id: request.bagId,
      path: request.downloadPath,
      files: request.files,
      download_all: request.downloadAll ?? true,
    },
  });
}

async function removeBag(httpClient: HttpClient, bagId: string, deleteFiles?: boolean): Promise<void> {
  validateBagId(bagId);
  await httpClient.post('/api/v1/remove', {
    body: { bag_id: bagId, with_files: deleteFiles ?? false },
  });
}

async function stopBag(httpClient: HttpClient, bagId: string): Promise<void> {
  validateBagId(bagId);
  await httpClient.post('/api/v1/stop', { body: { bag_id: bagId } });
}

async function getBagDetails(httpClient: HttpClient, bagId: string): Promise<BagDetails> {
  validateBagId(bagId);
  const response = await httpClient.get<RawBagDetails>(`/api/v1/details?bag_id=${encodeURIComponent(bagId)}`);
  if (response.body === undefined) throw new Error('Empty response body from getBagDetails');
  return mapBagDetails(response.body);
}

async function listBags(httpClient: HttpClient): Promise<BagInfo[]> {
  const response = await httpClient.get<RawListResponse>('/api/v1/list');
  if (response.body === undefined) throw new Error('Empty response body from listBags');
  return (response.body.bags ?? []).map(mapBagInfo);
}

function getFilePath(_httpClient: HttpClient, bagId: string, fileIndex: number): string {
  validateBagId(bagId);
  return `${bagId}/${fileIndex}`;
}

// --- Raw API response types (snake_case) ---

interface RawListResponse {
  bags: RawBagInfo[];
}

interface RawBagInfo {
  bag_id: string;
  description: string;
  size: number;
  downloaded: number;
  files_count: number;
  dir_name: string;
  completed: boolean;
  active: boolean;
  seeding: boolean;
  header_loaded: boolean;
  peers: number;
  upload_speed: number;
  download_speed: number;
}

interface RawBagDetails extends RawBagInfo {
  files: RawBagFile[];
  piece_size: number;
  bag_pieces_num: number;
  path: string;
}

interface RawBagFile {
  index: number;
  name: string;
  size: number;
}

interface RawPeerInfo {
  addr: string;
  id: string;
  upload_speed: number;
  download_speed: number;
}

// --- Mappers ---

function mapBagInfo(raw: RawBagInfo): BagInfo {
  return {
    bagId: raw.bag_id,
    description: raw.description,
    totalSize: raw.size,
    downloadedSize: raw.downloaded,
    filesCount: raw.files_count,
    dirName: raw.dir_name,
    isComplete: raw.completed,
    isActive: raw.active,
    isSeeding: raw.seeding,
    isHeaderLoaded: raw.header_loaded,
    peers: raw.peers,
    uploadSpeed: raw.upload_speed,
    downloadSpeed: raw.download_speed,
  };
}

function mapBagFile(raw: RawBagFile): BagFile {
  return { index: raw.index, name: raw.name, size: raw.size };
}

function mapPeerInfo(raw: RawPeerInfo): PeerInfo {
  return {
    address: raw.addr,
    id: raw.id,
    uploadSpeed: raw.upload_speed,
    downloadSpeed: raw.download_speed,
  };
}

function mapBagDetails(raw: RawBagDetails): BagDetails {
  return {
    ...mapBagInfo(raw),
    files: (raw.files ?? []).map(mapBagFile),
    pieceSize: raw.piece_size,
    piecesCount: raw.bag_pieces_num,
    activePeers: ((raw as unknown as { peers_list?: RawPeerInfo[] }).peers_list ?? []).map(mapPeerInfo),
    path: raw.path,
  };
}
