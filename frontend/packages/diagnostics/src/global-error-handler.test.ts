import { installGlobalErrorHandler } from './global-error-handler';

function setupMockErrorUtils() {
  const previousHandler = jest.fn();
  const mockErrorUtils = {
    getGlobalHandler: () => previousHandler,
    setGlobalHandler: jest.fn(),
  };

  (globalThis as Record<string, unknown>).ErrorUtils =
    mockErrorUtils;

  return { previousHandler, mockErrorUtils };
}

function teardownMockErrorUtils() {
  delete (globalThis as Record<string, unknown>).ErrorUtils;
}

describe('global error handler with ErrorUtils', () => {
  afterEach(teardownMockErrorUtils);

  it('captures uncaught exceptions', () => {
    const logFatal = jest.fn();
    const { previousHandler, mockErrorUtils } =
      setupMockErrorUtils();

    installGlobalErrorHandler(logFatal);

    const handler = mockErrorUtils.setGlobalHandler.mock
      .calls[0]?.[0] as (e: Error, f: boolean) => void;

    const error = new Error('crash');
    handler(error, true);

    expect(logFatal).toHaveBeenCalledWith(
      'Uncaught exception',
      { error, tag: 'global_error' },
    );
    expect(previousHandler).toHaveBeenCalledWith(error, true);
  });
});

describe('global error handler filtering', () => {
  afterEach(teardownMockErrorUtils);

  it('skips StateError cancelled to avoid noise', () => {
    const logFatal = jest.fn();
    const { previousHandler, mockErrorUtils } =
      setupMockErrorUtils();

    installGlobalErrorHandler(logFatal);

    const handler = mockErrorUtils.setGlobalHandler.mock
      .calls[0]?.[0] as (e: Error, f: boolean) => void;

    const cancelled = new Error('cancelled');
    cancelled.name = 'StateError';
    handler(cancelled, false);

    expect(logFatal).not.toHaveBeenCalled();
    expect(previousHandler).toHaveBeenCalled();
  });
});
