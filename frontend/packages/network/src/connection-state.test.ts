import { describe, it, expect, vi } from 'vitest';
import { createConnectionStateMachine } from './connection-state';

describe('ConnectionStateMachine initial state', () => {
  it('starts in idle state', () => {
    const machine = createConnectionStateMachine();
    expect(machine.getState()).toBe('idle');
  });
});

describe('ConnectionStateMachine forward transitions', () => {
  it('transitions from idle to connecting', () => {
    const machine = createConnectionStateMachine();
    machine.transition('connecting');
    expect(machine.getState()).toBe('connecting');
  });

  it('transitions from connecting to connected', () => {
    const machine = createConnectionStateMachine();
    machine.transition('connecting');
    machine.transition('connected');
    expect(machine.getState()).toBe('connected');
  });

  it('transitions from connecting to disconnected', () => {
    const machine = createConnectionStateMachine();
    machine.transition('connecting');
    machine.transition('disconnected');
    expect(machine.getState()).toBe('disconnected');
  });
});

describe('ConnectionStateMachine reconnect transitions', () => {
  it('transitions from connected to reconnecting', () => {
    const machine = createConnectionStateMachine();
    machine.transition('connecting');
    machine.transition('connected');
    machine.transition('reconnecting');
    expect(machine.getState()).toBe('reconnecting');
  });

  it('transitions from reconnecting to connected', () => {
    const machine = createConnectionStateMachine();
    machine.transition('connecting');
    machine.transition('connected');
    machine.transition('reconnecting');
    machine.transition('connected');
    expect(machine.getState()).toBe('connected');
  });

  it('transitions from disconnected to connecting', () => {
    const machine = createConnectionStateMachine();
    machine.transition('connecting');
    machine.transition('disconnected');
    machine.transition('connecting');
    expect(machine.getState()).toBe('connecting');
  });
});

describe('ConnectionStateMachine invalid transitions', () => {
  it('throws on idle to connected', () => {
    const machine = createConnectionStateMachine();
    expect(() => machine.transition('connected')).toThrow(
      'Invalid state transition: idle -> connected',
    );
  });

  it('throws on idle to disconnected', () => {
    const machine = createConnectionStateMachine();
    expect(() => machine.transition('disconnected')).toThrow(
      'Invalid state transition: idle -> disconnected',
    );
  });
});

describe('ConnectionStateMachine event handlers', () => {
  it('notifies handlers on state change', () => {
    const machine = createConnectionStateMachine();
    const handler = vi.fn();
    machine.onStateChange(handler);
    machine.transition('connecting');
    expect(handler).toHaveBeenCalledWith('connecting');
  });

  it('supports multiple handlers', () => {
    const machine = createConnectionStateMachine();
    const first = vi.fn();
    const second = vi.fn();
    machine.onStateChange(first);
    machine.onStateChange(second);
    machine.transition('connecting');
    expect(first).toHaveBeenCalledWith('connecting');
    expect(second).toHaveBeenCalledWith('connecting');
  });

  it('unsubscribes handler via returned function', () => {
    const machine = createConnectionStateMachine();
    const handler = vi.fn();
    const unsubscribe = machine.onStateChange(handler);
    unsubscribe();
    machine.transition('connecting');
    expect(handler).not.toHaveBeenCalled();
  });
});
