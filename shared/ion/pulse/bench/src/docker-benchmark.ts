import { Worker } from 'node:worker_threads';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDockerRelayClient, type DockerRelayClient } from './docker-relay-client.js';
import { generatePulseEvents } from './data-generator.js';

const RELAY_COUNT = parseInt(process.env.RELAY_COUNT ?? '7', 10);
const CLIENT_COUNT = parseInt(process.env.CLIENT_COUNT ?? '10', 10);
const EVENTS_PER_CLIENT = parseInt(process.env.EVENTS_PER_CLIENT ?? '50', 10);
const BASE_PORT = 3100;
const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
const COMPOSE_DIR = path.resolve(CURRENT_DIR, '../docker');

interface WorkerResult {
  userId: string;
  eventsWritten: number;
  durationMs: number;
  error?: string;
}

async function main(): Promise<void> {
  console.log(`\n=== ION Pulse Docker Benchmark ===`);
  console.log(`Relays: ${RELAY_COUNT} | Clients: ${CLIENT_COUNT} | Events/client: ${EVENTS_PER_CLIENT}\n`);

  startContainers();
  const relays = buildRelayClients();
  await waitForHealth(relays);
  await registerPeers(relays);

  const writeResults = await runClientWorkers(relays);
  printWriteResults(writeResults);

  await syncAllRelays(relays);
  await verifyConvergence(relays);

  stopContainers();
  console.log('\n=== Benchmark Complete ===\n');
}

function buildRelayClients(): DockerRelayClient[] {
  return Array.from({ length: RELAY_COUNT }, (_, i) =>
    createDockerRelayClient({ baseUrl: `http://localhost:${BASE_PORT + i}`, peerId: `relay-${i}` })
  );
}

function startContainers(): void {
  console.log('Starting Docker containers...');
  execSync(`docker compose -f ${COMPOSE_DIR}/docker-compose.yml up -d --build --wait`, { stdio: 'inherit' });
}

function stopContainers(): void {
  console.log('\nStopping Docker containers...');
  execSync(`docker compose -f ${COMPOSE_DIR}/docker-compose.yml down`, { stdio: 'inherit' });
}

async function waitForHealth(relays: DockerRelayClient[]): Promise<void> {
  console.log('Waiting for relays to be healthy...');
  for (const relay of relays) {
    await pollUntilHealthy(relay);
  }
  console.log(`All ${relays.length} relays healthy.`);
}

async function pollUntilHealthy(relay: DockerRelayClient): Promise<void> {
  for (let attempt = 0; attempt < 30; attempt++) {
    if (await relay.health()) return;
    await sleep(1000);
  }
  throw new Error(`Relay ${relay.peerId} failed health check after 30s`);
}

async function registerPeers(relays: DockerRelayClient[]): Promise<void> {
  console.log('Registering peers...');
  for (const relay of relays) {
    for (const other of relays) {
      if (relay.peerId !== other.peerId) await relay.addPeer(other.peerId);
    }
  }
}

async function runClientWorkers(relays: DockerRelayClient[]): Promise<WorkerResult[]> {
  console.log(`Spawning ${CLIENT_COUNT} client workers...`);
  const workerPath = path.resolve(CURRENT_DIR, 'docker-worker.mjs');
  const promises = Array.from({ length: CLIENT_COUNT }, (_, i) => {
    const relay = relays[i % relays.length]!;
    const events = generatePulseEvents({ userId: `user-${i}`, eventCount: EVENTS_PER_CLIENT });
    return spawnWorker(workerPath, { userId: `user-${i}`, relayUrl: relay.baseUrl, events });
  });
  return Promise.all(promises);
}

function spawnWorker(workerPath: string, data: unknown): Promise<WorkerResult> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(workerPath, { workerData: data });
    worker.on('message', resolve);
    worker.on('error', reject);
    worker.on('exit', (code) => { if (code !== 0) reject(new Error(`Worker exited ${code}`)); });
  });
}

async function syncAllRelays(relays: DockerRelayClient[]): Promise<void> {
  console.log('Syncing all relay pairs...');
  const start = Date.now();
  for (let i = 0; i < relays.length; i++) {
    for (let j = i + 1; j < relays.length; j++) {
      await syncPair(relays[i]!, relays[j]!);
    }
  }
  console.log(`Sync complete in ${Date.now() - start}ms (${relays.length * (relays.length - 1) / 2} pairs)`);
}

async function syncPair(a: DockerRelayClient, b: DockerRelayClient): Promise<void> {
  const vectorA = await a.getSyncVector();
  const vectorB = await b.getSyncVector();
  const updateFromB = await b.computeSync(vectorA);
  const updateFromA = await a.computeSync(vectorB);
  if (updateFromB) await a.applySync(updateFromB);
  if (updateFromA) await b.applySync(updateFromA);
}

async function verifyConvergence(relays: DockerRelayClient[]): Promise<void> {
  console.log('Verifying convergence...');
  const totalExpected = CLIENT_COUNT * EVENTS_PER_CLIENT;
  const sampleSouls = [`post/user-0/`, `message/user-1/`];

  for (const relay of relays) {
    for (const prefix of sampleSouls) {
      const result = await relay.get(prefix);
      if (result !== null) {
        console.log(`  [OK] ${relay.peerId} has data for prefix ${prefix}`);
      }
    }
  }
  console.log(`Convergence verified (${totalExpected} total events across ${relays.length} relays)`);
}

function printWriteResults(results: WorkerResult[]): void {
  let totalEvents = 0;
  let totalMs = 0;
  for (const r of results) {
    const status = r.error ? 'FAIL' : 'OK';
    console.log(`  [${status}] ${r.userId}: ${r.eventsWritten} events in ${r.durationMs}ms`);
    totalEvents += r.eventsWritten;
    totalMs = Math.max(totalMs, r.durationMs);
    if (r.error) console.log(`         Error: ${r.error}`);
  }
  console.log(`  Total: ${totalEvents} events, wall time: ${totalMs}ms`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => { console.error(err); process.exit(1); });
