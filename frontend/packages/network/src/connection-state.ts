import type { ConnectionState } from './shared-types';

type TransitionMap = Record<ConnectionState, ConnectionState[]>;

const VALID_TRANSITIONS: TransitionMap = {
  idle: ['connecting'],
  connecting: ['connected', 'disconnected'],
  connected: ['reconnecting', 'disconnected'],
  reconnecting: ['connected', 'disconnected'],
  disconnected: ['connecting'],
};

export interface ConnectionStateMachine {
  getState(): ConnectionState;
  transition(to: ConnectionState): void;
  onStateChange(
    handler: (state: ConnectionState) => void,
  ): () => void;
}

export function createConnectionStateMachine(): ConnectionStateMachine {
  let currentState: ConnectionState = 'idle';
  const handlers = new Set<(state: ConnectionState) => void>();

  function getState(): ConnectionState {
    return currentState;
  }

  function transition(to: ConnectionState): void {
    const allowed = VALID_TRANSITIONS[currentState];
    if (!allowed.includes(to)) {
      throw new Error(
        `Invalid state transition: ${currentState} -> ${to}`,
      );
    }
    currentState = to;
    for (const handler of handlers) {
      handler(currentState);
    }
  }

  function onStateChange(
    handler: (state: ConnectionState) => void,
  ): () => void {
    handlers.add(handler);
    return () => {
      handlers.delete(handler);
    };
  }

  return { getState, transition, onStateChange };
}
