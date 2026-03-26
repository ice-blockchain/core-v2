import { parentPort, workerData } from 'node:worker_threads';

async function run() {
  const { userId, relayUrl, events } = workerData;
  const start = Date.now();

  try {
    let written = 0;
    for (const event of events) {
      const res = await fetch(`${relayUrl}/put`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ soul: event.soul, data: event.data }),
      });
      if (!res.ok) throw new Error(`PUT failed: ${res.status}`);
      written++;
    }
    parentPort.postMessage({ userId, eventsWritten: written, durationMs: Date.now() - start });
  } catch (err) {
    parentPort.postMessage({ userId, eventsWritten: 0, durationMs: Date.now() - start, error: String(err) });
  }
}

run();
