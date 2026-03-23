import { LogBuffer } from './log-buffer';
import { createLogEntry } from './log-entry';
import { LogLevel } from './types';

function makeEntry(level: LogLevel, message: string) {
  return createLogEntry(level, message);
}

describe('LogBuffer insertion and retrieval', () => {
  it('stores and retrieves entries in order', () => {
    const buffer = new LogBuffer(10);

    buffer.add(makeEntry(LogLevel.Info, 'first'));
    buffer.add(makeEntry(LogLevel.Info, 'second'));

    const entries = buffer.getEntries();
    expect(entries).toHaveLength(2);
    expect(entries[0]?.message).toBe('first');
    expect(entries[1]?.message).toBe('second');
  });

  it('returns empty array when no entries added', () => {
    const buffer = new LogBuffer(5);
    expect(buffer.getEntries()).toEqual([]);
  });
});

describe('LogBuffer circular overwrite', () => {
  it('overwrites oldest entries when capacity exceeded', () => {
    const buffer = new LogBuffer(3);

    buffer.add(makeEntry(LogLevel.Info, 'a'));
    buffer.add(makeEntry(LogLevel.Info, 'b'));
    buffer.add(makeEntry(LogLevel.Info, 'c'));
    buffer.add(makeEntry(LogLevel.Info, 'd'));

    const entries = buffer.getEntries();
    expect(entries).toHaveLength(3);
    expect(entries[0]?.message).toBe('b');
    expect(entries[2]?.message).toBe('d');
  });

  it('tracks count correctly through wraparound', () => {
    const buffer = new LogBuffer(3);

    buffer.add(makeEntry(LogLevel.Info, 'a'));
    buffer.add(makeEntry(LogLevel.Info, 'b'));
    expect(buffer.getCount()).toBe(2);

    buffer.add(makeEntry(LogLevel.Info, 'c'));
    buffer.add(makeEntry(LogLevel.Info, 'd'));
    expect(buffer.getCount()).toBe(3);
  });
});

describe('LogBuffer filtering and clearing', () => {
  it('filters entries by minimum level', () => {
    const buffer = new LogBuffer(10);

    buffer.add(makeEntry(LogLevel.Debug, 'debug'));
    buffer.add(makeEntry(LogLevel.Error, 'error'));
    buffer.add(makeEntry(LogLevel.Info, 'info'));

    const errors = buffer.getEntriesByLevel(LogLevel.Error);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.message).toBe('error');
  });

  it('clears all entries', () => {
    const buffer = new LogBuffer(5);

    buffer.add(makeEntry(LogLevel.Info, 'entry'));
    buffer.clear();

    expect(buffer.getCount()).toBe(0);
    expect(buffer.getEntries()).toEqual([]);
  });
});
