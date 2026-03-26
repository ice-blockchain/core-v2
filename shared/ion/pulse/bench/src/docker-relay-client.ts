interface RelayResponse<T> {
  ok?: boolean;
  error?: string;
  [key: string]: unknown;
}

export interface DockerRelayClient {
  baseUrl: string;
  peerId: string;
  health(): Promise<boolean>;
  put(soul: string, data: Record<string, unknown>): Promise<void>;
  get(soul: string): Promise<unknown | null>;
  addPeer(peerId: string): Promise<void>;
  getSyncVector(): Promise<string>;
  computeSync(vector: string): Promise<string | null>;
  applySync(update: string): Promise<void>;
}

export function createDockerRelayClient(options: { baseUrl: string; peerId: string }): DockerRelayClient {
  const { baseUrl, peerId } = options;

  return {
    baseUrl,
    peerId,
    health: () => checkHealth(baseUrl),
    put: (soul, data) => sendPut(baseUrl, soul, data),
    get: (soul) => sendGet(baseUrl, soul),
    addPeer: (id) => sendAddPeer(baseUrl, id),
    getSyncVector: () => fetchSyncVector(baseUrl),
    computeSync: (vector) => fetchComputeSync(baseUrl, vector),
    applySync: (update) => sendApplySync(baseUrl, update),
  };
}

async function checkHealth(baseUrl: string): Promise<boolean> {
  try {
    const res = await fetch(`${baseUrl}/health`);
    return res.ok;
  } catch {
    return false;
  }
}

async function sendPut(baseUrl: string, soul: string, data: Record<string, unknown>): Promise<void> {
  await postJson(`${baseUrl}/put`, { soul, data });
}

async function sendGet(baseUrl: string, soul: string): Promise<unknown | null> {
  const res = await fetch(`${baseUrl}/get?soul=${encodeURIComponent(soul)}`);
  const body = await res.json() as { node: unknown | null };
  return body.node;
}

async function sendAddPeer(baseUrl: string, peerId: string): Promise<void> {
  await postJson(`${baseUrl}/peer/add`, { peerId });
}

async function fetchSyncVector(baseUrl: string): Promise<string> {
  const res = await postJson(`${baseUrl}/sync/vector`, {});
  return (res as { vector: string }).vector;
}

async function fetchComputeSync(baseUrl: string, vector: string): Promise<string | null> {
  const res = await postJson(`${baseUrl}/sync/compute`, { vector });
  return (res as { update: string | null }).update;
}

async function sendApplySync(baseUrl: string, update: string): Promise<void> {
  await postJson(`${baseUrl}/sync/apply`, { update });
}

async function postJson(url: string, body: unknown): Promise<unknown> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} from ${url}`);
  }
  return res.json();
}
