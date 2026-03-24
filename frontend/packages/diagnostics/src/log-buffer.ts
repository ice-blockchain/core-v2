import type { LogEntry } from './types';
import type { LogLevel } from './types';
import { isLevelEnabled } from './log-level';

const DEFAULT_BUFFER_CAPACITY = 100_000;

class LogBuffer {
  private readonly buffer: Array<LogEntry | undefined>;
  private readonly capacity: number;
  private writeIndex = 0;
  private count = 0;

  constructor(capacity = DEFAULT_BUFFER_CAPACITY) {
    this.capacity =
      capacity > 0 ? capacity : DEFAULT_BUFFER_CAPACITY;
    this.buffer = new Array<LogEntry | undefined>(
      this.capacity,
    );
  }

  add(entry: LogEntry): void {
    this.buffer[this.writeIndex] = entry;
    this.writeIndex = (this.writeIndex + 1) % this.capacity;

    if (this.count < this.capacity) {
      this.count++;
    }
  }

  getEntries(): LogEntry[] {
    if (this.count === 0) return [];

    const result: LogEntry[] = [];
    const startIndex = this.calculateStartIndex();

    for (let i = 0; i < this.count; i++) {
      const index = (startIndex + i) % this.capacity;
      const entry = this.buffer[index];

      if (entry) {
        result.push(entry);
      }
    }

    return result;
  }

  getEntriesByLevel(minimumLevel: LogLevel): LogEntry[] {
    return this.getEntries().filter((entry) =>
      isLevelEnabled(entry.level, minimumLevel),
    );
  }

  getCount(): number {
    return this.count;
  }

  clear(): void {
    this.buffer.fill(undefined);
    this.writeIndex = 0;
    this.count = 0;
  }

  private calculateStartIndex(): number {
    if (this.count < this.capacity) return 0;
    return this.writeIndex;
  }
}

export { LogBuffer, DEFAULT_BUFFER_CAPACITY };
