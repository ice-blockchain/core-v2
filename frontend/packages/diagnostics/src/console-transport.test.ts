import { sendToConsole, formatConsoleMessage } from './console-transport';
import { createLogEntry } from './log-entry';
import { LogLevel } from './types';

describe('formatConsoleMessage', () => {
  it('formats message with level label', () => {
    const entry = createLogEntry(LogLevel.Info, 'test');
    expect(formatConsoleMessage(entry)).toBe('[INFO] test');
  });

  it('includes tag when present', () => {
    const entry = createLogEntry(LogLevel.Error, 'fail', {
      tag: 'wallet',
    });
    expect(formatConsoleMessage(entry)).toBe('[ERROR] [wallet] fail');
  });
});

describe('sendToConsole routing', () => {
  beforeEach(() => {
    jest.spyOn(console, 'debug').mockImplementation();
    jest.spyOn(console, 'info').mockImplementation();
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('routes info to console.info', () => {
    const entry = createLogEntry(LogLevel.Info, 'hello');
    sendToConsole(entry, LogLevel.Debug);
    expect(console.info).toHaveBeenCalled();
  });

  it('routes warning to console.warn', () => {
    const entry = createLogEntry(LogLevel.Warning, 'caution');
    sendToConsole(entry, LogLevel.Debug);
    expect(console.warn).toHaveBeenCalled();
  });
});

describe('sendToConsole filtering', () => {
  beforeEach(() => {
    jest.spyOn(console, 'debug').mockImplementation();
    jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('suppresses entries below minimum level', () => {
    const entry = createLogEntry(LogLevel.Debug, 'quiet');
    sendToConsole(entry, LogLevel.Warning);
    expect(console.debug).not.toHaveBeenCalled();
  });

  it('passes data and error as extra arguments', () => {
    const error = new Error('boom');
    const entry = createLogEntry(LogLevel.Error, 'crash', {
      data: { userId: '123' },
      error,
    });

    sendToConsole(entry, LogLevel.Debug);

    expect(console.error).toHaveBeenCalledWith(
      '[ERROR] crash',
      { userId: '123' },
      error,
    );
  });
});
