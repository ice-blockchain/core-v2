type ErrorHandler = (
  error: Error,
  isFatal: boolean,
) => void;

type LogFatalFunction = (
  message: string,
  options: { error: Error; tag: string },
) => void;

type RejectionEvent = { reason?: unknown };

type RejectionListener = (event: RejectionEvent) => void;

interface ErrorUtilsStatic {
  getGlobalHandler: () => ErrorHandler;
  setGlobalHandler: (handler: ErrorHandler) => void;
}

declare const ErrorUtils: ErrorUtilsStatic;
declare const global: {
  ErrorUtils?: ErrorUtilsStatic;
};

function isStateCancelledError(error: Error): boolean {
  return (
    error.name === 'StateError' &&
    error.message === 'cancelled'
  );
}

function installGlobalErrorHandler(
  logFatal: LogFatalFunction,
): void {
  installUncaughtExceptionHandler(logFatal);
  installUnhandledRejectionHandler(logFatal);
}

function resolveErrorUtils(): ErrorUtilsStatic | undefined {
  if (typeof ErrorUtils !== 'undefined') return ErrorUtils;
  return global.ErrorUtils;
}

function installUncaughtExceptionHandler(
  logFatal: LogFatalFunction,
): void {
  const errorUtils = resolveErrorUtils();
  if (!errorUtils) return;

  const previousHandler = errorUtils.getGlobalHandler();

  errorUtils.setGlobalHandler(
    (error: Error, isFatal: boolean) => {
      if (!isStateCancelledError(error)) {
        logFatal('Uncaught exception', {
          error,
          tag: 'global_error',
        });
      }

      if (previousHandler) {
        previousHandler(error, isFatal);
      }
    },
  );
}

function toError(reason: unknown): Error {
  return reason instanceof Error
    ? reason
    : new Error(String(reason));
}

function addRejectionListener(
  listener: RejectionListener,
): void {
  if (typeof globalThis === 'undefined') return;
  if (!('addEventListener' in globalThis)) return;

  (
    globalThis as unknown as {
      addEventListener: (
        type: string,
        listener: RejectionListener,
      ) => void;
    }
  ).addEventListener('unhandledrejection', listener);
}

function installUnhandledRejectionHandler(
  logFatal: LogFatalFunction,
): void {
  addRejectionListener((event) => {
    logFatal('Unhandled promise rejection', {
      error: toError(event.reason),
      tag: 'unhandled_rejection',
    });
  });
}

export { installGlobalErrorHandler };
