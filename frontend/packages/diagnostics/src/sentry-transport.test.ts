import {
  setSentryModule,
  sendToSentry,
} from './sentry-transport';
import { createLogEntry } from './log-entry';
import { LogLevel } from './types';

const mockSentry = {
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  addBreadcrumb: jest.fn(),
  setUser: jest.fn(),
};

beforeAll(() => {
  setSentryModule(mockSentry);
});

beforeEach(() => jest.clearAllMocks());

describe('sendToSentry exception capture', () => {
  it('captures exception when entry has error', () => {
    const error = new Error('boom');
    const entry = createLogEntry(LogLevel.Error, 'crash', {
      error,
    });

    sendToSentry(entry, LogLevel.Error);

    expect(mockSentry.captureException).toHaveBeenCalledWith(
      error,
      expect.any(Object),
    );
  });

  it('captures message when entry has no error', () => {
    const entry = createLogEntry(LogLevel.Error, 'bad');

    sendToSentry(entry, LogLevel.Error);

    expect(mockSentry.captureMessage).toHaveBeenCalledWith(
      'bad',
      'error',
      expect.any(Object),
    );
  });
});

describe('sendToSentry filtering', () => {
  it('skips entries below minimum level', () => {
    const entry = createLogEntry(LogLevel.Info, 'ignored');

    sendToSentry(entry, LogLevel.Error);

    expect(mockSentry.captureException).not.toHaveBeenCalled();
    expect(mockSentry.captureMessage).not.toHaveBeenCalled();
  });

  it('filters transient network errors', () => {
    const entry = createLogEntry(
      LogLevel.Error,
      'network request failed',
    );

    sendToSentry(entry, LogLevel.Error);

    expect(mockSentry.captureException).not.toHaveBeenCalled();
    expect(mockSentry.captureMessage).not.toHaveBeenCalled();
  });
});

describe('sendToSentry context', () => {
  it('includes tag and data in context', () => {
    const entry = createLogEntry(LogLevel.Error, 'tagged', {
      tag: 'wallet',
      data: { amount: 50 },
    });

    sendToSentry(entry, LogLevel.Error);

    expect(mockSentry.captureMessage).toHaveBeenCalledWith(
      'tagged',
      'error',
      {
        tags: { manual_log: 'wallet' },
        extra: { debug_context: { amount: 50 } },
      },
    );
  });
});
