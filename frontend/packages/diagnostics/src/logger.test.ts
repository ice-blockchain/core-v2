import { Logger } from './logger';
import { LogLevel } from './types';

describe('Logger buffer without initialization', () => {
  it('logs to buffer before init is called', () => {
    Logger.info('before init', { tag: 'test' });

    const entries = Logger.getBuffer().getEntries();
    expect(entries.length).toBeGreaterThanOrEqual(1);

    const last = entries[entries.length - 1];
    expect(last?.message).toBe('before init');
  });
});

describe('Logger buffer after initialization', () => {
  it('stores entries from all log levels', () => {
    Logger.initialize({
      consoleLevel: LogLevel.Debug,
      bufferCapacity: 100,
    });

    Logger.debug('debug msg');
    Logger.info('info msg');
    Logger.warning('warn msg');

    const messages = Logger.getBuffer()
      .getEntries()
      .map((e) => e.message);

    expect(messages).toContain('debug msg');
    expect(messages).toContain('info msg');
    expect(messages).toContain('warn msg');
  });
});

describe('Logger level assignment', () => {
  it('assigns correct level and error to entries', () => {
    Logger.error('error msg', {
      error: new Error('test'),
    });

    const entries = Logger.getBuffer().getEntries();
    const found = entries.find(
      (e) => e.message === 'error msg',
    );

    expect(found?.level).toBe(LogLevel.Error);
    expect(found?.error?.message).toBe('test');
  });
});
