import { fork } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import type {
  RelayInstance,
  RelayClusterConfig,
} from './types';

const DEFAULT_HEALTH_TIMEOUT_MS = 10_000;
const HEALTH_POLL_INTERVAL_MS = 200;

function generatePeerId(): string {
  return randomBytes(16).toString('hex');
}

function buildRelayScriptPath(): string {
  return resolve(__dirname, 'relay-server.ts');
}

function createRelayInstance(
  index: number,
  basePort: number,
): RelayInstance {
  const port = basePort + index;
  return {
    id: `relay-${index}`,
    port,
    peerId: generatePeerId(),
    process: null,
  };
}

function spawnRelayProcess(
  relay: RelayInstance,
  replicationFactor: number,
): RelayInstance {
  const scriptPath = buildRelayScriptPath();
  const childProcess = fork(scriptPath, [], {
    env: {
      ...process.env,
      RELAY_PORT: String(relay.port),
      RELAY_PEER_ID: relay.peerId,
      RELAY_ID: relay.id,
      REPLICATION_FACTOR: String(replicationFactor),
    },
    stdio: 'pipe',
  });

  return { ...relay, process: childProcess };
}

async function pollHealthEndpoint(
  port: number,
  timeoutMs: number,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  const url = `http://127.0.0.1:${port}/health`;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, {
        signal: AbortSignal.timeout(1000),
      });
      if (response.ok) return true;
    } catch {
      // Relay not ready yet, keep polling
    }
    await new Promise((r) => setTimeout(r, HEALTH_POLL_INTERVAL_MS));
  }

  return false;
}

export async function waitForRelayHealth(
  port: number,
  timeoutMs: number = DEFAULT_HEALTH_TIMEOUT_MS,
): Promise<boolean> {
  return pollHealthEndpoint(port, timeoutMs);
}

async function startSingleRelay(
  index: number,
  config: RelayClusterConfig,
): Promise<RelayInstance> {
  const instance = createRelayInstance(index, config.basePort);
  const spawned = spawnRelayProcess(
    instance,
    config.replicationFactor,
  );

  const isHealthy = await waitForRelayHealth(spawned.port);

  if (!isHealthy) {
    killRelayProcess(spawned);
    throw new Error(
      `Relay ${spawned.id} on port ${spawned.port} failed health check`,
    );
  }

  return spawned;
}

export async function startRelayCluster(
  config: RelayClusterConfig,
): Promise<RelayInstance[]> {
  const relayPromises = Array.from(
    { length: config.relayCount },
    (_, index) => startSingleRelay(index, config),
  );

  return Promise.all(relayPromises);
}

function killRelayProcess(relay: RelayInstance): void {
  if (!relay.process) return;

  relay.process.kill('SIGTERM');
  relay.process = null;
}

export async function stopRelayCluster(
  relays: RelayInstance[],
): Promise<void> {
  for (const relay of relays) {
    killRelayProcess(relay);
  }
}

export async function killRelay(
  relay: RelayInstance,
): Promise<void> {
  killRelayProcess(relay);
}

export async function restartRelay(
  relay: RelayInstance,
  config: RelayClusterConfig,
): Promise<RelayInstance> {
  killRelayProcess(relay);
  const respawned = spawnRelayProcess(relay, config.replicationFactor);
  const isHealthy = await waitForRelayHealth(respawned.port);

  if (!isHealthy) {
    killRelayProcess(respawned);
    throw new Error(
      `Relay ${respawned.id} failed health check after restart`,
    );
  }

  return respawned;
}
