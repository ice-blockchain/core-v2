import type { PulseRelayInstance } from './pulse-relay.js';
import type { GeneratedEvent } from './types.js';
import type { PulseNode } from '../../graph/src/index.js';

export interface PulseClient {
  userId: string;
  relay: PulseRelayInstance;
  writeEvents(events: GeneratedEvent[]): Promise<void>;
  readEvent(soul: string): Promise<PulseNode | null>;
  disconnect(): void;
  reconnect(relay: PulseRelayInstance): void;
  isConnected(): boolean;
  getWriteCount(): number;
}

interface ClientState {
  connected: boolean;
  writeCount: number;
  currentRelay: PulseRelayInstance;
}

export function createPulseClient(config: { userId: string; relayEndpoint: PulseRelayInstance }): PulseClient {
  const state: ClientState = {
    connected: true,
    writeCount: 0,
    currentRelay: config.relayEndpoint,
  };

  return {
    userId: config.userId,
    get relay() { return state.currentRelay; },
    writeEvents: (events) => executeWrites(state, events),
    readEvent: (soul) => executeRead(state, soul),
    disconnect: () => { state.connected = false; },
    reconnect: (relay) => { state.connected = true; state.currentRelay = relay; },
    isConnected: () => state.connected,
    getWriteCount: () => state.writeCount,
  };
}

async function executeWrites(state: ClientState, events: GeneratedEvent[]): Promise<void> {
  if (!state.connected) {
    throw new Error('Client is disconnected');
  }
  for (const event of events) {
    await state.currentRelay.putData(event.soul, event.data);
    state.writeCount++;
  }
}

async function executeRead(state: ClientState, soul: string): Promise<PulseNode | null> {
  if (!state.connected) {
    throw new Error('Client is disconnected');
  }
  return state.currentRelay.getData(soul);
}
