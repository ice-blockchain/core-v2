/* Cross-platform global declarations for diagnostics.
 * Avoids pulling in full DOM or Node type libraries. */

interface Console {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

declare const console: Console;
